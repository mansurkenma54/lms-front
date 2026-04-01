// generate-hashes.js
// Run: node generate-hashes.js
// This outputs SQL with proper bcrypt hashes for seed.sql

const bcrypt = require('bcryptjs');

const users = [
  { username: 'admin',    password: 'admin2024',   display_name: 'Асқар Әкімші',   role: 'admin',   bits: 500 },
  { username: 'teacher',  password: 'teacher2024', display_name: 'Нұргүл Мұғалім', role: 'teacher', bits: 200 },
  { username: 'student1', password: '12345',       display_name: 'Айгерім Алиева', role: 'student', bits: 100 },
  { username: 'student2', password: '12345',       display_name: 'Берік Бейсенов', role: 'student', bits: 150 },
  { username: 'student3', password: '12345',       display_name: 'Дана Досова',    role: 'student', bits: 120 },
  { username: 'student4', password: '12345',       display_name: 'Ерлан Ерғали',   role: 'student', bits: 80  },
  { username: 'student5', password: '12345',       display_name: 'Жанар Жақсыбай', role: 'student', bits: 200 },
];

console.log('INSERT INTO users (username, password_hash, display_name, role, bits_balance) VALUES');
const rows = users.map((u, i) => {
  const hash = bcrypt.hashSync(u.password, 12);
  const comma = i < users.length - 1 ? ',' : '';
  return `  ('${u.username}', '${hash}', '${u.display_name}', '${u.role}', ${u.bits})${comma}`;
});
console.log(rows.join('\n'));
console.log('ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;');
