const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/comments?courseId=xx
router.get('/', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId міндетті' });
    const rows = await sql`
      SELECT c.*, u.display_name, u.role
      FROM course_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.course_id = ${courseId}
      ORDER BY c.created_at ASC
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/comments
router.post('/', verifyToken, async (req, res) => {
  try {
    const { course_id, message } = req.body;
    if (!course_id || !message) return res.status(400).json({ error: 'course_id және message міндетті' });
    const rows = await sql`
      INSERT INTO course_comments (course_id, user_id, message)
      VALUES (${course_id}, ${req.user.id}, ${message})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await sql`DELETE FROM course_comments WHERE id = ${req.params.id} AND user_id = ${req.user.id}`;
    res.json({ message: 'Пікір жойылды' });
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
