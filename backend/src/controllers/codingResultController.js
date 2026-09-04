const pool = require("../config/db");

/*
  Candidate:
  Get result for their own coding attempt.
*/
const getCodingResult = async (req, res) => {
  try {
    const attemptId = req.codingAttempt.id;

    const attemptResult = await pool.query(
      `
      SELECT
        ca.id,
        ca.coding_exam_id,
        ca.candidate_id,
        ca.started_at,
        ca.ends_at,
        ca.submitted_at,
        ca.status,
        ca.total_score,

        ce.title,
        ce.total_marks,

        c.name AS candidate_name,
        c.roll_number,
        c.course

      FROM coding_attempts ca

      JOIN coding_exams ce
        ON ce.id = ca.coding_exam_id

      JOIN candidates c
        ON c.id = ca.candidate_id

      WHERE ca.id = $1
      `,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Coding result not found",
      });
    }

    const attempt = attemptResult.rows[0];

    const submissionResult = await pool.query(
      `
      SELECT DISTINCT ON (cs.question_id)
        cs.question_id,
        cs.language,
        cs.status,
        cs.passed_tests,
        cs.total_tests,
        cs.marks_obtained,
        cs.execution_time_ms,
        cs.memory_used_kb,
        cs.submitted_at,

        cq.title,
        cq.marks AS question_marks

      FROM coding_submissions cs

      JOIN coding_questions cq
        ON cq.id = cs.question_id

      WHERE cs.attempt_id = $1

      ORDER BY
        cs.question_id,
        cs.marks_obtained DESC,
        cs.submitted_at DESC
      `,
      [attemptId]
    );

    return res.json({
      attempt,
      submissions: submissionResult.rows,
    });
  } catch (error) {
    console.error("Get coding result error:", error);

    return res.status(500).json({
      message: "Failed to fetch coding result",
    });
  }
};

const getAdminCodingResultDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return res.status(400).json({
        message: "Attempt ID is required",
      });
    }

    // --------------------------------------------------
    // Get attempt + candidate + exam
    // --------------------------------------------------

    const attemptResult = await pool.query(
      `
      SELECT
        ca.id,
        ca.coding_exam_id,
        ca.candidate_id,
        ca.started_at,
        ca.ends_at,
        ca.submitted_at,
        ca.status,
        ca.total_score,

        ce.title,
        ce.total_marks,
        ce.duration_minutes,

        c.name AS candidate_name,
        c.roll_number,
        c.course

      FROM coding_attempts ca

      JOIN coding_exams ce
        ON ce.id = ca.coding_exam_id

      JOIN candidates c
        ON c.id = ca.candidate_id

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

    // --------------------------------------------------
    // Get all questions
    // --------------------------------------------------

    const questionsResult = await pool.query(
      `
      SELECT
        id,
        title,
        marks,
        display_order
      FROM coding_questions
      WHERE coding_exam_id = $1
      ORDER BY display_order ASC, id ASC
      `,
      [attempt.coding_exam_id]
    );

    // --------------------------------------------------
    // Get best submission for every question
    // --------------------------------------------------

    const submissionsResult = await pool.query(
      `
      SELECT DISTINCT ON (cs.question_id)
        cs.question_id,
        cs.language,
        cs.status,
        cs.passed_tests,
        cs.total_tests,
        cs.marks_obtained,
        cs.execution_time_ms,
        cs.memory_used_kb,
        cs.submitted_at

      FROM coding_submissions cs

      WHERE cs.attempt_id = $1

      ORDER BY
        cs.question_id,
        cs.marks_obtained DESC,
        cs.submitted_at DESC
      `,
      [attemptId]
    );

    const submissionMap = new Map();

    submissionsResult.rows.forEach((submission) => {
      submissionMap.set(
        Number(submission.question_id),
        submission
      );
    });

    // --------------------------------------------------
    // Combine questions + best submissions
    // --------------------------------------------------

    const questions = questionsResult.rows.map((question) => {
      const submission = submissionMap.get(
        Number(question.id)
      );

      return {
        id: question.id,
        title: question.title,
        marks: Number(question.marks || 0),

        submission: submission
          ? {
              language: submission.language,
              status: submission.status,
              passed_tests: submission.passed_tests,
              total_tests: submission.total_tests,
              marks_obtained: Number(
                submission.marks_obtained || 0
              ),
              execution_time_ms:
                submission.execution_time_ms,
              memory_used_kb:
                submission.memory_used_kb,
              submitted_at:
                submission.submitted_at,
            }
          : null,
      };
    });

    // --------------------------------------------------
    // Calculate percentage
    // --------------------------------------------------

    const totalMarks = Number(
      attempt.total_marks || 0
    );

    const totalScore = Number(
      attempt.total_score || 0
    );

    const percentage =
      totalMarks > 0
        ? Number(
            ((totalScore / totalMarks) * 100).toFixed(2)
          )
        : 0;

    return res.json({
      attempt: {
        ...attempt,
        total_marks: totalMarks,
        total_score: totalScore,
        percentage,
      },

      questions,
    });
  } catch (error) {
    console.error(
      "Get admin coding result details error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch coding result details",
    });
  }
};


/*
  Admin:
  Get all coding results for one coding exam.
*/
const getCodingExamResults = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({
        message: "Coding exam ID is required",
      });
    }

    // --------------------------------------------------
    // Get exam
    // --------------------------------------------------

    const examResult = await pool.query(
      `
      SELECT
        id,
        title,
        total_marks,
        duration_minutes,
        status
      FROM coding_exams
      WHERE id = $1
      `,
      [examId]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        message: "Coding exam not found",
      });
    }

    const exam = examResult.rows[0];

    // --------------------------------------------------
    // Get attempts
    // --------------------------------------------------

    const attemptsResult = await pool.query(
      `
      SELECT
        ca.id,
        ca.candidate_id,
        ca.started_at,
        ca.ends_at,
        ca.submitted_at,
        ca.status,
        ca.total_score,

        c.name AS candidate_name,
        c.roll_number,
        c.course

      FROM coding_attempts ca

      JOIN candidates c
        ON c.id = ca.candidate_id

      WHERE ca.coding_exam_id = $1

      ORDER BY
        ca.total_score DESC,
        ca.submitted_at ASC NULLS LAST,
        ca.id ASC
      `,
      [examId]
    );

    // --------------------------------------------------
    // Calculate percentage
    // --------------------------------------------------

    const totalMarks = Number(exam.total_marks || 0);

    const results = attemptsResult.rows.map((attempt) => {
      const score = Number(attempt.total_score || 0);

      const percentage =
        totalMarks > 0
          ? Number(((score / totalMarks) * 100).toFixed(2))
          : 0;

      return {
        id: attempt.id,
        candidate_id: attempt.candidate_id,

        candidate_name: attempt.candidate_name,
        roll_number: attempt.roll_number,
        course: attempt.course,

        started_at: attempt.started_at,
        ends_at: attempt.ends_at,
        submitted_at: attempt.submitted_at,

        status: attempt.status,

        total_score: score,
        total_marks: totalMarks,
        percentage,
      };
    });

    return res.json({
      exam,
      results,
    });
  } catch (error) {
    console.error("Get coding exam results error:", error);

    return res.status(500).json({
      message: "Failed to fetch coding exam results",
    });
  }
};

const getAdminSubmissionCode = async (req, res) => {
  try {
    const { attemptId, questionId } = req.params;

    if (!attemptId || !questionId) {
      return res.status(400).json({
        message: "Attempt ID and question ID are required",
      });
    }

    const result = await pool.query(
      `
      SELECT DISTINCT ON (cs.question_id)
        cs.id,
        cs.question_id,
        cs.language,
        cs.source_code,
        cs.status,
        cs.passed_tests,
        cs.total_tests,
        cs.marks_obtained,
        cs.execution_time_ms,
        cs.memory_used_kb,
        cs.submitted_at,

        cq.title,
        cq.marks AS question_marks

      FROM coding_submissions cs

      JOIN coding_questions cq
        ON cq.id = cs.question_id

      JOIN coding_attempts ca
        ON ca.id = cs.attempt_id

      WHERE cs.attempt_id = $1
      AND cs.question_id = $2

      ORDER BY
        cs.question_id,
        cs.marks_obtained DESC,
        cs.submitted_at DESC
      `,
      [attemptId, questionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Submission not found",
      });
    }

    return res.json({
      submission: result.rows[0],
    });
  } catch (error) {
    console.error("Get submission code error:", error);

    return res.status(500).json({
      message: "Failed to fetch submitted code",
    });
  }
};


module.exports = {
  getCodingResult,
  getCodingExamResults,
  getAdminSubmissionCode,
    getAdminCodingResultDetails,
};