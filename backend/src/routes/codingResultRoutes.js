const express = require("express");

const router = express.Router();

const {
  getCodingResult,
  getCodingExamResults,
  getAdminCodingResultDetails,
  getAdminSubmissionCode,
} = require("../controllers/codingResultController");

const authenticateAdmin = require("../middleware/authMiddleware");

/*
====================================================
CANDIDATE RESULT
NO AUTHORIZATION

Same as MCQ result flow.
====================================================
*/
router.get(
  "/attempt/:attemptId",
  getCodingResult
);


/*
====================================================
ADMIN
ALL RESULTS FOR ONE CODING EXAM
====================================================
*/
router.get(
  "/exam/:examId",
  authenticateAdmin,
  getCodingExamResults
);


/*
====================================================
ADMIN
ONE CANDIDATE'S COMPLETE CODING RESULT
====================================================
*/
router.get(
  "/admin/attempt/:attemptId",
  authenticateAdmin,
  getAdminCodingResultDetails
);


/*
====================================================
ADMIN
VIEW SUBMITTED CODE
====================================================
*/
router.get(
  "/admin/attempt/:attemptId/question/:questionId/code",
  authenticateAdmin,
  getAdminSubmissionCode
);


module.exports = router;