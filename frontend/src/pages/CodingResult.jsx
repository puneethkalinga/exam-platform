import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./CodingResult.css";

const API_URL = "";

const CodingResult = () => {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError("");

      if (!attemptId) {
        throw new Error("Attempt ID is missing");
      }

      const response = await fetch(
        `${API_URL}/api/coding-results/attempt/${attemptId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load coding result"
        );
      }

      setResult(data);
    } catch (err) {
      console.error("Coding result error:", err);

      setError(
        err.message || "Unable to load coding result"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="coding-result-page">
        <div className="coding-result-card loading-card">
          <div className="result-loader"></div>

          <h2>Loading Result...</h2>

          <p>
            Please wait while we load your coding
            examination result.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coding-result-page">
        <div className="coding-result-card error-card">
          <div className="result-error-icon">!</div>

          <h2>Unable to Load Result</h2>

          <p>{error}</p>

          <button
            className="result-primary-button"
            onClick={fetchResult}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const candidate = result.candidate || {};
  const exam = result.exam || {};
  const attempt = result.attempt || {};
  const submissions = result.submissions || [];

  const totalMarks = Number(
    attempt.total_marks ||
      exam.total_marks ||
      0
  );

  const totalScore = Number(
    attempt.total_score || 0
  );

  const percentage =
    totalMarks > 0
      ? ((totalScore / totalMarks) * 100).toFixed(2)
      : "0.00";

  const getStatusClass = (status) => {
    const value = String(
      status || ""
    ).toLowerCase();

    if (
      value.includes("accepted") ||
      value.includes("passed")
    ) {
      return "passed";
    }

    if (
      value.includes("wrong") ||
      value.includes("failed") ||
      value.includes("error")
    ) {
      return "failed";
    }

    return "neutral";
  };

  return (
    <div className="coding-result-page">

      {/* ================================
          HEADER
      ================================= */}
      <header className="coding-result-header">
        <div>
          <span className="result-eyebrow">
            CODING ASSESSMENT
          </span>

          <h1>Coding Examination Result</h1>

          <p>
            {exam.title || "Coding Assessment"}
          </p>
        </div>
      </header>


      <main className="coding-result-container">

        {/* ================================
            SUCCESS MESSAGE
        ================================= */}
        <section className="result-success-banner">

          <div className="success-icon">
            ✓
          </div>

          <div>
            <h2>Examination Submitted</h2>

            <p>
              Your coding examination has been
              successfully submitted.
            </p>
          </div>

        </section>


        {/* ================================
            CANDIDATE INFORMATION
        ================================= */}
        <section className="result-card">

          <div className="result-card-heading">
            <div>
              <span className="result-section-label">
                CANDIDATE
              </span>

              <h2>Candidate Information</h2>
            </div>
          </div>


          <div className="candidate-grid">

            <div className="candidate-item">
              <span>Name</span>
              <strong>
                {candidate.name || "-"}
              </strong>
            </div>

            <div className="candidate-item">
              <span>Roll Number</span>
              <strong>
                {candidate.roll_number || "-"}
              </strong>
            </div>

            <div className="candidate-item">
              <span>Course</span>
              <strong>
                {candidate.course || "-"}
              </strong>
            </div>

            <div className="candidate-item">
              <span>Status</span>

              <strong className="status-completed">
                {attempt.status || "Submitted"}
              </strong>
            </div>

          </div>

        </section>


        {/* ================================
            SCORE
        ================================= */}
        <section className="score-card">

          <div className="score-main">

            <span className="result-section-label">
              FINAL SCORE
            </span>

            <div className="score-value">
              {totalScore}
              <span>
                / {totalMarks}
              </span>
            </div>

            <p>
              Overall Coding Score
            </p>

          </div>


          <div className="score-percentage">

            <div className="percentage-value">
              {percentage}%
            </div>

            <span>
              Percentage
            </span>

          </div>

        </section>


        {/* ================================
            QUESTION RESULTS
        ================================= */}
        <section className="result-card">

          <div className="result-card-heading">

            <div>
              <span className="result-section-label">
                PERFORMANCE
              </span>

              <h2>Question Results</h2>
            </div>

            <span className="question-count">
              {submissions.length} Questions
            </span>

          </div>


          {submissions.length === 0 ? (
            <div className="empty-results">
              No question submission details
              available.
            </div>
          ) : (
            <div className="question-results">

              {submissions.map(
                (submission, index) => {

                  const questionMarks =
                    Number(
                      submission.question_marks || 0
                    );

                  const marksObtained =
                    Number(
                      submission.marks_obtained || 0
                    );

                  const passed =
                    Number(
                      submission.passed_tests || 0
                    );

                  const totalTests =
                    Number(
                      submission.total_tests || 0
                    );

                  return (
                    <div
                      className="question-result-row"
                      key={
                        submission.question_id ||
                        index
                      }
                    >

                      <div className="question-number">
                        {index + 1}
                      </div>


                      <div className="question-info">

                        <h3>
                          {submission.title ||
                            `Question ${
                              index + 1
                            }`}
                        </h3>

                        <div className="question-meta">

                          <span>
                            Language:{" "}
                            <strong>
                              {submission.language ||
                                "-"}
                            </strong>
                          </span>

                          <span>
                            Tests:{" "}
                            <strong>
                              {passed}/{totalTests}
                            </strong>
                          </span>

                        </div>

                      </div>


                      <div className="question-status">

                        <span
                          className={`submission-status ${getStatusClass(
                            submission.status
                          )}`}
                        >
                          {submission.status ||
                            "Not Submitted"}
                        </span>

                      </div>


                      <div className="question-score">

                        <strong>
                          {marksObtained}
                        </strong>

                        <span>
                          / {questionMarks}
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>


        {/* ================================
            EXAM INFORMATION
        ================================= */}
        <section className="result-card">

          <div className="result-card-heading">

            <div>
              <span className="result-section-label">
                EXAMINATION
              </span>

              <h2>Exam Information</h2>
            </div>

          </div>


          <div className="exam-info-grid">

            <div>
              <span>Exam</span>
              <strong>
                {exam.title || "-"}
              </strong>
            </div>

            <div>
              <span>Total Marks</span>
              <strong>
                {totalMarks}
              </strong>
            </div>

            <div>
              <span>Duration</span>
              <strong>
                {exam.duration_minutes || 0} Minutes
              </strong>
            </div>

            <div>
              <span>Attempt ID</span>
              <strong>
                #{attempt.id}
              </strong>
            </div>

          </div>

        </section>


        {/* ================================
            FOOTER ACTION
        ================================= */}
        <div className="result-footer">

          <p>
            Your result has been recorded
            successfully.
          </p>

          <button
            className="result-primary-button"
            onClick={() =>
              navigate("/candidate/start")
            }
          >
            Finish
          </button>

        </div>

      </main>
    </div>
  );
};

export default CodingResult;
