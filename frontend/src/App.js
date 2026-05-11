import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

const BACKEND_URL = "https://ai-resume-analyser-tg33.onrender.com";

/* ── ATS Score Ring (smaller, for ATS section) ── */
function AtsRing({ score }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" aria-label={`ATS score: ${score}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)" }}/>
      <text x="50" y="46" textAnchor="middle" fill={color}
        style={{ fontSize: 20, fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>{score}%</text>
      <text x="50" y="60" textAnchor="middle" fill="#475569"
        style={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }}>ATS</text>
    </svg>
  );
}

/* ── ATS Breakdown Bar ── */
function AtsBar({ label, score }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="ats-bar-row">
      <div className="ats-bar-label-row">
        <span className="ats-bar-name">{label}</span>
        <span className="ats-bar-score" style={{ color }}>{score}%</span>
      </div>
      <div className="ats-bar-track">
        <div className="ats-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}
/* ── Score Ring ── */
function ScoreRing({ score }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 52, circ = 2 * Math.PI * r;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" aria-label={`Match score: ${score}%`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 65 65)"
        style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)" }}/>
      <text x="65" y="60" textAnchor="middle" fill={color}
        style={{ fontSize: 26, fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>{score}%</text>
      <text x="65" y="78" textAnchor="middle" fill="#475569"
        style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.5 }}>MATCH</text>
    </svg>
  );
}

/* ── Skill Pill ── */
function Pill({ text, type }) {
  return (
    <span className={`pill ${type === "matched" ? "pill-matched" : "pill-missing"}`}>
      {type === "matched" ? "✓" : "✗"} {text}
    </span>
  );
}

