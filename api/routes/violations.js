const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/violations?studentId=xxx
router.get('/', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ error: 'studentId міндетті' });
    const rows = await sql`
      SELECT * FROM violations WHERE student_id = ${studentId}
      ORDER BY created_at DESC
    `;
    return res.json(rows);
  } catch (e) {
    console.error('Get violations error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/violations — log a violation
router.post('/', verifyToken, async (req, res) => {
  try {
    const { student_id, assignment_id, violation_type } = req.body;
    const targetId = student_id || req.user.id;

    await sql`
      INSERT INTO violations (student_id, assignment_id, violation_type)
      VALUES (${targetId}, ${assignment_id || null}, ${violation_type})
    `;

    // Increment warnings
    const updated = await sql`
      UPDATE users SET warnings_count = warnings_count + 1
      WHERE id = ${targetId}
      RETURNING warnings_count, banned
    `;
    const { warnings_count, banned } = updated[0];
    let auto_banned = false;

    // Auto-ban at 3 warnings
    if (warnings_count >= 3 && !banned) {
      await sql`
        UPDATE users SET banned = true, ban_reason = 'Автоматты бан: 3 ескерту алды'
        WHERE id = ${targetId}
      `;
      auto_banned = true;
    }

    return res.json({ logged: true, warnings_count, auto_banned });
  } catch (e) {
    console.error('Log violation error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/violations/ban
router.post('/ban', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { studentId, banReason } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId міндетті' });
    await sql`
      UPDATE users SET banned = true, ban_reason = ${banReason || 'Мұғалім бандады'}
      WHERE id = ${studentId}
    `;
    // Delete sessions for banned user
    await sql`DELETE FROM sessions WHERE user_id = ${studentId}`;
    return res.json({ message: 'Пайдаланушы бандалды' });
  } catch (e) {
    console.error('Ban error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/violations/unban
router.post('/unban', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId міндетті' });
    await sql`
      UPDATE users SET banned = false, ban_reason = null, warnings_count = 0
      WHERE id = ${studentId}
    `;
    return res.json({ message: 'Пайдаланушы бандан шығарылды' });
  } catch (e) {
    console.error('Unban error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
