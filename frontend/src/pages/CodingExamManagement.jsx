import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CodingExamManagement.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

const DEFAULT_LANGUAGES = ["c", "cpp", "java", "python"];

const LANGUAGE_LABELS = {
  c: "C",
  cpp: "C++",
  java: "Java",
  python: "Python",
};

const emptyForm = {
  title: "",
  description: "",
  duration_minutes: 60,
  total_marks: 100,
  instructions: "",
  allowed_languages: DEFAULT_LANGUAGES,
};

export default function CodingExamManagement() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const getToken = () => localStorage.getItem("adminToken");

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/coding-exams`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch coding exams");
      }

      setExams(data.exams || []);
    } catch (err) {
      console.error("FETCH CODING EXAMS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingExam(null);
    setForm({
      ...emptyForm,
      allowed_languages: [...DEFAULT_LANGUAGES],
    });
    setShowModal(true);
  };

  const openEditModal = (exam) => {
    setEditingExam(exam);

    let languages = exam.allowed_languages;

    if (typeof languages === "string") {
      try {
        languages = JSON.parse(languages);
      } catch {
        languages = [...DEFAULT_LANGUAGES];
      }
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      languages = [...DEFAULT_LANGUAGES];
    }

    setForm({
      title: exam.title || "",
      description: exam.description || "",
      duration_minutes: exam.duration_minutes || 60,
      total_marks: exam.total_marks || 100,
      instructions: exam.instructions || "",
      allowed_languages: languages,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingExam(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleLanguage = (language) => {
    setForm((prev) => {
      const exists = prev.allowed_languages.includes(language);

      if (exists) {
        if (prev.allowed_languages.length === 1) {
          return prev;
        }

        return {
          ...prev,
          allowed_languages: prev.allowed_languages.filter(
            (item) => item !== language
          ),
        };
      }

      return {
        ...prev,
        allowed_languages: [...prev.allowed_languages, language],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a coding exam title.");
      return;
    }

    if (Number(form.duration_minutes) <= 0) {
      alert("Duration must be greater than 0.");
      return;
    }

    if (Number(form.total_marks) <= 0) {
      alert("Total marks must be greater than 0.");
      return;
    }

    if (form.allowed_languages.length === 0) {
      alert("Select at least one programming language.");
      return;
    }

    try {
      setSaving(true);

      const isEditing = Boolean(editingExam);

      const url = isEditing
        ? `${API_URL}/api/coding-exams/${editingExam.id}`
        : `${API_URL}/api/coding-exams`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          duration_minutes: Number(form.duration_minutes),
          total_marks: Number(form.total_marks),
          instructions: form.instructions.trim(),
          allowed_languages: form.allowed_languages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${isEditing ? "update" : "create"} coding exam`
        );
      }

      closeModal();
      await fetchExams();
    } catch (err) {
      console.error("SAVE CODING EXAM ERROR:", err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // PUBLISH / UNPUBLISH CODING EXAM
  const togglePublish = async (exam) => {
    const isPublished = exam.status === "published";
    const action = isPublished ? "unpublish" : "publish";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${exam.title}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/coding-exams/${exam.id}/publish`,
        {
          // IMPORTANT: Backend route uses PUT
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Failed to ${action} coding exam`
        );
      }

      await fetchExams();
    } catch (err) {
      console.error("PUBLISH CODING EXAM ERROR:", err);
      alert(err.message);
    }
  };

  const deleteExam = async (exam) => {
    if (exam.status === "published") {
      alert(
        "Published coding exams cannot be deleted. Unpublish the exam first."
      );
      return;
    }

    if (
      !window.confirm(
        `Delete "${exam.title}"?\n\nThis will also delete its coding questions and test cases.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/coding-exams/${exam.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete coding exam");
      }

      await fetchExams();
    } catch (err) {
      console.error("DELETE CODING EXAM ERROR:", err);
      alert(err.message);
    }
  };

  const totalQuestions = exams.reduce(
    (total, exam) => total + Number(exam.question_count || 0),
    0
  );

  const publishedExams = exams.filter(
    (exam) => exam.status === "published"
  );

  return (
    <div className="coding-admin-page">
      {/* HEADER */}
      <header className="coding-admin-header">
        <div className="coding-admin-brand">
          <img src="/xevotech.jpeg" alt="Logo" className="brand-logo" />

          <div>
            <div className="coding-admin-brand-name">
              XEVOTECH
            </div>

            <div className="coding-admin-product">
              EXAM PROTOCOL
            </div>
          </div>
        </div>

        <button
          className="coding-back-button"
          onClick={() => navigate("/admin")}
        >
          ← Dashboard
        </button>
      </header>

      <main className="coding-admin-main">
        {/* PAGE HEADING */}
        <section className="coding-page-heading">
          <div>
            <div className="coding-eyebrow">
              ASSESSMENT MANAGEMENT
            </div>

            <h1>Coding Assessments</h1>

            <p>
              Create and manage programming assessments for
              shortlisted candidates.
            </p>
          </div>

          <button
            className="coding-primary-button"
            onClick={openCreateModal}
          >
            <span>+</span>
            Create Coding Exam
          </button>
        </section>

        {/* STATS */}
        <section className="coding-stats-grid">
          <div className="coding-stat-card">
            <span>CODING EXAMS</span>
            <strong>{exams.length}</strong>
            <small>Total assessments</small>
          </div>

          <div className="coding-stat-card">
            <span>PUBLISHED</span>
            <strong>{publishedExams.length}</strong>
            <small>Currently available</small>
          </div>

          <div className="coding-stat-card">
            <span>PROBLEMS</span>
            <strong>{totalQuestions}</strong>
            <small>Across all assessments</small>
          </div>
        </section>

        {/* EXAM LIST */}
        <section className="coding-content-card">
          <div className="coding-card-heading">
            <div>
              <span>CODING ASSESSMENTS</span>
              <h2>Your Coding Exams</h2>
            </div>

            <button
              className="coding-refresh-button"
              onClick={fetchExams}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {loading && (
            <div className="coding-message">
              Loading coding assessments...
            </div>
          )}

          {!loading && error && (
            <div className="coding-error">
              <span>{error}</span>

              <button onClick={fetchExams}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && exams.length === 0 && (
            <div className="coding-empty">
              <div className="coding-empty-icon">
                {"</>"}
              </div>

              <h3>No coding assessments yet</h3>

              <p>
                Create your first coding assessment to start
                adding programming problems.
              </p>

              <button
                className="coding-primary-button"
                onClick={openCreateModal}
              >
                + Create Coding Exam
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            exams.length > 0 && (
              <div className="coding-exam-list">
                {exams.map((exam) => {
                  let languages = exam.allowed_languages;

                  if (typeof languages === "string") {
                    try {
                      languages = JSON.parse(languages);
                    } catch {
                      languages = [];
                    }
                  }

                  if (!Array.isArray(languages)) {
                    languages = [];
                  }

                  const published =
                    exam.status === "published";

                  return (
                    <div
                      className="coding-exam-row"
                      key={exam.id}
                    >
                      <div className="coding-exam-icon">
                        {"</>"}
                      </div>

                      <div className="coding-exam-details">
                        <div className="coding-exam-title-row">
                          <h3>{exam.title}</h3>

                          <span
                            className={`coding-status ${
                              published
                                ? "published"
                                : "draft"
                            }`}
                          >
                            {published
                              ? "PUBLISHED"
                              : "DRAFT"}
                          </span>
                        </div>

                        <p>
                          {exam.description ||
                            "Programming assessment"}
                        </p>

                        <div className="coding-exam-meta">
                          <span>
                            {exam.question_count || 0} Problems
                          </span>

                          <span>•</span>

                          <span>
                            {exam.duration_minutes || 0} Minutes
                          </span>

                          <span>•</span>

                          <span>
                            {exam.total_marks || 0} Marks
                          </span>
                        </div>

                        <div className="coding-language-list">
                          {languages.map((language) => (
                            <span key={language}>
                              {LANGUAGE_LABELS[language] ||
                                language}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="coding-exam-actions">
                        <button
                          onClick={() =>
                            navigate(
                              `/admin/coding-exams/${exam.id}`
                            )
                          }
                        >
                          Manage Problems
                        </button>

                        <button
                          onClick={() =>
                            navigate(
                              `/admin/coding-exams/${exam.id}/results`
                            )
                          }
                        >
                          Results
                        </button>

                        <button
                          onClick={() =>
                            openEditModal(exam)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className={
                            published
                              ? "warning"
                              : "success"
                          }
                          onClick={() =>
                            togglePublish(exam)
                          }
                        >
                          {published
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                        {!published && (
                          <button
                            className="danger"
                            onClick={() =>
                              deleteExam(exam)
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </section>
      </main>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div
          className="coding-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="coding-modal">
            <div className="coding-modal-header">
              <div>
                <span>
                  {editingExam
                    ? "EDIT ASSESSMENT"
                    : "NEW ASSESSMENT"}
                </span>

                <h2>
                  {editingExam
                    ? "Edit Coding Exam"
                    : "Create Coding Exam"}
                </h2>
              </div>

              <button
                className="coding-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="coding-form-group">
                <label>EXAM TITLE *</label>

                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. XevoTech Coding Assessment"
                  required
                />
              </div>

              <div className="coding-form-group">
                <label>DESCRIPTION</label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Brief description of the assessment"
                  rows="3"
                />
              </div>

              <div className="coding-form-grid">
                <div className="coding-form-group">
                  <label>DURATION (MINUTES) *</label>

                  <input
                    type="number"
                    name="duration_minutes"
                    value={form.duration_minutes}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>

                <div className="coding-form-group">
                  <label>TOTAL MARKS *</label>

                  <input
                    type="number"
                    name="total_marks"
                    value={form.total_marks}
                    onChange={handleChange}
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="coding-form-group">
                <label>ALLOWED LANGUAGES *</label>

                <div className="language-checkbox-grid">
                  {DEFAULT_LANGUAGES.map((language) => (
                    <label
                      className={`language-option ${
                        form.allowed_languages.includes(language)
                          ? "selected"
                          : ""
                      }`}
                      key={language}
                    >
                      <input
                        type="checkbox"
                        checked={form.allowed_languages.includes(
                          language
                        )}
                        onChange={() =>
                          toggleLanguage(language)
                        }
                      />

                      <span>
                        {LANGUAGE_LABELS[language]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="coding-form-group">
                <label>INSTRUCTIONS</label>

                <textarea
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  placeholder="Instructions shown to candidates before the assessment"
                  rows="5"
                />
              </div>

              <div className="coding-modal-footer">
                <button
                  type="button"
                  className="coding-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="coding-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingExam
                    ? "Save Changes"
                    : "Create Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}