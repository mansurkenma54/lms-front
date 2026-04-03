require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Дерекқор сілтемесі (init_new_db.js-тен алынған)
const DATABASE_URL = 'postgresql://neondb_owner:npg_Qqh1ZJwbiF8t@ep-bold-flower-am5zmoit-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixDB() {
  try {
    console.log('⏳ Дерекқорды тазарту басталуда (Ескі SERIAL ID кестелерінен арылу үшін)...');

    // Барлық ескі немесе қате кестелерді өшіреміз (қате мәліметтер қалмауы үшін)
    const tables = [
      'battle_participants', 'battles', 'hints_bought', 'bits_history', 'messages',
      'violations', 'submissions', 'assignments', 'notifications', 'course_comments',
      'lesson_materials', 'lessons', 'course_enrollments', 'courses', 'sessions',
      'guest_scores', 'users'
    ];

    for (const table of tables) {
      console.log(`   Өшірілуде: ${table}`);
      await sql(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }

    console.log('✅ Кестелер тазартылды.');

    console.log('⏳ Жаңа толық кестелер (UUID форматында) құрылуда...');
    
    // schema.sql оқу және орындау
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schemaSQL = '';
    try {
      schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    } catch(err) {
      console.error('schema.sql табылмады!', err.message);
      return;
    }

    // neon serverless ұзын қолдау көрсетпесе, әр кестені бөліп орындаймыз
    const statements = schemaSQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      // ignore empty or comments only
      if (!statement.startsWith('--')) {
        await sql(statement);
      }
    }

    console.log('✅ Жаңа құрылым (schema) сәтті орнатылды!');

    // Админ құру
    console.log('⏳ "nurdos1414" админ аккаунты құрылуда...');
    const hash = await bcrypt.hash('nurdos1414', 12);
    // Gen_random_uuid арқылы UUID жасайтынын schema автоматты түрде реттейді.
    await sql`
      INSERT INTO users (username, password_hash, display_name, role, status)
      VALUES ('nurdos1414', ${hash}, 'Нұрдос Мұғалім', 'admin', 'active')
    `;
    console.log('✅ Админ "nurdos1414" сәтті қосылды.');

    console.log('🎉 Дерекқор толығымен дайын! Енді платформа қатесіз жұмыс істейді.');

  } catch (error) {
    console.error('❌ Қате пайда болды:', error);
  }
}

fixDB();
