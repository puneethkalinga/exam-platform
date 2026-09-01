const express = require("express");

const {
  createExam,
  getExams,
  getExamById,
  publishExam,
} = require("../controllers/examController");

const router = express.Router();

router.post("/", createExam);
router.get("/", getExams);
router.get("/:id", getExamById);
router.patch("/:id/publish", publishExam);

module.exports = router;