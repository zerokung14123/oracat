import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import './config/db.js'; // Initialize database and connection log

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for simplicity in decoupled mode
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static assets from public folder
app.use('/public', express.static(path.resolve(__dirname, '../public')));

// Use high payload limit for base64-encoded image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routing API
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Photographer Portfolio Backend is running!      `);
  console.log(`  PORT: ${PORT}                                   `);
  console.log(`  API Base URL: http://localhost:${PORT}/api      `);
  console.log(`==================================================`);
});

export default app;
