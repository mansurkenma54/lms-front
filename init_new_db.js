const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_Qqh1ZJwbiF8t@ep-bold-flower-am5zmoit-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function initDB() {
  try {
    console.log('⏳ Дерекқор кестелерін құру басталды...');
    
    // Бұл кестелер api/db/schema.sql ішіндегі логиканы қайталайды
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        bits_balance INTEGER DEFAULT 0,
        banned BOOLEAN DEFAULT false,
        ban_reason TEXT,
        warnings_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE,
        quote VARCHAR(255) DEFAULT '',
        avatar_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS guest_scores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        score INTEGER NOT NULL,
        tasks_solved INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('✅ Кестелер сәтті құрылды.');

    // Админ құру
    console.log('⏳ Админ жасалуда...');
    const adminExists = await sql`SELECT id FROM users WHERE username = 'nurdos1414'`;
    if (adminExists.length === 0) {
      const hash = await bcrypt.hash('nurdos1414', 12);
      await sql`
        INSERT INTO users (username, password_hash, display_name, role, status)
        VALUES ('nurdos1414', ${hash}, 'Нұрдос Мұғалім', 'admin', 'active')
      `;
      console.log('✅ Админ "nurdos1414" сәтті қосылды.');
    } else {
      console.log('⚡ Админ "nurdos1414" бұрыннан бар.');
    }

    console.log('🎉 БӘРІ ДАЙЫН!');
  } catch (error) {
    console.error('❌ Қате пайда болды:', error);
  }
}

initDB();
