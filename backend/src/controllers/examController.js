const pool = require("../config/db");

const createExam = async (req, res) => {
  try {
    const {
      title,
      description,
      durationMinutes,
      cutoffPercentage,
    } = req.body;

    if (!title || !durationMinutes) {
      return res.status(400).json({
        message: "Title and duration are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO exams
        (title, description, duration_minutes, cutoff_percentage)
      VALUES
        ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        title,
        description || null,
        durationMinutes,
        cutoffPercentage || 0,
      ]
    );

    res.status(201).json({
      message: "Exam created successfully",
      exam: result.rows[0],
    });
  } catch (error) {
    console.error("Create exam error:", error);

    res.status(500).json({
      message: "Failed to create exam",
    });
  }
};

const getExams = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM exams
      ORDER BY created_at DESC
    `);

    res.json({
      exams: result.rows,
    });
  } catch (error) {
    console.error("Get exams error:", error);

    res.status(500).json({
      message: "Failed to fetch exams",
    });
  }
};

const getExamById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM exams
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    res.json({
      exam: result.rows[0],
    });
  } catch (error) {
    console.error("Get exam error:", error);

    res.status(500).json({
      message: "Failed to fetch exam",
    });
  }
};

const publishExam = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE exams
      SET status = 'published',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    res.json({
      message: "Exam published successfully",
      exam: result.rows[0],
    });
  } catch (error) {
    console.error("Publish exam error:", error);

    res.status(500).json({
      message: "Failed to publish exam",
    });
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
    publishExam,
};