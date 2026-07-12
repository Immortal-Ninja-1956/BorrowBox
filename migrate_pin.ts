// One-time migration script to add PIN columns and enum values
import "dotenv/config";
import postgres from "postgres";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in the environment variables");
  }
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  console.log("Starting migration...");

  // Add new enum values
  try {
    await sql.unsafe(`ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'NEEDS_ATTENTION'`);
    console.log("✓ Added NEEDS_ATTENTION to deal_status enum");
  } catch (e: any) {
    console.log("  NEEDS_ATTENTION already exists or error:", e.message);
  }

  try {
    await sql.unsafe(`ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'DISPUTED'`);
    console.log("✓ Added DISPUTED to deal_status enum");
  } catch (e: any) {
    console.log("  DISPUTED already exists or error:", e.message);
  }

  // Add new columns to deals table
  const columns = [
    [`"pinHash" varchar(255)`, "pinHash"],
    [`"pinEncrypted" varchar(512)`, "pinEncrypted"],
    [`"pinAttempts" integer DEFAULT 0 NOT NULL`, "pinAttempts"],
    [`"pinLockedAt" timestamp`, "pinLockedAt"],
    [`"pinViewedAt" timestamp`, "pinViewedAt"],
    [`utr varchar(12) UNIQUE`, "utr"],
    [`"utrSubmittedAt" timestamp`, "utrSubmittedAt"],
    [`"disputedAt" timestamp`, "disputedAt"],
  ];

  for (const [colDef, name] of columns) {
    try {
      await sql.unsafe(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS ${colDef}`);
      console.log(`✓ Added column: ${name}`);
    } catch (e: any) {
      console.log(`  ${name} error: ${e.message}`);
    }
  }

  await sql.end();
  console.log("\nMigration complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
