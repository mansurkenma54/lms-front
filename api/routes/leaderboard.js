const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');

// GET /api/leaderboard/score — top students by total score
router.get('/score', async (req, res) => {
  try {
    const rows = await sql`
      SELECT
        u.id, u.display_name, u.username,
        COALESCE(SUM(s.score), 0)::int             AS total_score,
        COUNT(DISTINCT s.assignment_id)::int         AS solved_count,
        COUNT(DISTINCT s.course_id)::int             AS courses_count
      FROM users u
      LEFT JOIN submissions s ON u.id = s.student_id
      WHERE u.role = 'student' AND u.banned = false
      GROUP BY u.id, u.display_name, u.username
      ORDER BY total_score DESC, solved_count DESC
      LIMIT 50
    `;
    return res.json(rows);
  } catch (e) {
    console.error('Leaderboard score error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/leaderboard/bits — top by bits balance
router.get('/bits', async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, display_name, username, bits_balance
      FROM users
      WHERE role = 'student' AND banned = false
      ORDER BY bits_balance DESC
      LIMIT 50
    `;
    return res.json(rows);
  } catch (e) {
    console.error('Leaderboard bits error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/leaderboard/speed — top by fastest submissions (100% score)
router.get('/speed', async (req, res) => {
  try {
    const rows = await sql`
      SELECT
        u.id, u.display_name, u.username,
        COUNT(DISTINCT s.assignment_id)::int AS perfect_count,
        MIN(s.submitted_at)                  AS first_submission
      FROM users u
      INNER JOIN submissions s ON u.id = s.student_id AND s.score = 100
      WHERE u.role = 'student' AND u.banned = false
      GROUP BY u.id, u.display_name, u.username
      ORDER BY perfect_count DESC, first_submission ASC
      LIMIT 50
    `;
    return res.json(rows);
  } catch (e) {
    console.error('Leaderboard speed error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
