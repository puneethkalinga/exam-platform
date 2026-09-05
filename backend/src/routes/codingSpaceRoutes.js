const express = require("express");

const router = express.Router();

const {
  getAttemptQuestions,
  getDraft,
  saveDraft,
} = require("../controllers/codingSpaceController");


/*
  Candidate coding workspace

  NO authentication.
*/


// Load coding exam workspace
router.get(
  "/attempt/:attemptId",
  getAttemptQuestions
);


// Load saved draft
router.get(
  "/attempt/:attemptId/question/:questionId/draft",
  getDraft
);


// Save/update draft
router.put(
  "/attempt/:attemptId/question/:questionId/draft",
  saveDraft
);


module.exports = router;