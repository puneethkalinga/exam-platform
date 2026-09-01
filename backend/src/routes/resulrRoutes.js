const express = require("express");

const {
  getExamResults,
  getCandidateResponses,
} = require("../controllers/resultController");

const router = express.Router();

router.get("/exam/:examId", getExamResults);

router.get("/attempt/:attemptId", getCandidateResponses);

module.exports = router;