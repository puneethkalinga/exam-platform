const pool = require("../config/db");

const createCodingQuestion = async (req, res) => {
  try {
    const {
      coding_exam_id,
      title,
      description,
      input_format,
      output_format,
      constraints,
      sample_input,
      sample_output,
      explanation,
      marks,
      time_limit_ms,
      memory_limit_mb,
      display_order,
    } = req.body;

    if (!coding_exam_id || !title?.trim() || !description?.trim()) {
      return res.status(400).json({
        message: "Exam, title and description are required",
      });
    }

    const exam = await pool.query(
      `SELECT id FROM coding_exams WHERE id = $1`,
      [coding_exam_id]
    );

    if (exam.rows.length === 0) {
      return res.status(404).json({
        message: "Coding exam not found",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO coding_questions (
        coding_exam_id,
        title,
        description,
        input_format,
        output_format,
        constraints,
        sample_input,
        sample_output,
        explanation,
        marks,
        time_limit_ms,
        memory_limit_mb,
        display_order
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
      RETURNING *
      `,
      [
        coding_exam_id,
        title.trim(),
        description.trim(),
        input_format || "",
        output_format || "",
        constraints || "",
        sample_input || "",
        sample_output || "",
        explanation || "",
        Number(marks) || 10,
        Number(time_limit_ms) || 2000,
        Number(memory_limit_mb) || 128,
        Number(display_order) || 1,
      ]
    );

    res.status(201).json({
      message: "Coding question created successfully",
      question: result.rows[0],
    });
  } catch (error) {
    console.error("Create coding question error:", error);

    res.status(500).json({
      message: "Failed to create coding question",
    });
  }
};

const getQuestionsByExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM coding_questions
      WHERE coding_exam_id = $1
      ORDER BY display_order ASC, id ASC
      `,
      [examId]
    );

    res.json({
      questions: result.rows,
    });
  } catch (error) {
    console.error("Get coding questions error:", error);

    res.status(500).json({
      message: "Failed to fetch coding questions",
    });
  }
};

const getCodingQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM coding_questions
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding question not found",
      });
    }

    res.json({
      question: result.rows[0],
    });
  } catch (error) {
    console.error("Get coding question error:", error);

    res.status(500).json({
      message: "Failed to fetch coding question",
    });
  }
};

const updateCodingQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      input_format,
      output_format,
      constraints,
      sample_input,
      sample_output,
      explanation,
      marks,
      time_limit_ms,
      memory_limit_mb,
      display_order,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE coding_questions
      SET
        title = $1,
        description = $2,
        input_format = $3,
        output_format = $4,
        constraints = $5,
        sample_input = $6,
        sample_output = $7,
        explanation = $8,
        marks = $9,
        time_limit_ms = $10,
        memory_limit_mb = $11,
        display_order = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
      `,
      [
        title?.trim(),
        description?.trim(),
        input_format || "",
        output_format || "",
        constraints || "",
        sample_input || "",
        sample_output || "",
        explanation || "",
        Number(marks) || 10,
        Number(time_limit_ms) || 2000,
        Number(memory_limit_mb) || 128,
        Number(display_order) || 1,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding question not found",
      });
    }

    res.json({
      message: "Coding question updated successfully",
      question: result.rows[0],
    });
  } catch (error) {
    console.error("Update coding question error:", error);

    res.status(500).json({
      message: "Failed to update coding question",
    });
  }
};

const deleteCodingQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM coding_questions
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding question not found",
      });
    }

    res.json({
      message: "Coding question deleted successfully",
    });
  } catch (error) {
    console.error("Delete coding question error:", error);

    res.status(500).json({
      message: "Failed to delete coding question",
    });
  }
};

module.exports = {
  createCodingQuestion,
  getQuestionsByExam,
  getCodingQuestionById,
  updateCodingQuestion,
  deleteCodingQuestion,
};