import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CodingResult.css";

const API_URL =
  "https://exam-platform-qhk8.onrender.com";

const CodingResult = () => {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const getCodingHeaders = () => {
    const token = localStorage.getItem(
      `codingAccessToken_${attemptId}`
    );

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/coding-results/attempt/${attemptId}`,
        {
          method: "GET",
          headers: {
            ...getCodingHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load coding result."
        );
      }

      setResult(data);
    } catch (error) {
      console.error(
        "Coding result error:",
        error
      );

      alert(
        error.message ||
          "Unable to load coding result."
      );

      navigate(`/coding-exam/${examId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString();
  };

  const getStatusClass = (status) => {
    if (status === "Accepted") {
      return "coding-result-success";
    }

    if (
      status === "Wrong Answer" ||
      status === "Compilation Error" ||
      status === "Time Limit Exceeded"
    ) {
      return "coding-result-danger";
    }

    return "coding-result-neutral";
  };

  if (loading) {
    return (
      <div className="coding-result-loading">
        Loading your coding result...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="coding-result-loading">
        Result not available.
      </div>
    );
  }

  const attempt = result.attempt || {};
  const exam = result.exam || {};
  const questions = result.questions || [];

  const totalMarks = Number(
    result.total_marks ??
      exam.total_marks ??
      0
  );

  const obtainedMarks = Number(
    result.total_score ??
      attempt.total_score ??
      0
  );

  const percentage =
    totalMarks > 0
      ? ((obtainedMarks / totalMarks) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="coding-result-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="coding-result-header">
        <div>
          <h1>
            Coding Assessment Result
          </h1>

          <p>
            {exam.title ||
              "Coding Examination"}
          </p>
        </div>
      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="coding-result-container">

        {/* =================================================
            COMPLETION MESSAGE
        ================================================= */}

        <section className="coding-result-complete">

          <div className="result-check">
            ✓
          </div>

          <div>
            <h2>
              Coding Exam Submitted
            </h2>

            <p>
              Your coding assessment has
              been submitted successfully.
            </p>
          </div>

        </section>

        {/* =================================================
            CANDIDATE INFORMATION
        ================================================= */}

        <section className="coding-result-card">

          <div className="coding-result-card-header">
            <h2>
              Candidate Information
            </h2>
          </div>

          <div className="candidate-result-grid">

            <div>
              <span>
                Name
              </span>

              <strong>
                {result.candidate?.name ||
                  attempt.name ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Roll Number
              </span>

              <strong>
                {result.candidate
                  ?.roll_number ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Course
              </span>

              <strong>
                {result.candidate?.course ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Submitted
              </span>

              <strong>
                {formatDate(
                  attempt.submitted_at
                )}
              </strong>
            </div>

          </div>

        </section>

        {/* =================================================
            SCORE
        ================================================= */}

        <section className="coding-score-card">

          <div className="coding-score-main">

            <span>
              Total Score
            </span>

            <strong>
              {obtainedMarks}
              <small>
                {" "}
                / {totalMarks}
              </small>
            </strong>

          </div>

          <div className="coding-score-item">

            <span>
              Percentage
            </span>

            <strong>
              {percentage}%
            </strong>

          </div>

          <div className="coding-score-item">

            <span>
              Problems
            </span>

            <strong>
              {questions.length}
            </strong>

          </div>

        </section>

        {/* =================================================
            PROBLEM-WISE RESULTS
        ================================================= */}

        <section className="coding-result-card">

          <div className="coding-result-card-header">

            <div>
              <h2>
                Problem-wise Results
              </h2>

              <p>
                Your best submission for each
                problem is counted.
              </p>
            </div>

          </div>

          {questions.length === 0 ? (
            <div className="coding-result-empty">
              No problem results available.
            </div>
          ) : (
            <div className="coding-result-table-wrapper">

              <table className="coding-result-table">

                <thead>
                  <tr>
                    <th>
                      #
                    </th>

                    <th>
                      Problem
                    </th>

                    <th>
                      Language
                    </th>

                    <th>
                      Tests
                    </th>

                    <th>
                      Marks
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {questions.map(
                    (question, index) => {

                      const submission =
                        question.submission ||
                        question.best_submission ||
                        null;

                      const passed =
                        Number(
                          submission?.passed_tests ||
                            0
                        );

                      const totalTests =
                        Number(
                          submission?.total_tests ||
                            0
                        );

                      const marks =
                        Number(
                          submission?.marks_obtained ||
                            0
                        );

                      const status =
                        submission?.status ||
                        "Not Submitted";

                      return (
                        <tr
                          key={question.id}
                        >

                          <td>
                            {index + 1}
                          </td>

                          <td>
                            <strong>
                              {question.title}
                            </strong>
                          </td>

                          <td>
                            {submission?.language
                              ? submission.language.toUpperCase()
                              : "-"}
                          </td>

                          <td>
                            {totalTests > 0
                              ? `${passed}/${totalTests}`
                              : "-"}
                          </td>

                          <td>
                            {marks} /{" "}
                            {question.marks}
                          </td>

                          <td>
                            <span
                              className={`coding-result-status ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* =================================================
            IMPORTANT NOTE
        ================================================= */}

        <section className="coding-result-note">

          <strong>
            Assessment Completed
          </strong>

          <p>
            Your result has been recorded.
            You can no longer modify your
            coding submissions for this
            attempt.
          </p>

        </section>

      </main>

    </div>
  );
};

export default CodingResult;