const express = require("express");

const router = express.Router();

const {
  getCodingResult,
  getCodingExamResults,
    getAdminCodingResultDetails,
    getAdminSubmissionCode,
} = require("../controllers/codingResultController");

const authenticateCodingAttempt = require("../middleware/codingAuth");


// Candidate result
router.get(
  "/attempt/:attemptId",
  authenticateCodingAttempt,
  getCodingResult
);

router.get(
  "/admin/attempt/:attemptId",
  authenticateAdmin,
  getAdminCodingResultDetails
);


// Admin results
// IMPORTANT:
// This route must use your existing admin authentication middleware.
const authenticateAdmin = require("../middleware/authMiddleware");

router.get(
  "/exam/:examId",
  authenticateAdmin,
  getCodingExamResults

);


router.get(
  "/admin/submission/:attemptId/:questionId",
  authenticateAdmin,
  getAdminSubmissionCode
);


module.exports = router;