const express = require("express");

const router = express.Router();

const {
  startCodingAttempt,
  getCodingAttempt,
} = require("../controllers/codingAttemptController");

router.post("/start", startCodingAttempt);
router.get("/:id", getCodingAttempt);

module.exports = router;
