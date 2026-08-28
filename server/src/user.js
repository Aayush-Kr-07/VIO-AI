const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const sessionSchema = new mongoose.Schema({
  sessionHash: { type: String, required: true },
  device: { type: String, required: true },
  ipAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
}, { _id: true });

const activitySchema = new mongoose.Schema({
  type: { type: String, required: true },
  success: { type: Boolean, default: true },
  device: { type: String, required: true },
  ipAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const alertSchema = new mongoose.Schema({
  type: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date, default: null },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["student", "mentor", "administrator"], default: "student", required: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", required: true },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationTokenHash: { type: String, select: false, default: null },
  emailVerificationExpiresAt: { type: Date, select: false, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  passwordResetTokenHash: { type: String, select: false, default: null },
  passwordResetExpiresAt: { type: Date, select: false, default: null },
  sessions: { type: [sessionSchema], default: [] },
  activityHistory: { type: [activitySchema], default: [] },
  securityAlerts: { type: [alertSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  resumeAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("user", userSchema);
