CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       VARCHAR(50)  UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  display_name   VARCHAR(100) NOT NULL,
  role           VARCHAR(20)  NOT NULL CHECK (role IN ('student','teacher','admin')),
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  last_login     TIMESTAMPTZ,
  bits_balance   INTEGER      NOT NULL DEFAULT 100,
  banned         BOOLEAN      NOT NULL DEFAULT FALSE,
  ban_reason     TEXT,
  warnings_count INTEGER      NOT NULL DEFAULT 0,
  quote          TEXT,
  avatar_url     TEXT,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS courses (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  subject       VARCHAR(100),
  teacher_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_name  VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  schedule_info TEXT,
  cover_image   TEXT,
  invite_code   VARCHAR(10)  UNIQUE
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE TABLE IF NOT EXISTS lessons (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  active_date   DATE,
  start_time    TIME,
  end_time      TIME,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  order_index   INTEGER      DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lesson_materials (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     UUID         NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  material_type VARCHAR(50)  NOT NULL CHECK (material_type IN ('video', 'pdf', 'image', 'link')),
  url           TEXT         NOT NULL,
  title         VARCHAR(200),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_comments (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message       TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message       TEXT         NOT NULL,
  type          VARCHAR(50),
  is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  link          TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id          UUID         REFERENCES lessons(id) ON DELETE CASCADE,
  title              VARCHAR(200) NOT NULL,
  assignment_type    VARCHAR(50)  NOT NULL DEFAULT 'code',
  text_explanation   TEXT,
  visual_explanation TEXT,
  input_format       TEXT,
  output_format      TEXT,
  test_cases         JSONB        NOT NULL DEFAULT '[]'::jsonb,
  hint_small         TEXT,
  hint_big           TEXT,
  deadline           TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  DEFAULT NOW(),
  order_index        INTEGER      DEFAULT 0
);

-- FIXED: assignment_id and course_id are NULLABLE for ACMP submissions
CREATE TABLE IF NOT EXISTS submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name    VARCHAR(100),
  assignment_id   UUID        REFERENCES assignments(id) ON DELETE SET NULL,
  course_id       UUID        REFERENCES courses(id)     ON DELETE SET NULL,
  acmp_problem_id INTEGER,
  code            TEXT,
  score           INTEGER     NOT NULL DEFAULT 0,
  passed_tests    INTEGER     NOT NULL DEFAULT 0,
  total_tests     INTEGER     NOT NULL DEFAULT 5,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violations (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID         NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  assignment_id  UUID         REFERENCES assignments(id)         ON DELETE SET NULL,
  violation_type VARCHAR(200) NOT NULL,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_name  VARCHAR(100) NOT NULL,
  to_id      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bits_history (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn','spend')),
  amount           INTEGER     NOT NULL,
  reason           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hints_bought (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id VARCHAR(100) NOT NULL,
  hint_type  VARCHAR(20)  NOT NULL CHECK (hint_type IN ('small','big','answer')),
  bought_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(student_id, problem_id, hint_type)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        UNIQUE NOT NULL,
  role       VARCHAR(20) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher     ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enroll_course       ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enroll_student      ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course      ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course  ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson  ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assign  ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_acmp    ON submissions(acmp_problem_id);
CREATE INDEX IF NOT EXISTS idx_violations_student  ON violations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_to         ON messages(to_id);
CREATE INDEX IF NOT EXISTS idx_bits_student        ON bits_history(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token      ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires    ON sessions(expires_at);

-- Guest scores (no login required)
CREATE TABLE IF NOT EXISTS guest_scores (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name  VARCHAR(100) NOT NULL UNIQUE,
  score       INTEGER      NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guest_scores_name ON guest_scores(guest_name);

-- ═══════════════════════════════════════════════
-- If tables already exist, run these ALTER commands
-- in Neon console to patch the existing submissions table:
--
-- ALTER TABLE submissions ALTER COLUMN assignment_id DROP NOT NULL;
-- ALTER TABLE submissions ALTER COLUMN course_id DROP NOT NULL;
-- ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_assignment_id_fkey;
-- ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_course_id_fkey;
-- ALTER TABLE submissions ADD CONSTRAINT submissions_assignment_id_fkey
--   FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL;
-- ALTER TABLE submissions ADD CONSTRAINT submissions_course_id_fkey
--   FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
-- ALTER TABLE submissions ADD COLUMN IF NOT EXISTS acmp_problem_id INTEGER;
-- CREATE INDEX IF NOT EXISTS idx_submissions_acmp ON submissions(acmp_problem_id);
--
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS quote TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
-- ALTER TABLE courses ADD COLUMN IF NOT EXISTS invite_code VARCHAR(10) UNIQUE;
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE;
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) NOT NULL DEFAULT 'code';
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS time_limit INTEGER;
-- ═══════════════════════════════════════════════
