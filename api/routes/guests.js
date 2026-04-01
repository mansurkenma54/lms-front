const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');

// Ensure table exists (runs once on first request)
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS guest_scores (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      guest_name  VARCHAR(100) NOT NULL UNIQUE,
      score       INTEGER      NOT NULL DEFAULT 0,
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `;
}

// GET /api/guests/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    await ensureTable();
    const guests = await sql`
      SELECT guest_name, score, updated_at
      FROM guest_scores
      ORDER BY score DESC, updated_at ASC
      LIMIT 100
    `;
    res.json(guests);
  } catch (err) {
    console.error('Error fetching guest leaderboard:', err);
    res.status(500).json({ error: 'Базадан оқу қатесі: ' + err.message });
  }
});

// POST /api/guests/score
router.post('/score', async (req, res) => {
  const { guest_name, points } = req.body;

  if (!guest_name || guest_name.trim() === '') {
    return res.status(400).json({ error: 'Атыңызды жіберіңіз' });
  }
  if (points === undefined || points === null) {
    return res.status(400).json({ error: 'Ұпайды жіберіңіз' });
  }

  const name = guest_name.trim();
  const pts  = parseInt(points, 10) || 0;

  try {
    await ensureTable();
    const result = await sql`
      INSERT INTO guest_scores (guest_name, score, updated_at)
      VALUES (${name}, ${pts}, NOW())
      ON CONFLICT (guest_name)
      DO UPDATE SET
        score      = guest_scores.score + EXCLUDED.score,
        updated_at = NOW()
      RETURNING *
    `;
    res.json({ message: 'Сәтті сақталды', guest: result[0] });
  } catch (err) {
    console.error('Error updating guest score:', err);
    res.status(500).json({ error: 'Сақтау кезінде қате: ' + err.message });
  }
});

module.exports = router;
