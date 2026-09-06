const pool = require("../config/db");

/* =========================================================
   START / RESUME ATTEMPT
========================================================= */

const startAttempt = async (req, res) => {
  try {
    const { examId, name, rollNumber } = req.body;

    if (!examId || !name?.trim() || !rollNumber?.trim()) {
      return res.status(400).json({
        message: "Name, roll number and exam ID are required",
      });
    }

    /* -----------------------------------------------------
       GET EXAM
    ----------------------------------------------------- */

    const examResult = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        duration_minutes,
        cutoff_percentage,
        status
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

    /* -----------------------------------------------------
       ONLY PUBLISHED EXAMS
    ----------------------------------------------------- */

    if (
      String(exam.status).toLowerCase() !== "published"
    ) {
      return res.status(400).json({
        message: "This exam is not currently available",
      });
    }

    const durationMinutes = Number(
      exam.duration_minutes
    );

    if (!durationMinutes || durationMinutes <= 0) {
      return res.status(400).json({
        message: "This exam does not have a valid duration",
      });
    }

    const cleanName = name.trim();
    const cleanRollNumber = rollNumber.trim();

    /* -----------------------------------------------------
       FIND / CREATE CANDIDATE
    ----------------------------------------------------- */

    let candidateResult = await pool.query(
      `
      SELECT *
      FROM candidates
      WHERE roll_number = $1
      `,
      [cleanRollNumber]
    );

    let candidate;

    if (candidateResult.rows.length > 0) {
      candidate = candidateResult.rows[0];

      if (candidate.name !== cleanName) {
        const updatedCandidate = await pool.query(
          `
          UPDATE candidates
          SET name = $1
          WHERE id = $2
          RETURNING *
          `,
          [cleanName, candidate.id]
        );

        candidate = updatedCandidate.rows[0];
      }
    } else {
      const newCandidate = await pool.query(
        `
        INSERT INTO candidates
          (name, roll_number, year, section)
        VALUES
          ($1, $2, NULL, NULL)
        RETURNING *
        `,
        [cleanName, cleanRollNumber]
      );

      candidate = newCandidate.rows[0];
    }

    /* -----------------------------------------------------
       CHECK MOST RECENT ATTEMPT
    ----------------------------------------------------- */

    const existingAttemptResult = await pool.query(
      `
      SELECT
        id,
        exam_id,
        candidate_id,
        status,
        started_at,
        submitted_at
      FROM attempts
      WHERE exam_id = $1
        AND candidate_id = $2
      ORDER BY started_at DESC
      LIMIT 1
      `,
      [exam.id, candidate.id]
    );

    if (existingAttemptResult.rows.length > 0) {
      const existing =
        existingAttemptResult.rows[0];

      /* ---------------------------------------------------
         RESUME ACTIVE ATTEMPT
      --------------------------------------------------- */

      if (existing.status === "in_progress") {
        const startedAt = new Date(
          existing.started_at
        );

        const expiresAt = new Date(
          startedAt.getTime() +
            durationMinutes * 60 * 1000
        );

        /* -----------------------------------------------
           ACTIVE ATTEMPT HAS EXPIRED
        ------------------------------------------------ */

        if (new Date() >= expiresAt) {
          await pool.query(
            `
            UPDATE attempts
            SET
              status = 'submitted',
              submitted_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND status = 'in_progress'
            `,
            [existing.id]
          );

          /* Continue and create a fresh attempt */
        } else {
          const remainingSeconds = Math.max(
            0,
            Math.floor(
              (expiresAt.getTime() - Date.now()) /
                1000
            )
          );

          return res.status(200).json({
            message: "Existing exam attempt resumed",

            candidate: {
              id: candidate.id,
              name: candidate.name,
              rollNumber: candidate.roll_number,
              year: candidate.year,
              section: candidate.section,
            },

            attempt: {
              id: existing.id,
              examId: existing.exam_id,
              candidateId: existing.candidate_id,
              startedAt: existing.started_at,
              status: existing.status,
              expiresAt: expiresAt.toISOString(),
            },

            exam: {
              id: exam.id,
              title: exam.title,
              description: exam.description,
              durationMinutes,
              cutoffPercentage: Number(
                exam.cutoff_percentage || 0
              ),
            },

            remainingSeconds,
          });
        }
      }
    }

    /* -----------------------------------------------------
       CREATE NEW ATTEMPT
    ----------------------------------------------------- */

    const attemptResult = await pool.query(
      `
      INSERT INTO attempts
        (
          exam_id,
          candidate_id,
          started_at,
          status
        )
      VALUES
        (
          $1,
          $2,
          CURRENT_TIMESTAMP,
          'in_progress'
        )
      RETURNING
        id,
        exam_id,
        candidate_id,
        started_at,
        status
      `,
      [exam.id, candidate.id]
    );

    const attempt = attemptResult.rows[0];

    /* -----------------------------------------------------
       SERVER EXPIRY
    ----------------------------------------------------- */

    const startedAt = new Date(
      attempt.started_at
    );

    const expiresAt = new Date(
      startedAt.getTime() +
        durationMinutes * 60 * 1000
    );

    const remainingSeconds = durationMinutes * 60;

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(201).json({
      message: "Exam attempt started",

      candidate: {
        id: candidate.id,
        name: candidate.name,
        rollNumber: candidate.roll_number,
        year: candidate.year,
        section: candidate.section,
      },

      attempt: {
        id: attempt.id,
        examId: attempt.exam_id,
        candidateId: attempt.candidate_id,
        startedAt: attempt.started_at,
        status: attempt.status,
        expiresAt: expiresAt.toISOString(),
      },

      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes,
        cutoffPercentage: Number(
          exam.cutoff_percentage || 0
        ),
      },

      remainingSeconds,
    });
  } catch (error) {
    console.error(
      "Start attempt error:",
      error
    );

    return res.status(500).json({
      message: "Failed to start exam",
    });
  }
};


