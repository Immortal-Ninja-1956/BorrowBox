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
    await sql`
      DO $$ BEGIN
        CREATE TYPE rejection_status AS ENUM ('PENDING', 'APPROVED', 'DISMISSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS item_rejections (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "imageUrl" TEXT,
        reason TEXT NOT NULL,
        "confidenceScores" TEXT,
        status rejection_status DEFAULT 'PENDING' NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS image_vision_cache (
        id SERIAL PRIMARY KEY,
        "imageHash" VARCHAR(64) NOT NULL UNIQUE,
        safe INTEGER NOT NULL,
        reason TEXT,
        "confidenceScores" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("Creating database composite indexes...");
    await sql`CREATE INDEX IF NOT EXISTS "deals_buyerId_status_idx" ON deals ("buyerId", status);`;
    await sql`CREATE INDEX IF NOT EXISTS "deals_sellerId_status_idx" ON deals ("sellerId", status);`;
    await sql`CREATE INDEX IF NOT EXISTS "items_sellerId_status_idx" ON items ("sellerId", status);`;
    await sql`CREATE INDEX IF NOT EXISTS "items_category_status_createdAt_idx" ON items (category, status, "createdAt");`;
    await sql`CREATE INDEX IF NOT EXISTS "item_reports_status_idx" ON item_reports (status);`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "trustScore" DECIMAL(5,2) DEFAULT 5.00 NOT NULL;`;
    await sql`
      CREATE TABLE IF NOT EXISTS deal_events (
        id SERIAL PRIMARY KEY,
        "dealId" INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        "fromStatus" VARCHAR(50) NOT NULL,
        "toStatus" VARCHAR(50) NOT NULL,
        "actorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("✅ Tables and indexes created successfully!");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
  } finally {
    await sql.end();
  }
}

run();

