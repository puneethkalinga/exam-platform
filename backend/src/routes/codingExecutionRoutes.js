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
  runCode
);

router.post(
  "/attempt/:attemptId/submit",
  submitCode
);

router.post(
  "/attempt/:attemptId/submit-exam",
  submitCodingExam
);

module.exports = router;