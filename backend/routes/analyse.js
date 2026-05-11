const express = require("express");
const multer = require("multer");
const Groq = require("groq-sdk");
const pdfParse = require("pdf-parse");
const pool = require("../db");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."), false);
    }
  }
});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/analyse", upload.single("resume"), async (req, res) => {
  try {
    let resumeText = req.body.resumeText || "";
    const jobDescription = req.body.jobDescription;

    if (req.file) {
      const parsed = await pdfParse(req.file.buffer);
      resumeText = parsed.text;
      if (!resumeText || resumeText.trim() === "") {
        return res.status(400).json({ error: "Could not extract text from PDF. Try a text-based PDF or paste your resume manually." });
      }
    }

    if (!resumeText || resumeText.trim() === "") {
      return res.status(400).json({ error: "No resume content found. Please upload a PDF or paste your resume text." });
    }
    if (!jobDescription) {
      return res.status(400).json({ error: "Job description is required." });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert ATS and HR analyst. Always respond with valid JSON only. No markdown, no backticks, no extra text."
        },
        {
          role: "user",
          content: `Analyse this resume against the job description.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Respond ONLY with this exact JSON format:
{
  "matchScore": <number between 0-100>,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["tip1", "tip2", "tip3"],
  "summary": "2-3 sentence assessment",
  "hiringChance": "Low or Medium or High or Very High"
}`
        }
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    await pool.query(
      `INSERT INTO analyses (resume_text, job_description, result) VALUES ($1, $2, $3)`,
      [resumeText.substring(0, 500), jobDescription.substring(0, 500), JSON.stringify(result)]
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM analyses ORDER BY created_at DESC LIMIT 20"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;