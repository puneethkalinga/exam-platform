const pool = require("../config/db");

const addQuestion = async (req, res) => {
  try {
    const {
      examId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      marks,
      category,
      difficulty,
      questionOrder,
    } = req.body;

    const isWritten = !optionA && !optionB && !optionC && !optionD;

    if (!questionText || !questionOrder) {
      return res.status(400).json({
        message: "Question text and question order are required",
      });
    }

    if (!isWritten) {
      if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        return res.status(400).json({
          message: "All options and correct answer are required for multiple choice questions",
        });
      }

      const validAnswers = ["A", "B", "C", "D"];

      if (!validAnswers.includes(String(correctAnswer).toUpperCase())) {
        return res.status(400).json({
          message: "Correct answer must be A, B, C, or D",
        });
      }
    }

    const exam = await pool.query(
      "SELECT id FROM exams WHERE id = $1",
      [examId]
    );

    if (exam.rows.length === 0) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO questions
      (
        exam_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        marks,
        category,
        difficulty,
        question_order
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        examId,
        questionText,
        isWritten ? null : optionA,
        isWritten ? null : optionB,
        isWritten ? null : optionC,
        isWritten ? null : optionD,
        isWritten || !correctAnswer ? null : String(correctAnswer).toUpperCase(),
        marks || 1,
        category || null,
        difficulty || null,
        questionOrder,
      ]
    );

    res.status(201).json({
      message: "Question added successfully",
      question: result.rows[0],
    });
  } catch (error) {
    console.error("Add question error:", error);

    res.status(500).json({
      message: "Failed to add question",
    });
  }
};

const getQuestionsByExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        exam_id,
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
      [examId]
    );

    res.json({
      questions: result.rows,
    });
  } catch (error) {
    console.error("Get questions error:", error);

    res.status(500).json({
      message: "Failed to fetch questions",
    });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      marks,
      category,
      difficulty,
      questionOrder,
    } = req.body;

    const isWritten = !optionA && !optionB && !optionC && !optionD;

    if (!questionText || !questionOrder) {
      return res.status(400).json({
        message: "Question text and question order are required",
      });
    }

    if (!isWritten) {
      if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        return res.status(400).json({
          message: "All options and correct answer are required for multiple choice questions",
        });
      }

      const validAnswers = ["A", "B", "C", "D"];

      if (!validAnswers.includes(String(correctAnswer).toUpperCase())) {
        return res.status(400).json({
          message: "Correct answer must be A, B, C, or D",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE questions
      SET
        question_text = $1,
        option_a = $2,
        option_b = $3,
        option_c = $4,
        option_d = $5,
        correct_answer = $6,
        marks = $7,
        category = $8,
        difficulty = $9,
        question_order = $10
      WHERE id = $11
      RETURNING *
      `,
      [
        questionText,
        isWritten ? null : optionA,
        isWritten ? null : optionB,
        isWritten ? null : optionC,
        isWritten ? null : optionD,
        isWritten || !correctAnswer ? null : String(correctAnswer).toUpperCase(),
        marks || 1,
        category || null,
        difficulty || null,
        questionOrder,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    res.json({
      message: "Question updated successfully",
      question: result.rows[0],
    });

  } catch (error) {
    console.error("Update question error:", error);

    res.status(500).json({
      message: "Failed to update question",
    });
  }
};


const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM questions
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    res.json({
      message: "Question deleted successfully",
    });

  } catch (error) {
    console.error("Delete question error:", error);

    res.status(500).json({
      message: "Failed to delete question",
    });
  }
};

module.exports = {
  addQuestion,
  getQuestionsByExam,
  updateQuestion,
  deleteQuestion,
};