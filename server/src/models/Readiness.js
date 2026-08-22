const mongoose = require("mongoose");

const roadmapItemSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["technology", "project", "certification", "interview"], required: true },
    title: { type: String, required: true },
    reason: { type: String, required: true },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
  },
  { _id: false },
);

const readinessSnapshotSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    classification: { type: String, required: true },
    candidateType: { type: String, required: true },
    confidence: { type: Number, default: 0 },
    summary: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    components: { type: mongoose.Schema.Types.Mixed, default: {} },
    gaps: { type: mongoose.Schema.Types.Mixed, default: {} },
    roadmap: { type: [roadmapItemSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const readinessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, unique: true },
  candidateType: { type: String, enum: ["Fresher", "Internship Seeker", "Experienced Candidate"], default: "Fresher" },
  resumeAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
  skillAssessment: { type: mongoose.Schema.Types.Mixed, default: null },
  current: { type: readinessSnapshotSchema, default: null },
  history: { type: [readinessSnapshotSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Readiness", readinessSchema);
