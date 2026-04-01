const router = require('express').Router();
const { sql } = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/submissions/stats?assignmentId=xxx
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { assignmentId } = req.query;
    if (!assignmentId) return res.status(400).json({ error: 'assignmentId қажет' });
    const rows = await sql`
      SELECT
        COUNT(DISTINCT student_id)::int AS submitted_count,
        ROUND(AVG(score),1)             AS avg_score,
        MAX(score)::int                 AS max_score,
        COUNT(*)::int                   AS total_submissions
      FROM submissions WHERE assignment_id = ${assignmentId}
    `;
    res.json(rows[0] || { submitted_count:0, avg_score:0, max_score:0, total_submissions:0 });
  } catch(e) {
    console.error('Stats error:', e);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/submissions
router.get('/', verifyToken, async (req, res) => {
  try {
    const { studentId, assignmentId, courseId, acmpProblemId } = req.query;
    let rows;
    if (assignmentId) {
      rows = await sql`SELECT * FROM submissions WHERE assignment_id=${assignmentId} ORDER BY submitted_at DESC`;
    } else if (acmpProblemId) {
      rows = await sql`SELECT * FROM submissions WHERE acmp_problem_id=${parseInt(acmpProblemId)} ORDER BY submitted_at DESC`;
    } else if (studentId && courseId) {
      rows = await sql`SELECT * FROM submissions WHERE student_id=${studentId} AND course_id=${courseId} ORDER BY submitted_at DESC`;
    } else if (studentId) {
      rows = await sql`SELECT * FROM submissions WHERE student_id=${studentId} ORDER BY submitted_at DESC`;
    } else if (courseId) {
      rows = await sql`SELECT * FROM submissions WHERE course_id=${courseId} ORDER BY submitted_at DESC`;
    } else {
      rows = await sql`SELECT * FROM submissions ORDER BY submitted_at DESC LIMIT 200`;
    }
    res.json(rows);
  } catch(e) {
    console.error('Get submissions error:', e);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/submissions — FIXED: assignment_id and course_id are optional
router.post('/', verifyToken, async (req, res) => {
  try {
    const { assignment_id, course_id, code, score, passed_tests, total_tests, acmp_problem_id } = req.body;
    const rows = await sql`
      INSERT INTO submissions
        (student_id, student_name, assignment_id, course_id, code, score, passed_tests, total_tests, acmp_problem_id)
      VALUES
        (${req.user.id}, ${req.user.display_name},
         ${assignment_id || null}, ${course_id || null},
         ${code || ''}, ${score || 0}, ${passed_tests || 0}, ${total_tests || 5},
         ${acmp_problem_id ? parseInt(acmp_problem_id) : null})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch(e) {
    console.error('Create submission error:', e);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// PUT /api/submissions/:id — Manual Grading
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { score } = req.body;
    const passed = score > 0 ? 1 : 0;
    const rows = await sql`
      UPDATE submissions
      SET score = ${score}, passed_tests = ${passed}
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Табылмады' });
    res.json(rows[0]);
  } catch(e) {
    console.error('Update submission error:', e);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
