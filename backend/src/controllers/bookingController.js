import { dbQuery, dbRun, dbGet } from '../config/db.js';
import { sendBookingSubmittedEmail, sendBookingApprovedEmail, sendBookingRejectedEmail } from '../services/emailService.js';
import fetch from 'node-fetch';
import { upsertCalendarEvent, deleteCalendarEvent } from '../services/googleCalendarService.js';

// Helper to generate a unique 6-character alphanumeric tracking code
async function generateUniqueCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  while (true) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await dbGet('SELECT id FROM jobs WHERE tracking_code = ?', [code]);
    if (!existing) return code;
  }
}

// POST /api/public/bookings - Submit a booking request
export const createBooking = async (req, res) => {
  const { client_name, contact, email, event_date, job_type, location, start_time, end_time, details } = req.body;

  if (!client_name || !contact || !event_date || !job_type || !start_time || !end_time) {
    return res.status(400).json({ error: 'ชื่อลูกค้า, ข้อมูลติดต่อ, วันที่ถ่ายภาพ, ประเภทงาน, และเวลาเริ่ม-สิ้นสุด จำเป็นต้องระบุครบถ้วน' });
  }

  try {
    // Check for overlap on same date (excluding rejected/cancelled status)
    const existingBookings = await dbQuery(
      "SELECT start_time, end_time FROM bookings WHERE event_date = ? AND status IN ('approved', 'pending')",
      [event_date]
    );

    const toMins = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const selStart = toMins(start_time);
    const selEnd = toMins(end_time);

    // Validate that start time is before end time
    if (selStart >= selEnd) {
      return res.status(400).json({ error: 'เวลาเริ่มถ่ายภาพต้องอยู่ก่อนเวลาสิ้นสุดงาน' });
    }

    const hasOverlap = existingBookings.some(b => {
      const bStart = toMins(b.start_time);
      const bEnd = toMins(b.end_time);
      return selStart < bEnd && bStart < selEnd;
    });

    if (hasOverlap) {
      return res.status(400).json({ error: 'ช่วงเวลาที่คุณเลือกมีคิวงานอื่นจองไว้แล้ว โปรดเลือกช่วงเวลาอื่น' });
    }

    // Get deposit and package price from settings
    let depositAmount = 1000;
    let packagePrice = 0;
    try {
      // 1. Get deposit from job_types
      const jobTypesSetting = await dbGet("SELECT value FROM settings WHERE key = 'job_types'");
      if (jobTypesSetting) {
        const list = JSON.parse(jobTypesSetting.value);
        const found = list.find(t => t.id === job_type);
        if (found && found.deposit !== undefined) {
          depositAmount = Number(found.deposit);
        }
      }

      // 2. Get price from packages
      const packagesSetting = await dbGet("SELECT value FROM settings WHERE key = 'packages'");
      if (packagesSetting) {
        const list = JSON.parse(packagesSetting.value);
        const found = list.find(t => t.id === job_type);
        if (found && found.price !== undefined) {
          packagePrice = Number(String(found.price).replace(/[^0-9]/g, '')) || 0;
        }
      }
    } catch (e) {
      console.error('Error fetching pricing from settings:', e.message);
    }

    const eventTime = `${start_time} - ${end_time}`;

    const result = await dbRun(
      `INSERT INTO bookings (
        client_name, contact, email, event_date, event_time, details,
        job_type, price, deposit, location, start_time, end_time, note, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        client_name, contact, email || '', event_date, eventTime, details || '',
        job_type, packagePrice, depositAmount, location || '', start_time, end_time, details || ''
      ]
    );

    const newBooking = await dbGet('SELECT * FROM bookings WHERE id = ?', [result.id]);

    // Send email notification to client asynchronously
    sendBookingSubmittedEmail(newBooking).catch(err => console.error('Failed to send booking submitted email:', err));

    return res.status(201).json(newBooking);
  } catch (err) {
    console.error('Error creating booking:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// POST /api/bookings - Admin manually create booking (job)
export const adminCreateBooking = async (req, res) => {
  const {
    client_name, contact, email, event_date, event_time, details,
    job_type, price, deposit, location, start_time, end_time, note, status, slip_image
  } = req.body;

  if (!client_name || !event_date) {
    return res.status(400).json({ error: 'Client name and event date are required.' });
  }

  try {
    const result = await dbRun(
      `INSERT INTO bookings (
        client_name, contact, email, event_date, event_time, details, 
        job_type, price, deposit, location, start_time, end_time, note, status, slip_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_name,
        contact || '',
        email || '',
        event_date,
        event_time || '',
        details || '',
        job_type || 'custom',
        Number(price) || 0,
        Number(deposit) || 0,
        location || '',
        start_time || '',
        end_time || '',
        note || '',
        status || 'pending',
        slip_image || ''
      ]
    );

    // If approved, automatically create a tracking job
    let job = null;
    if (status === 'approved') {
      const trackingCode = await generateUniqueCode();
      await dbRun(
        'INSERT INTO jobs (booking_id, tracking_code, status) VALUES (?, ?, ?)',
        [result.id, trackingCode, 'briefed']
      );
      job = await dbGet('SELECT * FROM jobs WHERE booking_id = ?', [result.id]);
    }

    const newBooking = await dbGet('SELECT * FROM bookings WHERE id = ?', [result.id]);

    // Google Calendar Sync
    if (status === 'approved') {
      upsertCalendarEvent(newBooking).catch(err => console.error('[Google Calendar] Sync Error:', err.message));
    }

    return res.status(201).json({ booking: newBooking, job });
  } catch (err) {
    console.error('Error in adminCreateBooking:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/bookings - Get all bookings (Manager)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await dbQuery('SELECT * FROM bookings ORDER BY event_date DESC, created_at DESC');
    return res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// PUT /api/bookings/:id - General update of booking (Manager)
export const updateBooking = async (req, res) => {
  const { id } = req.params;
  const {
    client_name, contact, email, event_date, event_time, details,
    job_type, price, deposit, location, start_time, end_time, note, status, slip_image
  } = req.body;

  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const updatedClientName = client_name !== undefined ? client_name : booking.client_name;
    const updatedContact = contact !== undefined ? contact : booking.contact;
    const updatedEmail = email !== undefined ? email : booking.email;
    const updatedEventDate = event_date !== undefined ? event_date : booking.event_date;
    const updatedEventTime = event_time !== undefined ? event_time : booking.event_time;
    const updatedDetails = details !== undefined ? details : booking.details;
    const updatedJobType = job_type !== undefined ? job_type : booking.job_type;
    const updatedPrice = price !== undefined ? Number(price) : booking.price;
    const updatedDeposit = deposit !== undefined ? Number(deposit) : booking.deposit;
    const updatedLocation = location !== undefined ? location : booking.location;
    const updatedStartTime = start_time !== undefined ? start_time : booking.start_time;
    const updatedEndTime = end_time !== undefined ? end_time : booking.end_time;
    const updatedNote = note !== undefined ? note : booking.note;
    const updatedStatus = status !== undefined ? status : booking.status;
    const updatedSlipImage = slip_image !== undefined ? slip_image : booking.slip_image;

    const statusChanged = booking.status !== updatedStatus;

    await dbRun(
      `UPDATE bookings SET 
        client_name = ?, contact = ?, email = ?, event_date = ?, event_time = ?, details = ?, 
        job_type = ?, price = ?, deposit = ?, location = ?, start_time = ?, end_time = ?, note = ?, status = ?, slip_image = ?
       WHERE id = ?`,
      [
        updatedClientName, updatedContact, updatedEmail, updatedEventDate, updatedEventTime, updatedDetails,
        updatedJobType, updatedPrice, updatedDeposit, updatedLocation, updatedStartTime, updatedEndTime, updatedNote, updatedStatus, updatedSlipImage,
        id
      ]
    );

    // If status changed to pending_deposit or approved, create tracking job if it doesn't exist
    let job = null;
    let trackingCode = '';
    if (updatedStatus === 'pending_deposit' || updatedStatus === 'approved') {
      const existingJob = await dbGet('SELECT * FROM jobs WHERE booking_id = ?', [id]);
      if (!existingJob) {
        trackingCode = await generateUniqueCode();
        await dbRun(
          'INSERT INTO jobs (booking_id, tracking_code, status) VALUES (?, ?, ?)',
          [id, trackingCode, 'briefed']
        );
        job = await dbGet('SELECT * FROM jobs WHERE booking_id = ?', [id]);
      } else {
        job = existingJob;
        trackingCode = job.tracking_code;
      }
    }

    const updatedBooking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);

    // Google Calendar Sync Logic
    if (updatedBooking.status === 'approved') {
      upsertCalendarEvent(updatedBooking).catch(err => console.error('[Google Calendar] Sync Error:', err.message));
    } else if (booking.status === 'approved' && updatedBooking.status !== 'approved' && booking.google_event_id) {
      deleteCalendarEvent(booking.google_event_id).catch(err => console.error('[Google Calendar] Delete Error:', err.message));
      await dbRun("UPDATE bookings SET google_event_id = NULL WHERE id = ?", [id]);
    }

    // Send status changed emails
    if (statusChanged) {
      if (updatedStatus === 'pending_deposit' && trackingCode) {
        sendBookingApprovedEmail(updatedBooking, trackingCode)
          .catch(err => console.error('Failed to send booking approved email:', err));
      } else if (updatedStatus === 'rejected') {
        sendBookingRejectedEmail(updatedBooking, updatedNote)
          .catch(err => console.error('Failed to send booking rejected email:', err));
      }
    }

    return res.json({ booking: updatedBooking, job });
  } catch (err) {
    console.error('Error updating booking:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// DELETE /api/bookings/:id - Delete booking/job (Manager)
export const deleteBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.google_event_id) {
      deleteCalendarEvent(booking.google_event_id).catch(err => console.error('[Google Calendar] Delete Error:', err.message));
    }

    // SQLite FOREIGN KEY ON DELETE CASCADE will automatically delete the related job from the jobs table!
    await dbRun('DELETE FROM bookings WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Booking and related tracking job deleted.' });
  } catch (err) {
    console.error('Error deleting booking:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/public/bookings - Publicly get event dates and time slots for calendar availability checks
export const getPublicBookingDates = async (req, res) => {
  try {
    const dates = await dbQuery(
      "SELECT event_date, start_time, end_time, event_time, status FROM bookings WHERE status IN ('approved', 'pending')"
    );
    return res.json(dates);
  } catch (err) {
    console.error('Error fetching public booking dates:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// POST /api/public/bookings/:id/verify-slip
export const verifySlip = async (req, res) => {
  const { id } = req.params;
  const { slip_image } = req.body;

  if (!slip_image) {
    return res.status(400).json({ error: 'กรุณาอัปโหลดสลิปการโอนเงิน' });
  }

  try {
    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลใบจองคิวนี้' });
    }

    // Get Thunder Solution API token
    const tokenRow = await dbGet("SELECT value FROM settings WHERE key = 'thunder_token'");
    const thunderToken = tokenRow ? tokenRow.value : '';

    if (!thunderToken) {
      // Sandbox Mode Mock
      console.log(`[SLIP VERIFICATION] Sandbox Mode enabled. Mocking success for booking ID: ${id}`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedNote = booking.note 
        ? `${booking.note}\n[ชำระมัดจำแล้ว (โหมดแซนด์บ็อกซ์): ยอด ฿${booking.deposit.toLocaleString()}]`
        : `[ชำระมัดจำแล้ว (โหมดแซนด์บ็อกซ์): ยอด ฿${booking.deposit.toLocaleString()}]`;

      await dbRun(
        "UPDATE bookings SET status = 'approved', note = ?, slip_image = ? WHERE id = ?",
        [updatedNote, slip_image, id]
      );

      const updatedBooking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
      
      // Google Calendar Sync
      upsertCalendarEvent(updatedBooking).catch(err => console.error('[Google Calendar] Sync Error:', err.message));

      return res.json({
        success: true,
        message: 'ชำระมัดจำเรียบร้อยแล้ว (โหมดทดสอบ)',
        booking: updatedBooking
      });
    }

    // Real API verification
    // Clean base64 prefix if present
    const base64Clean = slip_image.includes(',') ? slip_image.split(',')[1] : slip_image;

    const response = await fetch('https://api.thunder.in.th/v2/verify/bank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${thunderToken}`
      },
      body: JSON.stringify({
        base64: base64Clean,
        checkDuplicate: true
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      const errMsg = result.message || (result.error && result.error.message) || 'ตรวจสอบสลิปไม่สำเร็จ';
      return res.status(400).json({ error: `ไม่สามารถยืนยันสลิปได้: ${errMsg}` });
    }

    const slipAmount = result.data.amountInSlip || (result.data.rawSlip && result.data.rawSlip.amount && result.data.rawSlip.amount.amount) || 0;
    const requiredDeposit = booking.deposit;

    if (slipAmount < requiredDeposit) {
      return res.status(400).json({ 
        error: `ยอดเงินในสลิป (฿${slipAmount.toLocaleString()}) น้อยกว่ายอดเงินมัดจำขั้นต่ำที่กำหนด (฿${requiredDeposit.toLocaleString()})` 
      });
    }

    const transRef = (result.data.rawSlip && result.data.rawSlip.transRef) || 'N/A';

    // Success - update booking status to approved
    const updatedNote = booking.note 
      ? `${booking.note}\n[ชำระมัดจำแล้วผ่าน Thunder Solution: ยอด ฿${slipAmount.toLocaleString()} อ้างอิง: ${transRef}]`
      : `[ชำระมัดจำแล้วผ่าน Thunder Solution: ยอด ฿${slipAmount.toLocaleString()} อ้างอิง: ${transRef}]`;

    await dbRun(
      "UPDATE bookings SET status = 'approved', note = ?, slip_image = ? WHERE id = ?",
      [updatedNote, slip_image, id]
    );

    const updatedBooking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);

    // Google Calendar Sync
    upsertCalendarEvent(updatedBooking).catch(err => console.error('[Google Calendar] Sync Error:', err.message));

    return res.json({
      success: true,
      message: 'ยืนยันการชำระเงินมัดจำเสร็จสิ้น! คิวงานของคุณเข้าสู่ระบบของช่างภาพเรียบร้อยแล้ว',
      booking: updatedBooking
    });

  } catch (err) {
    console.error('Error verifying slip:', err.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' });
  }
};
