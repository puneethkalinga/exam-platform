const express = require("express");
const router = express.Router();

const authenticateCodingAttempt = require("../middleware/codingAuth");

const {
  getAttemptQuestions,
  getDraft,
  saveDraft
} = require("../controllers/codingWorkspaceController");

router.get(
  "/attempt/:attemptId",
  authenticateCodingAttempt,
  getAttemptQuestions
);

router.get(
  "/attempt/:attemptId/question/:questionId/draft",
  authenticateCodingAttempt,
  getDraft
);

router.put(
  "/attempt/:attemptId/question/:questionId/draft",
  authenticateCodingAttempt,
  saveDraft
);

module.exports = router;