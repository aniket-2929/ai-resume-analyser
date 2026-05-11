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

    // ── Call 1: Existing Resume vs JD Match Analysis (unchanged) ──
    const matchCompletion = await groq.chat.completions.create({
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

    const matchRaw = matchCompletion.choices[0].message.content;
    const matchClean = matchRaw.replace(/```json|```/g, "").trim();
    const matchResult = JSON.parse(matchClean);

    // ── Call 2: New Independent ATS Resume Quality Score ──
    const atsCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a professional ATS (Applicant Tracking System) resume quality evaluator. Always respond with valid JSON only. No markdown, no backticks, no extra text."
        },
        {
          role: "user",
          content: `Evaluate this resume for ATS quality and formatting. This is INDEPENDENT of any job description — evaluate the resume itself.

RESUME:
${resumeText}

Score the resume on these 8 criteria (each 0-100):
1. formatting: Is it clean, consistent, ATS-parseable? No tables/columns/graphics?
2. sections: Are key sections present? (Contact, Summary, Experience, Education, Skills)
3. keywords: Does it use strong industry keywords and action verbs?
4. readability: Is it concise, clear, well-structured?
5. skills: Is there a dedicated skills section with relevant technical/soft skills?
6. experience: Are experience entries detailed with achievements and metrics?
7. education: Is education section present and properly formatted?
8. structure: Is the overall resume structure logical and professional?

Respond ONLY with this exact JSON format:
{
  "atsScore": <overall weighted score 0-100>,
  "breakdown": {
    "formatting": <0-100>,
    "sections": <0-100>,
    "keywords": <0-100>,
    "readability": <0-100>,
    "skills": <0-100>,
    "experience": <0-100>,
    "education": <0-100>,
    "structure": <0-100>
  },
  "atsSuggestions": ["suggestion1", "suggestion2", "suggestion3", "suggestion4"],
  "missingSections": ["section1", "section2"],
  "atsWeaknesses": ["weakness1", "weakness2", "weakness3"],
  "atsStrengths": ["strength1", "strength2"],
  "atsVerdict": "Poor or Average or Good or Excellent"
}`
        }
      ],
      temperature: 0.2,
    });

    const atsRaw = atsCompletion.choices[0].message.content;
    const atsClean = atsRaw.replace(/```json|```/g, "").trim();
    const atsResult = JSON.parse(atsClean);

    // ── Merge both results into single response ──
    const result = { ...matchResult, ats: atsResult };

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