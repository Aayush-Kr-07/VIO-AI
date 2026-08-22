const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");
const { calculateForUser } = require("./readinesscontroller.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const difficultyLevels = ["Easy", "Medium", "Hard"];

const getPerformanceLevel = (score) => {
  if (score >= 80) return "Strong";
  if (score >= 50) return "Average";
  return "Weak";
};

const getNextDifficulty = (difficulty, performanceLevel) => {
  const currentIndex = Math.max(0, difficultyLevels.indexOf(difficulty));
  const change =
    performanceLevel === "Strong" ? 1 : performanceLevel === "Weak" ? -1 : 0;
  const nextIndex = Math.max(
    0,
    Math.min(difficultyLevels.length - 1, currentIndex + change),
  );
  return difficultyLevels[nextIndex];
};

const isSkippedAnswer = (answer) =>
  /^(skip|pass|next|i\s+(don'?t|do\s+not|cant|can\s*not)\s+know|no\s+idea|not\s+sure|move\s+on)([\s.!?]|$)/i.test(
    answer.trim(),
  );

const normalizeQuestion = (question) =>
  question.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

const isDuplicateQuestion = (candidate, previousQuestions) => {
  const normalizedCandidate = normalizeQuestion(candidate);
  return previousQuestions.some((question) => {
    const normalizedPrevious = normalizeQuestion(question);
    if (normalizedCandidate === normalizedPrevious) return true;
    const candidateWords = new Set(normalizedCandidate.split(" "));
    const previousWords = new Set(normalizedPrevious.split(" "));
    const overlap = [...candidateWords].filter((word) => previousWords.has(word));
    return overlap.length / Math.max(candidateWords.size, previousWords.size) > 0.82;
  });
};

const isCodingQuestion = (question) =>
  /\b(?:write|implement|create|build|develop|code|program|script)\b.{0,40}\b(?:function|class|program|script|code|solution|algorithm)\b|\b(?:provide|show|give)\s+(?:the\s+)?code\b|\bsolve\s+(?:this|the)\s+(?:coding|programming)\b/i.test(
    question,
  );

const generateQuestion = async ({ domain, difficulty, previousQuestions, answer }) => {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const questionResponse = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are a senior ${domain} technical interviewer.
Generate exactly one original interview question for the selected domain.
The question must be ${difficulty} difficulty, specific, professional, and answerable in natural language.
Ask only conceptual, definition, comparison, explanation, or real-world scenario questions.
Do not ask the candidate to write, implement, create, build, or provide any program, code, script, function, class, algorithm, or solution.
Do not ask for code snippets, coding exercises, or output from code.
Never repeat or paraphrase a previous question.
Return ONLY the question text, with no numbering, preamble, feedback, or commentary.`,
          },
          {
            role: "user",
            content: `Previous questions:
${previousQuestions.join("\n- ") || "None"}

${answer ? `The candidate's previous answer was: "${answer.substring(0, 500)}"` : "This is the first question."}

Generate a new ${difficulty} difficulty ${domain} interview question now.`,
          },
        ],
        temperature: 0.9,
          max_tokens: 300,
          reasoning_effort: "low",
      });
        const question = questionResponse.choices?.[0]?.message?.content
          ?.replace(/^\s*(?:\*\*Question:\*\*|Question:)\s*/i, "")
          .trim();

      if (
        question &&
        !isCodingQuestion(question) &&
        !isDuplicateQuestion(question, previousQuestions)
      ) {
        return question;
      }

      lastError = new Error(
        "AI generated an empty, duplicate, or coding-task question",
      );
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error("AI could not generate a unique interview question");
  error.cause = lastError;
  error.statusCode = 503;
  throw error;
};

// ── Start Interview ───────────────────────────────────────
const startInterview = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ message: "Domain is required" });

    const firstQuestion = await generateQuestion({
      domain,
      difficulty: "Easy",
      previousQuestions: [],
    });

    const interview = await Interview.create({
      userId: req.userId,
      domain,
      messages: [{ role: "ai", content: firstQuestion }],
    });

    res.status(201).json({
      sessionId: interview._id,
      question: firstQuestion,
      difficulty: interview.difficulty,
    });
  } catch (err) {
    console.error("startInterview error:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: "Failed to start interview", error: err.message });
  }
};

// ── Submit Answer ─────────────────────────────────────────
const submitAnswer = async (req, res) => {
  try {
    const {
      sessionId,
      answer,
      domain = "General",
      questionsAnswered = 0,
    } = req.body;

    if (!sessionId || !answer)
      return res.status(400).json({ message: "Missing required fields" });

    const interview = await Interview.findOne({
      _id: sessionId,
      userId: req.userId,
    });
    if (!interview)
      return res.status(404).json({ message: "Session not found" });

    // 1️⃣ Generate feedback on the answer
    let feedback = "Focus on technical precision and support your answer with a concrete example.";
    let answerScore = 50;
    const currentQuestion = [...interview.messages]
      .reverse()
      .find((message) => message.role === "ai")?.content;

    if (isSkippedAnswer(answer)) {
      answerScore = 0;
      feedback = "This question was skipped, so it received 0 points.";
    } else {
      try {
        const feedbackResponse = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: `You are an expert ${domain} interview evaluator.
Score the candidate's answer against the question, then provide constructive feedback in 2-3 sentences.
Use this scoring rubric:
- 0: skipped, no answer, or completely irrelevant
- 1-49: weak understanding, major inaccuracies, or insufficient detail
- 50-79: partially correct and relevant, but missing depth or clarity
- 80-100: technically accurate, clear, detailed, and demonstrates strong understanding

Question: "${currentQuestion || "No question available"}"
Answer: "${answer}"

Return ONLY valid JSON in this exact shape: {"score": 0, "feedback": "..."}
The score must be an integer from 0 to 100. Do not include markdown or extra text.`,
            },
          ],
          temperature: 0.3,
           max_tokens: 400,
           reasoning_effort: "low",
        });

        const evaluatorText = feedbackResponse.choices[0].message.content.trim();
        try {
          const parsed = JSON.parse(evaluatorText);
          const parsedScore = Number(parsed.score);
          answerScore = Number.isFinite(parsedScore)
            ? Math.round(Math.max(0, Math.min(100, parsedScore)))
            : 0;
          feedback = typeof parsed.feedback === "string" ? parsed.feedback : feedback;
        } catch {
          feedback = evaluatorText || feedback;
          answerScore = 0;
        }
      } catch (err) {
        console.error("Answer evaluation failed; continuing to next question:", err.message);
      }
    }

    const isComplete = questionsAnswered >= 9; // complete after at least 10 answered questions (0-9)

    // 2️⃣ Save messages to DB
    interview.messages.push({
      role: "user",
      content: answer,
      timestamp: new Date(),
    });
    interview.feedback = [interview.feedback, feedback].filter(Boolean).join("\n\n");
    interview.questionsAnswered = questionsAnswered + 1;
    interview.answerScores.push(answerScore);
    const performanceLevel = getPerformanceLevel(answerScore);
    interview.difficulty = getNextDifficulty(
      interview.difficulty,
      performanceLevel,
    );

    // ── Complete path ──────────────────────────────────────
    if (isComplete) {
      interview.score = Math.round(
        interview.answerScores.reduce((sum, value) => sum + value, 0) /
          interview.answerScores.length,
      );
      interview.isComplete = true;
      interview.duration = Math.max(
        1,
        Math.round((Date.now() - interview.createdAt.getTime()) / 60000),
      );
      interview.improvementSuggestions = interview.feedback;
      await interview.save();
      calculateForUser(req.userId).catch((error) =>
        console.error("Readiness recalculation failed:", error.message),
      );
      return res.json({
        score: interview.score,
        answerScore,
        performanceLevel,
        difficulty: interview.difficulty,
        isComplete: true,
      });
    }

    // ── Continue path ──────────────────────────────────────
    const questionHistory = interview.messages
      .filter((message) => message.role === "ai")
      .map((message) => message.content);
    const nextQuestion = await generateQuestion({
      domain,
      difficulty: interview.difficulty,
      previousQuestions: questionHistory,
      answer,
    });

    interview.messages.push({
      role: "ai",
      content: nextQuestion,
      timestamp: new Date(),
    });

    await interview.save();

    return res.json({
      nextQuestion,
      answerScore,
      performanceLevel,
      difficulty: interview.difficulty,
      isComplete: false,
    });
  } catch (err) {
    console.error("submitAnswer error:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: "Internal server error", error: err.message });
  }
};

const finishInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const interview = await Interview.findOne({
      _id: sessionId,
      userId: req.userId,
    });
    if (!interview) return res.status(404).json({ message: "Session not found" });

    if (!interview.isComplete) {
      interview.isComplete = true;
      interview.duration = Math.max(
        3,
        Math.round((Date.now() - interview.createdAt.getTime()) / 60000),
      );
      interview.score = interview.answerScores.length
        ? Math.round(
            interview.answerScores.reduce((sum, value) => sum + value, 0) /
              interview.answerScores.length,
          )
        : 0;
      interview.improvementSuggestions =
        interview.feedback ||
        "Answer with more technical detail and concrete examples.";
      await interview.save();
      calculateForUser(req.userId).catch((error) =>
        console.error("Readiness recalculation failed:", error.message),
      );
    }

    return res.json({ score: interview.score, isComplete: true });
  } catch (err) {
    console.error("finishInterview error:", err);
    return res
      .status(500)
      .json({ message: "Failed to finish interview", error: err.message });
  }
};

const deleteInterview = async (req, res) => {
  try {
    const deleted = await Interview.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!deleted) return res.status(404).json({ message: "Interview not found" });
    return res.json({ message: "Interview deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete interview", error: err.message });
  }
};
// ── Get All Completed Interviews ──────────────────────────
const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId,
      isComplete: true,
    })
      .select("domain score duration questionsAnswered createdAt")
      .sort({ createdAt: -1 });

    const mapped = interviews.map((i) => ({
      id: i._id,
      topic: i.domain,
      score: i.score,
      duration: i.duration,
      date: i.createdAt,
    }));

    res.json({ interviews: mapped });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch interviews", error: err.message });
  }
};

// ── Get Single Interview ──────────────────────────────────
const getInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!interview)
      return res.status(404).json({ message: "Interview not found" });
    res.json({ interview });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  getInterviews,
  getInterview,
  finishInterview,
  deleteInterview,
};