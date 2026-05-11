import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

const BACKEND_URL = "https://ai-resume-analyser-tg33.onrender.com";

function ScoreRing({ score }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 54, circ = 2 * Math.PI * r;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="12"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{transition:"stroke-dasharray 1.2s ease"}}/>
      <text x="70" y="66" textAnchor="middle" fill={color}
        style={{fontSize:28,fontWeight:800,fontFamily:"sans-serif"}}>{score}%</text>
      <text x="70" y="84" textAnchor="middle" fill="#94a3b8"
        style={{fontSize:11,fontFamily:"sans-serif"}}>MATCH</text>
    </svg>
  );
}

function Pill({ text, type }) {
  const s = type === "matched"
    ? {background:"#052e16",border:"1px solid #16a34a",color:"#4ade80"}
    : {background:"#2d0f0f",border:"1px solid #dc2626",color:"#f87171"};
  return (
    <span style={{...s,display:"inline-block",margin:4,padding:"4px 12px",
      borderRadius:999,fontSize:13,fontFamily:"monospace"}}>
      {type === "matched" ? "✓ " : "✗ "}{text}
    </span>
  );
}

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
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
    if (!resumeText && !resumeFile) return setError("Upload a PDF resume or paste text.");
    if (!jobDesc.trim()) return setError("Paste a job description.");
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
    const text = `AI RESUME ANALYSIS REPORT
Match Score: ${result.matchScore}%
Hiring Chance: ${result.hiringChance}

Summary: ${result.summary}

Matched Skills: ${result.matchedSkills.join(", ")}
Missing Skills: ${result.missingSkills.join(", ")}

Strengths:
${result.strengths.map(s => "• " + s).join("\n")}

Improvements:
${result.improvements.map(s => "• " + s).join("\n")}`;
    const blob = new Blob([text], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resume_analysis.txt";
    a.click();
  };

  const chanceColor = {Low:"#ef4444",Medium:"#f59e0b",High:"#22c55e","Very High":"#06b6d4"};

  return (
    <div className="app">
      <div className="bg-orb orb1"/><div className="bg-orb orb2"/>
      <div className="container">
        <div className="header">
          <span className="badge">⚡ AI Powered</span>
          <h1 className="title">Resume Analyser<br/>& Job Matcher</h1>
          <p className="subtitle">Upload resume, paste job description, get instant AI insights.</p>
        </div>

        {!result ? (
          <>
            <div className="card">
              <div className="card-title">📄 Your Resume</div>
              
              <div 
                className={`dropzone ${dragActive ? "active" : ""} ${resumeFile ? "has-file" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".pdf"
                  onChange={e => handleFileChange(e.target.files[0])}
                  style={{display: "none"}}
                />
                {resumeFile ? (
                  <div className="file-info">
                    <span className="file-icon">📄</span>
                    <div>
                      <div className="file-name">{resumeFile.name}</div>
                      <div className="file-size">{(resumeFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button 
                      className="remove-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResumeFile(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">📤</div>
                    <div className="upload-text">Drop PDF here or click to browse</div>
                    <div className="upload-hint">PDF files only • Max 5MB</div>
                  </>
                )}
              </div>

              <div className="divider">OR PASTE RESUME TEXT</div>
              
              <textarea 
                placeholder="Paste your resume text here..."
                value={resumeText} 
                onChange={e => {
                  setResumeText(e.target.value);
                  if (e.target.value.trim()) setResumeFile(null);
                }}
                disabled={!!resumeFile}
                style={{opacity: resumeFile ? 0.5 : 1}}
              />
            </div>

            <div className="card">
              <div className="card-title">💼 Job Description</div>
              <textarea placeholder="Paste the full job description here..."
                value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                style={{minHeight:180}}/>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button className="btn-primary" onClick={handleAnalyse} disabled={loading}>
              {loading ? (
                <span className="loading-state">
                  <span className="spinner"></span>
                  {resumeFile ? "Parsing PDF & Analysing..." : "Analysing..."}
                </span>
              ) : "🔍 ANALYSE MY RESUME"}
            </button>
          </>
        ) : (
          <>
            <div className="card">
              <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
                <ScoreRing score={result.matchScore}/>
                <div>
                  <span className="hiring-badge" style={{
                    color:chanceColor[result.hiringChance],
                    border:`1px solid ${chanceColor[result.hiringChance]}`,
                    background:chanceColor[result.hiringChance]+"18"
                  }}>{result.hiringChance} Hiring Chance</span>
                  <p style={{color:"#94a3b8",fontSize:14,marginTop:8,maxWidth:400,lineHeight:1.6}}>
                    {result.summary}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="sec-label">✅ Matched Skills ({result.matchedSkills.length})</div>
                {result.matchedSkills.map((s,i) => <Pill key={i} text={s} type="matched"/>)}
              </div>
              <div className="card">
                <div className="sec-label">❌ Missing Skills ({result.missingSkills.length})</div>
                {result.missingSkills.map((s,i) => <Pill key={i} text={s} type="missing"/>)}
              </div>
              <div className="card">
                <div className="sec-label">💪 Your Strengths</div>
                {result.strengths.map((s,i) => (
                  <div key={i} style={{padding:"8px 0",borderBottom:"1px solid #0f172a",color:"#cbd5e1",fontSize:14}}>
                    <span style={{color:"#22c55e",marginRight:8}}>▸</span>{s}
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="sec-label">🚀 How to Improve</div>
                {result.improvements.map((s,i) => (
                  <div key={i} style={{padding:"8px 0",borderBottom:"1px solid #0f172a",color:"#cbd5e1",fontSize:14}}>
                    <span style={{color:"#f59e0b",marginRight:8}}>▸</span>{s}
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"flex",gap:12,marginTop:8}}>
              <button className="btn-primary" style={{flex:1}} onClick={downloadReport}>
                📥 Download Report
              </button>
              <button className="btn-secondary" onClick={() => setResult(null)}>
                ↩ New Analysis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}