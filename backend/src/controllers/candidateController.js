const pool = require("../config/db");

/* =========================================================
   START / RESUME CANDIDATE ATTEMPT
========================================================= */

const startAttempt = async (req, res) => {
  try {
    const {
      examId,
      name,
      rollNumber,
      course,
    } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!examId || !name || !rollNumber || !course) {
      return res.status(400).json({
        message:
          "Name, roll number, course, and exam ID are required",
      });
    }
    const cleanCourse = String(course).trim();
    const cleanName = String(name).trim();
    const cleanRollNumber = String(rollNumber).trim().toUpperCase();

    if (!cleanName || !cleanRollNumber || !cleanCourse) {
      return res.status(400).json({
        message:
          "Name, roll number, and course cannot be empty",
      });
    }

    /* =====================================================
       GET EXAM FIRST TO VALIDATE TRACK / ROLL NUMBER
    ===================================================== */

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

    /* =====================================================
       ROLL NUMBER VALIDATION (TECHNICAL VS NON-TECHNICAL)
    ===================================================== */

    const isNonTechnical =
      /non[-\s]?technical/i.test(exam.title) ||
      /non[-\s]?technical/i.test(exam.description || "");

    if (isNonTechnical) {
      const ntMatch = cleanRollNumber.match(/^XEVO\/YEN\/NT\/(\d{3})$/);

      if (!ntMatch) {
        if (/^XEVO\/YEN\/T\/\d{3}$/i.test(cleanRollNumber)) {
          return res.status(400).json({
            message:
              "Invalid roll number. This is a Non-Technical exam. Please use your Non-Technical roll number in the format XEVO/YEN/NT/001 to XEVO/YEN/NT/800.",
          });
        }
        return res.status(400).json({
          message:
            "Invalid roll number. Non-Technical exams require format XEVO/YEN/NT/001 to XEVO/YEN/NT/800.",
        });
      }

      const rollNum = Number(ntMatch[1]);
      if (rollNum < 1 || rollNum > 800) {
        return res.status(400).json({
          message:
            "Invalid roll number. Non-Technical roll number must be between XEVO/YEN/NT/001 and XEVO/YEN/NT/800.",
        });
      }
    } else {
      // Technical exam
      const tMatch = cleanRollNumber.match(/^XEVO\/YEN\/T\/(\d{3})$/);

      if (!tMatch) {
        if (/^XEVO\/YEN\/NT\/\d{3}$/i.test(cleanRollNumber)) {
          return res.status(400).json({
            message:
              "Invalid roll number. This is a Technical exam. Please use your Technical roll number in the format XEVO/YEN/T/001 to XEVO/YEN/T/800.",
          });
        }
        return res.status(400).json({
          message:
            "Invalid roll number. Technical exams require format XEVO/YEN/T/001 to XEVO/YEN/T/800.",
        });
      }

      const rollNum = Number(tMatch[1]);
      if (rollNum < 1 || rollNum > 800) {
        return res.status(400).json({
          message:
            "Invalid roll number. Technical roll number must be between XEVO/YEN/T/001 and XEVO/YEN/T/800.",
        });
      }
    }

    /* =====================================================
       ONLY PUBLISHED EXAMS
    ===================================================== */

    if (
      String(exam.status).toLowerCase() !==
      "published"
    ) {
      return res.status(400).json({
        message:
          "This exam is not currently available",
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
          "This exam does not have a valid duration",
      });
    }

    /* =====================================================
       FIND CANDIDATE
    ===================================================== */

    let candidateResult =
      await pool.query(
        `
        SELECT *
        FROM candidates
        WHERE roll_number = $1
        `,
        [cleanRollNumber]
      );

    let candidate;

    if (candidateResult.rows.length > 0) {
      candidate =
        candidateResult.rows[0];

      /*
       * Update name if the candidate enters
       * a different name with the same roll number.
       */
      if (
       
        candidate.name !== cleanName ||
        candidate.course !== cleanCourse
      ) {
        const updatedCandidate =
          await pool.query(
            `
            UPDATE candidates
            SET name = $1,
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

        candidate =
          updatedCandidate.rows[0];
      }
    } else {
      /*
       * Candidate only enters:
       * Name
       * Roll Number
       *
       * year and section remain NULL.
       */
      const newCandidate =
        await pool.query(
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

      candidate =
        newCandidate.rows[0];
    }

    /* =====================================================
       CHECK EXISTING ATTEMPT
    ===================================================== */

    const existingAttemptResult =
      await pool.query(
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
        [
          exam.id,
          candidate.id,
        ]
      );

    /* =====================================================
       EXISTING ATTEMPT FOUND
    ===================================================== */

    if (
      existingAttemptResult.rows.length > 0
    ) {
      const existingAttempt =
        existingAttemptResult.rows[0];

      /* -----------------------------------------------
         RESUME ACTIVE ATTEMPT
      ------------------------------------------------ */

      if (
        existingAttempt.status ===
        "in_progress"
      ) {
        const startedAt =
          new Date(
            existingAttempt.started_at
          );

        const expiresAt =
          new Date(
            startedAt.getTime() +
              durationMinutes *
                60 *
                1000
          );

        /* ---------------------------------------------
           CHECK WHETHER EXISTING ATTEMPT EXPIRED
        --------------------------------------------- */

        if (new Date() >= expiresAt) {
          await pool.query(
            `
            UPDATE attempts
            SET
              status = 'submitted',
              submitted_at =
                CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [existingAttempt.id]
          );

          return res.status(400).json({
            message:
              "This examination attempt has expired",
          });
        }

        /* ---------------------------------------------
           RETURN EXISTING ACTIVE ATTEMPT
        --------------------------------------------- */

        return res.status(200).json({
          message:
            "Existing exam attempt resumed",

          candidate: {
            id: candidate.id,
            name: candidate.name,
            rollNumber: candidate.roll_number,
            course: candidate.course,
          },

          attempt: {
            id: existingAttempt.id,
            examId:
              existingAttempt.exam_id,
            candidateId:
              existingAttempt.candidate_id,
            startedAt:
              existingAttempt.started_at,
            status:
              existingAttempt.status,
            expiresAt,
          },

          exam: {
            id: exam.id,
            title: exam.title,
            description:
              exam.description,
            durationMinutes,
            cutoffPercentage:
              Number(
                exam.cutoff_percentage || 0
              ),
          },
        });
      }

      /* -----------------------------------------------
         ALREADY SUBMITTED
      ------------------------------------------------ */

      if (
        existingAttempt.status ===
        "submitted"
      ) {
        return res.status(409).json({
          message:
            "You have already completed this exam",
        });
      }
    }

    /* =====================================================
       CREATE NEW ATTEMPT
    ===================================================== */

    const attemptResult =
      await pool.query(
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
        [
          exam.id,
          candidate.id,
        ]
      );

    const attempt =
      attemptResult.rows[0];

    /* =====================================================
       CALCULATE SERVER EXPIRY
    ===================================================== */

    const startedAt =
      new Date(attempt.started_at);

    const expiresAt =
      new Date(
        startedAt.getTime() +
          durationMinutes *
            60 *
            1000
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      message:
        "Exam attempt started",

      candidate: {
        id: candidate.id,
        name: candidate.name,
        rollNumber:
          candidate.roll_number,
          course: candidate.course,
      },

      attempt: {
        id: attempt.id,
        examId: attempt.exam_id,
        candidateId:
          attempt.candidate_id,
        startedAt:
          attempt.started_at,
        status:
          attempt.status,
        expiresAt,
      },

      exam: {
        id: exam.id,
        title: exam.title,
        description:
          exam.description,
        durationMinutes,
        cutoffPercentage:
          Number(
            exam.cutoff_percentage || 0
          ),
      },
    });

  } catch (error) {
    console.error(
      "Start attempt error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to start exam",
    });
  }
};

/* =========================================================
   GET PUBLIC EXAM INFO (FOR CANDIDATE START PAGE)
========================================================= */

const getExamInfo = async (req, res) => {
  try {
    const { examId } = req.params;

    const result = await pool.query(
      `
      SELECT id, title, description, duration_minutes, status
      FROM exams
      WHERE id = $1
      `,
      [examId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const exam = result.rows[0];
    const isNonTechnical =
      /non[-\s]?technical/i.test(exam.title) ||
      /non[-\s]?technical/i.test(exam.description || "");

    return res.json({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.duration_minutes,
      isNonTechnical,
      expectedPrefix: isNonTechnical ? "XEVO/YEN/NT/" : "XEVO/YEN/T/",
      status: exam.status,
    });
  } catch (error) {
    console.error("Get exam info error:", error);
    return res.status(500).json({ message: "Failed to load exam information" });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  startAttempt,
  getExamInfo,
};