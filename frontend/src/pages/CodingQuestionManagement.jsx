import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CodingQuestionManagement.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

const CodingQuestionManagement = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    input_format: "",
    output_format: "",
    constraints: "",
    sample_input: "",
    sample_output: "",
    explanation: "",
    marks: 10,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    display_order: 1,
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      const [examResponse, questionResponse] = await Promise.all([
        fetch(`${API_URL}/api/coding-exams/${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/api/coding-questions/exam/${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const examData = await examResponse.json();
      const questionData = await questionResponse.json();

      if (examResponse.ok) {
        setExam(examData.exam);
      }

      if (questionResponse.ok) {
        setQuestions(questionData.questions || []);
      }
    } catch (error) {
      console.error(error);
      alert("Unable to load coding exam");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const createQuestion = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      alert("Title and description are required");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/coding-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            coding_exam_id: Number(examId),
            ...form,
            marks: Number(form.marks),
            time_limit_ms: Number(form.time_limit_ms),
            memory_limit_mb: Number(form.memory_limit_mb),
            display_order: Number(form.display_order),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to create question");
        return;
      }

      setQuestions((prev) => [...prev, data.question]);

      setForm({
        title: "",
        description: "",
        input_format: "",
        output_format: "",
        constraints: "",
        sample_input: "",
        sample_output: "",
        explanation: "",
        marks: 10,
        time_limit_ms: 2000,
        memory_limit_mb: 128,
        display_order: questions.length + 2,
      });

      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert("Unable to create question");
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm("Delete this coding question?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/coding-questions/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete question");
        return;
      }

      setQuestions((prev) =>
        prev.filter((question) => question.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert("Unable to delete question");
    }
  };

  if (loading) {
    return (
      <div className="coding-question-page">
        <div className="coding-question-loading">
          Loading...
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="coding-question-page">
        <div className="coding-question-empty">
          <h2>Exam not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="coding-question-page">
      <div className="coding-question-header">
        <div>
          <button
            className="back-button"
            onClick={() => navigate("/admin/coding-exams")}
          >
            ← Coding Exams
          </button>

          <h1>{exam.title}</h1>

          <p>
            {questions.length} question
            {questions.length !== 1 ? "s" : ""}
            {" · "}
            {exam.total_marks} total marks
            {" · "}
            {exam.duration_minutes} minutes
          </p>
        </div>

        <button
          className="add-question-button"
          onClick={() => setShowForm(true)}
        >
          + Add Question
        </button>
      </div>

      <div className="question-list">
        {questions.length === 0 ? (
          <div className="coding-question-empty">
            <h3>No coding questions</h3>
            <p>
              Add your first programming problem to this assessment.
            </p>
          </div>
        ) : (
          questions.map((question, index) => (
            <div
              className="coding-question-card"
              key={question.id}
            >
              <div className="question-number">
                {index + 1}
              </div>

              <div className="question-content">
                <h2>{question.title}</h2>

                <p>
                  {question.description.length > 180
                    ? `${question.description.substring(
                        0,
                        180
                      )}...`
                    : question.description}
                </p>

                <div className="question-meta">
                  <span>{question.marks} Marks</span>
                  <span>
                    {question.time_limit_ms} ms
                  </span>
                  <span>
                    {question.memory_limit_mb} MB
                  </span>
                </div>
              </div>

              <div className="question-actions">
                <button
                  onClick={() =>
                    navigate(
                      `/admin/coding-exams/${examId}/questions/${question.id}`
                    )
                  }
                >
                  Test Cases
                </button>

                <button
                  className="delete-question"
                  onClick={() =>
                    deleteQuestion(question.id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div
          className="question-modal-overlay"
          onClick={() => setShowForm(false)}
        >
          <div
            className="question-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="question-modal-header">
              <div>
                <h2>Add Coding Question</h2>
                <p>Create the programming problem.</p>
              </div>

              <button
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={createQuestion}>
              <div className="question-form-group">
                <label>Problem Title</label>

                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Find the Largest Element"
                  required
                />
              </div>

              <div className="question-form-group">
                <label>Problem Description</label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Describe the problem..."
                  required
                />
              </div>

              <div className="question-form-group">
                <label>Input Format</label>

                <textarea
                  name="input_format"
                  value={form.input_format}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe the input..."
                />
              </div>

              <div className="question-form-group">
                <label>Output Format</label>

                <textarea
                  name="output_format"
                  value={form.output_format}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe the output..."
                />
              </div>

              <div className="question-form-group">
                <label>Constraints</label>

                <textarea
                  name="constraints"
                  value={form.constraints}
                  onChange={handleChange}
                  rows="3"
                  placeholder="e.g. 1 ≤ N ≤ 10^5"
                />
              </div>

              <div className="question-two-column">
                <div className="question-form-group">
                  <label>Sample Input</label>

                  <textarea
                    name="sample_input"
                    value={form.sample_input}
                    onChange={handleChange}
                    rows="4"
                    placeholder="5&#10;10 20 30 40 50"
                  />
                </div>

                <div className="question-form-group">
                  <label>Sample Output</label>

                  <textarea
                    name="sample_output"
                    value={form.sample_output}
                    onChange={handleChange}
                    rows="4"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="question-form-group">
                <label>Explanation</label>

                <textarea
                  name="explanation"
                  value={form.explanation}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Explain the sample..."
                />
              </div>

              <div className="question-three-column">
                <div className="question-form-group">
                  <label>Marks</label>

                  <input
                    type="number"
                    name="marks"
                    min="1"
                    value={form.marks}
                    onChange={handleChange}
                  />
                </div>

                <div className="question-form-group">
                  <label>Time Limit (ms)</label>

                  <input
                    type="number"
                    name="time_limit_ms"
                    min="100"
                    value={form.time_limit_ms}
                    onChange={handleChange}
                  />
                </div>

                <div className="question-form-group">
                  <label>Memory (MB)</label>

                  <input
                    type="number"
                    name="memory_limit_mb"
                    min="16"
                    value={form.memory_limit_mb}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="question-modal-footer">
                <button
                  type="button"
                  className="question-cancel"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="question-save"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodingQuestionManagement;