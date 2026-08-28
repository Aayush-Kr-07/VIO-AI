const User = require("../user.js");
const Interview = require("../models/Interview.js");
const { isValidRole } = require("../config/rbac.js");

const listUsers = async (req, res) => {
  const users = await User.find({}).select("name email role createdAt emailVerifiedAt").sort({ createdAt: -1 }).lean();
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

module.exports = { listUsers, updateUserRole, getMentorReports };