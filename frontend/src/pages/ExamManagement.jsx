import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddQuestionModal from "../components/AddQuestionModal";
import "./ExamManagement.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

export default function ExamManagement() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("adminToken");

      // Get exam
      const response = await fetch(
        `${API_URL}/api/exams/${examId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load exam"
        );
      }

      setExam(data.exam || data);

      // Get questions
      const questionResponse = await fetch(
        `${API_URL}/api/questions/exam/${examId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const questionData = await questionResponse.json();

      if (!questionResponse.ok) {
        throw new Error(
          questionData.message ||
            "Failed to load questions"
        );
      }

      setQuestions(
        questionData.questions || questionData
      );

    } catch (err) {
      console.error("LOAD EXAM ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // EDIT QUESTION
  const handleEdit = (question) => {
    console.log(
      "EDIT QUESTION OBJECT:",
      question
    );

    setEditingQuestion(question);
  };

  // DELETE QUESTION
  const handleDelete = async (questionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this question?"
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("adminToken");

      const response = await fetch(
        `${API_URL}/api/questions/exam/${questionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error(
          "SERVER RESPONSE:",
          text
        );

        throw new Error(
          `Server returned ${response.status} instead of JSON`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete question"
        );
      }

      console.log(
        "DELETE QUESTION RESPONSE:",
        data
      );

      await loadExam();

    } catch (error) {
      console.error(
        "DELETE QUESTION ERROR:",
        error
      );

      alert(error.message);
    }
  };

  const handlePublish = async () => {
  try {
    const token = localStorage.getItem("adminToken");

    const response = await fetch(
      `${API_URL}/api/exams/${examId}/publish`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    console.log("PUBLISH RESPONSE:", data);

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to publish exam"
      );
    }

    // Use the exam returned by the backend immediately
    setExam(data.exam);

  } catch (error) {
    console.error("PUBLISH EXAM ERROR:", error);
    alert(error.message);
  }
};

  // LOADING
  if (loading) {
    return (
      <div className="exam-management">
        <div className="management-loading">
          Loading examination...
        </div>
      </div>
    );
  }

  // ERROR
  if (error) {
    return (
      <div className="exam-management">
        <div className="management-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="exam-management">

      {/* HEADER */}

      <header className="management-header">

        <button
          className="back-button"
          onClick={() => navigate("/admin")}
        >
          ← Dashboard
        </button>
        <div>
          <img src="/xevotech.jpeg" alt="Xevotech Logo" className="brand-logo" />
            </div>

      </header>

      {/* MAIN */}

      <main className="management-main">

        {/* TITLE */}

        <div className="management-title">

          <div>
            <span>EXAMINATION</span>

            <h1>
              {exam?.title}
            </h1>

            <p>
              {exam?.description ||
                "Recruitment examination"}
            </p>
          </div>

          <button
  className={
    exam?.status === "published"
      ? "management-status published"
      : "management-status"
  }
  onClick={handlePublish}
>
  {exam?.status === "published"
    ? "● PUBLISHED"
    : "● PUBLISH EXAM"}
</button>

        </div>

        {/* STATS */}

        <div className="management-stats">

          <div>
            <span>QUESTIONS</span>
            <strong>
              {questions.length}
            </strong>
          </div>

          <div>
            <span>DURATION</span>

            <strong>
              {exam?.duration_minutes || 0}
              <small> min</small>
            </strong>
          </div>

          <div>
            <span>CUTOFF</span>

            <strong>
              {exam?.cutoff_percentage || 0}
              <small>%</small>
            </strong>
          </div>

        </div>

        {/* QUESTIONS */}

        <section className="questions-panel">

          <div className="questions-heading">

            <div>
              <span>QUESTION BANK</span>
              <h2>Questions</h2>
            </div>

            <button
              className="add-question-button"
              onClick={() =>
                setShowAddQuestion(true)
              }
            >
              + Add Question
            </button>

          </div>

          {questions.length === 0 ? (

            <div className="empty-questions">

              <div className="empty-icon">
                ☷
              </div>

              <h3>
                No questions yet
              </h3>

              <p>
                Upload an Excel question bank
                from the dashboard.
              </p>

            </div>

          ) : (

            <div className="question-list">

              {questions.map(
                (question, index) => (

                  <div
                    className="question-card"
                    key={question.id}
                  >

                    <div className="question-number">
                      {index + 1}
                    </div>

                    <div className="question-content">

                      <h3>
                        {question.question_text}
                      </h3>

                      <div className="options-grid">

                        <span>
                          <b>A</b>
                          {question.option_a}
                        </span>

                        <span>
                          <b>B</b>
                          {question.option_b}
                        </span>

                        <span>
                          <b>C</b>
                          {question.option_c}
                        </span>

                        <span>
                          <b>D</b>
                          {question.option_d}
                        </span>

                      </div>

                    </div>

                    <div className="question-meta">
                      {question.marks || 1} mark
                    </div>

                    {/* ACTIONS */}

                    <div className="question-actions">

                      <button
                        onClick={() =>
                          handleEdit(question)
                        }
                        className="edit-question"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            question.id
                          )
                        }
                        className="delete-question"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* ADD QUESTION MODAL */}

      {showAddQuestion && (
        <AddQuestionModal
          examId={examId}
          onClose={() =>
            setShowAddQuestion(false)
          }
          onAdded={loadExam}
        />
      )}

      {/* EDIT QUESTION MODAL */}

      {editingQuestion && (
        <AddQuestionModal
          examId={examId}
          question={editingQuestion}
          onClose={() =>
            setEditingQuestion(null)
          }
          onAdded={loadExam}
        />
      )}

    </div>
  );
}