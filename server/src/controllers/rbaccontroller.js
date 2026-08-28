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
    .select("userId domain companyName score duration feedback improvementSuggestions strengths weakAreas mentorFeedback createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const students = await User.find({ _id: { $in: reports.map((report) => report.userId) } }).select("name email").lean();
  const studentMap = new Map(students.map((student) => [String(student._id), { name: student.name, email: student.email }]));
  res.json({ reports: reports.map((report) => ({ ...report, id: report._id, _id: undefined, student: studentMap.get(String(report.userId)) || null, userId: undefined })) });
};

const getMentorPerformance = async (req, res) => {
  const studentIds = await User.find({ role: "student" }).select("_id name email").lean();
  const reports = await Interview.find({ isComplete: true, userId: { $in: studentIds.map((student) => student._id) } })
    .select("userId score domain createdAt")
    .sort({ createdAt: -1 })
    .lean();
  const students = new Map(studentIds.map((student) => [String(student._id), student]));
  const performance = new Map();
  for (const report of reports) {
    const key = String(report.userId);
    const current = performance.get(key) || { student: students.get(key), interviews: 0, totalScore: 0, latestScore: report.score, domains: [] };
    current.interviews += 1;
    current.totalScore += report.score || 0;
    if (!current.domains.includes(report.domain)) current.domains.push(report.domain);
    performance.set(key, current);
  }
  res.json({ students: [...performance.values()].map((item) => ({ ...item, averageScore: Math.round(item.totalScore / item.interviews), totalScore: undefined })) });
};

const giveMentorFeedback = async (req, res) => {
  const feedback = String(req.body.feedback || "").trim();
  const advice = String(req.body.advice || "").trim();
  if (!feedback || !advice) return res.status(400).json({ message: "Feedback and advice are required" });
  const studentIds = await User.find({ role: "student" }).distinct("_id");
  const report = await Interview.findOne({ _id: req.params.reportId, isComplete: true, userId: { $in: studentIds } });
  if (!report) return res.status(404).json({ message: "Student report not found" });
  report.mentorFeedback.push({ mentorId: req.userId, feedback, advice });
  await report.save();
  res.status(201).json({ feedback: report.mentorFeedback[report.mentorFeedback.length - 1] });
};

module.exports = { listUsers, updateUserRole, updateUserStatus, deleteUser, getMentorReports, getMentorPerformance, giveMentorFeedback };