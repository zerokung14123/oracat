import nodemailer from 'nodemailer';

const PORTFOLIO_URL = process.env.PORTFOLIO_URL || 'http://localhost:3000';

// Create transporter based on env variables if they exist
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465, // true for 465, false for other ports
      auth: { user, pass }
    });
  }
  return null;
};

// Send email function with fallback mock logging
export const sendEmail = async ({ to, subject, htmlText, plainText }) => {
  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || 'no-reply@teenmaofoto.com';

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"ตีนแมวfoto" <${fromAddress}>`,
        to,
        subject,
        text: plainText,
        html: htmlText
      });
      console.log(`[SMTP EMAIL SENDER] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[SMTP EMAIL SENDER] Failed to send email via SMTP, falling back to mock logger:', err.message);
    }
  }

  // Fallback Mock Logger (shows in console logs)
  console.log(`
========================================================================
📧 [MOCK GMAIL SENDER] SIMULATED EMAIL SENT TO CUSTOMER
========================================================================
To:      ${to}
From:    "ตีนแมวfoto" <${fromAddress}>
Subject: ${subject}
Date:    ${new Date().toLocaleString('th-TH')}
------------------------------------------------------------------------
Message Body:
${plainText}
========================================================================
  `);

  return { success: true, isMock: true };
};

// 1. Email template for Booking Request Submitted (Pending status)
export const sendBookingSubmittedEmail = async (booking) => {
  const subject = `[ตีนแมวfoto] ยืนยันการรับคำขอจองคิวถ่ายภาพของคุณ`;
  const plainText = `สวัสดีคุณ ${booking.client_name},

เราได้รับคำขอจองคิวถ่ายภาพของคุณเรียบร้อยแล้ว รายละเอียดมีดังนี้:
- วันที่ต้องการจ้างงาน: ${booking.event_date}
- ช่วงเวลาถ่ายภาพ: ${booking.event_time}
- สถานที่/รายละเอียด: ${booking.details || 'ไม่ได้ระบุ'}
- สถานะปัจจุบัน: รอตรวจสอบคิวงาน (Pending)

ช่างภาพจะตรวจสอบตารางงานและอัปเดตสถานะการอนุมัติคิวให้คุณทางอีเมลฉบับนี้โดยเร็วที่สุด
ขอบคุณที่เลือกใช้บริการ ตีนแมวfoto ครับ!`;

  const htmlText = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #d8b76c; border-radius: 12px; background-color: #0a0a0a; color: #ffffff;">
      <h2 style="color: #d8b76c; border-bottom: 1px solid #d8b76c; padding-bottom: 10px;">ตีนแมวfoto</h2>
      <p>สวัสดีคุณ <strong>${booking.client_name}</strong>,</p>
      <p>เราได้รับคำขอจองคิวถ่ายภาพของคุณเรียบร้อยแล้ว รายละเอียดการจองมีดังนี้:</p>
      <div style="background-color: #141414; padding: 15px; border-radius: 8px; border-left: 4px solid #d8b76c; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>📅 วันที่จ้างงาน:</strong> ${booking.event_date}</p>
        <p style="margin: 5px 0;"><strong>⏰ ช่วงเวลา:</strong> ${booking.event_time}</p>
        <p style="margin: 5px 0;"><strong>📍 รายละเอียด:</strong> ${booking.details || '-'}</p>
        <p style="margin: 5px 0;"><strong>⏳ สถานะ:</strong> <span style="color: #f59e0b; font-weight: bold;">รอตรวจสอบคิวงาน</span></p>
      </div>
      <p>ช่างภาพจะตรวจสอบตารางงานและติดต่อกลับเพื่อส่งใบจองคิวงานและช่องทางมัดจำโดยเร็วที่สุด</p>
      <hr style="border-color: #222;" />
      <p style="font-size: 12px; color: #666; text-align: center;">© 2026 ตีนแมวfoto. สงวนลิขสิทธิ์ทั้งหมด</p>
    </div>
  `;

  const targetEmail = booking.email && booking.email.includes("@") ? booking.email : booking.contact;
  return sendEmail({ to: targetEmail, subject, htmlText, plainText });
};

export const sendBookingApprovedEmail = async (booking, trackingCode) => {
  const subject = `[ตีนแมวfoto] คำขอจองคิวถ่ายภาพได้รับการอนุมัติแล้ว (โปรดชำระเงินมัดจำ)`;
  const plainText = `สวัสดีคุณ ${booking.client_name},

คำขอจองคิวถ่ายภาพในวันที่ ${booking.event_date} ได้รับการอนุมัติขั้นต้นแล้ว!

รหัสติดตามคิวงานและชำระเงินมัดจำของคุณคือ: ${trackingCode}
ยอดมัดจำที่ต้องชำระ: ฿${Number(booking.deposit || 0).toLocaleString()} บาท

กรุณานำรหัสติดตามนี้ไปกรอกที่แท็บ "ติดตามสถานะงาน" เพื่อสแกน QR Code ชำระมัดจำและยืนยันคิวงาน:
ลิงก์เว็บไซต์: ${PORTFOLIO_URL}/?page=track&code=${trackingCode}

ขอบคุณที่เลือกใช้บริการ ตีนแมวfoto ครับ!`;

  const htmlText = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #74d98a; border-radius: 12px; background-color: #0a0a0a; color: #ffffff;">
      <h2 style="color: #d8b76c; border-bottom: 1px solid #74d98a; padding-bottom: 10px;">ตีนแมวfoto</h2>
      <p>สวัสดีคุณ <strong>${booking.client_name}</strong>,</p>
      <p style="color: #74d98a; font-size: 16px; font-weight: bold;">🎉 ยินดีด้วย! คำขอจองคิวถ่ายภาพของคุณได้รับการอนุมัติขั้นต้นแล้ว</p>
      <p>โปรดชำระเงินมัดจำจำนวน <strong>฿${Number(booking.deposit || 0).toLocaleString()} บาท</strong> เพื่อยืนยันล็อคคิวงานถาวร</p>
      <div style="background-color: #141414; padding: 20px; border-radius: 8px; border-left: 4px solid #d8b76c; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #888;">รหัสติดตามคิวงานและชำระเงินมัดจำของคุณ</p>
        <h1 style="color: #d8b76c; letter-spacing: 4px; margin: 10px 0; font-size: 32px; font-family: monospace;">${trackingCode}</h1>
        <p style="margin: 0; font-size: 12px; color: #bbb;">(ใช้กรอกที่แท็บ "ติดตามสถานะงาน" บนเว็บไซต์เพื่อชำระเงินและดูความคืบหน้า)</p>
      </div>
      <p><a href="${PORTFOLIO_URL}/?page=track&code=${trackingCode}" style="display: inline-block; background-color: #d8b76c; color: #161006; font-weight: bold; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 10px;">ชำระมัดจำและยืนยันคิวงาน</a></p>
      <hr style="border-color: #222;" />
      <p style="font-size: 12px; color: #666; text-align: center;">© 2026 ตีนแมวfoto. สงวนลิขสิทธิ์ทั้งหมด</p>
    </div>
  `;

  return sendEmail({ to: (booking.email && booking.email.includes("@") ? booking.email : booking.contact), subject, htmlText, plainText });
};

