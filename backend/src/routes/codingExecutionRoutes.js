const express = require("express");
const router = express.Router();

const {
  runCode,
  submitCode,
  submitCodingExam,
} = require("../controllers/codingExecutionController");

const authenticateCodingAttempt = require("../middleware/codingAuth");

router.post(
  "/attempt/:attemptId/run",
  authenticateCodingAttempt,
  runCode
);

router.post(
  "/attempt/:attemptId/submit",
  authenticateCodingAttempt,
  submitCode
);

router.post(
  "/attempt/:attemptId/submit-exam",
  authenticateCodingAttempt,
  submitCodingExam
);

module.exports = router;