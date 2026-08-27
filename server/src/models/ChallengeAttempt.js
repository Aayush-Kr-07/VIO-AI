const mongoose = require("mongoose");

const challengeAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
  answer: { type: String, required: true, maxlength: 6000 },
  score: { type: Number, required: true, min: 0, max: 100 },
  points: { type: Number, required: true, min: 0 },
  feedback: { type: String, required: true },
  strengths: { type: [String], default: [] },
  improvements: { type: [String], default: [] },
  completedAt: { type: Date, default: Date.now, index: true },
});

challengeAttemptSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

module.exports = mongoose.model("ChallengeAttempt", challengeAttemptSchema);
