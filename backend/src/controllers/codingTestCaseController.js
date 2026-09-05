const pool = require("../config/db");

const createTestCase = async (req, res) => {
  try {
    console.log("CREATE TEST CASE BODY:", req.body);
    console.log("CREATE TEST CASE USER:", req.user);

    const {
      question_id,
      input,
      expected_output,
      is_hidden,
      marks,
    } = req.body;

    if (!question_id) {
      return res.status(400).json({
        message: "Question ID is required",
      });
    }

    if (input === undefined || expected_output === undefined) {
      return res.status(400).json({
        message: "Input and expected output are required",
      });
    }

    const question = await pool.query(
      `SELECT id FROM coding_questions WHERE id = $1`,
      [question_id]
    );

    if (question.rows.length === 0) {
      return res.status(404).json({
        message: "Coding question not found",
      });
    }

    const testCaseResult = await pool.query(
      `
      INSERT INTO coding_test_cases (
        question_id,
        input,
        expected_output,
        is_hidden,
        marks
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        Number(question_id),
        String(input),
        String(expected_output),
        is_hidden !== false,
        marks === "" || marks === undefined || marks === null
          ? null
          : Number(marks),
      ]
    );

    console.log(
      "TEST CASE CREATED:",
      testCaseResult.rows[0]
    );

    return res.status(201).json({
      message: "Test case created successfully",
      testCase: testCaseResult.rows[0],
    });

  } catch (error) {
    console.error("=================================");
    console.error("CREATE TEST CASE ERROR");
    console.error(error);
    console.error("=================================");

    return res.status(500).json({
      message: error.message || "Failed to create test case",
    });
  }
};

const getTestCasesByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM coding_test_cases
      WHERE question_id = $1
      ORDER BY id ASC
      `,
      [questionId]
    );

    res.json({
      testCases: result.rows,
    });
  } catch (error) {
    console.error("Get test cases error:", error);

    res.status(500).json({
      message: "Failed to fetch test cases",
    });
  }
};

const updateTestCase = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      input,
      expected_output,
      is_hidden,
      marks,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE coding_test_cases
      SET
        input = $1,
        expected_output = $2,
        is_hidden = $3,
        marks = $4
      WHERE id = $5
      RETURNING *
      `,
      [
        String(input ?? ""),
        String(expected_output ?? ""),
        is_hidden !== false,
        marks === "" || marks === undefined
          ? null
          : Number(marks),
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Test case not found",
      });
    }

    res.json({
      message: "Test case updated successfully",
      testCase: result.rows[0],
    });
  } catch (error) {
    console.error("Update test case error:", error);

    res.status(500).json({
      message: "Failed to update test case",
    });
  }
};

const deleteTestCase = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM coding_test_cases
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Test case not found",
      });
    }

    res.json({
      message: "Test case deleted successfully",
    });
  } catch (error) {
    console.error("Delete test case error:", error);

    res.status(500).json({
      message: "Failed to delete test case",
    });
  }
};

module.exports = {
  createTestCase,
  getTestCasesByQuestion,
  updateTestCase,
  deleteTestCase,
};