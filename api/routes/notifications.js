const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM notifications WHERE user_id = ${req.user.id} ORDER BY created_at DESC LIMIT 50`;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/notifications
router.post('/', verifyToken, async (req, res) => {
  try {
    const { user_id, message, type, link } = req.body;
    const rows = await sql`
      INSERT INTO notifications (user_id, message, type, link)
      VALUES (${user_id}, ${message}, ${type || 'info'}, ${link || null})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const rows = await sql`UPDATE notifications SET is_read = TRUE WHERE id = ${req.params.id} AND user_id = ${req.user.id} RETURNING *`;
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
