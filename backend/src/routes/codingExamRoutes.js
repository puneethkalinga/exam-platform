const express = require("express");

const {
  createCodingExam,
  getCodingExams,
  getCodingExamById,
  updateCodingExam,
  deleteCodingExam,
} = require("../controllers/codingExamController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// Admin only
router.post("/", authMiddleware, createCodingExam);

router.get("/", authMiddleware, getCodingExams);

router.get("/:id", authMiddleware, getCodingExamById);

router.put("/:id", authMiddleware, updateCodingExam);

router.delete("/:id", authMiddleware, deleteCodingExam);


module.exports = router;