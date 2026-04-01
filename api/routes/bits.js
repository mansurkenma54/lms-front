const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/bits?studentId=xxx
router.get('/', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.query;
    const targetId = studentId || req.user.id;

    const userRows = await sql`SELECT bits_balance FROM users WHERE id = ${targetId}`;
    if (userRows.length === 0) return res.status(404).json({ error: 'Пайдаланушы табылмады' });

    const history = await sql`
      SELECT * FROM bits_history WHERE student_id = ${targetId}
      ORDER BY created_at DESC LIMIT 50
    `;
    return res.json({ balance: userRows[0].bits_balance, history });
  } catch (e) {
    console.error('Get bits error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/bits/earn
router.post('/earn', verifyToken, async (req, res) => {
  try {
    const { studentId, amount, reason } = req.body;
    const targetId = studentId || req.user.id;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Жарамсыз сома' });

    const updated = await sql`
      UPDATE users SET bits_balance = bits_balance + ${amount}
      WHERE id = ${targetId}
      RETURNING bits_balance
    `;
    if (updated.length === 0) return res.status(404).json({ error: 'Пайдаланушы табылмады' });

    await sql`
      INSERT INTO bits_history (student_id, transaction_type, amount, reason)
      VALUES (${targetId}, 'earn', ${amount}, ${reason || 'Табыс'})
    `;
    return res.json({ new_balance: updated[0].bits_balance });
  } catch (e) {
    console.error('Earn bits error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/bits/spend
router.post('/spend', verifyToken, async (req, res) => {
  try {
    const { studentId, amount, reason } = req.body;
    const targetId = studentId || req.user.id;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Жарамсыз сома' });

    // Check balance
    const userRows = await sql`SELECT bits_balance FROM users WHERE id = ${targetId}`;
    if (userRows.length === 0) return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    if (userRows[0].bits_balance < amount) {
      return res.status(400).json({ error: 'Жеткіліксіз бит' });
    }

    const updated = await sql`
      UPDATE users SET bits_balance = bits_balance - ${amount}
      WHERE id = ${targetId}
      RETURNING bits_balance
    `;
    await sql`
      INSERT INTO bits_history (student_id, transaction_type, amount, reason)
      VALUES (${targetId}, 'spend', ${amount}, ${reason || 'Шығын'})
    `;
    return res.json({ new_balance: updated[0].bits_balance });
  } catch (e) {
    console.error('Spend bits error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/bits/hint — buy a hint
router.post('/hint', verifyToken, async (req, res) => {
  try {
    const { studentId, problemId, hintType } = req.body;
    const targetId = studentId || req.user.id;
    const HINT_COSTS = { small: 10, big: 25, answer: 50 };
    const cost = HINT_COSTS[hintType];
    if (!cost) return res.status(400).json({ error: 'Жарамсыз кеңес түрі' });

    // Check if already bought
    const existing = await sql`
      SELECT id FROM hints_bought
      WHERE student_id = ${targetId} AND problem_id = ${problemId} AND hint_type = ${hintType}
    `;
    if (existing.length > 0) {
      return res.json({ already_bought: true });
    }

    // Check balance and deduct
    const userRows = await sql`SELECT bits_balance FROM users WHERE id = ${targetId}`;
    if (userRows.length === 0) return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    if (userRows[0].bits_balance < cost) {
      return res.status(400).json({ error: `Жеткіліксіз бит. Кеңес бағасы: ${cost} 💎` });
    }

    await sql`UPDATE users SET bits_balance = bits_balance - ${cost} WHERE id = ${targetId}`;
    await sql`
      INSERT INTO bits_history (student_id, transaction_type, amount, reason)
      VALUES (${targetId}, 'spend', ${cost}, ${`Кеңес: ${problemId} — ${hintType}`})
    `;
    await sql`
      INSERT INTO hints_bought (student_id, problem_id, hint_type)
      VALUES (${targetId}, ${problemId}, ${hintType})
    `;

    const newBal = await sql`SELECT bits_balance FROM users WHERE id = ${targetId}`;
    return res.json({ purchased: true, new_balance: newBal[0].bits_balance });
  } catch (e) {
    console.error('Buy hint error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/bits/hint?studentId=xxx&problemId=xxx&hintType=xxx
router.get('/hint', verifyToken, async (req, res) => {
  try {
    const { studentId, problemId, hintType } = req.query;
    const targetId = studentId || req.user.id;
    const rows = await sql`
      SELECT id FROM hints_bought
      WHERE student_id = ${targetId} AND problem_id = ${problemId} AND hint_type = ${hintType}
    `;
    return res.json({ bought: rows.length > 0 });
  } catch (e) {
    console.error('Check hint error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
