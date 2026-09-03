const pool = require("../config/db");

const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;

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

    res.json({
      examId,
      totalCandidates: result.rows.length,
      results: result.rows.map((row, index) => ({
        rank: index + 1,
        ...row,
      })),
    });
  } catch (error) {
    console.error("Get exam results error:", error);

    res.status(500).json({
      message: "Failed to fetch exam results",
    });
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
};