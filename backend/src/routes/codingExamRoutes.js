const express = require("express");

const router = express.Router();

const {
  createCodingExam,
  getCodingExams,
  getCodingExamById,
  updateCodingExam,
  deleteCodingExam,
  publishCodingExam,
} = require("../controllers/codingExamController");

const authMiddleware = require("../middleware/authMiddleware");

// Admin
router.get("/", authMiddleware, getCodingExams);

router.post("/", authMiddleware, createCodingExam);

router.put("/:id", authMiddleware, updateCodingExam);

router.delete("/:id", authMiddleware, deleteCodingExam);

router.put(
  "/:id/publish",
  authMiddleware,
  publishCodingExam
);

// Public candidate exam information
router.get("/:id", getCodingExamById);

module.exports = router;