import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CodingTestCaseManagement.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

const CodingTestCaseManagement = () => {
  const { examId, questionId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    input: "",
    expected_output: "",
    is_hidden: true,
    marks: "",
  });

  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    loadData();
  }, [questionId]);

  const loadData = async () => {
  try {
    setLoading(true);

    const questionResponse = await fetch(
      `${API_URL}/api/coding-questions/${questionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const questionData = await questionResponse.json();

    console.log("QUESTION STATUS:", questionResponse.status);
    console.log("QUESTION RESPONSE:", questionData);

    if (!questionResponse.ok) {
      throw new Error(
        questionData.message || "Failed to load question"
      );
    }

    setQuestion(questionData.question);

    const testCaseResponse = await fetch(
      `${API_URL}/api/coding-test-cases/question/${questionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const testCaseData = await testCaseResponse.json();

    console.log("TEST CASE STATUS:", testCaseResponse.status);
    console.log("TEST CASE RESPONSE:", testCaseData);

    if (!testCaseResponse.ok) {
      throw new Error(
        testCaseData.message || "Failed to load test cases"
      );
    }

    setTestCases(testCaseData.testCases || []);
  } catch (error) {
    console.error("LOAD TEST CASES ERROR:", error);
    alert(error.message || "Unable to load test cases");
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

  const resetForm = () => {
    setForm({
      input: "",
      expected_output: "",
      is_hidden: true,
      marks: "",
    });

    setEditingId(null);
  };

  const saveTestCase = async (e) => {
    e.preventDefault();

    if (
      !form.input.trim() ||
      !form.expected_output.trim()
    ) {
      alert("Input and expected output are required");
      return;
    }

    const url = editingId
      ? `${API_URL}/api/coding-test-cases/${editingId}`
      : `${API_URL}/api/coding-test-cases`;

    try {
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: Number(questionId),
          input: form.input,
          expected_output: form.expected_output,
          is_hidden: form.is_hidden,
          marks: form.marks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to save test case");
        return;
      }

      if (editingId) {
        setTestCases((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? data.testCase
              : item
          )
        );
      } else {
        setTestCases((prev) => [
          ...prev,
          data.testCase,
        ]);
      }

      resetForm();
    } catch (error) {
      console.error(error);
      alert("Unable to save test case");
    }
  };

  const editTestCase = (testCase) => {
    setEditingId(testCase.id);

    setForm({
      input: testCase.input || "",
      expected_output:
        testCase.expected_output || "",
      is_hidden: testCase.is_hidden,
      marks:
        testCase.marks === null
          ? ""
          : testCase.marks,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteTestCase = async (id) => {
    if (!window.confirm("Delete this test case?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/coding-test-cases/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete test case");
        return;
      }

      setTestCases((prev) =>
        prev.filter((item) => item.id !== id)
      );

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      alert("Unable to delete test case");
    }
  };

  if (loading) {
    return (
      <div className="test-case-page">
        <div className="test-case-loading">
          Loading...
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="test-case-page">
        <div className="test-case-empty">
          Question not found
        </div>
      </div>
    );
  }

  return (
    <div className="test-case-page">
      <div className="test-case-header">
        <div>
          <button
            className="test-case-back"
            onClick={() =>
              navigate(
                `/admin/coding-exams/${examId}`
              )
            }
          >
            ← Back to Questions
          </button>

          <h1>{question.title}</h1>

          <p>
            {testCases.length} test case
            {testCases.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Form */}

      <div className="test-case-form-card">
        <div className="test-case-form-header">
          <div>
            <h2>
              {editingId
                ? "Edit Test Case"
                : "Add Test Case"}
            </h2>

            <p>
              Configure input and expected output.
            </p>
          </div>
        </div>

        <form onSubmit={saveTestCase}>
          <div className="test-case-two-column">
            <div className="test-case-group">
              <label>Input</label>

              <textarea
                name="input"
                value={form.input}
                onChange={handleChange}
                placeholder="Example:
5
10 20 30 40 50"
                rows="8"
                required
              />
            </div>

            <div className="test-case-group">
              <label>Expected Output</label>

              <textarea
                name="expected_output"
                value={form.expected_output}
                onChange={handleChange}
                placeholder="Example:
50"
                rows="8"
                required
              />
            </div>
          </div>

          <div className="test-case-options">
            <label className="hidden-toggle">
              <input
                type="checkbox"
                checked={form.is_hidden}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_hidden: e.target.checked,
                  }))
                }
              />

              <span>
                Hidden test case
              </span>
            </label>

            <div className="test-case-marks">
              <label>Marks</label>

              <input
                type="number"
                min="0"
                name="marks"
                value={form.marks}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="test-case-form-actions">
            {editingId && (
              <button
                type="button"
                className="test-case-cancel"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}

            <button
              type="submit"
              className="test-case-save"
            >
              {editingId
                ? "Update Test Case"
                : "Add Test Case"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing cases */}

      <div className="existing-test-cases">
        <div className="existing-test-header">
          <h2>Test Cases</h2>

          <span>
            {testCases.length} total
          </span>
        </div>

        {testCases.length === 0 ? (
          <div className="test-case-empty">
            No test cases added yet.
          </div>
        ) : (
          <div className="test-case-list">
            {testCases.map((testCase, index) => (
              <div
                className="test-case-item"
                key={testCase.id}
              >
                <div className="test-case-number">
                  {index + 1}
                </div>

                <div className="test-case-details">
                  <div className="test-case-item-header">
                    <span
                      className={
                        testCase.is_hidden
                          ? "case-badge hidden"
                          : "case-badge visible"
                      }
                    >
                      {testCase.is_hidden
                        ? "Hidden"
                        : "Sample"}
                    </span>

                    {testCase.marks !== null && (
                      <span className="case-marks">
                        {testCase.marks} marks
                      </span>
                    )}
                  </div>

                  <div className="test-case-preview">
                    <div>
                      <label>Input</label>
                      <pre>
                        {testCase.input}
                      </pre>
                    </div>

                    <div>
                      <label>Expected Output</label>
                      <pre>
                        {testCase.expected_output}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="test-case-actions">
                  <button
                    onClick={() =>
                      editTestCase(testCase)
                    }
                  >
                    Edit
                  </button>

                  <button
                    className="delete-case"
                    onClick={() =>
                      deleteTestCase(testCase.id)
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodingTestCaseManagement;