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


app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
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





app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});