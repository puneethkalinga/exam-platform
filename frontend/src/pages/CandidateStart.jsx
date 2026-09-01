import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CandidateStart.css";

const API_URL = "http://localhost:5000";

export default function CandidateStart() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const examId = searchParams.get("examId");

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async (e) => {
    e.preventDefault();

    setError("");

    if (!examId) {
      setError("Invalid examination link.");
      return;
    }

    if (!name.trim() || !rollNumber.trim()) {
      setError("Please enter your name and roll number.");
      return;
    }

    try {
      setLoading(true);

      console.log("STARTING EXAM:", {
        examId,
        name: name.trim(),
        rollNumber: rollNumber.trim(),
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
          }),
        }
      );

      const data = await response.json();

      console.log("START EXAM RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to start examination"
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
          <h2>XEVOTECH</h2>
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