const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/messages?toId=xxx
router.get('/', verifyToken, async (req, res) => {
  try {
    const { toId } = req.query;
    const userId = req.user.id;
    let rows;
    if (toId) {
      // Messages sent TO this user or to 'all'
      rows = await sql`
        SELECT * FROM messages
        WHERE to_id = ${toId} OR to_id = 'all'
        ORDER BY created_at DESC
        LIMIT 100
      `;
    } else {
      // Messages for this user or for all
      rows = await sql`
        SELECT * FROM messages
        WHERE to_id = ${userId} OR to_id = 'all'
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }
    return res.json(rows);
  } catch (e) {
    console.error('Get messages error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/messages
router.post('/', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { to_id, message } = req.body;
    if (!to_id || !message) {
      return res.status(400).json({ error: 'to_id және message міндетті' });
    }
    const rows = await sql`
      INSERT INTO messages (from_id, from_name, to_id, message)
      VALUES (${req.user.id}, ${req.user.display_name}, ${to_id}, ${message})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Send message error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// PUT /api/messages/:id — mark as read
router.put('/:id', verifyToken, async (req, res) => {
  try {
    await sql`UPDATE messages SET is_read = true WHERE id = ${req.params.id}`;
    return res.json({ message: 'Оқылды' });
  } catch (e) {
    console.error('Mark read error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
