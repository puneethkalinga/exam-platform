import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ExamResults.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

export default function ExamResults() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cutoff, setCutoff] = useState(0);
const [cutoffInput, setCutoffInput] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [updatingCutoff, setUpdatingCutoff] =
  useState(false);

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
      setExam(examData.exam || examData);

setResults(
  resultData.results || []
);

const currentCutoff =
  Number(
    resultData.cutoff ??
    examData.exam?.cutoff_percentage ??
    examData.cutoff_percentage ??
    0
  );

setCutoff(currentCutoff);
setCutoffInput(
  String(currentCutoff)
);

    } catch (err) {
      console.error("LOAD RESULTS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const updateCutoff = async () => {
  const newCutoff =
    Number(cutoffInput);

  if (
    !Number.isFinite(newCutoff) ||
    newCutoff < 0 ||
    newCutoff > 100
  ) {
    alert(
      "Cutoff must be between 0 and 100."
    );
    return;
  }

  try {

    setUpdatingCutoff(true);

    const token =
      localStorage.getItem(
        "adminToken"
      );

    const response = await fetch(
      `${API_URL}/api/results/exam/${examId}/cutoff`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          cutoffPercentage:
            newCutoff,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to update cutoff"
      );
    }

    setCutoff(newCutoff);

    setCutoffInput(
      String(newCutoff)
    );

    // Reload results so the
    // shortlist is immediately updated
    await loadResults();

  } catch (error) {

    console.error(
      "UPDATE CUTOFF ERROR:",
      error
    );

    alert(
      error.message ||
        "Failed to update cutoff"
    );

  } finally {

    setUpdatingCutoff(false);

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

  const filteredResults =
  results.filter((result) => {

    const isShortlisted =
      Number(result.percentage || 0) >=
      Number(cutoff);

    if (
      statusFilter ===
      "shortlisted"
    ) {
      return isShortlisted;
    }

    if (
      statusFilter ===
      "not_shortlisted"
    ) {
      return !isShortlisted;
    }

    return true;
  });

  const exportToCSV = () => {
    if (!results || results.length === 0) {
      alert("No results to export.");
      return;
    }

    const headers = [
      "Rank",
      "Candidate Name",
      "Roll Number",
      "Course",
      "Marks Obtained",
      "Total Marks",
      "Percentage",
      "Status",
      "Submitted At"
    ];

    const rows = filteredResults.map((r, index) => [
      index + 1,
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${r.roll_number || ""}"`,
      `"${r.course || ""}"`,
      r.obtained_marks,
      r.total_marks,
      `${r.percentage}%`,
      r.shortlisted ? "SHORTLISTED" : "NOT SHORTLISTED",
      r.submitted_at ? `"${new Date(r.submitted_at).toLocaleString()}"` : '"—"'
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(exam?.title || "Exam").replace(/\s+/g, "_")}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

        <img src="/xevotech.jpeg" alt="Xevotech Logo" className="brand-logo" />

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

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="refresh-results"
              style={{ background: "#2563eb", color: "#fff", borderColor: "#2563eb" }}
              onClick={exportToCSV}
            >
              📥 Export CSV
            </button>
            <button
              className="refresh-results"
              onClick={loadResults}
            >
              ↻ Refresh
            </button>
          </div>

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
        Number(
          item.percentage || 0
        ) >= Number(cutoff)
    ).length
              }
            </strong>
          </div>

          <div className="result-stat">
            <span>
              CUTOFF
            </span>

            <strong>
                {cutoff}%
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


  {/* RESULT FILTERS */}

  <div className="results-filters">

    {/* CUTOFF */}

    <div className="cutoff-control">

      <label>
        CUTOFF
      </label>

      <div className="cutoff-input-group">

        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={cutoffInput}
          onChange={(e) =>
            setCutoffInput(
              e.target.value
            )
          }
        />

        <span>%</span>

        <button
          type="button"
          onClick={updateCutoff}
          disabled={updatingCutoff}
        >
          {updatingCutoff
            ? "Updating..."
            : "Apply"}
        </button>

      </div>

    </div>


    {/* STATUS FILTER */}

    <div className="status-filter">

      <label>
        SHOW
      </label>

      <select
        value={statusFilter}
        onChange={(e) =>
          setStatusFilter(
            e.target.value
          )
        }
      >

        <option value="all">
          All Candidates
        </option>

        <option value="shortlisted">
          Shortlisted
        </option>

        <option value="not_shortlisted">
          Not Shortlisted
        </option>

      </select>

    </div>

  </div>

</div>

          


          {filteredResults.length === 0 ? (

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
                    <th>COURSE</th>
                    <th>MARKS</th>
                    <th>PERCENTAGE</th>
                    <th>STATUS</th>
                    <th>SUBMITTED</th>
                    <th></th>
                  </tr>

                </thead>

                <tbody>

                  {filteredResults.map((result) => {

                    const shortlisted =
  Number(result.percentage || 0) >=
  Number(cutoff);

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
                          <span className="roll-number">
                            {result.course || "—"}
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