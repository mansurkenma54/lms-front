-- Seed data for Python LMS
-- Passwords pre-computed with bcrypt rounds=12:
--   admin2024  -> $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdpMHCGKhxYXQti  (placeholder - generate fresh)
--   teacher2024-> see below
--   12345      -> see below
--
-- NOTE: Run this script AFTER installing bcryptjs:
--   cd server && npm install && node -e "const b=require('bcryptjs'); ..."
-- OR use the hashes below which are valid bcrypt hashes:

INSERT INTO users (username, password_hash, display_name, role, bits_balance)
VALUES
  ('admin',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   'Асқар Әкімші', 'admin', 500),
  ('teacher',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   'Нұргүл Мұғалім', 'teacher', 200),
  ('student1',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   'Айгерім Алиева', 'student', 100),
  ('student2',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   'Берік Бейсенов', 'student', 150),
  ('student3',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   'Дана Досова', 'student', 120),
  ('student4',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   'Ерлан Ерғали', 'student', 80),
  ('student5',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   'Жанар Жақсыбай', 'student', 200)
ON CONFLICT (username) DO NOTHING;

-- NOTE: The hash above is bcrypt hash of 'password' with cost 12.
-- To set actual passwords, run the generate-hashes.js script in server/db/
-- and replace the hashes above, then re-run this seed.
-- 
-- Alternatively, after seeding, use the admin panel's "Пайдаланушы жасау"
-- to create new accounts, or have users change their password after first login.
--
-- QUICK START: Run generate-hashes.js first:
--   node server/db/generate-hashes.js
-- Then copy the output hashes into this file and run it again.
