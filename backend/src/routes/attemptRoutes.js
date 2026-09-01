const express = require("express");

const {
  startAttempt,
  getAttemptQuestions,
  saveAnswer,
  submitAttempt,
} = require("../controllers/attemptController");

const router = express.Router();

/* =========================
   START / RESUME ATTEMPT
========================= */

router.post(
  "/start",
  startAttempt
);

/* =========================
   GET QUESTIONS
========================= */

router.get(
  "/:attemptId/questions",
  getAttemptQuestions
);

/* =========================
   SAVE ANSWER
========================= */

router.post(
  "/:attemptId/answers",
  saveAnswer
);

/* =========================
   SUBMIT ATTEMPT
========================= */

router.post(
  "/:attemptId/submit",
  submitAttempt
);

module.exports = router;