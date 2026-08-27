const mongoose = require("mongoose");

const challengeRankingSnapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
  position: { type: Number, required: true },
  points: { type: Number, required: true },
  completed: { type: Number, required: true },
  capturedAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("ChallengeRankingSnapshot", challengeRankingSnapshotSchema);
