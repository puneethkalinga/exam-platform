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
    // Combine questions + submissions
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

    // --------------------------------------------------
    // Return frontend-compatible structure
    // --------------------------------------------------

    return res.json({
      candidate: {
        id: attempt.candidate_id,
        name: attempt.candidate_name,
        roll_number: attempt.roll_number,
        course: attempt.course,
      },

      exam: {
        id: attempt.coding_exam_id,
        title: attempt.title,
        total_marks: totalMarks,
        duration_minutes: attempt.duration_minutes,
      },

      attempt: {
        id: attempt.id,
        coding_exam_id: attempt.coding_exam_id,
        candidate_id: attempt.candidate_id,
        started_at: attempt.started_at,
        ends_at: attempt.ends_at,
        submitted_at: attempt.submitted_at,
        status: attempt.status,
        total_score: totalScore,
        total_marks: totalMarks,
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