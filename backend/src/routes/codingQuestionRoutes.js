const express = require("express");

const {
  createCodingQuestion,
  getQuestionsByExam,
  getCodingQuestionById,
  updateCodingQuestion,
  deleteCodingQuestion,
} = require("../controllers/codingQuestionController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createCodingQuestion);

router.get(
  "/exam/:examId",
  authMiddleware,
  getQuestionsByExam
);

router.get("/:id", authMiddleware, getCodingQuestionById);

router.put("/:id", authMiddleware, updateCodingQuestion);

router.delete("/:id", authMiddleware, deleteCodingQuestion);

module.exports = router;