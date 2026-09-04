const express = require("express");

const router = express.Router();

const {
  logSecurityEvent,
  getSecurityEvents,
  getAdminSecurityEvents,
} = require("../controllers/codingSecurityController");

const authenticateCodingAttempt =
  require("../middleware/codingAuth");

// IMPORTANT:
// Replace this import with the exact admin middleware
// already used by your existing /api/exams routes.
const authenticateAdmin =
  require("../middleware/authMiddleware");


/*
  Candidate security logging
*/
router.post(
  "/events",
  authenticateCodingAttempt,
  logSecurityEvent
);


/*
  Candidate security events
*/
router.get(
  "/attempt/:attemptId",
  authenticateCodingAttempt,
  getSecurityEvents
);


/*
  Admin security events
*/
router.get(
  "/admin/attempt/:attemptId",
  authenticateAdmin,
  getAdminSecurityEvents
);


module.exports = router;