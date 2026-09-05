const express = require("express");

const {
  createTestCase,
  getTestCasesByQuestion,
  updateTestCase,
  deleteTestCase,
} = require("../controllers/codingTestCaseController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE TEST CASE
router.post("/", authMiddleware, createTestCase);

// GET TEST CASES FOR QUESTION
router.get(
  "/question/:questionId",
  authMiddleware,
  getTestCasesByQuestion
);

// UPDATE TEST CASE
router.put("/:id", authMiddleware, updateTestCase);

// DELETE TEST CASE
router.delete("/:id", authMiddleware, deleteTestCase);

module.exports = router;