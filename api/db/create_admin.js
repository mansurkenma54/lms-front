require('dotenv').config({ path: __dirname + '/../.env' });
const { sql } = require('./pool');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const hash = await bcrypt.hash('26364656', 12);
    
    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE username = 'nurdos1414'`;
    
    if (existing.length > 0) {
      await sql`
        UPDATE users 
        SET password_hash = ${hash}, role = 'admin', status = 'active' 
        WHERE username = 'nurdos1414'
      `;
      console.log('Admin user nurdos1414 updated successfully.');
    } else {
      await sql`
        INSERT INTO users (username, password_hash, display_name, role, status)
        VALUES ('nurdos1414', ${hash}, 'Нұрдос Әкімші', 'admin', 'active')
      `;
      console.log('Admin user nurdos1414 created successfully.');
    }
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    process.exit(0);
  }
}

main();
