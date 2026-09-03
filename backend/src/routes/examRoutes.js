const express = require("express");

const {
  createExam,
  getExams,
  getExamById,
  publishExam,
  deletePublishedExam,
} = require("../controllers/examController");

const router = express.Router();

router.post("/", createExam);
router.get("/", getExams);
router.get("/:id", getExamById);
router.patch("/:id/publish", publishExam);
router.delete("/:id", deletePublishedExam);
module.exports = router;