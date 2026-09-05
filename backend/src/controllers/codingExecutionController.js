const pool = require("../config/db");
const axios = require("axios");

const JUDGE0_URL =
  process.env.JUDGE0_URL || "https://ce.judge0.com";

// Judge0 language IDs
const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  java: 62,
  python: 71,
};

// --------------------------------------------------
// Normalize output for comparison
// --------------------------------------------------

const normalizeOutput = (value) => {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
};

// --------------------------------------------------
// Get Judge0 status
// --------------------------------------------------

const getJudgeStatus = (statusId) => {
  const statuses = {
    1: "Processing",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error",
    8: "Runtime Error",
    9: "Runtime Error",
    10: "Runtime Error",
    11: "Runtime Error",
    12: "Runtime Error",
    13: "Internal Error",
    14: "Exec Format Error",
  };

  return statuses[statusId] || "Execution Error";
};


// ==================================================
// RUN CODE
// ==================================================

exports.runCode = async (req, res) => {
  try {
    // IMPORTANT:
    // attempt ID comes from authenticated middleware.
    // Do NOT trust attempt_id from request body.
    const attempt_id = req.params.attemptId;

    const {
      question_id,
      language,
      source_code,
      custom_input,
    } = req.body;

    if (!question_id || !language) {
      return res.status(400).json({
        message:
          "question_id and language are required",
      });
    }

    if (!source_code || !source_code.trim()) {
      return res.status(400).json({
        message: "Source code cannot be empty",
      });
    }

    const languageId = LANGUAGE_IDS[language];

    if (!languageId) {
      return res.status(400).json({
        message: "Unsupported programming language",
      });
    }

    // --------------------------------------------------
    // Verify attempt
    // --------------------------------------------------

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
      [attempt_id]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Coding attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        message:
          "This coding attempt is no longer active.",
      });
    }

    // --------------------------------------------------
    // Server-side timer
    // --------------------------------------------------

    if (new Date() >= new Date(attempt.ends_at)) {
      await pool.query(
        `
        UPDATE coding_attempts
        SET
          status = 'expired',
          submitted_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [attempt_id]
      );

      return res.status(400).json({
        message:
          "Coding exam time has expired.",
      });
    }

    // --------------------------------------------------
    // Verify question belongs to exam
    // --------------------------------------------------

    const questionResult = await pool.query(
      `
      SELECT
        id,
        coding_exam_id,
        time_limit_ms,
        memory_limit_mb
      FROM coding_questions
      WHERE id = $1
        AND coding_exam_id = $2
      `,
      [
        question_id,
        attempt.coding_exam_id,
      ]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        message: "Question not found.",
      });
    }

    const question = questionResult.rows[0];

    // --------------------------------------------------
    // Run against sample/custom input
    // --------------------------------------------------

    const judgeResponse = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        language_id: languageId,
        source_code,

        stdin: custom_input || "",

        cpu_time_limit:
          Number(
            question.time_limit_ms || 2000
          ) / 1000,

        wall_time_limit: 5,

        memory_limit:
          Number(
            question.memory_limit_mb || 128
          ) * 1024,

        enable_network: false,
      },
      {
        timeout: 15000,
      }
    );

    const result = judgeResponse.data;

    const status =
      getJudgeStatus(result.status?.id);

    res.json({
      success: true,

      status,

      stdout: result.stdout || "",

      stderr: result.stderr || "",

      compile_output:
        result.compile_output || "",

      execution_time_ms: result.time
        ? Math.round(
            Number(result.time) * 1000
          )
        : 0,

      memory_used_kb:
        result.memory || 0,
    });
  } catch (error) {
    console.error(
      "Run code error:",
      error.response?.data ||
        error.message ||
        error
    );

    res.status(500).json({
      message:
        "Unable to execute code.",
    });
  }
};


// ==================================================
// SUBMIT ONE QUESTION
//
// Runs ALL test cases including hidden cases.
// ==================================================

exports.submitCode = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // IMPORTANT:
    // Attempt ID comes from authenticated middleware.
    const attempt_id = req.params.attemptId;

    const {
      question_id,
      language,
      source_code,
    } = req.body;

    if (!question_id || !language) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "question_id and language are required",
      });
    }

    if (!source_code || !source_code.trim()) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Source code cannot be empty",
      });
    }

    const languageId = LANGUAGE_IDS[language];

    if (!languageId) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Unsupported programming language",
      });
    }

    // --------------------------------------------------
    // 1. Verify attempt
    // --------------------------------------------------

    const attemptResult = await client.query(
      `
      SELECT *
      FROM coding_attempts
      WHERE id = $1
      FOR UPDATE
      `,
      [attempt_id]
    );

    if (attemptResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message:
          "Coding attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== "in_progress") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "This coding attempt is already submitted.",
      });
    }

    // --------------------------------------------------
    // 2. Server-side timer check
    // --------------------------------------------------

    if (
      new Date() >=
      new Date(attempt.ends_at)
    ) {
      await client.query(
        `
        UPDATE coding_attempts
        SET
          status = 'expired',
          submitted_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [attempt_id]
      );

      await client.query("COMMIT");

      return res.status(400).json({
        message:
          "Coding exam time has expired.",
      });
    }

    // --------------------------------------------------
    // 3. Verify question
    // --------------------------------------------------

    const questionResult =
      await client.query(
        `
        SELECT *
        FROM coding_questions
        WHERE id = $1
          AND coding_exam_id = $2
        `,
        [
          question_id,
          attempt.coding_exam_id,
        ]
      );

    if (
      questionResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message:
          "Question not found.",
      });
    }

    const question =
      questionResult.rows[0];

    // --------------------------------------------------
    // 4. Get ALL test cases
    // --------------------------------------------------

    const testCasesResult =
      await client.query(
        `
        SELECT *
        FROM coding_test_cases
        WHERE question_id = $1
        ORDER BY id ASC
        `,
        [question_id]
      );

    const testCases =
      testCasesResult.rows;

    if (testCases.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "No test cases configured for this question.",
      });
    }

    // --------------------------------------------------
    // 5. Run every test case
    // --------------------------------------------------

    let passedTests = 0;
    let totalExecutionTime = 0;
    let maxMemory = 0;

    let finalStatus = "Accepted";

    for (const testCase of testCases) {
      try {
        const judgeResponse =
          await axios.post(
            `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
            {
              language_id: languageId,

              source_code,

              stdin:
                testCase.input || "",

              cpu_time_limit:
                Number(
                  question.time_limit_ms ||
                    2000
                ) / 1000,

              wall_time_limit: 5,

              memory_limit:
                Number(
                  question.memory_limit_mb ||
                    128
                ) * 1024,

              enable_network: false,
            },
            {
              timeout: 15000,
            }
          );

        const result =
          judgeResponse.data;

        const statusId =
          result.status?.id;

        const executionTime =
          result.time
            ? Math.round(
                Number(result.time) *
                  1000
              )
            : 0;

        const memoryUsed =
          result.memory || 0;

        totalExecutionTime +=
          executionTime;

        maxMemory = Math.max(
          maxMemory,
          memoryUsed
        );

        // Compilation error
        if (statusId === 6) {
          finalStatus =
            "Compilation Error";

          break;
        }

        // Time limit
        if (statusId === 5) {
          finalStatus =
            "Time Limit Exceeded";

          break;
        }

        // Runtime error
        if (
          [7, 8, 9, 10, 11, 12].includes(
            statusId
          )
        ) {
          finalStatus =
            "Runtime Error";

          break;
        }

        // Judge0 wrong answer
        if (statusId !== 3) {
          finalStatus =
            "Wrong Answer";

          break;
        }

        // Compare outputs
        const actual =
          normalizeOutput(
            result.stdout
          );

        const expected =
          normalizeOutput(
            testCase.expected_output
          );

        if (actual !== expected) {
          finalStatus =
            "Wrong Answer";

          break;
        }

        passedTests++;
      } catch (error) {
        console.error(
          "Judge execution error:",
          error.message
        );

        finalStatus =
          "Execution Error";

        break;
      }
    }

    // --------------------------------------------------
    // 6. Calculate marks
    // --------------------------------------------------

    const questionMarks =
      Number(question.marks || 0);

    const marksObtained =
      finalStatus === "Accepted"
        ? questionMarks
        : Number(
            (
              (passedTests /
                testCases.length) *
              questionMarks
            ).toFixed(2)
          );

    // --------------------------------------------------
    // 7. Save submission
    // --------------------------------------------------

    await client.query(
      `
      INSERT INTO coding_submissions (
        attempt_id,
        question_id,
        language,
        source_code,
        status,
        passed_tests,
        total_tests,
        marks_obtained,
        execution_time_ms,
        memory_used_kb
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
      `,
      [
        attempt_id,
        question_id,
        language,
        source_code,
        finalStatus,
        passedTests,
        testCases.length,
        marksObtained,
        totalExecutionTime,
        maxMemory,
      ]
    );

    // --------------------------------------------------
    // 8. Calculate BEST score per question
    // --------------------------------------------------

    const scoreResult =
      await client.query(
        `
        SELECT COALESCE(
          SUM(best_marks),
          0
        ) AS total_score
        FROM (
          SELECT
            question_id,
            MAX(marks_obtained) AS best_marks
          FROM coding_submissions
          WHERE attempt_id = $1
          GROUP BY question_id
        ) best_submissions
        `,
        [attempt_id]
      );

    const totalScore =
      Number(
        scoreResult.rows[0]
          .total_score
      );

    // --------------------------------------------------
    // 9. Update attempt score
    // --------------------------------------------------

    await client.query(
      `
      UPDATE coding_attempts
      SET total_score = $1
      WHERE id = $2
      `,
      [
        totalScore,
        attempt_id,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,

      result: {
        status: finalStatus,

        passed_tests:
          passedTests,

        total_tests:
          testCases.length,

        marks_obtained:
          marksObtained,

        total_score:
          totalScore,

        execution_time_ms:
          totalExecutionTime,

        memory_used_kb:
          maxMemory,
      },
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
      "Submit code error:",
      error
    );

    res.status(500).json({
      message:
        "Code submission failed.",
    });
  } finally {
    client.release();
  }
};


// ==================================================
// SUBMIT ENTIRE CODING EXAM
//
// Final score uses BEST submission per question.
// ==================================================

exports.submitCodingExam = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // IMPORTANT:
    // Attempt ID comes from authenticated middleware.
    const attempt_id = req.params.attemptId;

    // -----------------------------------------
    // 1. Get attempt
    // -----------------------------------------

    const attemptResult =
      await client.query(
        `
        SELECT *
        FROM coding_attempts
        WHERE id = $1
        FOR UPDATE
        `,
        [attempt_id]
      );

    if (
      attemptResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message:
          "Coding attempt not found",
      });
    }

    const attempt =
      attemptResult.rows[0];

    // -----------------------------------------
    // 2. Prevent duplicate submission
    // -----------------------------------------

    if (
      attempt.status ===
        "submitted" ||
      attempt.status === "expired"
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "This coding exam has already been submitted.",
      });
    }

    // -----------------------------------------
    // 3. Get exam questions
    // -----------------------------------------

    const questionsResult =
      await client.query(
        `
        SELECT
          id,
          marks
        FROM coding_questions
        WHERE coding_exam_id = $1
        ORDER BY
          display_order ASC,
          id ASC
        `,
        [attempt.coding_exam_id]
      );

    const questions =
      questionsResult.rows;

    // -----------------------------------------
    // 4. Best submission for every question
    // -----------------------------------------

    const bestSubmissionsResult =
      await client.query(
        `
        SELECT DISTINCT ON (question_id)
          question_id,
          marks_obtained,
          status,
          passed_tests,
          total_tests,
          language,
          submitted_at
        FROM coding_submissions
        WHERE attempt_id = $1
        ORDER BY
          question_id,
          marks_obtained DESC,
          submitted_at DESC
        `,
        [attempt_id]
      );

    const bestSubmissions =
      bestSubmissionsResult.rows;

    // -----------------------------------------
    // 5. Calculate final score
    // -----------------------------------------

    const totalMarks =
      questions.reduce(
        (sum, question) =>
          sum +
          Number(
            question.marks || 0
          ),
        0
      );

    const obtainedMarks =
      bestSubmissions.reduce(
        (sum, submission) =>
          sum +
          Number(
            submission.marks_obtained ||
              0
          ),
        0
      );

    const percentage =
      totalMarks > 0
        ? Number(
            (
              (obtainedMarks /
                totalMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    // -----------------------------------------
    // 6. Determine final status
    // -----------------------------------------

    const isExpired =
      new Date() >=
      new Date(attempt.ends_at);

    const finalStatus = isExpired
      ? "expired"
      : "submitted";

    // -----------------------------------------
    // 7. Finalize attempt
    // -----------------------------------------

    await client.query(
      `
      UPDATE coding_attempts
      SET
        submitted_at =
          CURRENT_TIMESTAMP,
        status = $1,
        total_score = $2
      WHERE id = $3
      `,
      [
        finalStatus,
        obtainedMarks,
        attempt_id,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,

      result: {
        attempt_id,

        status:
          finalStatus,

        total_marks:
          totalMarks,

        obtained_marks:
          obtainedMarks,

        percentage,

        total_questions:
          questions.length,

        attempted_questions:
          bestSubmissions.length,
      },
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
      "Submit coding exam error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to submit coding exam.",
    });
  } finally {
    client.release();
  }
};