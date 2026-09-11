const express = require("express");

const {
  startAttempt,
  getExamInfo,
} = require("../controllers/candidateController");

const router = express.Router();

router.get("/exam-info/:examId", getExamInfo);
router.post("/start", startAttempt);

module.exports = router;