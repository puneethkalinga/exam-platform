import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ExamResults.css";

const API_URL = "http://localhost:5000";

export default function ExamResults() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadResults();
  }, [examId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("adminToken");

      const [examResponse, resultResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/exams/${examId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          fetch(
            `${API_URL}/api/results/exam/${examId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),
        ]);

      const examData = await examResponse.json();
      const resultData = await resultResponse.json();

      if (!examResponse.ok) {
        throw new Error(
          examData.message || "Failed to load exam"
        );
      }

      if (!resultResponse.ok) {
        throw new Error(
          resultData.message ||
            "Failed to load results"
        );
      }

      setExam(examData.exam || examData);
      setResults(resultData.results || []);

    } catch (err) {
      console.error("LOAD RESULTS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="results-loading">
        Loading examination results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-error">
        <h2>Unable to load results</h2>
        <p>{error}</p>

        <button onClick={loadResults}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="exam-results">

      {/* HEADER */}

      <header className="results-header">

        <button
          className="results-back"
          onClick={() =>
            navigate(`/admin/exams/${examId}`)
          }
        >
          ← Exam Management
        </button>

        <div className="results-brand">
          XEVOTECH
          <span>EXAM PROTOCOL</span>
        </div>

      </header>


      {/* MAIN */}

      <main className="results-main">

        <div className="results-title">

          <div>

            <span>
              EXAMINATION RESULTS
            </span>

            <h1>
              {exam?.title || "Exam Results"}
            </h1>

            <p>
              Review candidate performance
              and examination outcomes.
            </p>

          </div>

          <button
            className="refresh-results"
            onClick={loadResults}
          >
            ↻ Refresh
          </button>

        </div>


        {/* STATS */}

        <section className="results-stats">

          <div className="result-stat">
            <span>
              CANDIDATES
            </span>

            <strong>
              {results.length}
            </strong>
          </div>

          <div className="result-stat">
            <span>
              SUBMITTED
            </span>

            <strong>
              {
                results.filter(
                  (item) =>
                    item.status === "submitted"
                ).length
              }
            </strong>
          </div>

          <div className="result-stat">
            <span>
              SHORTLISTED
            </span>

            <strong>
              {
                results.filter(
                  (item) =>
                    item.result_status ===
                    "shortlisted"
                ).length
              }
            </strong>
          </div>

          <div className="result-stat">
            <span>
              CUTOFF
            </span>

            <strong>
              {exam?.cutoff_percentage || 0}%
            </strong>
          </div>

        </section>


        {/* RESULTS TABLE */}

        <section className="results-panel">

          <div className="results-panel-heading">

            <div>
              <span>
                CANDIDATE PERFORMANCE
              </span>

              <h2>
                Results
              </h2>
            </div>

          </div>


          {results.length === 0 ? (

            <div className="results-empty">

              <div className="results-empty-icon">
                ◉
              </div>

              <h3>
                No results yet
              </h3>

              <p>
                Candidate submissions will
                appear here after they complete
                the examination.
              </p>

            </div>

          ) : (

            <div className="results-table-wrapper">

              <table className="results-table">

                <thead>

                  <tr>
                    <th>RANK</th>
                    <th>CANDIDATE</th>
                    <th>ROLL NUMBER</th>
                    <th>MARKS</th>
                    <th>PERCENTAGE</th>
                    <th>STATUS</th>
                    <th>SUBMITTED</th>
                    <th></th>
                  </tr>

                </thead>

                <tbody>

                  {results.map((result) => {

                    const shortlisted =
                      result.result_status ===
                      "shortlisted";

                    return (
                      <tr
                        key={result.attempt_id}
                      >

                        <td>
                          <span className="rank">
                            #{result.rank}
                          </span>
                        </td>


                        <td>

                          <div className="candidate-name">
                            {result.name}
                          </div>

                        </td>


                        <td>
                          <span className="roll-number">
                            {result.roll_number}
                          </span>
                        </td>


                        <td>

                          <strong>
                            {result.obtained_marks ??
                              0}
                          </strong>

                          {" / "}

                          {result.total_marks ??
                            0}

                        </td>


                        <td>

                          <strong className="percentage">
                            {Number(
                              result.percentage || 0
                            ).toFixed(2)}
                            %
                          </strong>

                        </td>


                        <td>

                          <span
                            className={
                              shortlisted
                                ? "result-badge shortlisted"
                                : "result-badge not-shortlisted"
                            }
                          >
                            {shortlisted
                              ? "SHORTLISTED"
                              : "NOT SHORTLISTED"}
                          </span>

                        </td>


                        <td>

                          <span className="submitted-date">
                            {formatDate(
                              result.submitted_at
                            )}
                          </span>

                        </td>


                        <td>

                          <button
                            className="view-response-button"
                            onClick={() =>
  window.location.href =
    `/admin/exams/${examId}/results/${result.attempt_id}`
}
                          >
                            View
                          </button>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}