import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CodingResultDetails.css";

const API_URL =
  "https://exam-platform-qhk8.onrender.com";

const CodingResultDetails = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSecurity, setLoadingSecurity] = useState(true);

  const getAdminHeaders = () => {
    const token = localStorage.getItem("adminToken");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  useEffect(() => {
    loadResult();
    loadSecurityEvents();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/coding-results/admin/attempt/${attemptId}`,
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
            "Unable to load result."
        );
      }

      setResult(data);
    } catch (error) {
      console.error(
        "Result details error:",
        error
      );

      alert(
        error.message ||
          "Unable to load result."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityEvents = async () => {
  try {
    setLoadingSecurity(true);

    const token =
      localStorage.getItem("adminToken");

    const response = await fetch(
      `${API_URL}/api/coding-security/admin/attempt/${attemptId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to load security events"
      );
    }

    setSecurityEvents(data.events || []);
  } catch (error) {
    console.error(
      "Security events error:",
      error
    );

    setSecurityEvents([]);
  } finally {
    setLoadingSecurity(false);
  }
};
  const refreshAll = () => {
    loadResult();
    loadSecurityEvents();
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString();
  };

  const securityCounts = useMemo(() => {
    const counts = {
      TAB_SWITCH: 0,
      WINDOW_BLUR: 0,
      COPY_ATTEMPT: 0,
      PASTE_ATTEMPT: 0,
      CUT_ATTEMPT: 0,
      RIGHT_CLICK: 0,
      FULLSCREEN_EXIT: 0,
      PAGE_REFRESH: 0,
      WINDOW_FOCUS: 0,
      EXAM_SUBMITTED: 0,
      EXAM_TIMEOUT: 0,
    };

    securityEvents.forEach((event) => {
      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          event.event_type
        )
      ) {
        counts[event.event_type] += 1;
      }
    });

    return counts;
  }, [securityEvents]);

  const getEventLabel = (type) => {
    const labels = {
      TAB_SWITCH: "Tab Switch",
      WINDOW_BLUR: "Window Blur",
      WINDOW_FOCUS: "Window Focus",
      COPY_ATTEMPT: "Copy Attempt",
      PASTE_ATTEMPT: "Paste Attempt",
      CUT_ATTEMPT: "Cut Attempt",
      RIGHT_CLICK: "Right Click",
      FULLSCREEN_EXIT: "Fullscreen Exit",
      PAGE_REFRESH: "Page Refresh",
      EXAM_SUBMITTED: "Exam Submitted",
      EXAM_TIMEOUT: "Exam Timeout",
    };

    return labels[type] || type;
  };

  const getEventIcon = (type) => {
    if (
      type === "COPY_ATTEMPT" ||
      type === "PASTE_ATTEMPT" ||
      type === "CUT_ATTEMPT"
    ) {
      return "C";
    }

    if (
      type === "TAB_SWITCH" ||
      type === "WINDOW_BLUR"
    ) {
      return "T";
    }

    if (type === "FULLSCREEN_EXIT") {
      return "F";
    }

    if (type === "RIGHT_CLICK") {
      return "R";
    }

    if (type === "PAGE_REFRESH") {
      return "↻";
    }

    if (type === "EXAM_TIMEOUT") {
      return "!";
    }

    return "•";
  };

  const viewCode = (
    questionId
  ) => {
    navigate(
      `/admin/coding-results/${attemptId}/question/${questionId}/code`
    );
  };

  if (loading) {
    return (
      <div className="coding-result-details-loading">
        Loading candidate result...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="coding-result-details-loading">
        Result not available.
      </div>
    );
  }

  const candidate =
    result.candidate || {};

  const attempt =
    result.attempt || {};

  const exam =
    result.exam || {};

  const questions =
    result.questions || [];

  const totalMarks = Number(
    result.total_marks ??
      exam.total_marks ??
      0
  );

  const totalScore = Number(
    result.total_score ??
      attempt.total_score ??
      0
  );

  const percentage =
    totalMarks > 0
      ? ((totalScore / totalMarks) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="coding-result-details-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="coding-details-header">

        <div>
          <button
            className="coding-details-back"
            onClick={() =>
              navigate(-1)
            }
          >
            ← Back
          </button>

          <h1>
            Coding Result Details
          </h1>

          <p>
            {exam.title ||
              "Coding Assessment"}
          </p>
        </div>

        <button
          className="coding-details-refresh"
          onClick={refreshAll}
        >
          ↻ Refresh
        </button>

      </header>

      <main className="coding-details-container">

        {/* =================================================
            CANDIDATE
        ================================================= */}

        <section className="details-card">

          <div className="details-card-header">
            <h2>
              Candidate
            </h2>
          </div>

          <div className="candidate-details-grid">

            <div>
              <span>
                Name
              </span>

              <strong>
                {candidate.name || "-"}
              </strong>
            </div>

            <div>
              <span>
                Roll Number
              </span>

              <strong>
                {candidate.roll_number ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Course
              </span>

              <strong>
                {candidate.course ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Attempt ID
              </span>

              <strong>
                {attempt.id ||
                  attemptId}
              </strong>
            </div>

          </div>

        </section>

        {/* =================================================
            SCORE
        ================================================= */}

        <section className="details-score-grid">

          <div className="details-score-card">

            <span>
              Score
            </span>

            <strong>
              {totalScore}
              <small>
                {" "}
                / {totalMarks}
              </small>
            </strong>

          </div>

          <div className="details-score-card">

            <span>
              Percentage
            </span>

            <strong>
              {percentage}%
            </strong>

          </div>

          <div className="details-score-card">

            <span>
              Status
            </span>

            <strong className="details-status">
              {attempt.status ||
                "-"}
            </strong>

          </div>

          <div className="details-score-card">

            <span>
              Submitted
            </span>

            <strong className="details-date">
              {formatDate(
                attempt.submitted_at
              )}
            </strong>

          </div>

        </section>

        {/* =================================================
            PROBLEM RESULTS
        ================================================= */}

        <section className="details-card">

          <div className="details-card-header">

            <div>
              <h2>
                Problem Results
              </h2>

              <p>
                Best submission for each
                problem.
              </p>
            </div>

          </div>

          <div className="details-table-wrapper">

            <table className="details-table">

              <thead>
                <tr>
                  <th>#</th>
                  <th>Problem</th>
                  <th>Language</th>
                  <th>Tests</th>
                  <th>Marks</th>
                  <th>Status</th>
                  <th>Code</th>
                </tr>
              </thead>

              <tbody>

                {questions.map(
                  (question, index) => {

                    const submission =
                      question.best_submission ||
                      question.submission ||
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
                            className={
                              submission?.status ===
                              "Accepted"
                                ? "result-pill accepted"
                                : "result-pill failed"
                            }
                          >
                            {submission?.status ||
                              "Not Submitted"}
                          </span>
                        </td>

                        <td>

                          {submission ? (
                            <button
                              className="view-code-button"
                              onClick={() =>
                                viewCode(
                                  question.id
                                )
                              }
                            >
                              View Code
                            </button>
                          ) : (
                            <span>
                              -
                            </span>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* =================================================
            SECURITY SUMMARY
        ================================================= */}

        <section className="security-panel">

          <div className="security-panel-header">

            <div>
              <h2>
                Security Activity
              </h2>

              <p>
                Browser activity recorded
                during the coding attempt.
              </p>
            </div>

            <strong className="security-total">
              {securityEvents.length} events
            </strong>

          </div>

          {loadingSecurity ? (
            <div className="security-empty">
              Loading security activity...
            </div>
          ) : (
            <>
              <div className="security-summary">

                <div className="security-stat">
                  <strong>
                    {
                      securityCounts.TAB_SWITCH
                    }
                  </strong>

                  <span>
                    Tab Switches
                  </span>
                </div>

                <div className="security-stat">
                  <strong>
                    {
                      securityCounts.COPY_ATTEMPT
                    }
                  </strong>

                  <span>
                    Copy Attempts
                  </span>
                </div>

                <div className="security-stat">
                  <strong>
                    {
                      securityCounts.PASTE_ATTEMPT
                    }
                  </strong>

                  <span>
                    Paste Attempts
                  </span>
                </div>

                <div className="security-stat">
                  <strong>
                    {
                      securityCounts.FULLSCREEN_EXIT
                    }
                  </strong>

                  <span>
                    Fullscreen Exits
                  </span>
                </div>

                <div className="security-stat">
                  <strong>
                    {
                      securityCounts.RIGHT_CLICK
                    }
                  </strong>

                  <span>
                    Right Clicks
                  </span>
                </div>

                <div className="security-stat">
                  <strong>
                    {
                      securityCounts.PAGE_REFRESH
                    }
                  </strong>

                  <span>
                    Page Refreshes
                  </span>
                </div>

              </div>

              <div className="security-events-list">

                {securityEvents.length === 0 ? (
                  <div className="security-empty">
                    No security events recorded.
                  </div>
                ) : (
                  securityEvents.map(
                    (event) => (
                      <div
                        className="security-event-row"
                        key={event.id}
                      >

                        <div className="security-event-icon">
                          {getEventIcon(
                            event.event_type
                          )}
                        </div>

                        <div className="security-event-info">

                          <strong>
                            {getEventLabel(
                              event.event_type
                            )}
                          </strong>

                          <small>
                            {formatDate(
                              event.occurred_at
                            )}
                          </small>

                        </div>

                      </div>
                    )
                  )
                )}

              </div>
            </>
          )}

        </section>

      </main>

    </div>
  );
};

export default CodingResultDetails;