/* ── Step Indicator ── */
function Steps({ current }) {
  const steps = ["Upload Resume", "Job Description", "AI Analysis"];
  return (
    <div className="steps" role="list" aria-label="Progress steps">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div className={`step ${state}`} role="listitem">
              <div className="step-num">{i < current ? "✓" : i + 1}</div>
              <span>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ value, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  /* ── All existing handlers preserved exactly ── */
  const handleFileChange = (file) => {
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
      setResumeText("");
      setError("");
    } else {
      setError("Please upload a PDF file only.");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyse = async () => {
    if (!resumeText && !resumeFile) return setError("Upload a PDF resume or paste resume text.");
    if (!jobDesc.trim()) return setError("Please paste a job description.");
    setError(""); setLoading(true);
    try {
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      formData.append("resumeText", resumeText);
      formData.append("jobDescription", jobDesc);
      const { data } = await axios.post(`${BACKEND_URL}/api/analyse`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(data);
    } catch (e) {
      setError("Analysis failed: " + (e.response?.data?.error || e.message));
    }
    setLoading(false);
  };

  const downloadReport = () => {
    const ats = result.ats || {};
    const breakdown = ats.breakdown || {};
    const text = `AI RESUME ANALYSIS REPORT
Match Score: ${result.matchScore}%
Hiring Chance: ${result.hiringChance}

Summary: ${result.summary}

Matched Skills: ${result.matchedSkills.join(", ")}
Missing Skills: ${result.missingSkills.join(", ")}

Strengths:
${result.strengths.map(s => "• " + s).join("\n")}

Improvements:
${result.improvements.map(s => "• " + s).join("\n")}

--- ATS RESUME QUALITY SCORE ---
ATS Score: ${ats.atsScore || "N/A"}%
Verdict: ${ats.atsVerdict || "N/A"}

Breakdown:
${Object.entries(breakdown).map(([k, v]) => `  ${k}: ${v}%`).join("\n")}

ATS Strengths:
${(ats.atsStrengths || []).map(s => "• " + s).join("\n")}

ATS Weaknesses:
${(ats.atsWeaknesses || []).map(s => "• " + s).join("\n")}

Missing Sections:
${(ats.missingSections || []).map(s => "• " + s).join("\n")}

ATS Suggestions:
${(ats.atsSuggestions || []).map(s => "• " + s).join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resume_analysis.txt";
    a.click();
  };

  const chanceColor = { Low: "#ef4444", Medium: "#f59e0b", High: "#22c55e", "Very High": "#06b6d4" };
  const chanceEmoji = { Low: "⚠️", Medium: "📊", High: "✅", "Very High": "🚀" };
  const scoreColor = result ? (result.matchScore >= 75 ? "#22c55e" : result.matchScore >= 50 ? "#f59e0b" : "#ef4444") : "#6366f1";
  const atsVerdictColor = { Poor: "#ef4444", Average: "#f59e0b", Good: "#22c55e", Excellent: "#06b6d4" };
  const atsVerdictEmoji = { Poor: "🚨", Average: "📊", Good: "✅", Excellent: "🌟" };
  const atsBreakdownLabels = {
    formatting: "Formatting",
    sections: "Sections",
    keywords: "Keywords",
    readability: "Readability",
    skills: "Skills Section",
    experience: "Experience",
    education: "Education",
    structure: "Structure"
  };
  const currentStep = result ? 2 : (resumeFile || resumeText) ? 1 : 0;

  return (
    <div className="app">
      <div className="bg-mesh" aria-hidden="true" />

      {/* ── Navbar ── */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <div className="navbar-logo" aria-hidden="true">🎯</div>
            <span className="navbar-name">ResumeAI</span>
          </div>
          <span className="navbar-tag">AI Powered</span>
        </div>
      </nav>

      <main className="container">
        {/* ── Hero ── */}
        <header className="hero">
          <div className="hero-eyebrow" aria-hidden="true">
            <span className="hero-eyebrow-dot" />
            ATS Resume Analyzer
          </div>
          <h1 className="hero-title">Match Your Resume<br />to Any Job</h1>
          <p className="hero-subtitle">
            Upload your resume, paste a job description, and get instant AI-powered insights to land your next role.
          </p>
        </header>

        <Steps current={currentStep} />

        {!result ? (
          /* ── Input Form ── */
          <div className="fade-in">
            {/* Resume Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon purple" aria-hidden="true">📄</div>
                <div>
                  <div className="card-title">Your Resume</div>
                  <div className="card-subtitle">Upload PDF or paste text</div>
                </div>
              </div>

              {/* Dropzone */}
              <div
                className={`dropzone${dragActive ? " active" : ""}${resumeFile ? " has-file" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload PDF resume by clicking or dragging"
                onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={e => handleFileChange(e.target.files[0])}
                  style={{ display: "none" }}
                  aria-hidden="true"
                />
                {resumeFile ? (
                  <div className="file-info">
                    <div className="file-icon-wrap" aria-hidden="true">📄</div>
                    <div className="file-details">
                      <div className="file-name">{resumeFile.name}</div>
                      <div className="file-size">{(resumeFile.size / 1024).toFixed(1)} KB • PDF</div>
                    </div>
                    <button
                      className="remove-file"
                      onClick={e => { e.stopPropagation(); setResumeFile(null); }}
                      aria-label="Remove uploaded file"
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon-wrap" aria-hidden="true">📤</div>
                    <div className="upload-text">Drop your PDF here or click to browse</div>
                    <div className="upload-hint">PDF only • Max 5MB</div>
                  </>
                )}
              </div>

              <div className="divider">or paste resume text</div>

              <textarea
                placeholder="Paste your resume text here..."
                value={resumeText}
                onChange={e => { setResumeText(e.target.value); if (e.target.value.trim()) setResumeFile(null); }}
                disabled={!!resumeFile}
                aria-label="Resume text input"
                aria-disabled={!!resumeFile}
              />
            </div>

            {/* Job Description Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon cyan" aria-hidden="true">💼</div>
                <div>
                  <div className="card-title">Job Description</div>
                  <div className="card-subtitle">Paste the full JD for best results</div>
                </div>
              </div>
              <textarea
                placeholder="Paste the full job description here..."
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                style={{ minHeight: 180 }}
                aria-label="Job description input"
              />
            </div>

            {error && (
              <div className="error-box" role="alert" aria-live="polite">
                <span className="error-icon" aria-hidden="true">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn-primary"
              onClick={handleAnalyse}
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Analysing resume..." : "Analyse my resume"}
            >
              {loading ? (
                <span className="loading-state">
                  <span className="spinner" aria-hidden="true" />
                  {resumeFile ? "Parsing PDF & Analysing..." : "Analysing..."}
                </span>
              ) : "🔍 Analyse My Resume"}
            </button>
          </div>

        ) : (
          /* ── Results ── */
          <div className="fade-in">
            {/* Score Hero Card */}
            <div className="card">
              <div className="result-hero">
                <div className="score-wrap">
                  <ScoreRing score={result.matchScore} />
                </div>
                <div className="result-meta">
                  <div
                    className="hiring-badge"
                    style={{
                      color: chanceColor[result.hiringChance],
                      border: `1px solid ${chanceColor[result.hiringChance]}40`,
                      background: `${chanceColor[result.hiringChance]}12`,
                    }}
                    aria-label={`Hiring chance: ${result.hiringChance}`}
                  >
                    <span aria-hidden="true">{chanceEmoji[result.hiringChance]}</span>
                    {result.hiringChance} Hiring Chance
                  </div>
                  <p className="result-summary">{result.summary}</p>

                  {/* Score Bar */}
                  <div className="score-bar-wrap" aria-label={`ATS match score: ${result.matchScore}%`}>
                    <div className="score-bar-label">
                      <span>ATS Match Score</span>
                      <span style={{ color: scoreColor, fontWeight: 700 }}>{result.matchScore}%</span>
                    </div>
                    <div className="score-bar-track">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${result.matchScore}%`, background: scoreColor }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
              <StatCard
                value={result.matchedSkills.length}
                label="Matched Skills"
                color="#22c55e"
              />
              <StatCard
                value={result.missingSkills.length}
                label="Missing Skills"
                color="#ef4444"
              />
              <StatCard
                value={result.strengths.length}
                label="Strengths Found"
                color="#6366f1"
              />
            </div>

            {/* Skills Grid */}
            <div className="grid-2">
              <div className="card">
                <div className="sec-label">
                  <span aria-hidden="true">✅</span>
                  Matched Skills ({result.matchedSkills.length})
                </div>
                {result.matchedSkills.length > 0
                  ? result.matchedSkills.map((s, i) => <Pill key={i} text={s} type="matched" />)
                  : <div className="empty-state">No matched skills found</div>
                }
              </div>

              <div className="card">
                <div className="sec-label">
                  <span aria-hidden="true">❌</span>
                  Missing Skills ({result.missingSkills.length})
                </div>
                {result.missingSkills.length > 0
                  ? result.missingSkills.map((s, i) => <Pill key={i} text={s} type="missing" />)
                  : <div className="empty-state">No missing skills — great match!</div>
                }
              </div>

              <div className="card">
                <div className="sec-label">
                  <span aria-hidden="true">💪</span>
                  Your Strengths
                </div>
                {result.strengths.map((s, i) => (
                  <div key={i} className="list-item">
                    <div className="list-dot green" aria-hidden="true">▸</div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="sec-label">
                  <span aria-hidden="true">🚀</span>
                  How to Improve
                </div>
                {result.improvements.map((s, i) => (
                  <div key={i} className="list-item">
                    <div className="list-dot amber" aria-hidden="true">▸</div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ATS Resume Quality Score Section ── */}
            {result.ats && (
              <>
                {/* ATS Score Hero */}
                <div className="ats-section-divider">
                  <span className="ats-section-label">🤖 ATS Resume Quality Score</span>
                  <span className="ats-section-sub">Independent resume quality evaluation</span>
                </div>

                <div className="card ats-hero-card">
                  <div className="ats-hero">
                    <div className="ats-ring-wrap">
                      <AtsRing score={result.ats.atsScore} />
                      <div
                        className="ats-verdict-badge"
                        style={{
                          color: atsVerdictColor[result.ats.atsVerdict],
                          border: `1px solid ${atsVerdictColor[result.ats.atsVerdict]}40`,
                          background: `${atsVerdictColor[result.ats.atsVerdict]}12`,
                        }}
                      >
                        <span aria-hidden="true">{atsVerdictEmoji[result.ats.atsVerdict]}</span>
                        {result.ats.atsVerdict}
                      </div>
                    </div>

                    <div className="ats-breakdown">
                      <div className="ats-breakdown-title">Score Breakdown</div>
                      {Object.entries(result.ats.breakdown || {}).map(([key, val]) => (
                        <AtsBar key={key} label={atsBreakdownLabels[key] || key} score={val} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* ATS Strengths & Weaknesses */}
                <div className="grid-2">
                  <div className="card">
                    <div className="sec-label">
                      <span aria-hidden="true">✨</span>
                      ATS Strengths ({(result.ats.atsStrengths || []).length})
                    </div>
                    {(result.ats.atsStrengths || []).length > 0
                      ? result.ats.atsStrengths.map((s, i) => (
                          <div key={i} className="list-item">
                            <div className="list-dot green" aria-hidden="true">▸</div>
                            <span>{s}</span>
                          </div>
                        ))
                      : <div className="empty-state">No strengths detected</div>
                    }
                  </div>

                  <div className="card">
                    <div className="sec-label">
                      <span aria-hidden="true">⚠️</span>
                      ATS Weaknesses ({(result.ats.atsWeaknesses || []).length})
                    </div>
                    {(result.ats.atsWeaknesses || []).length > 0
                      ? result.ats.atsWeaknesses.map((s, i) => (
                          <div key={i} className="list-item">
                            <div className="list-dot red" aria-hidden="true">▸</div>
                            <span>{s}</span>
                          </div>
                        ))
                      : <div className="empty-state">No major weaknesses found!</div>
                    }
                  </div>
                </div>

                {/* Missing Sections + ATS Suggestions */}
                <div className="grid-2">
                  {(result.ats.missingSections || []).length > 0 && (
                    <div className="card">
                      <div className="sec-label">
                        <span aria-hidden="true">📌</span>
                        Missing Sections
                      </div>
                      {result.ats.missingSections.map((s, i) => (
                        <span key={i} className="pill pill-missing" style={{ margin: 3 }}>
                          ✗ {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="card" style={(result.ats.missingSections || []).length === 0 ? { gridColumn: "1 / -1" } : {}}>
                    <div className="sec-label">
                      <span aria-hidden="true">💡</span>
                      ATS Improvement Tips
                    </div>
                    {(result.ats.atsSuggestions || []).map((s, i) => (
                      <div key={i} className="list-item">
                        <div className="list-dot amber" aria-hidden="true">▸</div>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Action Row */}
            <div className="action-row">
              <button
                className="btn-download"
                onClick={downloadReport}
                aria-label="Download analysis report as text file"
              >
                📥 Download Report
              </button>
              <button
                className="btn-secondary"
                onClick={() => { setResult(null); setResumeFile(null); setResumeText(""); setJobDesc(""); setError(""); }}
                aria-label="Start a new analysis"
              >
                ↩ New Analysis
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
