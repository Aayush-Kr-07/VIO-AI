const pdfParse = require("pdf-parse");
const { Groq } = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let resumeText = "";

    // Extract text based on file type
    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text;
    } else if (
      req.file.mimetype === "text/plain" ||
      req.file.mimetype === "application/msword" ||
      req.file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      resumeText = req.file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ message: "Unsupported file type" });
    }

    if (!resumeText.trim()) {
      return res
        .status(400)
        .json({ message: "Could not extract text from resume" });
    }

    // Send to Groq for analysis
    const message = await groq.messages.create({
      model: "mixtral-8x7b-32768",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this resume and provide:
1. A brief summary of the candidate
2. Key strengths
3. Areas for improvement
4. Overall score (1-10)

Resume:\n${resumeText}`,
        },
      ],
    });

    const analysis =
      message.content[0].type === "text" ? message.content[0].text : "";

    res.status(200).json({
      success: true,
      analysis,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error("Resume analysis error:", error);
    res.status(500).json({
      message: "Error analyzing resume",
      error: error.message,
    });
  }
};

module.exports = { analyzeResume };