// 3. Email template for Booking Request Rejected
export const sendBookingRejectedEmail = async (booking, reason = '') => {
  const subject = `[ตีนแมวfoto] แจ้งผลการพิจารณาคำขอจองคิวถ่ายภาพ`;
  const plainText = `สวัสดีคุณ ${booking.client_name},

เราได้พิจารณาคำขอจองคิวถ่ายภาพในวันที่ ${booking.event_date} ของคุณแล้ว
ขอแสดงความเสียใจด้วยครับ เนื่องจากในวันดังกล่าวช่างภาพไม่สามารถรับงานได้ในเวลานี้

เหตุผล/หมายเหตุเพิ่มเติม: ${reason || 'ช่างภาพติดภารกิจอื่น'}

ทางเราต้องขออภัยในความไม่สะดวกเป็นอย่างยิ่ง และหวังว่าจะได้มีโอกาสให้บริการคุณในครั้งต่อไปครับ`;

  const htmlText = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff6b6b; border-radius: 12px; background-color: #0a0a0a; color: #ffffff;">
      <h2 style="color: #d8b76c; border-bottom: 1px solid #ff6b6b; padding-bottom: 10px;">ตีนแมวfoto</h2>
      <p>สวัสดีคุณ <strong>${booking.client_name}</strong>,</p>
      <p>เราได้ตรวจสอบคำขอจองคิวถ่ายภาพในวันที่ <strong>${booking.event_date}</strong> เรียบร้อยแล้ว</p>
      <p style="color: #ff6b6b; font-weight: bold;">ขอแสดงความเสียใจด้วยครับ ทางช่างภาพไม่สามารถรับงานจองคิวในครั้งนี้ได้</p>
      <div style="background-color: #141414; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b6b; margin: 20px 0;">
        <p style="margin: 0;"><strong>💬 เหตุผลจากช่างภาพ:</strong> ${reason || 'คิวงานชนกับคิวงานแต่งงานอื่นที่ช่างภาพตกลงไว้ล่วงหน้า'}</p>
      </div>
      <p>ทางเราต้องขออภัยเป็นอย่างยิ่ง และหวังเป็นอย่างยิ่งว่าจะมีโอกาสให้บริการคุณในกิจกรรมถัดไป</p>
      <hr style="border-color: #222;" />
      <p style="font-size: 12px; color: #666; text-align: center;">© 2026 ตีนแมวfoto. สงวนลิขสิทธิ์ทั้งหมด</p>
    </div>
  `;

  return sendEmail({ to: (booking.email && booking.email.includes("@") ? booking.email : booking.contact), subject, htmlText, plainText });
};

// 4. Email template for Job Status Progress Update
export const sendJobStatusUpdateEmail = async (booking, trackingCode, status, downloadUrl = '') => {
  const getStatusLabelTH = (s) => {
    switch (s) {
      case 'briefed': return 'ได้รับข้อมูลบรีฟคิวแล้ว';
      case 'shooting': return 'ช่างภาพกำลังเริ่มถ่ายงาน';
      case 'editing': return 'ช่างภาพกำลังแต่งและทำสีรูปภาพ';
      case 'completed': return 'ส่งมอบงานสำเร็จเรียบร้อยแล้ว!';
      default: return s;
    }
  };

  const statusLabel = getStatusLabelTH(status);
  const subject = `[ตีนแมวfoto] อัปเดตความคืบหน้าคิวงานถ่ายภาพของคุณ: ${statusLabel}`;
  
  let plainText = `สวัสดีคุณ ${booking.client_name},

เราขอแจ้งอัปเดตความคืบหน้าล่าสุดสำหรับคิวงานถ่ายภาพของคุณ (รหัสคิว: ${trackingCode})
สถานะปัจจุบัน: **${statusLabel}**
`;

  if (status === 'completed') {
    plainText += `
ยินดีด้วยครับ! ภาพถ่ายคุณภาพสูงของคุณตกแต่งและปรับแต่งสีสันเสร็จเรียบร้อยแล้ว
คุณสามารถดาวน์โหลดรูปภาพทั้งหมดได้ที่แกลเลอรีนี้: ${downloadUrl || 'โปรดเข้าดูแกลเลอรีในหน้าหลัก'}
`;
  } else {
    plainText += `
คุณสามารถนำรหัส ${trackingCode} ไปใช้ตรวจสอบสถานะโดยละเอียดได้ตลอดเวลาทางหน้าแรกของพอร์ตโฟลิโอ ตีนแมวfoto
`;
  }

  plainText += `
ขอบคุณที่ไว้วางใจ ตีนแมวfoto ครับ!`;

  const htmlText = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #d8b76c; border-radius: 12px; background-color: #0a0a0a; color: #ffffff;">
      <h2 style="color: #d8b76c; border-bottom: 1px solid #d8b76c; padding-bottom: 10px;">ตีนแมวfoto</h2>
      <p>สวัสดีคุณ <strong>${booking.client_name}</strong>,</p>
      <p>ขอแจ้งอัปเดตความคืบหน้าล่าสุดของคิวงานจองถ่ายภาพของคุณ (รหัสติดตาม: <strong>${trackingCode}</strong>) ดังนี้:</p>
      
      <div style="background-color: #141414; padding: 20px; border-radius: 8px; border-left: 4px solid #d8b76c; margin: 20px 0; text-align: center;">
        <span style="font-size: 14px; color: #888;">สถานะปัจจุบัน</span>
        <h2 style="color: #d8b76c; margin: 5px 0;">${statusLabel}</h2>
      </div>

      ${status === 'completed' && downloadUrl ? `
        <div style="background-color: #122216; border: 1px solid #74d98a; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="color: #74d98a; font-weight: bold; margin-top: 0;">✨ รูปภาพของคุณตกแต่งเสร็จเรียบร้อยพร้อมส่งแล้วครับ!</p>
          <a href="${downloadUrl}" target="_blank" style="display: inline-block; background-color: #74d98a; color: #051608; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 10px 0;">ดาวน์โหลดรูปภาพทั้งหมด</a>
        </div>
      ` : `
        <p>คุณสามารถติดตามขั้นตอนการทำงานในสเต็ปถัดไปได้ทางหน้าหลักเว็บไซต์</p>
        <p><a href="${PORTFOLIO_URL}/?page=track&code=${trackingCode}" style="display: inline-block; background-color: #d8b76c; color: #161006; font-weight: bold; padding: 10px 20px; border-radius: 8px; text-decoration: none;">เปิดหน้าตรวจสอบคิวงาน</a></p>
      `}

      <hr style="border-color: #222;" />
      <p style="font-size: 12px; color: #666; text-align: center;">© 2026 ตีนแมวfoto. สงวนลิขสิทธิ์ทั้งหมด</p>
    </div>
  `;

  return sendEmail({ to: (booking.email && booking.email.includes("@") ? booking.email : booking.contact), subject, htmlText, plainText });
};
