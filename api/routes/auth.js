const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimit');

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Логин және пароль міндетті' });
    }

    const rows = await sql`SELECT * FROM users WHERE username = ${username.trim()}`;
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Логин немесе пароль қате' });
    }
    const user = rows[0];

    if (user.banned) {
      return res.status(401).json({ error: `Аккаунтыңыз бандалды: ${user.ban_reason || 'Мұғалімге хабарласыңыз'}` });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Логин немесе пароль қате' });
    }

    // Check pending approval
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'PENDING', message: 'Аккаунтыңыз әлі бекітілмеген. Мұғалімді күтіңіз.' });
    }

    const payload = { id: user.id, username: user.username, role: user.role, display_name: user.display_name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await sql`
      INSERT INTO sessions (user_id, token, role, expires_at)
      VALUES (${user.id}, ${token}, ${user.role}, ${expiresAt})
    `;
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        bits_balance: user.bits_balance,
        banned: user.banned
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/auth/register
router.post('/register', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { username, password, display_name, role } = req.body;
    if (!username || !password || !display_name || !role) {
      return res.status(400).json({ error: 'Барлық өрістер міндетті' });
    }
    const validRoles = ['student', 'teacher', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Жарамсыз рөл' });
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${username.trim()}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Бұл логин бұрыннан бар' });
    }

    const hash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO users (username, password_hash, display_name, role, status)
      VALUES (${username.trim()}, ${hash}, ${display_name.trim()}, ${role}, 'active')
      RETURNING id, username, display_name, role, status, bits_balance, banned, created_at
    `;
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/auth/logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].slice(7);
    await sql`DELETE FROM sessions WHERE token = ${token}`;
    return res.json({ message: 'Сәтті шықтыңыз' });
  } catch (e) {
    console.error('Logout error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, username, display_name, role, bits_balance, banned, ban_reason,
             warnings_count, created_at, last_login, quote, avatar_url
      FROM users WHERE id = ${req.user.id}
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('Me error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Ескі және жаңа пароль міндетті' });
    }
    if (new_password.length < 4) {
      return res.status(400).json({ error: 'Жаңа пароль кем дегенде 4 таңба болуы керек' });
    }

    const rows = await sql`SELECT password_hash FROM users WHERE id = ${req.user.id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Пайдаланушы табылмады' });

    const valid = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Ескі пароль дұрыс емес' });

    const newHash = await bcrypt.hash(new_password, 12);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${req.user.id}`;
    // Invalidate all other sessions
    const token = req.headers['authorization'].slice(7);
    await sql`DELETE FROM sessions WHERE user_id = ${req.user.id} AND token != ${token}`;

    return res.json({ message: 'Пароль сәтті өзгерді' });
  } catch (e) {
    console.error('Change password error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/auth/self-register — Student registers themselves (pending until approved)
router.post('/self-register', async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'Барлық өрістер міндетті' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль кем дегенде 4 таңба' });
    }

    // Ensure status column exists
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`;

    const existing = await sql`SELECT id FROM users WHERE username = ${username.trim()}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Бұл логин бұрыннан бар' });
    }

    const hash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO users (username, password_hash, display_name, role, status)
      VALUES (${username.trim()}, ${hash}, ${display_name.trim()}, 'student', 'active')
      RETURNING id, username, display_name, role, status
    `;
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Self-register error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/auth/pending — Teacher/Admin sees pending users
router.get('/pending', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`;
    const rows = await sql`
      SELECT id, username, display_name, role, status, created_at
      FROM users WHERE status = 'pending' ORDER BY created_at DESC
    `;
    return res.json(rows);
  } catch (e) {
    console.error('Pending users error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/auth/approve/:id — Teacher/Admin approves a pending student
router.post('/approve/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`;
    await sql`UPDATE users SET status = 'active' WHERE id = ${req.params.id}`;
    return res.json({ approved: true });
  } catch (e) {
    console.error('Approve error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/auth/reject/:id — Teacher/Admin rejects (deletes) a pending student
router.post('/reject/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    await sql`DELETE FROM users WHERE id = ${req.params.id} AND status = 'pending'`;
    return res.json({ rejected: true });
  } catch (e) {
    console.error('Reject error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// PUT /api/auth/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { avatar_url, quote } = req.body;
    const rows = await sql`
      UPDATE users 
      SET avatar_url = COALESCE(${avatar_url || null}, avatar_url),
          quote = COALESCE(${quote || null}, quote)
      WHERE id = ${req.user.id}
      RETURNING id, avatar_url, quote
    `;
    return res.json(rows[0]);
  } catch (e) {
    console.error('Profile update error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
