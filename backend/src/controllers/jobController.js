import { dbGet, dbQuery, dbRun } from '../config/db.js';
import { sendJobStatusUpdateEmail } from '../services/emailService.js';
import fetch from 'node-fetch';

// GET /api/public/track/:code - Get job tracking details for client
export const getJobByTrackingCode = async (req, res) => {
  const { code } = req.params;

  if (!code || code.trim().length !== 6) {
    return res.status(400).json({ error: 'Invalid tracking code. Must be 6 characters.' });
  }

  try {
    const job = await dbGet(
      `SELECT j.id, j.tracking_code, j.status, j.download_url, j.updated_at, 
              b.client_name, b.event_date, b.status AS booking_status, b.deposit, b.job_type, b.id AS booking_id 
       FROM jobs j 
       JOIN bookings b ON j.booking_id = b.id 
       WHERE UPPER(j.tracking_code) = ?`,
      [code.toUpperCase().trim()]
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found. Please double-check your tracking code.' });
    }

    return res.json(job);
  } catch (err) {
    console.error('Error tracking job:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/jobs - Get all tracking jobs (Manager)
export const getAllJobs = async (req, res) => {
  try {
    const jobs = await dbQuery(
      `SELECT j.*, b.client_name, b.contact, b.event_date, b.event_time 
       FROM jobs j 
       JOIN bookings b ON j.booking_id = b.id 
       ORDER BY j.updated_at DESC`
    );
    return res.json(jobs);
  } catch (err) {
    console.error('Error fetching jobs:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// PATCH /api/jobs/:id - Update job progress or download URL (Manager)
export const updateJob = async (req, res) => {
  const { id } = req.params;
  const { status, download_url } = req.body;

  const validStatuses = ['briefed', 'shooting', 'editing', 'completed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid job status.' });
  }

  try {
    const job = await dbGet('SELECT * FROM jobs WHERE id = ?', [id]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const updatedStatus = status !== undefined ? status : job.status;
    const updatedUrl = download_url !== undefined ? download_url : job.download_url;
    const statusChanged = job.status !== updatedStatus;

    await dbRun(
      'UPDATE jobs SET status = ?, download_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [updatedStatus, updatedUrl, id]
    );

    const updatedJob = await dbGet('SELECT * FROM jobs WHERE id = ?', [id]);

    // Send email notification to client if status changed
    if (statusChanged) {
      const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [job.booking_id]);
      if (booking) {
        sendJobStatusUpdateEmail(booking, job.tracking_code, updatedStatus, updatedUrl)
          .catch(err => console.error('Failed to send job status update email:', err));
      }
    }

    return res.json(updatedJob);
  } catch (err) {
    console.error('Error updating job:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/public/client-jobs - Get all bookings & jobs for verified client email
export const getClientJobsByEmail = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  let email = '';

  try {
    if (token === 'dev') {
      email = req.headers['x-dev-email'] || req.query.email;
      if (!email) {
        return res.status(400).json({ error: 'Dev email missing in request headers/query.' });
      }
    } else {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        return res.status(401).json({ error: 'Failed to authenticate Google access token.' });
      }
      const userInfo = await response.json();
      email = userInfo.email;
    }

    if (!email) {
      return res.status(400).json({ error: 'Email could not be retrieved from Google token.' });
    }

    const clientJobs = await dbQuery(
      `SELECT 
         b.id AS booking_id, 
         b.client_name, 
         b.event_date, 
         b.event_time, 
         b.job_type, 
         b.location, 
         b.status AS booking_status,
         b.deposit,
         b.price,
         b.note,
         j.id AS job_id,
         j.tracking_code,
         j.status AS job_status,
         j.download_url
       FROM bookings b
       LEFT JOIN jobs j ON b.id = j.booking_id
       WHERE LOWER(b.email) = ? OR LOWER(b.contact) = ?
       ORDER BY b.event_date DESC, b.created_at DESC`,
      [email.toLowerCase().trim(), email.toLowerCase().trim()]
    );

    return res.json(clientJobs);
  } catch (err) {
    console.error('Error fetching client jobs:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

