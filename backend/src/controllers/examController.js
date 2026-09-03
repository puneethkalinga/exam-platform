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
      SELECT
        e.*,
        COUNT(q.id)::int AS question_count
      FROM exams e
      LEFT JOIN questions q
        ON q.exam_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
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

const deletePublishedExam = async (req, res) => {
  try {
    const { id } = req.params;

    const examResult = await pool.query(
      `
      SELECT id, title, status
      FROM exams
      WHERE id = $1
      `,
      [id]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const exam = examResult.rows[0];

    if (exam.status !== "published") {
      return res.status(400).json({
        message: "Only published exams can be deleted",
      });
    }

    await pool.query(
      `
      DELETE FROM exams
      WHERE id = $1
      `,
      [id]
    );

    return res.json({
      message: "Published exam deleted successfully",
      exam: {
        id: exam.id,
        title: exam.title,
      },
    });
  } catch (error) {
    console.error("Delete exam error:", error);

    return res.status(500).json({
      message: "Failed to delete exam",
    });
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  publishExam,
  deletePublishedExam,
};
   