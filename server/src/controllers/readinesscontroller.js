const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");
const Readiness = require("../models/Readiness.js");
const User = require("../user.js");

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;
const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const roadmapCategories = new Set([
  "technology",
  "project",
  "certification",
  "interview",
]);
const candidateTypes = [
  "Fresher",
  "Internship Seeker",
  "Experienced Candidate",
];

const clamp = (value) =>
  Math.round(Math.max(0, Math.min(100, Number(value) || 0)));

const evaluateReadiness = async ({
  candidateType,
  resumeAnalysis,
  skillAssessment,
  interviews,
}) => {
  if (!groq) {
    throw new Error("GROQ_API_KEY is required for AI readiness evaluation");
  }
  try {
    const response = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        {
          role: "user",
          content: `Evaluate this candidate's actual placement readiness from the evidence below. Return valid JSON only.

Candidate type: ${candidateType}
Resume analysis: ${JSON.stringify(resumeAnalysis || null)}
Skill assessment supplied by the candidate: ${JSON.stringify(skillAssessment || null)}
Completed interview performance records: ${JSON.stringify(interviews)}

Judge demonstrated performance, not the amount of data available. Do not use fixed weights, arbitrary averages, generic thresholds, or assumptions. Missing evidence must reduce confidence, not be treated as a strong score. Compare the candidate's demonstrated skills and interview performance with realistic expectations for their candidate type and resume profile. Use the interview scores, answer scores, feedback, domains, difficulty, questions answered, and improvement suggestions when present. Never invent achievements, skills, or interview evidence.

Return exactly this shape:
{
  "score": 0,
  "classification": "Placement Ready|High Potential Candidate|Needs Improvement|Insufficient Evidence",
  "confidence": 0,
  "summary": "brief evidence-based explanation",
  "strengths": ["observed strength"],
  "weaknesses": ["observed weakness or missing evidence"],
  "components": {"resume": 0, "interview": 0, "skills": 0},
  "gaps": {"technical": ["specific evidence-based gap"], "communication": ["specific evidence-based gap"], "industry": ["specific evidence-based gap"]},
  "roadmap": [{"category":"technology|project|certification|interview", "title":"specific action", "reason":"tie it to evidence", "priority":"high|medium|low"}]
}

All numeric values must be integers from 0 to 100. Make the components independent evidence assessments, not a weighted formula. Return only actions justified by the supplied evidence.`,
        },
      ],
    });
    const raw = response.choices?.[0]?.message?.content || "";
    const match = raw.match(/\{[\s\S]*\}/);
    const evaluation = match ? JSON.parse(match[0]) : null;
    if (!evaluation || !Number.isFinite(Number(evaluation.score))) {
      throw new Error("AI returned an invalid readiness evaluation");
    }
    return {
      ...evaluation,
      score: clamp(evaluation.score),
      confidence: clamp(evaluation.confidence),
      components: {
        resume: clamp(evaluation.components?.resume),
        interview: clamp(evaluation.components?.interview),
        skills: clamp(evaluation.components?.skills),
      },
      gaps: {
        technical: Array.isArray(evaluation.gaps?.technical)
          ? evaluation.gaps.technical
          : [],
        communication: Array.isArray(evaluation.gaps?.communication)
          ? evaluation.gaps.communication
          : [],
        industry: Array.isArray(evaluation.gaps?.industry)
          ? evaluation.gaps.industry
          : [],
      },
      roadmap: Array.isArray(evaluation.roadmap)
        ? evaluation.roadmap
            .filter(
              (item) =>
                roadmapCategories.has(item?.category) &&
                typeof item?.title === "string" &&
                typeof item?.reason === "string",
            )
            .slice(0, 8)
        : [],
    };
  } catch (error) {
    console.error("AI readiness evaluation failed:", error.message);
    throw error;
  }
};

const calculateForUser = async (userId, input = {}) => {
  const saved = await Readiness.findOne({ userId }).lean();
  const user = await User.findById(userId).select("resumeAnalysis").lean();
  const candidateType =
    input.candidateType || saved?.candidateType || "Fresher";
  const resumeAnalysis =
    input.resumeAnalysis ||
    saved?.resumeAnalysis ||
    user?.resumeAnalysis ||
    null;
  const skillAssessment = null;
  if (!candidateTypes.includes(candidateType))
    throw new Error("Invalid candidate type");
  const interviews = await Interview.find({ userId, isComplete: true })
    .select("score feedback improvementSuggestions domain difficulty questionsAnswered answerScores duration createdAt")
    .lean();
  const evaluation = await evaluateReadiness({
    candidateType,
    resumeAnalysis,
    skillAssessment,
    interviews,
  });
  const snapshot = {
    ...evaluation,
    candidateType,
    createdAt: new Date(),
  };
  const readiness = await Readiness.findOneAndUpdate(
    { userId },
    {
      $set: {
        candidateType,
        resumeAnalysis,
        skillAssessment,
        current: snapshot,
        updatedAt: new Date(),
      },
      $push: { history: snapshot },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return { ...snapshot, history: readiness.history };
};

const calculateReadiness = async (req, res) => {
  try {
    return res.json({
      readiness: await calculateForUser(req.userId, req.body),
    });
  } catch (error) {
    console.error("calculateReadiness error:", error);
    return res
      .status(500)
      .json({
        message: "Failed to calculate placement readiness",
        error: error.message,
      });
  }
};

const getReadiness = async (req, res) => {
  const readiness = await Readiness.findOne({ userId: req.userId }).lean();
  return res.json({
    readiness: readiness
      ? {
          ...readiness.current,
          candidateType: readiness.candidateType,
          history: readiness.history,
        }
      : null,
  });
};

module.exports = { calculateReadiness, getReadiness };
module.exports = { calculateReadiness, getReadiness, calculateForUser };
