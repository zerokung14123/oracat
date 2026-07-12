import express from 'express';
import { login, changePassword } from '../controllers/authController.js';
import { getPublicPhotos, getAllPhotos, addPhoto, updatePhoto, deletePhoto } from '../controllers/photoController.js';
import { createBooking, getAllBookings, adminCreateBooking, updateBooking, deleteBooking, getPublicBookingDates, verifySlip } from '../controllers/bookingController.js';
import { getJobByTrackingCode, getAllJobs, updateJob, getClientJobsByEmail } from '../controllers/jobController.js';
import { getPublicPortfolio, getSettings, updateSettings } from '../controllers/settingsController.js';
import { authMiddleware } from '../middleware/auth.js';
import { verifyGoogleToken } from '../controllers/googleAuthController.js';
import { getGoogleCalendarAuthUrl, handleGoogleCalendarCallback, getCalendarConnectionStatus, disconnectCalendar, exchangeAuthCode, triggerManualSync } from '../controllers/googleCalendarController.js';

const router = express.Router();

// --- PUBLIC ROUTES ---
router.post('/auth/login', login);
router.post('/auth/google', verifyGoogleToken); // Google OAuth token verification

// Portfolio setup (photos + settings)
router.get('/public/portfolio', getPublicPortfolio);
router.get('/public/photos', getPublicPhotos);

// Booking submission & availability checks
router.post('/public/bookings', createBooking);
router.get('/public/bookings', getPublicBookingDates);
router.post('/public/bookings/:id/verify-slip', verifySlip);

// Job tracking search
router.get('/public/track/:code', getJobByTrackingCode);
router.get('/public/client-jobs', getClientJobsByEmail);

// Google Calendar OAuth Callback (Public Redirect)
router.get('/auth/google/calendar/callback', handleGoogleCalendarCallback);


// --- PROTECTED ROUTES (Requires Authentication) ---
// Photos management
router.get('/photos', authMiddleware, getAllPhotos);
router.post('/photos', authMiddleware, addPhoto);
router.patch('/photos/:id', authMiddleware, updatePhoto);
router.delete('/photos/:id', authMiddleware, deletePhoto);

// Bookings management
router.get('/bookings', authMiddleware, getAllBookings);
router.post('/bookings', authMiddleware, adminCreateBooking);
router.put('/bookings/:id', authMiddleware, updateBooking);
router.patch('/bookings/:id', authMiddleware, updateBooking);
router.delete('/bookings/:id', authMiddleware, deleteBooking);

// Jobs tracking management
router.get('/jobs', authMiddleware, getAllJobs);
router.patch('/jobs/:id', authMiddleware, updateJob);

// Settings management
router.get('/settings', authMiddleware, getSettings);
router.put('/settings', authMiddleware, updateSettings);

// Auth management
router.post('/auth/change-password', authMiddleware, changePassword);

// Google Calendar Management
router.get('/auth/google/calendar/auth-url', authMiddleware, getGoogleCalendarAuthUrl);
router.get('/auth/google/calendar/status', authMiddleware, getCalendarConnectionStatus);
router.post('/auth/google/calendar/disconnect', authMiddleware, disconnectCalendar);
router.post('/auth/google/calendar/exchange-code', authMiddleware, exchangeAuthCode);
router.post('/auth/google/calendar/sync', authMiddleware, triggerManualSync);

export default router;
