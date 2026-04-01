const { neon } = require('@neondatabase/serverless');

// DATABASE_URL болмаса, сервер мүлдем қосылмай қалмауы үшін тексеру
const dbUrl = process.env.DATABASE_URL || '';
const sql = dbUrl ? neon(dbUrl) : () => { throw new Error('DATABASE_URL is missing in Vercel settings'); };

module.exports = { sql };
