const XLSX = require("xlsx");
const pool = require("../config/db");

const uploadQuestions = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an Excel file",
      });
    }

    const { examId } = req.body;

    if (!examId) {
      return res.status(400).json({
        message: "Exam ID is required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Excel file is empty",
      });
    }

    await client.query("BEGIN");

    // Verify exam
    const examResult = await client.query(
      "SELECT id FROM exams WHERE id = $1",
      [examId]
    );

    if (examResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Exam not found",
      });
    }

    let imported = 0;

    for (const [index, row] of rows.entries()) {
      const questionText = row.question || row.question_text;
      const optionA = row.optionA || row.option_a;
      const optionB = row.optionB || row.option_b;
      const optionC = row.optionC || row.option_c;
      const optionD = row.optionD || row.option_d;
      const correctAnswer = String(
        row.correctAnswer || row.correct_answer
      ).toUpperCase();

      if (
        !questionText ||
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD ||
        !["A", "B", "C", "D"].includes(correctAnswer)
      ) {
        throw new Error(
          `Invalid data in Excel row ${index + 2}`
        );
      }

      await client.query(
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
        `,
        [
          examId,
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer,
          Number(row.marks) || 1,
          row.category || null,
          row.difficulty || null,
          Number(row.questionOrder) || index + 1,
        ]
      );

      imported++;
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Questions imported successfully",
      imported,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Excel upload error:", error);

    res.status(400).json({
      message: error.message || "Failed to import questions",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  uploadQuestions,
};