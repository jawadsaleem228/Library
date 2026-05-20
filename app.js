const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Library app running");
});

// Static folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/books', require('./src/routes/bookRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/issues', require('./src/routes/issueRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));

// Health route
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'College Library System API is running'
  });
});

// Unknown API route
app.use('/api', (req, res) => {
  res.status(404).json({
    message: 'API route not found'
  });
});

// Frontend route
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(errorHandler);

module.exports = app;