/* =========================================================
   GET ATTEMPT QUESTIONS
========================================================= */

const getAttemptQuestions = async (req, res) => {
  try {
    const { attemptId } = req.params;

    console.log("GET QUESTIONS FOR ATTEMPT:", attemptId);

    /*
     * PostgreSQL calculates the expiration time.
     * This avoids Node.js timezone/date conversion problems.
     */
    const attemptResult = await pool.query(
      `
      SELECT
        a.id,
        a.exam_id,
        a.candidate_id,
        a.status,
        a.started_at,
        e.duration_minutes,

        (
          a.started_at +
          (e.duration_minutes * INTERVAL '1 minute')
        ) AS expires_at,

        EXTRACT(
          EPOCH FROM
          (
            a.started_at +
            (e.duration_minutes * INTERVAL '1 minute')
            - CURRENT_TIMESTAMP
          )
        ) AS remaining_seconds

      FROM attempts a

      JOIN exams e
        ON e.id = a.exam_id

      WHERE a.id = $1
      `,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    console.log("ATTEMPT DETAILS:", {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.started_at,
      durationMinutes: attempt.duration_minutes,
      expiresAt: attempt.expires_at,
      remainingSeconds: attempt.remaining_seconds,
    });

    /*
     * Attempt must be active.
     */
    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        message: "This exam attempt is no longer active",
        status: attempt.status,
      });
    }

    /*
     * PostgreSQL has calculated the remaining time.
     */
    const remainingSeconds = Math.max(
      0,
      Math.floor(Number(attempt.remaining_seconds))
    );

    /*
     * Check expiration.
     */
    if (remainingSeconds <= 0) {
      await pool.query(
        `
        UPDATE attempts
        SET
          status = 'submitted',
          submitted_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'in_progress'
        `,
        [attemptId]
      );

      return res.status(400).json({
        message: "This examination has expired",
      });
    }

    /*
     * Get questions.
     */
    const questionsResult = await pool.query(
      `
      SELECT
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        marks,
        category,
        difficulty,
        question_order
      FROM questions
      WHERE exam_id = $1
      ORDER BY question_order ASC
      `,
      [attempt.exam_id]
    );

    console.log(
      "QUESTIONS FOUND:",
      questionsResult.rows.length
    );

    console.log(
      "REMAINING SECONDS:",
      remainingSeconds
    );

    /*
     * Return questions + server-controlled timer.
     */
    return res.json({
      attemptId: attempt.id,

      startedAt: attempt.started_at,

      expiresAt: new Date(
        attempt.expires_at
      ).toISOString(),

      durationMinutes: Number(
        attempt.duration_minutes
      ),

      remainingSeconds,

      questions: questionsResult.rows,
    });
  } catch (error) {
    console.error(
      "Get attempt questions error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch questions",
    });
  }
};


