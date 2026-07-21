import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    console.log("Connecting to database and creating tables...");
    await sql`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id SERIAL PRIMARY KEY,
        "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id SERIAL PRIMARY KEY,
        "adminId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        "targetId" INTEGER NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("✅ Tables created successfully!");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
  } finally {
    await sql.end();
  }
}

run();

