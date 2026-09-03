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
    const cleanRollNumber =
      String(rollNumber).trim();

      const rollNumberPattern = /^XEVO\/YEN\/T\/(\d{3})$/;
const rollNumberMatch = cleanRollNumber.match(
  rollNumberPattern
);

if (!rollNumberMatch) {
  return res.status(400).json({
    message:
      "Invalid roll number. Use format XEVO/YEN/T/--- to XEVO/YEN/T/---",
  });
}

const rollNumberNumber = Number(
  rollNumberMatch[1]
);

if (
  rollNumberNumber < 1 ||
  rollNumberNumber > 500
) {
  return res.status(400).json({
    message:
      "Invalid roll number. Roll number must be between XEVO/YEN/T/--- and XEVO/YEN/T/---",
  });
}

    if (!cleanName || !cleanRollNumber || !cleanCourse) {
      return res.status(400).json({
        message:
          "Name, roll number, and course cannot be empty",
      });
    }

    /* =====================================================
       GET EXAM
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
   EXPORT
========================================================= */

module.exports = {
  startAttempt,
};