const express = require("express");
const router = express.Router();

const {
  getWorkspace,
  saveWorkspace,
} = require("../controllers/codingWorkspaceController");

router.get("/:attemptId", getWorkspace);
router.put("/:attemptId", saveWorkspace);

module.exports = router;
