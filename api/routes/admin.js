const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/admin/stats — public (for index.html stats section)
router.get('/stats', async (req, res) => {
  try {
    const rows = await sql`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student')::int  AS students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher')::int  AS teachers,
        (SELECT COUNT(*) FROM courses)::int                       AS courses,
        (SELECT COUNT(*) FROM assignments)::int                   AS assignments,
        (SELECT COUNT(*) FROM submissions)::int                   AS submissions
    `;
    return res.json(rows[0]);
  } catch (e) {
    console.error('Admin stats error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/admin/users
router.get('/users', verifyToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, username, display_name, role, bits_balance,
             banned, ban_reason, warnings_count, created_at, last_login
      FROM users
      ORDER BY role, display_name
    `;
    return res.json(rows);
  } catch (e) {
    console.error('Get users error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/admin/users — create user
router.post('/users', verifyToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { username, password, display_name, role } = req.body;
    if (!username || !password || !display_name || !role) {
      return res.status(400).json({ error: 'Барлық өрістер міндетті' });
    }
    const validRoles = ['student', 'teacher', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Жарамсыз рөл' });
    }
    // Only admin can create teacher/admin accounts
    if (['teacher', 'admin'].includes(role) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Тек admin мұғалім/admin жасай алады' });
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${username.trim()}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Бұл логин бұрыннан бар' });
    }

    const hash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES (${username.trim()}, ${hash}, ${display_name.trim()}, ${role})
      RETURNING id, username, display_name, role, bits_balance, banned, created_at
    `;
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create user error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Өзіңізді жоя алмайсыз' });
    }
    await sql`DELETE FROM users WHERE id = ${req.params.id}`;
    return res.json({ message: 'Пайдаланушы жойылды' });
  } catch (e) {
    console.error('Delete user error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/admin/reset — system reset
router.post('/reset', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    await sql`DELETE FROM sessions`;
    await sql`DELETE FROM bits_history`;
    await sql`DELETE FROM hints_bought`;
    await sql`DELETE FROM violations`;
    await sql`DELETE FROM submissions`;
    await sql`DELETE FROM messages`;
    await sql`DELETE FROM course_enrollments`;
    await sql`UPDATE users SET bits_balance = 100, banned = false, ban_reason = null, warnings_count = 0`;
    return res.json({ message: 'Жүйе тазаланды' });
  } catch (e) {
    console.error('Reset error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
