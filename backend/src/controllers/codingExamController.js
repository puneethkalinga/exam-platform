const pool = require("../config/db");

// ============================================
// CREATE CODING EXAM
// ============================================

const createCodingExam = async (req, res) => {
  try {
    const {
      title,
      description,
      duration_minutes,
      total_marks,
      allowed_languages,
      instructions,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Coding exam title is required",
      });
    }

    if (!duration_minutes || Number(duration_minutes) <= 0) {
      return res.status(400).json({
        message: "Duration must be greater than 0",
      });
    }

    const languages =
      Array.isArray(allowed_languages) && allowed_languages.length > 0
        ? allowed_languages
        : ["c", "cpp", "java", "python"];

    const result = await pool.query(
      `
      INSERT INTO coding_exams (
        title,
        description,
        duration_minutes,
        total_marks,
        allowed_languages,
        instructions
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        title.trim(),
        description || "",
        Number(duration_minutes),
        Number(total_marks) || 100,
        JSON.stringify(languages),
        instructions || "",
      ]
    );

    res.status(201).json({
      message: "Coding exam created successfully",
      exam: result.rows[0],
    });
  } catch (error) {
    console.error("Create coding exam error:", error);

    res.status(500).json({
      message: "Failed to create coding exam",
    });
  }
};


// ============================================
// GET ALL CODING EXAMS
// ============================================

const getCodingExams = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ce.*,
        COUNT(cq.id)::int AS question_count
      FROM coding_exams ce
      LEFT JOIN coding_questions cq
        ON cq.coding_exam_id = ce.id
      GROUP BY ce.id
      ORDER BY ce.created_at DESC
    `);

    res.json({
      exams: result.rows,
    });
  } catch (error) {
    console.error("Get coding exams error:", error);

    res.status(500).json({
      message: "Failed to fetch coding exams",
    });
  }
};


// ============================================
// GET SINGLE CODING EXAM
// ============================================

const getCodingExamById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
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
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding exam not found",
      });
    }

    res.json({
      exam: result.rows[0],
    });
  } catch (error) {
    console.error("Get coding exam error:", error);

    res.status(500).json({
      message: "Failed to fetch coding exam",
    });
  }
};


// ============================================
// UPDATE CODING EXAM
// ============================================

const updateCodingExam = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      duration_minutes,
      total_marks,
      allowed_languages,
      instructions,
      status,
    } = req.body;

    const languages =
      Array.isArray(allowed_languages) && allowed_languages.length > 0
        ? allowed_languages
        : ["c", "cpp", "java", "python"];

    const result = await pool.query(
      `
      UPDATE coding_exams
      SET
        title = $1,
        description = $2,
        duration_minutes = $3,
        total_marks = $4,
        allowed_languages = $5,
        instructions = $6,
        status = COALESCE($7, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
      `,
      [
        title?.trim(),
        description || "",
        Number(duration_minutes),
        Number(total_marks) || 100,
        JSON.stringify(languages),
        instructions || "",
        status || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding exam not found",
      });
    }

    res.json({
      message: "Coding exam updated successfully",
      exam: result.rows[0],
    });
  } catch (error) {
    console.error("Update coding exam error:", error);

    res.status(500).json({
      message: "Failed to update coding exam",
    });
  }
};


// ============================================
// DELETE CODING EXAM
// ============================================

const deleteCodingExam = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM coding_exams
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding exam not found",
      });
    }

    res.json({
      message: "Coding exam deleted successfully",
    });
  } catch (error) {
    console.error("Delete coding exam error:", error);

    res.status(500).json({
      message: "Failed to delete coding exam",
    });
  }
};

const publishCodingExam = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE coding_exams
      SET
        status = CASE
          WHEN status = 'published' THEN 'draft'
          ELSE 'published'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding exam not found",
      });
    }

    res.json({
      message: "Coding exam status updated",
      exam: result.rows[0],
    });
  } catch (error) {
    console.error("Publish coding exam error:", error);

    res.status(500).json({
      message: "Failed to update coding exam status",
    });
  }
};


module.exports = {
  createCodingExam,
  getCodingExams,
  getCodingExamById,
  updateCodingExam,
  deleteCodingExam,
  publishCodingExam,
};