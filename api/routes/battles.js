// routes/battles.js — Battle (Батл) System
const express = require('express');
const router = express.Router();
const { sql } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

// ─── Helper: ensure tables exist ─────────────────────────────
async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS battles (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      teacher_name  VARCHAR(100) NOT NULL,
      title         VARCHAR(200) NOT NULL,
      problem_text  TEXT         NOT NULL,
      input_format  TEXT,
      output_format TEXT,
      test_cases    JSONB        NOT NULL DEFAULT '[]'::jsonb,
      time_limit    INTEGER      NOT NULL DEFAULT 300,
      reward_points INTEGER      NOT NULL DEFAULT 5,
      reward_bits   INTEGER      NOT NULL DEFAULT 0,
      status        VARCHAR(20)  NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','in_progress','finished','cancelled')),
      created_at    TIMESTAMPTZ  DEFAULT NOW(),
      finished_at   TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS battle_participants (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      battle_id   UUID        NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
      student_id  UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      student_name VARCHAR(100) NOT NULL,
      joined_at   TIMESTAMPTZ DEFAULT NOW(),
      accepted    BOOLEAN     NOT NULL DEFAULT FALSE,
      code        TEXT,
      score       INTEGER,
      submitted_at TIMESTAMPTZ,
      result      VARCHAR(20) CHECK (result IN ('win','lose','draw',NULL)),
      UNIQUE(battle_id, student_id)
    )
  `;
}

// Initialize tables on load
ensureTables().catch(console.error);

// ─── GET /api/battles — List open battles ─────────────────────
router.get('/', async (req, res) => {
  try {
    const defaultTitle = '⚔️ Тұрақты батл: Нөлдер (№43)';
    const [openDefault] = await sql`
      SELECT id FROM battles WHERE title = ${defaultTitle} AND status IN ('open', 'in_progress') LIMIT 1
    `;
    if (!openDefault) {
      let [admin] = await sql`SELECT id, display_name FROM users WHERE role = 'admin' LIMIT 1`;
      if (!admin) {
        [admin] = await sql`SELECT id, display_name FROM users LIMIT 1`;
      }
      if (admin) {
        await sql`
          INSERT INTO battles (
            teacher_id, teacher_name, title, problem_text, input_format, output_format,
            test_cases, time_limit, reward_points, reward_bits, status
          ) VALUES (
            ${admin.id}, ${admin.display_name || 'Авто-Жүйе'}, ${defaultTitle},
            'Нөлдер мен бірлерден тұратын тізбектегі үздіксіз нөлдер тізбегін (ең ұзын) табу керек.',
            'Кіріс файлының жалғыз қатарында нөлдер мен бірлерден тұратын тізбек жазылған (бос орынсыз).',
            'Шығыс файлының жалғыз қатарына ізделінетін нөлдер тізбегінің ұзындығын шығарыңыз.',
            ${JSON.stringify([
              { input: "00101110000110", expected_output: "4" },
              { input: "111", expected_output: "0" },
              { input: "00000", expected_output: "5" },
              { input: "10101", expected_output: "1" },
              { input: "00100010000", expected_output: "4" }
            ])},
            300, 10, 5, 'open'
          )
        `;
      }
    }

    const rows = await sql`
      SELECT b.*,
        (SELECT COUNT(*) FROM battle_participants bp WHERE bp.battle_id = b.id AND bp.accepted = TRUE) AS participant_count
      FROM battles b
      WHERE b.status IN ('open','in_progress')
      ORDER BY b.created_at DESC
      LIMIT 50
    `;
    return res.json(rows);
  } catch (e) {
    console.error('Get battles error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ─── POST /api/battles — Teacher creates a battle ────────────
router.post('/', verifyToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const {
      title, problem_text, input_format, output_format,
      test_cases, time_limit, reward_points, reward_bits
    } = req.body;

    if (!title || !problem_text) {
      return res.status(400).json({ error: 'Тақырып және есеп мәтіні міндетті' });
    }

    const rows = await sql`
      INSERT INTO battles
        (teacher_id, teacher_name, title, problem_text, input_format, output_format,
         test_cases, time_limit, reward_points, reward_bits)
      VALUES (
        ${req.user.id}, ${req.user.display_name}, ${title}, ${problem_text},
        ${input_format || null}, ${output_format || null},
        ${JSON.stringify(test_cases || [])},
        ${time_limit || 300}, ${reward_points || 5}, ${reward_bits || 0}
      )
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create battle error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ─── GET /api/battles/:id — Get one battle ───────────────────
router.get('/:id', async (req, res) => {
  try {
    const [battle] = await sql`SELECT * FROM battles WHERE id = ${req.params.id}`;
    if (!battle) return res.status(404).json({ error: 'Батл табылмады' });

    const participants = await sql`
      SELECT bp.*, u.bits_balance
      FROM battle_participants bp
      JOIN users u ON u.id = bp.student_id
      WHERE bp.battle_id = ${req.params.id}
      ORDER BY bp.joined_at
    `;
    return res.json({ ...battle, participants });
  } catch (e) {
    console.error('Get battle error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ─── POST /api/battles/:id/join — Student joins ──────────────
router.post('/:id/join', verifyToken, requireRole(['student']), async (req, res) => {
  try {
    const battleId = req.params.id;
    const [battle] = await sql`SELECT * FROM battles WHERE id = ${battleId}`;
    if (!battle) return res.status(404).json({ error: 'Батл табылмады' });
    if (battle.status === 'finished' || battle.status === 'cancelled') {
      return res.status(400).json({ error: 'Батл аяқталған' });
    }

    // Check already joined
    const existing = await sql`
      SELECT id FROM battle_participants
      WHERE battle_id = ${battleId} AND student_id = ${req.user.id}
    `;
    if (existing.length > 0) {
      return res.json({ joined: true, already: true });
    }

    // Check bits for staking
    if (battle.reward_bits > 0) {
      const [user] = await sql`SELECT bits_balance FROM users WHERE id = ${req.user.id}`;
      if (user.bits_balance < battle.reward_bits) {
        return res.status(400).json({ error: `Алмаз жетіспейді. Керек: ${battle.reward_bits} 💎` });
      }
      // Deduct bits (stake)
      await sql`
        UPDATE users SET bits_balance = bits_balance - ${battle.reward_bits} WHERE id = ${req.user.id}
      `;
      await sql`
        INSERT INTO bits_history (student_id, transaction_type, amount, reason)
        VALUES (${req.user.id}, 'spend', ${battle.reward_bits}, ${'Батл тігімі: ' + battle.title})
      `;
    }

    await sql`
      INSERT INTO battle_participants (battle_id, student_id, student_name)
      VALUES (${battleId}, ${req.user.id}, ${req.user.display_name})
    `;

    return res.json({ joined: true });
  } catch (e) {
    console.error('Join battle error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ─── POST /api/battles/:id/accept — Student accepts rules ────
router.post('/:id/accept', verifyToken, requireRole(['student']), async (req, res) => {
  try {
    const battleId = req.params.id;
    await sql`
      UPDATE battle_participants
      SET accepted = TRUE
      WHERE battle_id = ${battleId} AND student_id = ${req.user.id}
    `;

    // Check if both participants accepted → start battle
    const accepted = await sql`
      SELECT COUNT(*) AS cnt FROM battle_participants
      WHERE battle_id = ${battleId} AND accepted = TRUE
    `;
    const total = await sql`
      SELECT COUNT(*) AS cnt FROM battle_participants WHERE battle_id = ${battleId}
    `;

    if (parseInt(accepted[0].cnt) >= 2 && parseInt(accepted[0].cnt) >= parseInt(total[0].cnt)) {
      await sql`
        UPDATE battles SET status = 'in_progress' WHERE id = ${battleId} AND status = 'open'
      `;
    }

    const [battle] = await sql`SELECT status FROM battles WHERE id = ${battleId}`;
    return res.json({ accepted: true, battle_status: battle.status });
  } catch (e) {
    console.error('Accept battle error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ─── POST /api/battles/:id/submit — Submit solution ──────────
router.post('/:id/submit', verifyToken, requireRole(['student']), async (req, res) => {
  try {
    const battleId = req.params.id;
    const { code, score, passed_tests, total_tests } = req.body;

    const [battle] = await sql`SELECT * FROM battles WHERE id = ${battleId}`;
    if (!battle) return res.status(404).json({ error: 'Батл табылмады' });
    if (battle.status !== 'in_progress') {
      return res.status(400).json({ error: 'Батл белсенді емес' });
    }

    // Check participant hasn't already submitted
    const [me] = await sql`
      SELECT * FROM battle_participants
      WHERE battle_id = ${battleId} AND student_id = ${req.user.id}
    `;
    if (!me) return res.status(403).json({ error: 'Сіз батлда жоқсыз' });
    if (me.submitted_at) return res.status(400).json({ error: 'Сіз бұрын жібергенсіз' });

    // Save submission
    await sql`
      UPDATE battle_participants
      SET code = ${code}, score = ${score || 0}, submitted_at = NOW()
      WHERE battle_id = ${battleId} AND student_id = ${req.user.id}
    `;

    // Check if winner (100% score)
    let winnerDeclared = false;
    if ((score || 0) === 100) {
      // Declare winner immediately
      const [opponent] = await sql`
        SELECT * FROM battle_participants
        WHERE battle_id = ${battleId} AND student_id != ${req.user.id}
        LIMIT 1
      `;

      await sql`
        UPDATE battle_participants SET result = 'win'
        WHERE battle_id = ${battleId} AND student_id = ${req.user.id}
      `;

      if (opponent) {
        await sql`
          UPDATE battle_participants SET result = 'lose'
          WHERE battle_id = ${battleId} AND student_id = ${opponent.student_id}
        `;

        // Award points and bits
        await sql`
          UPDATE users SET bits_balance = bits_balance + ${battle.reward_bits * 2}
          WHERE id = ${req.user.id}
        `;
        if (battle.reward_bits > 0) {
          await sql`
            INSERT INTO bits_history (student_id, transaction_type, amount, reason)
            VALUES (${req.user.id}, 'earn', ${battle.reward_bits * 2}, ${'Батл жеңісі: ' + battle.title})
          `;
        }
        // Points bonus stored in submissions
        await sql`
          INSERT INTO submissions (student_id, student_name, acmp_problem_id, code, score, passed_tests, total_tests)
          VALUES (${req.user.id}, ${req.user.display_name}, NULL, ${code}, ${Math.min(score + battle.reward_points, 100) || battle.reward_points}, ${passed_tests || 0}, ${total_tests || 5})
        `;
      }

      await sql`
        UPDATE battles SET status = 'finished', finished_at = NOW() WHERE id = ${battleId}
      `;
      winnerDeclared = true;
    }

    const participants = await sql`
      SELECT * FROM battle_participants WHERE battle_id = ${battleId}
    `;

    return res.json({ submitted: true, winner_declared: winnerDeclared, participants });
  } catch (e) {
    console.error('Submit battle error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ─── POST /api/battles/:id/timeout — Battle timed out ────────
router.post('/:id/timeout', async (req, res) => {
  try {
    const battleId = req.params.id;
    const [battle] = await sql`SELECT * FROM battles WHERE id = ${battleId}`;
    if (!battle || battle.status === 'finished') return res.json({ ok: true });

    // Find who submitted with highest score
    const parts = await sql`
      SELECT * FROM battle_participants WHERE battle_id = ${battleId} ORDER BY COALESCE(score,0) DESC
    `;

    if (parts.length >= 2) {
      const winner = parts[0];
      const loser  = parts[1];
      const sameScore = winner.score === loser.score;

      if (!sameScore && winner.score > 0) {
        await sql`UPDATE battle_participants SET result='win'  WHERE id = ${winner.id}`;
        await sql`UPDATE battle_participants SET result='lose' WHERE id = ${loser.id}`;
        if (battle.reward_bits > 0) {
          await sql`UPDATE users SET bits_balance = bits_balance + ${battle.reward_bits * 2} WHERE id = ${winner.student_id}`;
          await sql`INSERT INTO bits_history (student_id, transaction_type, amount, reason) VALUES (${winner.student_id},'earn',${battle.reward_bits * 2},${'Батл жеңісі (уақыт): ' + battle.title})`;
        }
      } else {
        // Draw – return staked bits
        for (const p of parts) {
          await sql`UPDATE battle_participants SET result='draw' WHERE id = ${p.id}`;
          if (battle.reward_bits > 0) {
            await sql`UPDATE users SET bits_balance = bits_balance + ${battle.reward_bits} WHERE id = ${p.student_id}`;
          }
        }
      }
    }

    await sql`UPDATE battles SET status='finished', finished_at=NOW() WHERE id=${battleId}`;
    return res.json({ ok: true });
  } catch (e) {
    console.error('Timeout battle error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ─── DELETE /api/battles/:id — Teacher cancels ───────────────
router.delete('/:id', verifyToken, requireRole(['teacher','admin']), async (req, res) => {
  try {
    const [battle] = await sql`SELECT * FROM battles WHERE id = ${req.params.id}`;
    if (!battle) return res.status(404).json({ error: 'Табылмады' });
    if (battle.teacher_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    // Refund staked bits
    if (battle.reward_bits > 0) {
      const parts = await sql`SELECT student_id FROM battle_participants WHERE battle_id = ${req.params.id}`;
      for (const p of parts) {
        await sql`UPDATE users SET bits_balance = bits_balance + ${battle.reward_bits} WHERE id = ${p.student_id}`;
      }
    }
    await sql`UPDATE battles SET status='cancelled' WHERE id = ${req.params.id}`;
    return res.json({ cancelled: true });
  } catch (e) {
    console.error('Cancel battle error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
