const express = require("express");

const router = express.Router();

const {
  startCodingAttempt,
  getCodingAttempt,
} = require("../controllers/codingAttemptController");

const authenticateCodingAttempt =
  require("../middleware/codingAuth");

router.post(
  "/start",
  startCodingAttempt
);

router.get(
  "/:id",
  authenticateCodingAttempt,
  getCodingAttempt
);

module.exports = router;