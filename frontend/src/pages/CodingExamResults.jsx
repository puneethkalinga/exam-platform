import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CodingExamResults.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";


const CodingExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getAdminHeaders = () => {
    const token = localStorage.getItem("adminToken");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  // ==================================================
  // LOAD RESULTS
  // ==================================================
  const fetchResults = async () => {
    try {
      setLoading(true);
      setError("");

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
          data.message || "Failed to fetch coding results."
        );
      }

      setExam(data.exam || {});
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error(
        "Fetch coding exam results error:",
        error
      );

      setError(
        error.message || "Failed to fetch coding results."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchResults();
    }
  }, [examId]);

  // ==================================================
  // VIEW CANDIDATE RESULT
  // ==================================================
  const viewResult = (result) => {
    const attemptId =
      result.attempt_id ?? result.id;

    if (!attemptId) {
      alert("Attempt ID is missing.");
      return;
    }

    navigate(
      `/admin/coding-results/${attemptId}`
    );
  };

  // ==================================================
  // FORMAT DATE
  // ==================================================
  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString();
  };

  // ==================================================
  // STATUS
  // ==================================================
  const getStatusLabel = (status) => {
    if (!status) {
      return "UNKNOWN";
    }

    return status.replace(/_/g, " ").toUpperCase();
  };

  // ==================================================
  // LOADING
  // ==================================================
  if (loading) {
    return (
      <div className="coding-result-loading">
        Loading coding results...
      </div>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================
  if (error) {
    return (
      <div className="coding-result-page">
        <div className="coding-result-header">
          <button
            onClick={() => navigate(-1)}
            className="coding-back-button"
          >
            ← Back
          </button>

          <div>
            <h1>Coding Exam Results</h1>
            <p>
              Unable to load results for this assessment.
            </p>
          </div>
        </div>

        <div className="coding-result-error">
          <strong>{error}</strong>

          <button onClick={fetchResults}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================
  return (
    <div className="coding-result-page">

      {/* =================================================
          HEADER
      ================================================= */}
      <header className="coding-result-header">

        <div>
          <button
            onClick={() => navigate(-1)}
            className="coding-back-button"
          >
            ← Back
          </button>

          <h1>
            {exam?.title || "Coding Exam Results"}
          </h1>

          <p>
            Candidate performance and submission results
          </p>
        </div>

        <button
          className="coding-refresh-button"
          onClick={fetchResults}
          disabled={loading}
        >
          ↻ Refresh
        </button>

      </header>

      {/* =================================================
          EXAM SUMMARY
      ================================================= */}
      <section className="coding-results-summary">

        <div className="coding-summary-card">
          <span>PROBLEMS</span>
          <strong>
            {exam?.question_count || "-"}
          </strong>
        </div>

        <div className="coding-summary-card">
          <span>DURATION</span>
          <strong>
            {exam?.duration_minutes || 0} min
          </strong>
        </div>

        <div className="coding-summary-card">
          <span>TOTAL MARKS</span>
          <strong>
            {exam?.total_marks || 0}
          </strong>
        </div>

        <div className="coding-summary-card">
          <span>SUBMISSIONS</span>
          <strong>
            {results.length}
          </strong>
        </div>

      </section>

      {/* =================================================
          RESULTS TABLE
      ================================================= */}
      <section className="coding-results-card">

        <div className="coding-results-card-header">
          <div>
            <span>RESULTS</span>
            <h2>Candidate Performance</h2>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="coding-results-empty">
            <div className="coding-results-empty-icon">
              {"</>"}
            </div>

            <h3>No results yet</h3>

            <p>
              No candidate has submitted this coding
              assessment yet.
            </p>
          </div>
        ) : (
          <div className="coding-results-table-wrapper">

            <table className="coding-results-table">

              <thead>
                <tr>
                  <th>#</th>
                  <th>Candidate</th>
                  <th>Roll Number</th>
                  <th>Course</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {results.map((result, index) => (
                  <tr key={result.attempt_id ?? result.id}>

                    <td>
                      {index + 1}
                    </td>

                    <td>
                      <div className="candidate-name">
                        {result.candidate_name || "-"}
                      </div>
                    </td>

                    <td>
                      {result.roll_number || "-"}
                    </td>

                    <td>
                      {result.course || "-"}
                    </td>

                    <td>
                      <strong>
                        {result.total_score ?? 0}
                      </strong>
                      {" / "}
                      {result.total_marks ?? 0}
                    </td>

                    <td>
                      <strong>
                        {result.percentage ?? 0}%
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`coding-result-status ${
                          result.status || ""
                        }`}
                      >
                        {getStatusLabel(result.status)}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        result.submitted_at
                      )}
                    </td>

                    <td>
                      <button
                        className="coding-view-result-button"
                        onClick={() =>
                          viewResult(result)
                        }
                      >
                        View Result
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
};

export default CodingExamResults;