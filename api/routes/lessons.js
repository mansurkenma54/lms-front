const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/lessons?courseId=xx
router.get('/', async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId міндетті' });
    const rows = await sql`SELECT * FROM lessons WHERE course_id = ${courseId} ORDER BY order_index ASC, created_at ASC`;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/lessons/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM lessons WHERE id = ${req.params.id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Сабақ табылмады' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/lessons
router.post('/', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { course_id, title, description, active_date, start_time, end_time, order_index } = req.body;
    if (!course_id || !title) return res.status(400).json({ error: 'course_id және title міндетті' });
    
    const rows = await sql`
      INSERT INTO lessons (course_id, title, description, active_date, start_time, end_time, order_index)
      VALUES (${course_id}, ${title}, ${description || null}, ${active_date || null}, ${start_time || null}, ${end_time || null}, ${order_index || 0})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// PUT /api/lessons/:id
router.put('/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { title, description, active_date, start_time, end_time, order_index } = req.body;
    const rows = await sql`
      UPDATE lessons SET
        title = COALESCE(${title || null}, title),
        description = COALESCE(${description || null}, description),
        active_date = COALESCE(${active_date || null}, active_date),
        start_time = COALESCE(${start_time || null}, start_time),
        end_time = COALESCE(${end_time || null}, end_time),
        order_index = COALESCE(${order_index != null ? order_index : null}, order_index)
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Сабақ табылмады' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// DELETE /api/lessons/:id
router.delete('/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    await sql`DELETE FROM lessons WHERE id = ${req.params.id}`;
    res.json({ message: 'Сабақ жойылды' });
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/lessons/:id/materials
router.get('/:id/materials', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM lesson_materials WHERE lesson_id = ${req.params.id} ORDER BY created_at ASC`;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/lessons/:id/materials
router.post('/:id/materials', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { material_type, url, title } = req.body;
    if (!material_type || !url) return res.status(400).json({ error: 'material_type және url міндетті' });
    const rows = await sql`
      INSERT INTO lesson_materials (lesson_id, material_type, url, title)
      VALUES (${req.params.id}, ${material_type}, ${url}, ${title || null})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// DELETE /api/lessons/materials/:materialId
router.delete('/materials/:materialId', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    await sql`DELETE FROM lesson_materials WHERE id = ${req.params.materialId}`;
    res.json({ message: 'Материал жойылды' });
  } catch (e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
