const express = require("express");

const {
  createTestCase,
  getTestCasesByQuestion,
  updateTestCase,
  deleteTestCase,
} = require("../controllers/codingTestCaseController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createTestCase);

router.get(
  "/question/:questionId",
  authMiddleware,
  getTestCasesByQuestion
);

router.put("/:id", authMiddleware, updateTestCase);

router.delete("/:id", authMiddleware, deleteTestCase);

module.exports = router;