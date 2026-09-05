const express = require("express");
const router = express.Router();

const {
  getWorkspace,
  saveWorkspace,
} = require("../controllers/codingWorkspaceController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/:attemptId", authMiddleware, getWorkspace);
router.put("/:attemptId", authMiddleware, saveWorkspace);

module.exports = router;