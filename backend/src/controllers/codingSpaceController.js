const pool = require("../config/db");

/*
  Get coding questions for an active attempt.

  IMPORTANT:
  Hidden expected outputs are NEVER returned.
*/
const getAttemptQuestions = async (req, res) => {
  try {
    // Get authenticated attempt from codingAuth middleware
    const attemptId = req.codingAttempt.id;

    const attemptResult = await pool.query(
      `
      SELECT
        ca.id,
        ca.coding_exam_id,
        ca.candidate_id,
        ca.started_at,
        ca.ends_at,
        ca.status,
        ce.title,
        ce.allowed_languages
      FROM coding_attempts ca
      JOIN coding_exams ce
        ON ce.id = ca.coding_exam_id
      WHERE ca.id = $1
      `,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Coding attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    const questionResult = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        input_format,
        output_format,
        constraints,
        sample_input,
        sample_output,
        explanation,
        marks,
        time_limit_ms,
        memory_limit_mb,
        display_order
      FROM coding_questions
      WHERE coding_exam_id = $1
      ORDER BY display_order ASC, id ASC
      `,
      [attempt.coding_exam_id]
    );

    res.json({
      attempt: {
        id: attempt.id,
        coding_exam_id: attempt.coding_exam_id,
        started_at: attempt.started_at,
        ends_at: attempt.ends_at,
        status: attempt.status,
        title: attempt.title,
        allowed_languages: attempt.allowed_languages,
      },
      questions: questionResult.rows,
    });
  } catch (error) {
    console.error("Get coding workspace error:", error);

    res.status(500).json({
      message: "Failed to load coding workspace",
    });
  }
};


/*
  Get the candidate's saved draft.
*/
const getDraft = async (req, res) => {
  try {
    // Attempt comes from authenticated middleware
    const attemptId = req.codingAttempt.id;

    const { questionId } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        question_id,
        language,
        source_code,
        updated_at
      FROM coding_drafts
      WHERE attempt_id = $1
      AND question_id = $2
      `,
      [attemptId, questionId]
    );

    if (result.rows.length === 0) {
      return res.json({
        draft: null,
      });
    }

    res.json({
      draft: result.rows[0],
    });
  } catch (error) {
    console.error("Get coding draft error:", error);

    res.status(500).json({
      message: "Failed to load draft",
    });
  }
};


/*
  Create/update candidate draft.
*/
const saveDraft = async (req, res) => {
  try {
    // Attempt comes from authenticated middleware
    const attemptId = req.codingAttempt.id;

    const { questionId } = req.params;

    const {
      language,
      source_code,
    } = req.body;

    if (!language) {
      return res.status(400).json({
        message: "Language is required",
      });
    }

    const attemptResult = await pool.query(
      `
      SELECT
        id,
        coding_exam_id,
        status,
        ends_at
      FROM coding_attempts
      WHERE id = $1
      `,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Coding attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        message: "Coding attempt is no longer active",
      });
    }

    if (new Date(attempt.ends_at) <= new Date()) {
      return res.status(400).json({
        message: "Coding exam time has expired",
      });
    }

    /*
      Make sure the question belongs to this coding exam.
      This prevents a candidate from saving a draft
      against another exam's question ID.
    */
    const questionResult = await pool.query(
      `
      SELECT id
      FROM coding_questions
      WHERE id = $1
      AND coding_exam_id = $2
      `,
      [
        questionId,
        attempt.coding_exam_id,
      ]
    );

    if (questionResult.rows.length === 0) {
      return res.status(403).json({
        message: "Question does not belong to this coding exam",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO coding_drafts (
        attempt_id,
        question_id,
        language,
        source_code,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)

      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        language = EXCLUDED.language,
        source_code = EXCLUDED.source_code,
        updated_at = CURRENT_TIMESTAMP

      RETURNING *
      `,
      [
        attemptId,
        questionId,
        language,
        source_code || "",
      ]
    );

    res.json({
      message: "Draft saved",
      draft: result.rows[0],
    });
  } catch (error) {
    console.error("Save coding draft error:", error);

    res.status(500).json({
      message: "Failed to save draft",
    });
  }
};


module.exports = {
  getAttemptQuestions,
  getDraft,
  saveDraft,
};