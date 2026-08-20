const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const systemPrompt = (domain) =>
  `
You are a senior technical interviewer conducting a mock interview for a ${domain} developer role.
Ask exactly one clear, specific technical question at a time.
When the candidate sends an answer, immediately ask the next question.
Never provide feedback, scoring, explanations, greetings, or commentary during the interview.
Return ONLY the question text.
`.trim();

const normalizeQuestion = (question) =>
  question.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

const fallbackQuestions = (domain) => [
  `How would you design a reliable ${domain} solution for a sudden increase in traffic?`,
  `What debugging process would you use when a ${domain} feature works locally but fails in production?`,
  `How would you test a complex ${domain} component or service before releasing it?`,
  `What are the most important security risks to consider in a ${domain} application?`,
  `How would you improve the performance of a slow ${domain} application?`,
  `How would you structure error handling in a production ${domain} system?`,
  `What trade-offs would you evaluate when choosing between two ${domain} architectures?`,
  `How would you monitor and troubleshoot a ${domain} system after deployment?`,
  `How would you make a ${domain} codebase easier for a team to maintain?`,
  `Describe how you would safely introduce a breaking change in a ${domain} project?`,
];

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

// ── Start Interview ───────────────────────────────────────
const startInterview = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ message: "Domain is required" });

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt(domain) },
        {
          role: "user",
          content: `Start the interview. Ask me the first ${domain} technical question. Only ask the question, no preamble.`,
        },
      ],
      temperature: 0.7,
    });

    const firstQuestion =
      completion.choices[0].message.content ||
      "Tell me about yourself and your experience.";

    const interview = await Interview.create({
      userId: req.userId,
      domain,
      messages: [{ role: "ai", content: firstQuestion }],
    });

    res.status(201).json({
      sessionId: interview._id,
      question: firstQuestion,
    });
  } catch (err) {
    console.error("startInterview error:", err);
    res
      .status(500)
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
    try {
      const feedbackResponse = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: `You are an expert ${domain} interview evaluator.
Provide constructive feedback on this interview answer in 2-3 sentences.
Focus on:
- Clarity and structure of the response
- Technical accuracy and depth
- Communication skills
- Name the most important weakness and give one concrete way to improve it

Answer: "${answer}"

Return ONLY valid JSON in this exact shape: {"score": 0, "feedback": "..."}
The score must be an integer from 10 to 100. Do not include markdown or extra text.`
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const evaluatorText = feedbackResponse.choices[0].message.content.trim();
      try {
        const parsed = JSON.parse(evaluatorText);
        answerScore = Math.max(10, Math.min(100, Number(parsed.score) || 50));
        feedback = typeof parsed.feedback === "string" ? parsed.feedback : feedback;
      } catch {
        feedback = evaluatorText || feedback;
      }
    } catch (err) {
      console.error("Answer evaluation failed; continuing to next question:", err.message);
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
      return res.json({ score: interview.score, isComplete: true });
    }

    // ── Continue path ──────────────────────────────────────
    const questionHistory = interview.messages
      .filter((message) => message.role === "ai")
      .map((message) => message.content);
    const availableFallbacks = fallbackQuestions(domain);
    let nextQuestion = availableFallbacks.find(
      (question) => !isDuplicateQuestion(question, questionHistory),
    ) || `${domain}: What is a technical decision you would revisit in this project, and why?`;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const nextQuestionResponse = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: `You are an expert ${domain} interviewer. Generate the NEXT interview question based on the previous answer.
Do not repeat or paraphrase any question from this list:
- ${questionHistory.join("\n- ") || "None"}
The question should:
- Be different from typical generic interview questions
- Build on topics relevant to ${domain}
- Be open-ended and professional
- Test deeper understanding of the domain

Previous answer context: "${answer.substring(0, 100)}..."

Return ONLY the new question, nothing else.`,
            },
          ],
          temperature: 0.9,
          max_tokens: 150,
        });
        const generatedQuestion = nextQuestionResponse.choices[0].message.content.trim();
        if (generatedQuestion && !isDuplicateQuestion(generatedQuestion, questionHistory)) {
          nextQuestion = generatedQuestion;
          break;
        }
      } catch (err) {
        console.error("Next question generation failed; using fallback:", err.message);
      }
    }

    interview.messages.push({
      role: "ai",
      content: nextQuestion,
      timestamp: new Date(),
    });

    await interview.save();

    return res.json({ nextQuestion, isComplete: false });
  } catch (err) {
    console.error("submitAnswer error:", err);
    res
      .status(500)
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