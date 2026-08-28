const User = require("../user.js");
const Interview = require("../models/Interview.js");
const { isValidRole } = require("../config/rbac.js");

const listUsers = async (req, res) => {
  const users = await User.find({}).select("name email role status createdAt emailVerifiedAt").sort({ createdAt: -1 }).lean();
  res.json({ users: users.map((user) => ({ ...user, id: user._id, emailVerified: Boolean(user.emailVerifiedAt), emailVerifiedAt: undefined, _id: undefined })) });
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!isValidRole(role)) return res.status(400).json({ message: "Invalid role" });
  if (String(req.params.userId) === String(req.userId)) {
    return res.status(403).json({ message: "You cannot change your own role" });
  }
  const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true }).select("name email role");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

const updateUserStatus = async (req, res) => {
  const { status } = req.body;
  if (!["active", "suspended"].includes(status)) return res.status(400).json({ message: "Invalid account status" });
  if (String(req.params.userId) === String(req.userId)) return res.status(403).json({ message: "You cannot change your own account status" });
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.status = status;
  if (status === "suspended") user.sessions.forEach((session) => { session.revokedAt = new Date(); });
  await user.save();
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status } });
};

const deleteUser = async (req, res) => {
  if (String(req.params.userId) === String(req.userId)) return res.status(403).json({ message: "You cannot delete your own administrator account" });
  const userId = req.params.userId;
  const user = await User.findById(userId).select("_id");
  if (!user) return res.status(404).json({ message: "User not found" });
  const ChallengeAttempt = require("../models/ChallengeAttempt.js");
  const ChallengeRankingSnapshot = require("../models/ChallengeRankingSnapshot.js");
  const Readiness = require("../models/Readiness.js");
  await Promise.all([
    Interview.deleteMany({ userId }),
    Readiness.deleteOne({ userId }),
    ChallengeAttempt.deleteMany({ userId }),
    ChallengeRankingSnapshot.deleteMany({ userId }),
    User.deleteOne({ _id: userId }),
  ]);
  res.json({ message: "User account and associated data deleted." });
};

const getMentorReports = async (req, res) => {
  const studentIds = await User.find({ role: "student" }).select("_id").lean();
  const reports = await Interview.find({ isComplete: true, userId: { $in: studentIds.map((student) => student._id) } })
    .select("userId domain companyName score duration feedback improvementSuggestions strengths weakAreas createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const students = await User.find({ _id: { $in: reports.map((report) => report.userId) } }).select("name email").lean();
  const studentMap = new Map(students.map((student) => [String(student._id), { name: student.name, email: student.email }]));
  res.json({ reports: reports.map((report) => ({ ...report, id: report._id, _id: undefined, student: studentMap.get(String(report.userId)) || null, userId: undefined })) });
};

module.exports = { listUsers, updateUserRole, updateUserStatus, deleteUser, getMentorReports };