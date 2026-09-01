import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionUpload from "../components/QuestionUpload";
import CreateExamModal from "../components/CreateExamModal";
import "./AdminDashboard.css";

const API_URL = "http://localhost:5000";

export default function AdminDashboard({ admin, onLogout }) {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateExam, setShowCreateExam] =
    useState(false);

  const [selectedExamId, setSelectedExamId] =
    useState("");

  /* =========================
     FETCH EXAMS ON LOAD
  ========================= */

  useEffect(() => {
    fetchExams();
  }, []);

  /* =========================
     SELECT FIRST EXAM
  ========================= */

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(String(exams[0].id));
    }
  }, [exams, selectedExamId]);

  /* =========================
     FETCH EXAMS
  ========================= */

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("adminToken");

      if (!token) {
        throw new Error(
          "Admin session expired. Please login again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/exams`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log("EXAMS RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch examinations"
        );
      }

      setExams(data.exams || []);

    } catch (err) {
      console.error(
        "FETCH EXAMS ERROR:",
        err
      );

      setError(err.message);

    } finally {
      setLoading(false);
    }
  };

  /* =========================
     TOTAL QUESTIONS
  ========================= */

  const totalQuestions = exams.reduce(
    (total, exam) =>
      total +
      Number(exam.question_count || 0),
    0
  );

  /* =========================
     PUBLISHED EXAMS
  ========================= */

  const publishedExams = exams.filter(
    (exam) =>
      exam.status === "published" ||
      exam.is_published === true
  );

  /* =========================
     LOGOUT
  ========================= */

  const handleLogout = () => {
    localStorage.removeItem("adminToken");

    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="admin-page">

      {/* =========================
          TOP BAR
      ========================= */}

      <header className="admin-topbar">

        <div className="admin-brand">

          <div className="admin-logo">
            X
          </div>

          <div>

            <div className="admin-brand-name">
              XEVOTECH
            </div>

            <div className="admin-product-name">
              EXAM PROTOCOL
            </div>

          </div>

        </div>


        <div className="admin-profile">

          <div className="profile-avatar">
            {admin?.username
              ?.charAt(0)
              .toUpperCase() || "A"}
          </div>

          <div className="profile-info">

            <strong>
              {admin?.username || "admin"}
            </strong>

            <span>
              Administrator
            </span>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      <div className="admin-layout">

        {/* =========================
            SIDEBAR
        ========================= */}

        <aside className="admin-sidebar">

          <div className="sidebar-label">
            MANAGEMENT
          </div>


          <button
            className="sidebar-item active"
            onClick={() =>
              navigate("/admin")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              document
                .querySelector(".content-card")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            <span>▣</span>
            Exams
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              document
                .querySelector(".upload-card")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            <span>☷</span>
            Question Bank
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              document
                .querySelector(".upload-card")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            <span>⇧</span>
            Upload Questions
          </button>


          <button
            className="sidebar-item"
            onClick={() =>
              alert(
                "Candidate management will be added next."
              )
            }
          >
            <span>◉</span>
            Candidates
          </button>


          {/* RESULTS */}

          <button
            className="sidebar-item"
            onClick={() => {

              if (selectedExamId) {

                navigate(
                  `/admin/exams/${selectedExamId}/results`
                );

              } else {

                alert(
                  "Please create or select an examination first."
                );

              }

            }}
          >
            <span>▤</span>
            Results
          </button>


          <div className="sidebar-label security-label">
            SECURITY
          </div>


          <button
            className="sidebar-item"
            onClick={() =>
              alert(
                "Security logs will be added next."
              )
            }
          >
            <span>◇</span>
            Security Logs
          </button>

        </aside>


        {/* =========================
            MAIN
        ========================= */}

        <main className="admin-main">

          {/* PAGE HEADING */}

          <div className="page-heading">

            <div>

              <div className="heading-eyebrow">
                ADMINISTRATION
              </div>

              <h1>
                Dashboard
              </h1>

              <p>
                Manage your recruitment
                examination workflow from
                one place.
              </p>

            </div>


            <button
              className="new-exam-button"
              onClick={() =>
                setShowCreateExam(true)
              }
            >
              <span>+</span>
              New Exam
            </button>

          </div>


          {/* =========================
              STATS
          ========================= */}

          <section className="stats-grid">

            <div className="stat-card">

              <div className="stat-top">

                <span>
                  ACTIVE EXAMS
                </span>

                <div className="stat-icon purple">
                  ▣
                </div>

              </div>

              <strong>
                {publishedExams.length}
              </strong>

              <small>
                Currently published
              </small>

            </div>


            <div className="stat-card">

              <div className="stat-top">

                <span>
                  EXAMS
                </span>

                <div className="stat-icon pink">
                  ▤
                </div>

              </div>

              <strong>
                {exams.length}
              </strong>

              <small>
                Total examinations
              </small>

            </div>


            <div className="stat-card">

              <div className="stat-top">

                <span>
                  QUESTIONS
                </span>

                <div className="stat-icon blue">
                  ☷
                </div>

              </div>

              <strong>
                {totalQuestions}
              </strong>

              <small>
                Across all exams
              </small>

            </div>


            <div className="stat-card">

              <div className="stat-top">

                <span>
                  CANDIDATES
                </span>

                <div className="stat-icon green">
                  ◉
                </div>

              </div>

              <strong>
                —
              </strong>

              <small>
                We'll connect this next
              </small>

            </div>

          </section>


          {/* =========================
              EXAM MANAGEMENT
          ========================= */}

          <section className="content-card">

            <div className="card-heading">

              <div>

                <span className="card-eyebrow">
                  EXAM MANAGEMENT
                </span>

                <h2>
                  Your Examinations
                </h2>

              </div>

            </div>


            {/* LOADING */}

            {loading && (
              <div className="dashboard-message">
                Loading examinations...
              </div>
            )}


            {/* ERROR */}

            {!loading && error && (

              <div className="dashboard-error">

                {error}

                <button
                  onClick={fetchExams}
                  style={{
                    marginLeft: "15px",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>

              </div>

            )}


            {/* EMPTY */}

            {!loading &&
              !error &&
              exams.length === 0 && (

                <div className="dashboard-message">

                  No examinations created yet.

                </div>

              )}


            {/* EXAM LIST */}

            {!loading &&
              !error &&
              exams.map((exam) => (

                <div
                  className="exam-row"
                  key={exam.id}
                >

                  {/* ICON */}

                  <div className="exam-symbol">
                    EP
                  </div>


                  {/* DETAILS */}

                  <div className="exam-details">

                    <h3>
                      {exam.title ||
                        exam.name}
                    </h3>

                    <p>
                      {exam.description ||
                        "Recruitment examination"}
                    </p>


                    <div className="exam-meta">

                      <span>
                        {exam.question_count ||
                          0}{" "}
                        Questions
                      </span>

                      <span>
                        •
                      </span>

                      <span>
                        {exam.duration_minutes ||
                          0}{" "}
                        Minutes
                      </span>

                      <span>
                        •
                      </span>

                      <span>
                        Cutoff:{" "}
                        {exam.cutoff_percentage ||
                          0}
                        %
                      </span>

                    </div>

                  </div>


                  {/* STATUS */}

                  <div
                    className={
                      exam.status ===
                      "published"
                        ? "exam-status published"
                        : "exam-status"
                    }
                  >
                    {exam.status ===
                    "published"
                      ? "PUBLISHED"
                      : "DRAFT"}
                  </div>


                  {/* ACTIONS */}

                  <div className="exam-actions">

                    <button
                      onClick={() =>
                        navigate(
                          `/admin/exams/${exam.id}`
                        )
                      }
                    >
                      Manage
                    </button>


                    <button
  className={
    exam.status === "published"
      ? "results-button"
      : "results-button disabled"
  }
  disabled={exam.status !== "published"}
  onClick={() => {
    window.location.href =
      `/admin/exams/${exam.id}/results`;
  }}
>
  {exam.status === "published"
    ? "Results"
    : "Results unavailable"}
</button>

                  </div>

                </div>

              ))}

          </section>


          {/* =========================
              QUESTION UPLOAD
          ========================= */}

          <section
            className="content-card upload-card"
          >

            <div className="card-heading">

              <div>

                <span className="card-eyebrow">
                  QUESTION BANK
                </span>

                <h2>
                  Import Questions
                </h2>

                <p>
                  Upload your Excel question
                  bank directly into your
                  exam.
                </p>

              </div>

            </div>


            {/* EXAM SELECTOR */}

            <div className="exam-selector">

              <label>
                SELECT EXAMINATION
              </label>

              <select
                value={selectedExamId}
                onChange={(e) =>
                  setSelectedExamId(
                    e.target.value
                  )
                }
              >

                <option value="">
                  Select an examination
                </option>

                {exams.map((exam) => (

                  <option
                    key={exam.id}
                    value={exam.id}
                  >
                    {exam.title ||
                      exam.name}
                  </option>

                ))}

              </select>

            </div>


            <QuestionUpload
              examId={selectedExamId}
            />

          </section>

        </main>

      </div>


      {/* =========================
          CREATE EXAM MODAL
      ========================= */}

      {showCreateExam && (

        <CreateExamModal

          onClose={() =>
            setShowCreateExam(false)
          }

          onCreated={() => {
            setShowCreateExam(false);
            fetchExams();
          }}

        />

      )}

    </div>
  );
}