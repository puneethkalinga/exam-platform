const express = require("express");
const multer = require("multer");

const {
  uploadQuestions,
} = require("../controllers/uploadController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/questions",
  upload.single("file"),
  uploadQuestions
);

module.exports = router;