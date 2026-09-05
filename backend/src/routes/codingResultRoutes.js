const express = require("express");

const router = express.Router();

const {
  getCodingResult,
  getCodingExamResults,
  getAdminCodingResultDetails,
  getAdminSubmissionCode,
} = require("../controllers/codingResultController");

const authenticateAdmin = require("../middleware/authMiddleware");

// ==================================================
// CANDIDATE
// No coding access token required
// ==================================================
router.get(
  "/attempt/:attemptId",
  getCodingResult
);

// ==================================================
// ADMIN
// ==================================================
router.get(
  "/exam/:examId",
  authenticateAdmin,
  getCodingExamResults
);

router.get(
  "/admin/attempt/:attemptId",
  authenticateAdmin,
  getAdminCodingResultDetails
);

router.get(
  "/admin/attempt/:attemptId/question/:questionId/code",
  authenticateAdmin,
  getAdminSubmissionCode
);

module.exports = router;