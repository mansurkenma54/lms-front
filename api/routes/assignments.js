const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/assignments?courseId=xxx&lessonId=xxx — public
router.get('/', async (req, res) => {
  try {
    const { courseId, lessonId } = req.query;
    let rows = [];
    if (lessonId) {
      rows = await sql`
        SELECT * FROM assignments
        WHERE lesson_id = ${lessonId}
        ORDER BY order_index ASC, created_at ASC
      `;
    } else if (courseId) {
      rows = await sql`
        SELECT * FROM assignments
        WHERE course_id = ${courseId}
        ORDER BY order_index ASC, created_at ASC
      `;
    } else {
      return res.status(400).json({ error: 'courseId немесе lessonId міндетті' });
    }
    return res.json(rows);
  } catch (e) {
    console.error('Get assignments error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/assignments/:id — public
router.get('/:id', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM assignments WHERE id = ${req.params.id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Тапсырма табылмады' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('Get assignment error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/assignments
router.post('/', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const {
      course_id, lesson_id, title, assignment_type, text_explanation, visual_explanation,
      input_format, output_format, test_cases,
      hint_small, hint_big, deadline, time_limit, order_index
    } = req.body;
    if (!course_id || !title) {
      return res.status(400).json({ error: 'course_id және title міндетті' });
    }
    const rows = await sql`
      INSERT INTO assignments
        (course_id, lesson_id, title, assignment_type, text_explanation, visual_explanation,
         input_format, output_format, test_cases,
         hint_small, hint_big, deadline, time_limit, order_index)
      VALUES
        (${course_id}, ${lesson_id || null}, ${title}, ${assignment_type || 'code'},
         ${text_explanation || null}, ${visual_explanation || null},
         ${input_format || null}, ${output_format || null},
         ${JSON.stringify(test_cases || [])},
         ${hint_small || null}, ${hint_big || null},
         ${deadline || null}, ${time_limit ? parseInt(time_limit) : null}, ${order_index || 0})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create assignment error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// PUT /api/assignments/:id
router.put('/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const {
      lesson_id, title, assignment_type, text_explanation, visual_explanation,
      input_format, output_format, test_cases,
      hint_small, hint_big, deadline, time_limit, order_index
    } = req.body;
    const rows = await sql`
      UPDATE assignments SET
        lesson_id          = COALESCE(${lesson_id || null}, lesson_id),
        title              = COALESCE(${title || null}, title),
        assignment_type    = COALESCE(${assignment_type || null}, assignment_type),
        text_explanation   = COALESCE(${text_explanation || null}, text_explanation),
        visual_explanation = COALESCE(${visual_explanation || null}, visual_explanation),
        input_format       = COALESCE(${input_format || null}, input_format),
        output_format      = COALESCE(${output_format || null}, output_format),
        test_cases         = COALESCE(${test_cases ? JSON.stringify(test_cases) : null}::jsonb, test_cases),
        hint_small         = COALESCE(${hint_small || null}, hint_small),
        hint_big           = COALESCE(${hint_big || null}, hint_big),
        deadline           = COALESCE(${deadline || null}, deadline),
        time_limit         = COALESCE(${time_limit ? parseInt(time_limit) : null}, time_limit),
        order_index        = COALESCE(${order_index != null ? order_index : null}, order_index)
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Тапсырма табылмады' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('Update assignment error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    await sql`DELETE FROM assignments WHERE id = ${req.params.id}`;
    return res.json({ message: 'Тапсырма жойылды' });
  } catch (e) {
    console.error('Delete assignment error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
