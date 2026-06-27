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

// TEST ROUTE: Temporary login form to verify backend works
app.get('/test-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bell Ventures - Test Login</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 400px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #333; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: bold; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        .demo-creds { background: #e7f3ff; padding: 15px; border-radius: 4px; margin-top: 20px; font-size: 14px; }
        .success { color: green; margin-top: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Bell Ventures</h1>
        <h2>Test Login (API Test)</h2>
        <form id="loginForm">
          <div class="form-group">
            <label>Email:</label>
            <input type="email" id="email" value="demo@bell-ventures.com" required>
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input type="password" id="password" value="demo123" required>
          </div>
          <button type="submit">Sign In</button>
        </form>
        <div class="demo-creds">
          <strong>Demo Credentials:</strong><br>
          Email: demo@bell-ventures.com<br>
          Password: demo123
        </div>
        <div id="response"></div>
      </div>

      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          const responseDiv = document.getElementById('response');

          try {
            responseDiv.innerHTML = '<p>Logging in...</p>';
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
              responseDiv.innerHTML = '<div class="success">✅ Login successful! Token received: ' + data.token.substring(0, 20) + '...</div>';
              localStorage.setItem('authToken', data.token);
            } else {
              responseDiv.innerHTML = '<div class="success" style="color: red;">❌ Login failed: ' + data.message + '</div>';
            }
          } catch (error) {
            responseDiv.innerHTML = '<div class="success" style="color: red;">❌ Error: ' + error.message + '</div>';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// TEST ROUTE: API test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: '✅ Backend API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase_connected: !!process.env.SUPABASE_URL,
    public_folder_path: path.join(__dirname, 'public')
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

// DEBUG: Log env vars on startup
console.log('DEBUG - Environment Variables Loaded:');
console.log('  PORT:', process.env.PORT || '(not set)');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ SET' : '❌ MISSING');
console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ SET' : '❌ MISSING');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓ SET' : '❌ MISSING');
console.log('  NODE_ENV:', process.env.NODE_ENV || '(not set)');

// DEBUG: Verify static files path
const publicPath = path.join(__dirname, 'public');
console.log('  Static files path:', publicPath);
console.log('  Public folder exists:', require('fs').existsSync(publicPath));

module.exports = app;
