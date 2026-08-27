const Groq = require("groq-sdk");
const Challenge = require("../models/Challenge.js");
const ChallengeAttempt = require("../models/ChallengeAttempt.js");
const ChallengeRankingSnapshot = require("../models/ChallengeRankingSnapshot.js");
const User = require("../user.js");

const categories = ["HR", "Technical", "Aptitude", "Domain-Specific"];
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const fallbackPrompts = {
  HR: "Tell me about a time you handled disagreement in a team. What did you do and what was the outcome?",
  Technical: "Explain how you would diagnose a slow API endpoint in production, from first signal to verified fix.",
  Aptitude: "A project has 5 tasks taking 2, 3, 4, 6, and 10 days. With two people working in parallel and no task dependencies, what is the shortest completion time? Explain your reasoning.",
  "Domain-Specific": "Choose the technical domain you are preparing for and explain one recent decision you made in that domain, including the trade-off.",
};

const today = () => { const date = new Date(); date.setUTCHours(0, 0, 0, 0); return date; };
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const parseJson = (raw) => { const text = String(raw || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""); const start = text.indexOf("{"); const end = text.lastIndexOf("}"); return start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : null; };

const generateChallenge = async (category, scheduledFor) => {
  let prompt = fallbackPrompts[category];
  let generatedBy = "fallback";
  if (groq) {
    try {
      const response = await groq.chat.completions.create({ model, temperature: 0.8, max_tokens: 300, messages: [{ role: "system", content: "You create concise, realistic interview-preparation challenges. Return JSON only." }, { role: "user", content: `Create one ${category} interview challenge for candidates. It must require a thoughtful written answer, be answerable in under 5 minutes, and not require code. Return {"title":"short title","prompt":"challenge question","difficulty":"Easy|Medium|Hard"}.` }] });
      const result = parseJson(response.choices?.[0]?.message?.content);
      if (result?.title && result?.prompt && ["Easy", "Medium", "Hard"].includes(result.difficulty)) {
        prompt = result.prompt;
        generatedBy = "ai";
        return Challenge.create({ title: result.title, category, prompt, difficulty: result.difficulty, scheduledFor, generatedBy });
      }
    } catch (error) { console.error("Challenge generation failed:", error.message); }
  }
  return Challenge.create({ title: `${category} interview challenge`, category, prompt, difficulty: "Medium", scheduledFor, generatedBy });
};

const evaluateAnswer = async (challenge, answer) => {
  if (groq) {
    try {
      const response = await groq.chat.completions.create({ model, temperature: 0.2, max_tokens: 500, response_format: { type: "json_object" }, messages: [{ role: "user", content: `Evaluate this interview answer fairly. Challenge category: ${challenge.category}. Question: ${challenge.prompt}. Answer: ${answer}\nReturn JSON only: {"score":0,"feedback":"brief evidence-based feedback","strengths":["..."],"improvements":["..."]}. Score communication, relevance, reasoning, and completeness. Numeric score must be 0-100.` }] });
      const result = parseJson(response.choices?.[0]?.message?.content);
      if (result && typeof result.feedback === "string") return { score: clamp(result.score), feedback: result.feedback, strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 3) : [], improvements: Array.isArray(result.improvements) ? result.improvements.slice(0, 3) : [] };
    } catch (error) { console.error("Challenge evaluation failed:", error.message); }
  }
  const score = clamp(answer.length < 80 ? 35 : answer.length < 220 ? 60 : 78);
  return { score, feedback: "Your response was recorded. Add specific reasoning, examples, and a clear outcome to improve it.", strengths: answer.length >= 80 ? ["Provides enough detail to assess"] : [], improvements: ["Support the answer with a concrete example", "Close with a clear result or takeaway"] };
};

