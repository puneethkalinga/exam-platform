const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const pool = require("./config/db");
const examRoutes = require("./routes/examRoutes");
const app = express();
const questionRoutes = require("./routes/questionRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const resultRoutes = require("./routes/resulrRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const codingExamRoutes = require("./routes/codingExamRoutes");
const codingQuestionRoutes = require("./routes/codingQuestionRoutes");
const codingTestCaseRoutes = require("./routes/codingTestCaseRoutes");
const codingAttemptRoutes = require("./routes/codingAttemptRoutes");
const codingWorkspaceRoutes = require("./routes/codingSpaceRoutes");
const codingExecutionRoutes = require("./routes/codingExecutionRoutes");
const codingResultRoutes = require("./routes/codingResultRoutes");
const codingSecurityRoutes = require("./routes/codingSecurityRoutes");

app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "https://exam-platform-inky-nine.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an origin
      // such as Postman/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Not allowed by CORS")
      );
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Exam Platform API is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.use("/api/exams",authMiddleware, examRoutes);
app.use("/api/questions",authMiddleware,  questionRoutes);
app.use("/api/candidates",  candidateRoutes);
app.use("/api/attempts",  attemptRoutes);
app.use("/api/results", authMiddleware, resultRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/coding-exams", codingExamRoutes);
app.use("/api/coding-questions", codingQuestionRoutes);
app.use("/api/coding-test-cases", codingTestCaseRoutes);
app.use("/api/coding-attempts", codingAttemptRoutes);
app.use("/api/coding-workspace", codingWorkspaceRoutes);
app.use("/api/coding-execution", codingExecutionRoutes);
app.put("/api/test-publish-route", (req, res) => {
  res.json({
    ok: true,
    message: "NEW BACKEND CODE IS LIVE"
  });
});
app.use("/api/coding-results", codingResultRoutes);
app.use("/api/coding-security", codingSecurityRoutes);



app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});