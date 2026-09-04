import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CodingStart.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

const CodingStart = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [course, setCourse] = useState("");

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/coding-exams/${examId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load coding exam"
        );
      }

      if (data.exam.status !== "published") {
        throw new Error(
          "This coding exam is not currently available."
        );
      }

      setExam(data.exam);
    } catch (err) {
      setError(
        err.message || "Unable to load coding examination"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!rollNumber.trim()) {
      setError("Please enter your roll number.");
      return;
    }

    if (!course.trim()) {
      setError("Please enter your course.");
      return;
    }

    try {
      setStarting(true);

      const response = await fetch(
        `${API_URL}/api/coding-attempts/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coding_exam_id: Number(examId),
            name: name.trim(),
            roll_number: rollNumber.trim().toUpperCase(),
            course: course.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to start coding exam"
        );
      }

      const attemptId = data.attempt.id;
      const accessToken = data.attempt.accessToken;

      localStorage.setItem(
        `codingAccessToken_${attemptId}`,
        accessToken
      );

      navigate(
        `/coding-exam/${examId}/attempt/${attemptId}`,
        {
          replace: true,
        }
      );
    } catch (err) {
      setError(
        err.message || "Failed to start coding examination"
      );
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="coding-start-page">
        <div className="coding-start-card loading-card">
          <div className="coding-spinner"></div>
          <p>Loading coding examination...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="coding-start-page">
        <div className="coding-start-card error-card">
          <h1>Exam Unavailable</h1>
          <p>{error || "Coding exam could not be loaded."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coding-start-page">
      <div className="coding-start-card">

        <div className="coding-start-header">
          <div className="coding-label">
            CODING ASSESSMENT
          </div>

          <h1>{exam.title}</h1>

          {exam.description && (
            <p>{exam.description}</p>
          )}
        </div>

        <div className="coding-exam-info">

          <div className="coding-info-item">
            <span>Duration</span>
            <strong>
              {exam.duration_minutes} Minutes
            </strong>
          </div>

          <div className="coding-info-item">
            <span>Total Marks</span>
            <strong>
              {exam.total_marks}
            </strong>
          </div>

          <div className="coding-info-item">
            <span>Questions</span>
            <strong>
              {exam.question_count || 0}
            </strong>
          </div>

        </div>

        {exam.instructions && (
          <div className="coding-instructions">
            <h2>Instructions</h2>

            <div className="instructions-content">
              {exam.instructions}
            </div>
          </div>
        )}

        <form
          className="coding-candidate-form"
          onSubmit={handleStart}
        >

          <h2>Candidate Details</h2>

          <div className="coding-form-group">
            <label>
              Full Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>

          <div className="coding-form-group">
            <label>
              Roll Number
            </label>

            <input
              type="text"
              value={rollNumber}
              onChange={(e) =>
                setRollNumber(e.target.value.toUpperCase())
              }
              placeholder="XEVO/YEN/T/001"
              autoComplete="off"
            />

            <small>
              Enter your registered roll number.
            </small>
          </div>

          <div className="coding-form-group">
            <label>
              Course
            </label>

            <input
              type="text"
              value={course}
              onChange={(e) =>
                setCourse(e.target.value)
              }
              placeholder="Enter your course"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="coding-start-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="coding-start-button"
            disabled={starting}
          >
            {starting
              ? "Starting Exam..."
              : "Start Coding Exam"}
          </button>

        </form>

      </div>
    </div>
  );
};

export default CodingStart;