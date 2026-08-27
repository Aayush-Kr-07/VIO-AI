const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ["HR", "Technical", "Aptitude", "Domain-Specific"], required: true },
  prompt: { type: String, required: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  cadence: { type: String, enum: ["daily", "weekly"], default: "daily" },
  scheduledFor: { type: Date, required: true, index: true },
  generatedBy: { type: String, enum: ["ai", "fallback"], default: "ai" },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

challengeSchema.index({ category: 1, scheduledFor: 1 }, { unique: true });

module.exports = mongoose.model("Challenge", challengeSchema);
