const pool = require("./src/config/db");

async function fixCandidates() {
  try {
    await pool.query(`
      ALTER TABLE candidates
      ALTER COLUMN year DROP NOT NULL
    `);

    await pool.query(`
      ALTER TABLE candidates
      ALTER COLUMN section DROP NOT NULL
    `);

    console.log("✅ Candidates table updated successfully");

  } catch (error) {
    console.error("❌ Database update failed:", error);
  } finally {
    await pool.end();
  }
}

fixCandidates();