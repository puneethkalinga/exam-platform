import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CodingExamResults.css";

const API_URL =
  "https://exam-platform-qhk8.onrender.com";

const CodingExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAdminHeaders = () => {
    const token = localStorage.getItem("adminToken");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  useEffect(() => {
    loadResults();
  }, [examId]);

  const loadResults = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/coding-results/exam/${examId}`,
        {
          method: "GET",
          headers: {
            ...getAdminHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load coding results."
        );
      }

      setExam(data.exam || null);
      setResults(data.results || []);
    } catch (error) {
      console.error(
        "Coding results error:",
        error
      );

      alert(
        error.message ||
          "Unable to load coding results."
      );
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
    if (status === "submitted") {
      return "coding-admin-status submitted";
    }

    if (status === "expired") {
      return "coding-admin-status expired";
    }

    return "coding-admin-status in-progress";
  };

  if (loading) {
    return (
      <div className="coding-admin-loading">
        Loading coding results...
      </div>
    );
  }

  return (
    <div className="coding-admin-results-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="coding-admin-results-header">

        <div>
          <button
            className="back-button"
            onClick={() =>
              navigate("/admin/coding-exams")
            }
          >
            ← Back
          </button>

          <h1>
            {exam?.title ||
              "Coding Exam Results"}
          </h1>

          <p>
            Candidate submissions and
            evaluation results
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadResults}
        >
          ↻ Refresh
        </button>

      </header>

      {/* =================================================
          STATS
      ================================================= */}

      <section className="coding-result-stats">

        <div className="coding-result-stat-card">
          <span>
            Total Candidates
          </span>

          <strong>
            {results.length}
          </strong>
        </div>

        <div className="coding-result-stat-card">
          <span>
            Submitted
          </span>

          <strong>
            {
              results.filter(
                (item) =>
                  item.status ===
                  "submitted"
              ).length
            }
          </strong>
        </div>

        <div className="coding-result-stat-card">
          <span>
            In Progress
          </span>

          <strong>
            {
              results.filter(
                (item) =>
                  item.status ===
                  "in_progress"
              ).length
            }
          </strong>
        </div>

        <div className="coding-result-stat-card">
          <span>
            Average Score
          </span>

          <strong>
            {results.length > 0
              ? (
                  results.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.total_score || 0
                      ),
                    0
                  ) / results.length
                ).toFixed(2)
              : "0.00"}
          </strong>
        </div>

      </section>

      {/* =================================================
          RESULTS TABLE
      ================================================= */}

      <section className="coding-admin-results-card">

        <div className="coding-admin-results-card-header">

          <div>
            <h2>
              Candidate Results
            </h2>

            <p>
              Results are ordered by score.
            </p>
          </div>

          <span>
            {results.length} candidates
          </span>

        </div>

        {results.length === 0 ? (
          <div className="coding-admin-empty">
            No candidates have attempted
            this coding exam yet.
          </div>
        ) : (
          <div className="coding-admin-table-wrapper">

            <table className="coding-admin-table">

              <thead>
                <tr>
                  <th>
                    Rank
                  </th>

                  <th>
                    Candidate
                  </th>

                  <th>
                    Roll Number
                  </th>

                  <th>
                    Course
                  </th>

                  <th>
                    Score
                  </th>

                  <th>
                    Percentage
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Submitted
                  </th>

                  <th>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>

                {results.map(
                  (result, index) => (
                    <tr
                      key={result.attempt_id}
                    >

                      <td>
                        <strong>
                          {index + 1}
                        </strong>
                      </td>

                      <td>
                        <div className="candidate-name">
                          <strong>
                            {result.name}
                          </strong>

                          <small>
                            Candidate ID:{" "}
                            {result.candidate_id}
                          </small>
                        </div>
                      </td>

                      <td>
                        {result.roll_number}
                      </td>

                      <td>
                        {result.course ||
                          "-"}
                      </td>

                      <td>
                        <strong>
                          {
                            result.total_score
                          }
                          {" / "}
                          {
                            result.total_marks
                          }
                        </strong>
                      </td>

                      <td>
                        {Number(
                          result.percentage || 0
                        ).toFixed(2)}
                        %
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            result.status
                          )}
                        >
                          {result.status ===
                          "submitted"
                            ? "Submitted"
                            : result.status ===
                              "expired"
                            ? "Expired"
                            : "In Progress"}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          result.submitted_at
                        )}
                      </td>

                      <td>

                        <button
                          className="view-result-button"
                          onClick={() =>
                            navigate(
                              `/admin/coding-results/${result.attempt_id}`
                            )
                          }
                        >
                          View Result
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
};

export default CodingExamResults;