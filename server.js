/**
 * MINIMAL TEST SERVER - Debugging why Express won't respond
 */

require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Single test route
app.get('/', (req, res) => {
  res.json({ message: '✅ EXPRESS IS WORKING!', port: PORT });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/test-simple', (req, res) => {
  res.json({
    message: 'Backend is responding!',
    environment: process.env.NODE_ENV,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ MINIMAL SERVER STARTED ON PORT ${PORT}`);
  console.log(`Test at: http://localhost:${PORT}`);
});

module.exports = app;
