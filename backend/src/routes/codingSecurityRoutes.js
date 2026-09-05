const express = require("express");
const router = express.Router();

const {
  logSecurityEvent,
  getSecurityEvents,
  getAdminSecurityEvents,
} = require("../controllers/codingSecurityController");

const authenticateAdmin = require("../middleware/authMiddleware");

router.post("/attempt/:attemptId/events", logSecurityEvent);
router.get("/attempt/:attemptId", getSecurityEvents);

router.get(
  "/admin/attempt/:attemptId",
  authenticateAdmin,
  getAdminSecurityEvents
);

module.exports = router;
