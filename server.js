/**
 * Bell Ventures Task Manager - Hybrid Backend
 * Node.js Express Server + Supabase PostgreSQL Database
 *
 * This server acts as a proxy between the frontend (CC's beautiful UI)
 * and Supabase, bypassing SiteGround WAF issues.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware
// ============================================================

// Security
app.use(helmet());

// CORS - Allow frontend to call backend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://bellventuresltd.co.uk',
    process.env.APP_URL
  ].filter(Boolean),
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================
// Static Files (Serve CC's beautiful UI)
// ============================================================

app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// API Routes
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Task routes (all protected)
app.use('/api/tasks', taskRoutes);

// ============================================================
// Error Handling
// ============================================================

// 404 handler
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    // Serve frontend for non-API routes
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
  } else {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// ============================================================
// Server Startup
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Bell Ventures Task Manager            ║
║  Hybrid Backend (Supabase Connected)   ║
╚════════════════════════════════════════╝

✓ Server running on http://localhost:${PORT}
✓ Environment: ${process.env.NODE_ENV || 'development'}
✓ Database: Supabase (${process.env.SUPABASE_URL || 'not configured'})

📋 URLs:
  • Login:     http://localhost:${PORT}/login.html
  • Dashboard: http://localhost:${PORT}/dashboard.html
  • API Health: http://localhost:${PORT}/health

⚙️  Configuration:
  • JWT Expiry: ${process.env.JWT_EXPIRE || '7 days'}
  • CORS Origins: ${process.env.APP_URL || 'localhost'}
  • Twilio: ${process.env.TWILIO_ACCOUNT_SID ? '✓ Configured' : '✗ Not configured'}

Frontend calls backend at: /api/*
Backend proxies to Supabase at: ${process.env.SUPABASE_URL}

Press Ctrl+C to stop the server
  `);
});

module.exports = app;
