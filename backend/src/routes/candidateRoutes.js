const express = require("express");

const {
  startAttempt,
} = require("../controllers/candidateController");

const router = express.Router();

router.post("/start", startAttempt);

module.exports = router;