const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db.js");
require("dotenv").config();
const authRoutes = require("./routes/auth.js");
const interviewsRoutes = require("./routes/interview.js");
const resumeRoutes = require("./routes/resume");
const startServer = async () => {
  const dbConnected = await connectDB();
  const app = express();

  // ── Middleware (BEFORE routes) ──────────────────────────
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/resume", resumeRoutes);

  // ── Routes ──────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/interviews", interviewsRoutes);
  const PORT = process.env.PORT || 5000;

  app.get("/", (req, res) => {
    res.send("Backend is running");
  });

  app.listen(PORT, () => {
    console.log(`Server is running ${PORT}`);
    console.log(`DB connected: ${dbConnected}`);
  });
};

startServer().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
