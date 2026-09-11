import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CandidateStart.css";

const API_URL = "";

export default function CandidateStart() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const examId = searchParams.get("examId");

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [examInfo, setExamInfo] = useState(null);

  useEffect(() => {
    if (!examId) return;
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/candidates/exam-info/${examId}`);
        if (res.ok) {
          const data = await res.json();
          setExamInfo(data);
        }
      } catch (e) {
        console.error("Exam info fetch error:", e);
      }
    };
    fetchInfo();
  }, [examId]);

  const handleStart = async (e) => {
    e.preventDefault();

    setError("");

    if (!examId) {
      setError("Invalid examination link.");
      return;
    }

    if (!name.trim() || !rollNumber.trim() || !course.trim()) {
      setError("Please enter your name, roll number, and course.");
      return;
    }

    const cleanRoll = rollNumber.trim().toUpperCase();

    if (examInfo?.isNonTechnical) {
      if (/^XEVO\/YEN\/T\/\d{3}$/i.test(cleanRoll)) {
        setError("This is a Non-Technical exam. Please enter your Non-Technical roll number (e.g. XEVO/YEN/NT/001).");
        return;
      }
      if (!/^XEVO\/YEN\/NT\/\d{3}$/i.test(cleanRoll)) {
        setError("Invalid roll number format. Non-Technical exams require format XEVO/YEN/NT/001 to XEVO/YEN/NT/800.");
        return;
      }
    } else if (examInfo && !examInfo.isNonTechnical) {
      if (/^XEVO\/YEN\/NT\/\d{3}$/i.test(cleanRoll)) {
        setError("This is a Technical exam. Please enter your Technical roll number (e.g. XEVO/YEN/T/001).");
        return;
      }
      if (!/^XEVO\/YEN\/T\/\d{3}$/i.test(cleanRoll)) {
        setError("Invalid roll number format. Technical exams require format XEVO/YEN/T/001 to XEVO/YEN/T/800.");
        return;
      }
    }

    try {
      setLoading(true);

      console.log("STARTING EXAM:", {
        examId,
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        course: course.trim(),
      });

      const response = await fetch(
        `${API_URL}/api/candidates/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            examId,
            name: name.trim(),
            rollNumber: rollNumber.trim().toUpperCase(),
            course: course.trim(),
          }),
        }
      );

      const contentType = response.headers.get("content-type") || "";
      let data = {};
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      }

      console.log("START EXAM RESPONSE:", data);

      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error("Server is waking up. Please wait 10 seconds and click Start Exam again.");
        }
        throw new Error(
          data.message || `Unable to start examination (${response.status})`
        );
      }

      // Save attempt
      localStorage.setItem(
        "attemptId",
        data.attempt.id
      );

      // Save candidate
      localStorage.setItem(
        "candidate",
        JSON.stringify(data.candidate)
      );

      // Save exam
      localStorage.setItem(
        "exam",
        JSON.stringify(data.exam)
      );

      // Go to exam
      navigate(
        `/candidate/exam/${data.attempt.id}`
      );

    } catch (err) {
      console.error(
        "START EXAM ERROR:",
        err
      );

      setError(err.message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-start">

      <div className="candidate-start-card">

        <div className="candidate-brand">
          <div className="admin-logo">
  <img src="/xevotech.jpeg" alt="Company Logo" />
</div>
          <h3>XEVOTECH</h3>
          <span>EXAM PROTOCOL</span>
        </div>

        <div className="candidate-heading">
          <span>{examInfo ? (examInfo.isNonTechnical ? "NON-TECHNICAL ASSESSMENT" : "TECHNICAL ASSESSMENT") : "CANDIDATE ACCESS"}</span>

          <h1>{examInfo?.title || "Start Examination"}</h1>

          <p>
            {examInfo?.durationMinutes
              ? `Duration: ${examInfo.durationMinutes} minutes • Enter your details to begin.`
              : "Enter your details to begin the examination."}
          </p>
        </div>

        <form onSubmit={handleStart}>

          <div className="candidate-field">

            <label>FULL NAME</label>

            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

          </div>

          <div className="candidate-field">

            <label>
              ROLL NUMBER{" "}
              <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b" }}>
                ({examInfo?.isNonTechnical ? "Format: XEVO/YEN/NT/001-800" : "Format: XEVO/YEN/T/001-800"})
              </span>
            </label>

            <input
              type="text"
              placeholder={examInfo?.isNonTechnical ? "XEVO/YEN/NT/001" : "XEVO/YEN/T/001"}
              value={rollNumber}
              onChange={(e) =>
                setRollNumber(e.target.value.toUpperCase())
              }
              required
            />

          </div>

          <div className="candidate-field">
  <label>COURSE</label>

  <input
    type="text"
    placeholder="Enter your course (e.g. B.Tech / MCA / MBA / B.Com)"
    value={course}
    onChange={(e) => setCourse(e.target.value)}
    required
  />
</div>

          <div style={{
            margin: "12px 0 16px",
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "12px",
            lineHeight: "1.45"
          }}>
            <strong>⚠ Anti-Cheating Protocol:</strong> If you switch tabs, minimize the browser window, or switch applications at any point, your examination will be <strong>automatically submitted and terminated immediately</strong>.
          </div>

          {error && (
            <div className="candidate-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="start-exam-button"
            disabled={loading}
          >
            {loading
              ? "STARTING EXAM..."
              : "START EXAM →"}
          </button>

        </form>

        <div className="candidate-security">
          <span>●</span>
          Strict anti-cheating & tab-switch monitoring is active.
        </div>

      </div>

    </div>
  );
}
