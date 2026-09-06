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
            rollNumber: rollNumber.trim(),
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
          <span>CANDIDATE ACCESS</span>

          <h1>Start Examination</h1>

          <p>
            Enter your details to begin the
            examination.
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

            <label>ROLL NUMBER</label>

            <input
              type="text"
              placeholder="Enter your roll number"
              value={rollNumber}
              onChange={(e) =>
                setRollNumber(e.target.value)
              }
              required
            />

          </div>

          <div className="candidate-field">
  <label>COURSE</label>

  <input
    type="text"
    placeholder="Enter your course"
    value={course}
    onChange={(e) => setCourse(e.target.value)}
    required
  />
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
          Your examination session is securely tracked.
        </div>

      </div>

    </div>
  );
}
