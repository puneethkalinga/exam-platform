const pool = require("../config/db");

/*
  ADMIN:
  Get all results for one exam
*/
const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({
        message: "Exam ID is required",
      });
    }

    // ---------------------------------------------
    // Get exam + current cutoff
    // ---------------------------------------------

    const examResult = await pool.query(
      `
      SELECT
        id,
        title,
        cutoff_percentage
      FROM exams
      WHERE id = $1
      `,
      [examId]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const exam = examResult.rows[0];

    const cutoff = Number(
      exam.cutoff_percentage || 0
    );

    // ---------------------------------------------
    // Get results
    // ---------------------------------------------

    const result = await pool.query(
      `
      SELECT
        a.id AS attempt_id,
        c.name,
        c.roll_number,
        c.course,
        a.total_marks,
        a.obtained_marks,
        a.percentage,
        a.result_status,
        a.status,
        a.started_at,
        a.submitted_at
      FROM attempts a
      JOIN candidates c
        ON c.id = a.candidate_id
      WHERE a.exam_id = $1
      ORDER BY
        a.percentage DESC NULLS LAST,
        a.submitted_at ASC NULLS LAST
      `,
      [examId]
    );

    const results = result.rows.map((row, index) => {

      const percentage = Number(
        row.percentage || 0
      );

      // IMPORTANT:
      // Shortlist is based on CURRENT cutoff
      const shortlisted =
        percentage >= cutoff;

      return {
        rank: index + 1,

        attempt_id: row.attempt_id,

        name: row.name,

        roll_number: row.roll_number,

        course: row.course,

        total_marks: Number(
          row.total_marks || 0
        ),

        obtained_marks: Number(
          row.obtained_marks || 0
        ),

        percentage,

        // Dynamic status
        result_status: shortlisted
          ? "shortlisted"
          : "not_shortlisted",

        shortlisted,

        status: row.status,

        started_at: row.started_at,

        submitted_at: row.submitted_at,
      };
    });

    const shortlistedCount =
      results.filter(
        (candidate) =>
          candidate.shortlisted
      ).length;

    res.json({
      examId,

      cutoff,

      totalCandidates:
        results.length,

      shortlistedCount,

      notShortlistedCount:
        results.length -
        shortlistedCount,

      results,
    });

  } catch (error) {

    console.error(
      "Get exam results error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch exam results",
    });
  }
};


/*
  ADMIN:
  Update cutoff and recalculate
  shortlist status
*/
const updateExamCutoff = async (
  req,
  res
) => {

  const client = await pool.connect();

  try {

    const { examId } = req.params;

    const {
      cutoffPercentage,
    } = req.body;

    // ---------------------------------------------
    // Validate
    // ---------------------------------------------

    if (
      cutoffPercentage === undefined ||
      cutoffPercentage === null ||
      cutoffPercentage === ""
    ) {
      return res.status(400).json({
        message:
          "Cutoff percentage is required",
      });
    }

    const cutoff =
      Number(cutoffPercentage);

    if (
      !Number.isFinite(cutoff) ||
      cutoff < 0 ||
      cutoff > 100
    ) {
      return res.status(400).json({
        message:
          "Cutoff must be between 0 and 100",
      });
    }

    await client.query("BEGIN");

    // ---------------------------------------------
    // Check exam
    // ---------------------------------------------

    const examResult =
      await client.query(
        `
        SELECT
          id,
          title
        FROM exams
        WHERE id = $1
        FOR UPDATE
        `,
        [examId]
      );

    if (
      examResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Exam not found",
      });
    }

    // ---------------------------------------------
    // Update exam cutoff
    // ---------------------------------------------

    await client.query(
      `
      UPDATE exams
      SET
        cutoff_percentage = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [cutoff, examId]
    );

    // ---------------------------------------------
    // Recalculate shortlist
    // ---------------------------------------------

    await client.query(
      `
      UPDATE attempts
      SET result_status =
        CASE
          WHEN COALESCE(percentage, 0) >= $1
            THEN 'shortlisted'
          ELSE
            'not_shortlisted'
        END
      WHERE exam_id = $2
      `,
      [cutoff, examId]
    );

    await client.query("COMMIT");

    return res.json({
      message:
        "Cutoff updated successfully",

      examId,

      cutoff,
    });

  } catch (error) {

    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Rollback error:",
        rollbackError
      );
    }

    console.error(
      "Update cutoff error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to update cutoff",
    });

  } finally {

    client.release();

  }
};


const getCandidateResponses = async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Get candidate details
    const candidateResult = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.roll_number,
        c.course
      FROM attempts at
      JOIN candidates c
        ON c.id = at.candidate_id
      WHERE at.id = $1
      `,
      [attemptId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({
        message: "Attempt not found",
      });
    }

    const candidate = candidateResult.rows[0];

    // Get responses
    const result = await pool.query(
      `
      SELECT
        q.id AS question_id,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        q.marks,
        a.selected_answer,
        a.is_correct,
        a.marks_obtained,
        a.answered_at
      FROM attempts at
      JOIN questions q
        ON q.exam_id = at.exam_id
      LEFT JOIN answers a
        ON a.question_id = q.id
        AND a.attempt_id = at.id
      WHERE at.id = $1
      ORDER BY q.question_order ASC
      `,
      [attemptId]
    );

    res.json({
      attemptId,
      candidate,
      responses: result.rows,
    });

  } catch (error) {
    console.error(
      "Get candidate responses error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch candidate responses",
    });
  }
};


module.exports = {
  getExamResults,
  getCandidateResponses,
  updateExamCutoff
};