/* =========================================================
   SAVE ANSWER
========================================================= */

const saveAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedAnswer } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!questionId || !selectedAnswer) {
      return res.status(400).json({
        message:
          "Question ID and selected answer are required",
      });
    }

    const answer = String(selectedAnswer).toUpperCase();

    if (!["A", "B", "C", "D"].includes(answer)) {
      return res.status(400).json({
        message: "Invalid answer",
      });
    }

    /* =====================================================
       GET ATTEMPT + CHECK EXPIRY IN POSTGRES
    ===================================================== */

    const attemptResult = await pool.query(
      `
      SELECT
        a.id,
        a.exam_id,
        a.status,
        a.started_at,
        e.duration_minutes,

        (
          a.started_at +
          (e.duration_minutes * INTERVAL '1 minute')
        ) AS expires_at,

        (
          a.started_at +
          (e.duration_minutes * INTERVAL '1 minute')
          > CURRENT_TIMESTAMP
        ) AS is_active

      FROM attempts a

      JOIN exams e
        ON e.id = a.exam_id

      WHERE a.id = $1
      `,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    console.log("SAVE ANSWER ATTEMPT:", {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.started_at,
      durationMinutes: attempt.duration_minutes,
      expiresAt: attempt.expires_at,
      isActive: attempt.is_active,
    });

    /* =====================================================
       STATUS CHECK
    ===================================================== */

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        message: "Exam attempt is not active",
      });
    }

    /* =====================================================
       SERVER EXPIRY CHECK
    ===================================================== */

    if (!attempt.is_active) {
      await pool.query(
        `
        UPDATE attempts
        SET
          status = 'submitted',
          submitted_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'in_progress'
        `,
        [attemptId]
      );

      return res.status(400).json({
        message: "Examination time has expired",
      });
    }

    /* =====================================================
       VERIFY QUESTION BELONGS TO EXAM
    ===================================================== */

    const questionResult = await pool.query(
      `
      SELECT id
      FROM questions
      WHERE id = $1
        AND exam_id = $2
      `,
      [questionId, attempt.exam_id]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        message: "Question not found for this exam",
      });
    }

    /* =====================================================
       SAVE ANSWER
    ===================================================== */

    await pool.query(
      `
      INSERT INTO answers
        (
          attempt_id,
          question_id,
          selected_answer,
          answered_at
        )
      VALUES
        (
          $1,
          $2,
          $3,
          CURRENT_TIMESTAMP
        )

      ON CONFLICT
        (attempt_id, question_id)

      DO UPDATE SET
        selected_answer = EXCLUDED.selected_answer,
        answered_at = CURRENT_TIMESTAMP
      `,
      [
        attemptId,
        questionId,
        answer,
      ]
    );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return res.json({
      message: "Answer saved",
    });

  } catch (error) {
    console.error(
      "Save answer error:",
      error
    );

    return res.status(500).json({
      message: "Failed to save answer",
    });
  }
};


/* =========================================================
   SUBMIT ATTEMPT
========================================================= */

