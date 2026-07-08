import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    console.log("Connecting to database and creating revoked_tokens table...");
    await sql`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id SERIAL PRIMARY KEY,
        "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL
      );
    `;
    console.log("✅ Table created successfully!");
  } catch (error) {
    console.error("❌ Error creating table:", error);
  } finally {
    await sql.end();
  }
}

run();
