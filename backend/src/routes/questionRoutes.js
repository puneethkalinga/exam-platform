const express = require("express");

const {
  addQuestion,
  getQuestionsByExam,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/questionController");

const router = express.Router();

router.post("/", addQuestion);
router.get("/exam/:examId", getQuestionsByExam);
router.put("/exam/:id", updateQuestion);
router.delete("/exam/:id", deleteQuestion);

module.exports = router;