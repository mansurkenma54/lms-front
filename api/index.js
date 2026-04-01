require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow any origin for testing, including 'null' (file:///)
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/courses',       require('./routes/courses'));
app.use('/api/lessons',       require('./routes/lessons'));
app.use('/api/assignments',   require('./routes/assignments'));
app.use('/api/submissions',   require('./routes/submissions'));
app.use('/api/violations',    require('./routes/violations'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bits',          require('./routes/bits'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/leaderboard',   require('./routes/leaderboard'));
app.use('/api/battles',       require('./routes/battles'));
app.use('/api/guests',        require('./routes/guests'));

// Health check
app.get('/api/health', async (req, res) => {
  const { sql } = require('./db/pool');
  try {
    await sql`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', has_db_url: !!process.env.DATABASE_URL, version: '1.0.3', time: new Date() });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected', has_db_url: !!process.env.DATABASE_URL, error: e.message });
  }
});

// Diagnostic ping
app.get('/api/ping', (req, res) => {
  res.json({ status: 'pong', timestamp: new Date(), version: '1.0.1' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут табылмады' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Сервер қатесі' });
});

const PORT = process.env.PORT || 3001;

// Vercel Serverless немесе локальді қосу
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Сервер ${PORT} портта іске қосылды`);
  });
}

module.exports = app;
