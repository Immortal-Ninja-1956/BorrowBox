require('dotenv').config();
const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  await conn.execute('UPDATE users SET isEmailVerified = 1');
  console.log('Updated existing users');
  process.exit(0);
}
run();
