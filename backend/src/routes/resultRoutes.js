const express = require("express");

const {
  getExamResults,
  getCandidateResponses,
  updateExamCutoff,
} = require("../controllers/resultController");

const router = express.Router();


// Get exam results
router.get(
  "/exam/:examId",
  getExamResults
);


// Update exam cutoff
router.put(
  "/exam/:examId/cutoff",
  updateExamCutoff
);


// Get candidate responses
router.get(
  "/attempt/:attemptId",
  getCandidateResponses
);


module.exports = router;