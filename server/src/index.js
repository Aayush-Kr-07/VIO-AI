const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db.js");
require("dotenv").config();
const authRoutes = require("./routes/auth.js");
const interviewsRoutes = require("./routes/interview.js");
const resumeRoutes = require("./routes/resume");
const readinessRoutes = require("./routes/readiness.js");
const challengesRoutes = require("./routes/challenges.js");
const rbacRoutes = require("./routes/rbac.js");
const startServer = async () => {
  const dbConnected = await connectDB();
  const app = express();

  // ── Middleware (BEFORE routes) ──────────────────────────
  const allowedOrigins = new Set([
    "http://localhost:3000",
    "https://vio-ai-iota.vercel.app",
    ...(process.env.CLIENT_URL || "").split(",").map((origin) => origin.trim()).filter(Boolean),
  ]);
  app.use(cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/resume", resumeRoutes);

  // ── Routes ──────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/interviews", interviewsRoutes);
  app.use("/api/readiness", readinessRoutes);
  app.use("/api/challenges", challengesRoutes);
  app.use("/api/rbac", rbacRoutes);
  const PORT = process.env.PORT || 5000;

  app.get("/", (req, res) => {
    res.send("Backend is running");
  });

  app.listen(PORT, () => {
    console.log(`Server is running ${PORT}`);
    console.log(`DB connected: ${dbConnected}`);
    console.log(
      `Gmail webhook configured: ${Boolean(process.env.GMAIL_WEBHOOK_URL && process.env.GMAIL_WEBHOOK_SECRET)}`,
    );
  });
};

startServer().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
