const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/courses — public
router.get('/', async (req, res) => {
  try {
    const courses = await sql`
      SELECT c.*, COUNT(ce.student_id)::int AS enrolled_count
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return res.json(courses);
  } catch (e) {
    console.error('Get courses error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/courses/student/:studentId
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const courses = await sql`
      SELECT c.*, COUNT(ce2.student_id)::int AS enrolled_count
      FROM courses c
      INNER JOIN course_enrollments ce ON c.id = ce.course_id AND ce.student_id = ${studentId}
      LEFT JOIN course_enrollments ce2 ON c.id = ce2.course_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return res.json(courses);
  } catch (e) {
    console.error('Get student courses error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/courses/:id — public
router.get('/:id', async (req, res) => {
  try {
    const rows = await sql`
      SELECT c.*, COUNT(ce.student_id)::int AS enrolled_count
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE c.id = ${req.params.id}
      GROUP BY c.id
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Курс табылмады' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('Get course error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/courses
router.post('/', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { title, description, subject, schedule_info, cover_image, teacher_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Курс атауы міндетті' });

    // Admin can create course for another teacher
    const actualTeacherId = (req.user.role === 'admin' && teacher_id) ? teacher_id : req.user.id;
    const teacherRows = await sql`SELECT display_name FROM users WHERE id = ${actualTeacherId}`;
    const teacherName = teacherRows.length > 0 ? teacherRows[0].display_name : req.user.display_name;

    const invite_code = require('crypto').randomBytes(3).toString('hex').toUpperCase();

    const rows = await sql`
      INSERT INTO courses (title, description, subject, teacher_id, teacher_name, schedule_info, cover_image, invite_code)
      VALUES (${title}, ${description || null}, ${subject || null}, ${actualTeacherId},
              ${teacherName}, ${schedule_info || null}, ${cover_image || null}, ${invite_code})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create course error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// PUT /api/courses/:id
router.put('/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { title, description, subject, schedule_info, cover_image } = req.body;

    // Check ownership (admin can edit any course)
    if (req.user.role !== 'admin') {
      const check = await sql`SELECT teacher_id FROM courses WHERE id = ${req.params.id}`;
      if (check.length === 0) return res.status(404).json({ error: 'Курс табылмады' });
      if (check[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Рұқсат жоқ' });
      }
    }

    const rows = await sql`
      UPDATE courses SET
        title         = COALESCE(${title || null}, title),
        description   = COALESCE(${description || null}, description),
        subject       = COALESCE(${subject || null}, subject),
        schedule_info = COALESCE(${schedule_info || null}, schedule_info),
        cover_image   = COALESCE(${cover_image || null}, cover_image)
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Курс табылмады' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('Update course error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      const check = await sql`SELECT teacher_id FROM courses WHERE id = ${req.params.id}`;
      if (check.length === 0) return res.status(404).json({ error: 'Курс табылмады' });
      if (check[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Рұқсат жоқ' });
      }
    }
    await sql`DELETE FROM courses WHERE id = ${req.params.id}`;
    return res.json({ message: 'Курс жойылды' });
  } catch (e) {
    console.error('Delete course error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /api/courses/:id/students
router.get('/:id/students', verifyToken, async (req, res) => {
  try {
    const students = await sql`
      SELECT u.id, u.username, u.display_name, u.bits_balance, u.banned,
             u.warnings_count, ce.enrolled_at
      FROM course_enrollments ce
      JOIN users u ON ce.student_id = u.id
      WHERE ce.course_id = ${req.params.id}
      ORDER BY u.display_name
    `;
    return res.json(students);
  } catch (e) {
    console.error('Get course students error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/courses/:id/enroll
router.post('/:id/enroll', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId міндетті' });

    // Verify student exists
    const userCheck = await sql`SELECT id FROM users WHERE id = ${studentId} AND role = 'student'`;
    if (userCheck.length === 0) return res.status(404).json({ error: 'Студент табылмады' });

    await sql`
      INSERT INTO course_enrollments (course_id, student_id)
      VALUES (${req.params.id}, ${studentId})
      ON CONFLICT (course_id, student_id) DO NOTHING
    `;
    return res.json({ message: 'Студент курсқа қосылды' });
  } catch (e) {
    console.error('Enroll error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// DELETE /api/courses/:id/enroll/:studentId
router.delete('/:id/enroll/:studentId', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    await sql`
      DELETE FROM course_enrollments
      WHERE course_id = ${req.params.id} AND student_id = ${req.params.studentId}
    `;
    return res.json({ message: 'Студент курстан шығарылды' });
  } catch (e) {
    console.error('Unenroll error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// POST /api/courses/join
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ error: 'Шақыру коды міндетті' });

    const courses = await sql`SELECT id FROM courses WHERE invite_code = ${invite_code.toUpperCase()}`;
    if (courses.length === 0) return res.status(404).json({ error: 'Курс табылмады немесе код қате' });
    
    const courseId = courses[0].id;
    await sql`
      INSERT INTO course_enrollments (course_id, student_id)
      VALUES (${courseId}, ${req.user.id})
      ON CONFLICT (course_id, student_id) DO NOTHING
    `;
    return res.json({ message: 'Курсқа сәтті қосылдыңыз', courseId });
  } catch (e) {
    console.error('Join course error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
