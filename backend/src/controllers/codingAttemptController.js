const pool = require("../config/db");

/* =========================================================
   START CODING ATTEMPT
========================================================= */

const startCodingAttempt = async (req, res) => {
  try {
    const {
      coding_exam_id,
      name,
      roll_number,
      course,
    } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!coding_exam_id) {
      return res.status(400).json({
        message: "Coding exam is required",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    if (!roll_number || !roll_number.trim()) {
      return res.status(400).json({
        message: "Roll number is required",
      });
    }

    if (!course || !course.trim()) {
      return res.status(400).json({
        message: "Course is required",
      });
    }

    const cleanName = name.trim();
    const cleanRollNumber = roll_number.trim().toUpperCase();
    const cleanCourse = course.trim();

    /* =====================================================
       VALIDATE ROLL NUMBER (TECHNICAL TRACK ONLY)
    ===================================================== */

    const rollNumberPattern = /^XEVO\/YEN\/T\/(\d{3})$/;

    const rollMatch = cleanRollNumber.match(
      rollNumberPattern
    );

    if (!rollMatch) {
      if (/^XEVO\/YEN\/NT\/\d{3}$/i.test(cleanRollNumber)) {
        return res.status(400).json({
          message:
            "Invalid roll number. Coding Assessment is a Technical exam. Please enter your Technical roll number in the format XEVO/YEN/T/001 to XEVO/YEN/T/800.",
        });
      }
      return res.status(400).json({
        message:
          "Invalid roll number. Technical coding exams require format XEVO/YEN/T/001 to XEVO/YEN/T/800.",
      });
    }

    const rollNumberValue = Number(rollMatch[1]);

    if (
      rollNumberValue < 1 ||
      rollNumberValue > 800
    ) {
      return res.status(400).json({
        message:
          "Invalid roll number. Technical roll number must be between XEVO/YEN/T/001 and XEVO/YEN/T/800.",
      });
    }

    /* =====================================================
       GET CODING EXAM
    ===================================================== */

    const examResult = await pool.query(
      `
      SELECT
        ce.*,
        COUNT(cq.id)::int AS question_count
      FROM coding_exams ce
      LEFT JOIN coding_questions cq
        ON cq.coding_exam_id = ce.id
      WHERE ce.id = $1
      GROUP BY ce.id
      `,
      [coding_exam_id]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        message: "Coding exam not found",
      });
    }

    const exam = examResult.rows[0];

    /* =====================================================
       ONLY PUBLISHED EXAMS
    ===================================================== */

    if (exam.status !== "published") {
      return res.status(403).json({
        message:
          "This coding exam is not currently available",
      });
    }

    /* =====================================================
       VALIDATE DURATION
    ===================================================== */

    const durationMinutes =
      Number(exam.duration_minutes);

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0
    ) {
      return res.status(400).json({
        message:
          "This coding exam does not have a valid duration",
      });
    }

    /* =====================================================
       FIND OR CREATE CANDIDATE
    ===================================================== */

    let candidateResult = await pool.query(
      `
      SELECT *
      FROM candidates
      WHERE roll_number = $1
      LIMIT 1
      `,
      [cleanRollNumber]
    );

    let candidate;

    if (candidateResult.rows.length > 0) {
      candidate = candidateResult.rows[0];

      /*
       * Keep candidate information updated.
       */
      if (
        candidate.name !== cleanName ||
        candidate.course !== cleanCourse
      ) {
        const updatedCandidate = await pool.query(
          `
          UPDATE candidates
          SET
            name = $1,
            course = $2
          WHERE id = $3
          RETURNING *
          `,
          [
            cleanName,
            cleanCourse,
            candidate.id,
          ]
        );

        candidate = updatedCandidate.rows[0];
      }
    } else {
      const newCandidate = await pool.query(
        `
        INSERT INTO candidates
          (
            name,
            roll_number,
            course,
            year,
            section
          )
        VALUES
          (
            $1,
            $2,
            $3,
            NULL,
            NULL
          )
        RETURNING *
        `,
        [
          cleanName,
          cleanRollNumber,
          cleanCourse,
        ]
      );

      candidate = newCandidate.rows[0];
    }

    /* =====================================================
       CHECK MOST RECENT CODING ATTEMPT
    ===================================================== */

    const existingAttemptResult =
      await pool.query(
        `
        SELECT
          id,
          coding_exam_id,
          candidate_id,
          started_at,
          ends_at,
          status
        FROM coding_attempts
        WHERE coding_exam_id = $1
          AND candidate_id = $2
        ORDER BY started_at DESC
        LIMIT 1
        `,
        [
          exam.id,
          candidate.id,
        ]
      );

    if (
      existingAttemptResult.rows.length > 0
    ) {
      const existingAttempt =
        existingAttemptResult.rows[0];

      /* =================================================
         RESUME ACTIVE ATTEMPT
      ================================================= */

      if (
        existingAttempt.status ===
        "in_progress"
      ) {
        const endsAt =
          new Date(existingAttempt.ends_at);

        /* -----------------------------------------------
           ATTEMPT EXPIRED
        ----------------------------------------------- */

        if (new Date() >= endsAt) {
          await pool.query(
            `
            UPDATE coding_attempts
            SET
              status = 'expired',
              submitted_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND status = 'in_progress'
            `,
            [existingAttempt.id]
          );
        } else {
          const remainingSeconds = Math.max(
            0,
            Math.floor(
              (
                endsAt.getTime() -
                Date.now()
              ) / 1000
            )
          );

          return res.status(200).json({
            message:
              "Existing coding exam attempt resumed",

            candidate: {
              id: candidate.id,
              name: candidate.name,
              rollNumber:
                candidate.roll_number,
              course: candidate.course,
            },

            attempt: {
              id: existingAttempt.id,
              codingExamId:
                existingAttempt.coding_exam_id,
              candidateId:
                existingAttempt.candidate_id,
              startedAt:
                existingAttempt.started_at,
              endsAt:
                existingAttempt.ends_at,
              status:
                existingAttempt.status,
            },

            exam: {
              id: exam.id,
              title: exam.title,
              description:
                exam.description,
              durationMinutes,
              totalMarks:
                Number(exam.total_marks),
              allowedLanguages:
                exam.allowed_languages,
              instructions:
                exam.instructions,
              questionCount:
                Number(exam.question_count),
            },

            remainingSeconds,
            resumed: true,
          });
        }
      }

      /* =================================================
         ALREADY SUBMITTED
      ================================================= */

      if (
        existingAttempt.status ===
        "submitted"
      ) {
        return res.status(409).json({
          message:
            "You have already completed this coding exam",
        });
      }
    }

    /* =====================================================
       CREATE NEW ATTEMPT
    ===================================================== */

    const startedAt = new Date();

    const endsAt = new Date(
      startedAt.getTime() +
        durationMinutes * 60 * 1000
    );

    const attemptResult = await pool.query(
      `
      INSERT INTO coding_attempts
        (
          coding_exam_id,
          candidate_id,
          started_at,
          ends_at,
          status
        )
      VALUES
        (
          $1,
          $2,
          $3,
          $4,
          'in_progress'
        )
      RETURNING
        id,
        coding_exam_id,
        candidate_id,
        started_at,
        ends_at,
        status
      `,
      [
        exam.id,
        candidate.id,
        startedAt,
        endsAt,
      ]
    );

    const attempt =
      attemptResult.rows[0];

    const remainingSeconds = Math.max(
      0,
      Math.floor(
        (
          new Date(attempt.ends_at).getTime() -
          Date.now()
        ) / 1000
      )
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      message:
        "Coding exam attempt started",

      candidate: {
        id: candidate.id,
        name: candidate.name,
        rollNumber:
          candidate.roll_number,
        course: candidate.course,
      },

      attempt: {
        id: attempt.id,
        codingExamId:
          attempt.coding_exam_id,
        candidateId:
          attempt.candidate_id,
        startedAt:
          attempt.started_at,
        endsAt:
          attempt.ends_at,
        status:
          attempt.status,
      },

      exam: {
        id: exam.id,
        title: exam.title,
        description:
          exam.description,
        durationMinutes,
        totalMarks:
          Number(exam.total_marks),
        allowedLanguages:
          exam.allowed_languages,
        instructions:
          exam.instructions,
        questionCount:
          Number(exam.question_count),
      },

      remainingSeconds,
      resumed: false,
    });
  } catch (error) {
    console.error(
      "Start coding attempt error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to start coding exam",
    });
  }
};


/* =========================================================
   GET CODING ATTEMPT
========================================================= */

const getCodingAttempt = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
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
        ce.duration_minutes,
        ce.total_marks,
        ce.allowed_languages,

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
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Coding attempt not found",
      });
    }

    return res.json({
      attempt: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get coding attempt error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch coding attempt",
    });
  }
};


module.exports = {
  startCodingAttempt,
  getCodingAttempt,
};