const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Get coding space for an attempt
router.get("/attempt/:attemptId", authMiddleware, async (req, res) => {
  try {
    const { attemptId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM coding_drafts
      WHERE attempt_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [attemptId]
    );

    res.json({
      draft: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Get coding space error:", error);

    res.status(500).json({
      message: "Failed to load coding space",
    });
  }
});

// Save coding space
router.put(
  "/attempt/:attemptId",
  authMiddleware,
  async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { source_code, language } = req.body;

      const existing = await pool.query(
        `
        SELECT id
        FROM coding_drafts
        WHERE attempt_id = $1
        LIMIT 1
        `,
        [attemptId]
      );

      let result;

      if (existing.rows.length > 0) {
        result = await pool.query(
          `
          UPDATE coding_drafts
          SET source_code = $1,
              language = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
          `,
          [
            source_code || "",
            language || "javascript",
            existing.rows[0].id,
          ]
        );
      } else {
        result = await pool.query(
          `
          INSERT INTO coding_drafts
            (attempt_id, source_code, language)
          VALUES ($1, $2, $3)
          RETURNING *
          `,
          [
            attemptId,
            source_code || "",
            language || "javascript",
          ]
        );
      }

      res.json({
        message: "Coding space saved successfully",
        draft: result.rows[0],
      });
    } catch (error) {
      console.error("Save coding space error:", error);

      res.status(500).json({
        message: "Failed to save coding space",
      });
    }
  }
);

module.exports = router;