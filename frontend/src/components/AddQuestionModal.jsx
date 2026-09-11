import { useState } from "react";
import "./AddQuestionModal.css";

const API_URL = "";

export default function AddQuestionModal({
  examId,
  question,
  onClose,
  onAdded,
}) {
  const [questionText, setQuestionText] = useState(
  question?.question_text || ""
);

const [optionA, setOptionA] = useState(
  question?.option_a || ""
);

const [optionB, setOptionB] = useState(
  question?.option_b || ""
);

const [optionC, setOptionC] = useState(
  question?.option_c || ""
);

const [optionD, setOptionD] = useState(
  question?.option_d || ""
);

const [correctAnswer, setCorrectAnswer] =
  useState(question?.correct_answer || "A");

const [marks, setMarks] = useState(
  question?.marks || 1
);

const [category, setCategory] = useState(
  question?.category || "Technical"
);

const [difficulty, setDifficulty] = useState(
  question?.difficulty || "Easy"
);

const [questionOrder, setQuestionOrder] =
  useState(question?.question_order || 1);

const isExistingWritten = Boolean(
  question &&
  !question.option_a &&
  !question.option_b &&
  !question.option_c &&
  !question.option_d
);
const [isWrittenQuestion, setIsWrittenQuestion] = useState(isExistingWritten);

const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();

  setError("");
  setLoading(true);

  try {
    const token = localStorage.getItem("adminToken");

    const payload = {
      examId,
      questionText: questionText.trim(),
      optionA: isWrittenQuestion ? null : optionA.trim(),
      optionB: isWrittenQuestion ? null : optionB.trim(),
      optionC: isWrittenQuestion ? null : optionC.trim(),
      optionD: isWrittenQuestion ? null : optionD.trim(),
      correctAnswer: isWrittenQuestion ? null : correctAnswer,
      marks: Number(marks),
      category,
      difficulty,
      questionOrder: Number(questionOrder),
    };

    const url = question
  ? `${API_URL}/api/questions/exam/${question.id}`
  : `${API_URL}/api/questions`;

    const method = question ? "PUT" : "POST";
console.log("QUESTION FOR UPDATE:", question);
console.log("QUESTION ID:", question?.id);
console.log("UPDATE URL:", url);
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log(
      question
        ? "UPDATE QUESTION RESPONSE:"
        : "ADD QUESTION RESPONSE:",
      data
    );

    if (!response.ok) {
      throw new Error(
        data.message ||
          (question
            ? "Failed to update question"
            : "Failed to add question")
      );
    }

    onAdded();
    onClose();

  } catch (err) {
    console.error(
      question
        ? "UPDATE QUESTION ERROR:"
        : "ADD QUESTION ERROR:",
      err
    );

    setError(err.message);

  } finally {
    setLoading(false);
  }
};

  return (
    <div className="question-modal-overlay">

      <div className="question-modal">

        <div className="question-modal-header">

          <div>
            <span>QUESTION BANK</span>
            <h2>
  {question ? "Edit Question" : "Add Question"}
</h2>
          </div>

          <button
            className="question-modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <form onSubmit={handleSubmit}>

          <label>QUESTION</label>

          <textarea
            value={questionText}
            onChange={(e) =>
              setQuestionText(e.target.value)
            }
            placeholder="Enter the question..."
            rows="3"
            required
          />

          <div style={{ margin: "14px 0 16px", padding: "10px 14px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              id="isWrittenToggle"
              checked={isWrittenQuestion}
              onChange={(e) => setIsWrittenQuestion(e.target.checked)}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <label htmlFor="isWrittenToggle" style={{ fontSize: "13px", fontWeight: "600", color: "#334155", cursor: "pointer", margin: 0 }}>
              Written / Short Answer Question (No multiple choice options)
            </label>
          </div>

          {!isWrittenQuestion ? (
            <div className="options-form">
              <div>
                <label>OPTION A</label>
                <input
                  value={optionA}
                  onChange={(e) =>
                    setOptionA(e.target.value)
                  }
                  required={!isWrittenQuestion}
                />
              </div>

              <div>
                <label>OPTION B</label>
                <input
                  value={optionB}
                  onChange={(e) =>
                    setOptionB(e.target.value)
                  }
                  required={!isWrittenQuestion}
                />
              </div>

              <div>
                <label>OPTION C</label>
                <input
                  value={optionC}
                  onChange={(e) =>
                    setOptionC(e.target.value)
                  }
                  required={!isWrittenQuestion}
                />
              </div>

              <div>
                <label>OPTION D</label>
                <input
                  value={optionD}
                  onChange={(e) =>
                    setOptionD(e.target.value)
                  }
                  required={!isWrittenQuestion}
                />
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1e40af", fontSize: "13px", margin: "10px 0 16px", lineHeight: "1.5" }}>
              ✎ <strong>Written Question:</strong> Candidates will be given a blank text box in the exam to type their answers freely. No multiple-choice options will be shown.
            </div>
          )}

          <div className="question-settings">

  <div>
    <label>CATEGORY</label>

    <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
    >
      <option value="Technical">Technical</option>
      <option value="Aptitude">Aptitude</option>
      <option value="Reasoning">Reasoning</option>
      <option value="Verbal">Verbal</option>
      <option value="Short Answer">Short Answer</option>
      <option value="General">General</option>
    </select>
  </div>

  <div>
    <label>DIFFICULTY</label>

    <select
      value={difficulty}
      onChange={(e) => setDifficulty(e.target.value)}
    >
      <option value="Easy">Easy</option>
      <option value="Medium">Medium</option>
      <option value="Hard">Hard</option>
    </select>
  </div>

</div>

<div className="question-settings">

  <div>
    <label>QUESTION ORDER</label>

    <input
      type="number"
      min="1"
      value={questionOrder}
      onChange={(e) =>
        setQuestionOrder(e.target.value)
      }
    />
  </div>

  

</div>

          <div className="question-settings">

            {!isWrittenQuestion && (
              <div>
                <label>CORRECT ANSWER</label>

                <select
                  value={correctAnswer}
                  onChange={(e) =>
                    setCorrectAnswer(e.target.value)
                  }
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            )}

            <div>
              <label>MARKS</label>

              <input
                type="number"
                min="1"
                value={marks}
                onChange={(e) =>
                  setMarks(e.target.value)
                }
              />
            </div>

          </div>

          {error && (
            <div className="question-modal-error">
              {error}
            </div>
          )}

          <div className="question-modal-actions">

            <button
              type="button"
              className="question-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="question-save"
              disabled={loading}
            >
              {loading
  ? "SAVING..."
  : question
    ? "UPDATE QUESTION"
    : "ADD QUESTION"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}
