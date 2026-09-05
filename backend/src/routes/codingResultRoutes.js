const express = require("express");

const router = express.Router();

const {
  getCodingResult,
  getCodingExamResults,
  getAdminCodingResultDetails,
  getAdminSubmissionCode,
} = require("../controllers/codingResultController");

const authenticateCodingAttempt =
  require("../middleware/codingAuth");

const authenticateAdmin =
  require("../middleware/authMiddleware");

// Candidate result
router.get(
  "/attempt/:attemptId",
  authenticateCodingAttempt,
  getCodingResult
);

// Admin result list
router.get(
  "/exam/:examId",
  authenticateAdmin,
  getCodingExamResults
);

// Admin result details
router.get(
  "/admin/attempt/:attemptId",
  authenticateAdmin,
  getAdminCodingResultDetails
);

// Admin submitted code
router.get(
  "/admin/attempt/:attemptId/question/:questionId/code",
  authenticateAdmin,
  getAdminSubmissionCode
);

module.exports = router;