const getStats = async (userId) => {
  const attempts = await ChallengeAttempt.find({ userId }).sort({ completedAt: -1 }).lean();
  const totalPoints = attempts.reduce((sum, item) => sum + item.points, 0);
  const averageScore = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length) : 0;
  const days = [...new Set(attempts.map((item) => new Date(item.completedAt).toISOString().slice(0, 10)))];
  let streak = 0; let cursor = today();
  for (const day of days) { if (day !== cursor.toISOString().slice(0, 10)) break; streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  const leaderboard = await ChallengeAttempt.aggregate([{ $group: { _id: "$userId", points: { $sum: "$points" }, completed: { $sum: 1 } } }, { $sort: { points: -1, completed: -1 } }]);
  const position = Math.max(1, leaderboard.findIndex((item) => String(item._id) === String(userId)) + 1);
  const rank = totalPoints >= 1000 ? "Elite Candidate" : totalPoints >= 500 ? "Interview Pro" : totalPoints >= 200 ? "Rising Candidate" : "New Challenger";
  const badges = [];
  if (attempts.length >= 1) badges.push({ name: "First Step", description: "Completed your first challenge" });
  if (attempts.length >= 5) badges.push({ name: "Consistent", description: "Completed five challenges" });
  if (averageScore >= 80) badges.push({ name: "Sharp Thinker", description: "Reached an average score of 80+" });
  if (streak >= 3) badges.push({ name: "On a Roll", description: "Practiced three days in a row" });
  return { attempted: attempts.length, completed: attempts.length, averageScore, totalPoints, rank, streak, leaderboardPosition: position, badges, recentAttempts: attempts.slice(0, 5) };
};

const listChallenges = async (req, res) => { try { const scheduledFor = today(); let challenges = await Challenge.find({ scheduledFor, active: true }).sort({ category: 1 }); for (const category of categories) if (!challenges.some((item) => item.category === category)) { try { challenges.push(await generateChallenge(category, scheduledFor)); } catch (error) { console.error("Challenge persistence failed:", error.message); } } const attempts = await ChallengeAttempt.find({ userId: req.userId, challengeId: { $in: challenges.map((item) => item._id) } }).select("challengeId score points feedback").lean(); const attemptMap = new Map(attempts.map((item) => [String(item.challengeId), item])); res.json({ challenges: challenges.map((item) => ({ ...item.toObject(), attempt: attemptMap.get(String(item._id)) || null })), stats: await getStats(req.userId) }); } catch (error) { console.error("Challenge list error:", error); res.status(500).json({ message: "Unable to load challenges." }); } };
const submitChallenge = async (req, res) => { try { const answer = String(req.body.answer || "").trim(); if (answer.length < 20) return res.status(400).json({ message: "Write at least 20 characters so your answer can be evaluated." }); const challenge = await Challenge.findById(req.params.id); if (!challenge) return res.status(404).json({ message: "Challenge not found." }); const existing = await ChallengeAttempt.findOne({ userId: req.userId, challengeId: challenge._id }); if (existing) return res.status(409).json({ message: "You already completed this challenge.", attempt: existing }); const evaluation = await evaluateAnswer(challenge, answer); const attempt = await ChallengeAttempt.create({ userId: req.userId, challengeId: challenge._id, answer, ...evaluation, points: Math.round(evaluation.score * (challenge.difficulty === "Hard" ? 1.5 : challenge.difficulty === "Medium" ? 1.2 : 1)) }); const stats = await getStats(req.userId); await ChallengeRankingSnapshot.create({ userId: req.userId, position: stats.leaderboardPosition, points: stats.totalPoints, completed: stats.completed }); res.status(201).json({ attempt, stats }); } catch (error) { console.error("Challenge submit error:", error); res.status(500).json({ message: "Unable to submit challenge." }); } };
const leaderboard = async (req, res) => { try { const rows = await ChallengeAttempt.aggregate([{ $group: { _id: "$userId", points: { $sum: "$points" }, completed: { $sum: 1 }, averageScore: { $avg: "$score" } } }, { $sort: { points: -1, completed: -1 } }, { $limit: 25 }]); const users = await User.find({ _id: { $in: rows.map((row) => row._id) } }).select("name").lean(); const names = new Map(users.map((user) => [String(user._id), user.name])); res.json({ leaderboard: rows.map((row, index) => ({ position: index + 1, name: names.get(String(row._id)) || "Candidate", points: row.points, completed: row.completed, averageScore: Math.round(row.averageScore || 0), current: String(row._id) === String(req.userId) })) }); } catch (error) { res.status(500).json({ message: "Unable to load leaderboard." }); } };
module.exports = { listChallenges, submitChallenge, leaderboard };
