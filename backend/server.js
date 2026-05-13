// College Library System Backend
// ------------------------------------------------------------
// This is the backend entry file. It connects MongoDB, loads
// Express routes, serves uploaded images, and opens the frontend.

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares: allow frontend requests and read JSON/form data.
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static folders: book covers and frontend website files.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes are separated by feature for clean backend structure.
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/books', require('./src/routes/bookRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/issues', require('./src/routes/issueRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));

// Health route helps confirm that backend is running.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'College Library System API is running' });
});

// Unknown API route response.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Browser fallback: direct refresh opens the frontend again.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Central backend error handler.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ College Library System running at http://localhost:${PORT}`);
});
