const pool = require("../config/db");

const getWorkspace = async (req, res) => {
  try {
    const attemptId = req.params.attemptId || req.params.id;

    if (!attemptId) {
      return res.status(400).json({
        message: "Attempt ID is required",
      });
    }

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

    if (result.rows.length === 0) {
      return res.json({
        workspace: null,
      });
    }

    res.json({
      workspace: result.rows[0],
    });
  } catch (error) {
    console.error("Get workspace error:", error);
    res.status(500).json({
      message: "Failed to load workspace",
    });
  }
};

const saveWorkspace = async (req, res) => {
  try {
    const attemptId = req.params.attemptId || req.params.id;
    const { code, language } = req.body;

    if (!attemptId) {
      return res.status(400).json({
        message: "Attempt ID is required",
      });
    }

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
        SET code = $1,
            language = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
        `,
        [
          code || "",
          language || "javascript",
          existing.rows[0].id,
        ]
      );
    } else {
      result = await pool.query(
        `
        INSERT INTO coding_drafts
          (attempt_id, code, language)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
          attemptId,
          code || "",
          language || "javascript",
        ]
      );
    }

    res.json({
      message: "Workspace saved successfully",
      workspace: result.rows[0],
    });
  } catch (error) {
    console.error("Save workspace error:", error);
    res.status(500).json({
      message: "Failed to save workspace",
    });
  }
};

module.exports = {
  getWorkspace,
  saveWorkspace,
};