const submitAttempt = async (req, res) => {
  const client = await pool.connect();

  try {
    const { attemptId } = req.params;

    await client.query("BEGIN");

    /* -----------------------------------------------------
       GET ATTEMPT
    ----------------------------------------------------- */

    const attemptResult =
      await client.query(
        `
        SELECT
          a.id,
          a.exam_id,
          a.candidate_id,
          a.status,
          a.started_at,
          e.cutoff_percentage,
          e.duration_minutes
        FROM attempts a
        JOIN exams e
          ON e.id = a.exam_id
        WHERE a.id = $1
        FOR UPDATE
        `,
        [attemptId]
      );

    if (
      attemptResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message:
          "Attempt not found",
      });
    }

    const attempt =
      attemptResult.rows[0];

    if (
      attempt.status !==
      "in_progress"
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "This attempt has already been submitted",
      });
    }

    /* -----------------------------------------------------
       TIMER
    ----------------------------------------------------- */

    const startedAt =
      new Date(attempt.started_at);

    const expiresAt =
      new Date(
        startedAt.getTime() +
          Number(attempt.duration_minutes) *
            60 *
            1000
      );

    /* -----------------------------------------------------
       BACKUP: ENSURE ALL PENDING ANSWERS ARE SAVED
    ----------------------------------------------------- */
    const { answers } = req.body || {};
    if (answers && typeof answers === "object") {
      for (const [qId, selectedAns] of Object.entries(answers)) {
        const cleanAns = String(selectedAns || "").toUpperCase();
        if (["A", "B", "C", "D"].includes(cleanAns)) {
          await client.query(
            `
            INSERT INTO answers
              (attempt_id, question_id, selected_answer, answered_at)
            VALUES
              ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (attempt_id, question_id)
            DO UPDATE SET
              selected_answer = EXCLUDED.selected_answer,
              answered_at = CURRENT_TIMESTAMP
            `,
            [attemptId, qId, cleanAns]
          );
        }
      }
    }

    /* -----------------------------------------------------
       CALCULATE SCORE
    ----------------------------------------------------- */

    const scoreResult =
      await client.query(
        `
        SELECT
          COUNT(q.id)
            AS total_questions,

          COUNT(
            CASE
              WHEN
                UPPER(a.selected_answer) =
                UPPER(q.correct_answer)
              THEN 1
            END
          ) AS correct_answers,

          COALESCE(
            SUM(q.marks),
            0
          ) AS total_marks,

          COALESCE(
            SUM(
              CASE
                WHEN
                  UPPER(a.selected_answer) =
                  UPPER(q.correct_answer)
                THEN q.marks
                ELSE 0
              END
            ),
            0
          ) AS obtained_marks

        FROM questions q

        LEFT JOIN answers a
          ON a.question_id = q.id
          AND a.attempt_id = $1

        WHERE q.exam_id = $2
        `,
        [
          attemptId,
          attempt.exam_id,
        ]
      );

    const score =
      scoreResult.rows[0];

    const totalMarks =
      Number(score.total_marks);

    const obtainedMarks =
      Number(score.obtained_marks);

    const percentage =
      totalMarks > 0
        ? (obtainedMarks /
            totalMarks) *
          100
        : 0;

    const cutoff =
      Number(
        attempt.cutoff_percentage || 0
      );

    const resultStatus =
      percentage >= cutoff
        ? "shortlisted"
        : "not_shortlisted";

    /* -----------------------------------------------------
       FINALIZE ATTEMPT
    ----------------------------------------------------- */

    await client.query(
      `
      UPDATE attempts
      SET
        submitted_at =
          CURRENT_TIMESTAMP,

        status =
          'submitted',

        total_marks =
          $1,

        obtained_marks =
          $2,

        percentage =
          $3,

        result_status =
          $4

      WHERE id = $5
      `,
      [
        totalMarks,
        obtainedMarks,
        percentage,
        resultStatus,
        attemptId,
      ]
    );

    await client.query("COMMIT");

    /* -----------------------------------------------------
       CANDIDATE GETS NO RESULT
    ----------------------------------------------------- */

    return res.json({
      message: isExpired
        ? "Exam time expired and examination was submitted successfully"
        : "Exam submitted successfully",

      submitted: true,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Rollback error:",
        rollbackError
      );
    }

    console.error(
      "Submit attempt error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to submit exam",
    });
  } finally {
    client.release();
  }
};


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  startAttempt,
  getAttemptQuestions,
  saveAnswer,
  submitAttempt,
};