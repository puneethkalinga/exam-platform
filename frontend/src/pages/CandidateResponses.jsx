import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CandidateResponses.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

export default function CandidateResponses() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
const [candidate, setCandidate] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResponses();
  }, [attemptId]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("adminToken");

      const response = await fetch(
        `${API_URL}/api/results/attempt/${attemptId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch responses"
        );
      }

      setCandidate(data.candidate);
      setResponses(data.responses || []);
    } catch (err) {
      console.error("FETCH RESPONSES ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="responses-loading">
        Loading candidate responses...
      </div>
    );
  }

  if (error) {
    return (
      <div className="responses-error">
        <h2>Unable to load responses</h2>
        <p>{error}</p>

        <button onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="candidate-responses">

      <header className="responses-header">

        <button
          className="responses-back"
          onClick={() => navigate(-1)}
        >
          ← Back to Results
        </button>

        <div className="responses-brand">
          XEVOTECH
          <span>EXAM PROTOCOL</span>
        </div>

      </header>

      <main className="responses-main">

        <div className="responses-title">
          <div>
            <span>CANDIDATE EVALUATION</span>

            <h1>Candidate Responses</h1>

            <p>
              Attempt ID: #{attemptId}
            </p>

            {candidate && (
  <div className="candidate-info">
    <div>
      <span>NAME</span>
      <strong>{candidate.name}</strong>
    </div>

    <div>
      <span>ROLL NUMBER</span>
      <strong>{candidate.roll_number}</strong>
    </div>

    <div>
      <span>COURSE</span>
      <strong>{candidate.course || "—"}</strong>
    </div>
  </div>
)}
          </div>
        </div>

        <section className="responses-panel">

          <div className="responses-panel-header">
            <span>ANSWER REVIEW</span>

            <strong>
              {responses.length} Questions
            </strong>
          </div>

          {responses.length === 0 ? (
            <div className="responses-empty">
              No responses found.
            </div>
          ) : (
            <div className="response-list">

              {responses.map((response, index) => {

                const selected =
                  response.selected_answer;

                const correct =
                  response.correct_answer;

                const isCorrect =
  selected &&
  correct &&
  String(selected).toUpperCase() ===
    String(correct).toUpperCase();

                return (
                  <article
                    className="response-card"
                    key={response.question_id}
                  >

                    <div className="response-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="response-content">

                      <div className="response-status">
                        {selected
                          ? isCorrect
                            ? "✓ CORRECT"
                            : "✕ INCORRECT"
                          : "— UNANSWERED"}
                      </div>

                      <h2>
                        {response.question_text}
                      </h2>

                      <div className="response-options">

                        {[
                          ["A", response.option_a],
                          ["B", response.option_b],
                          ["C", response.option_c],
                          ["D", response.option_d],
                        ].map(([letter, text]) => {

                          const isSelected =
                            selected === letter;

                          const isAnswer =
                            correct === letter;

                          return (
                            <div
                              key={letter}
                              className={[
                                "response-option",

                                isSelected
                                  ? "candidate-answer"
                                  : "",

                                isAnswer
                                  ? "correct-answer"
                                  : "",

                                isSelected &&
                                !isAnswer
                                  ? "wrong-answer"
                                  : "",
                              ].join(" ")}
                            >

                              <span className="response-option-letter">
                                {letter}
                              </span>

                              <span className="response-option-text">
                                {text}
                              </span>

                              {isSelected && (
                                <span className="answer-label">
                                  CANDIDATE
                                </span>
                              )}

                              {!isSelected &&
                                isAnswer && (
                                  <span className="answer-label">
                                    CORRECT
                                  </span>
                                )}

                            </div>
                          );
                        })}

                      </div>

                    </div>

                    <div className="response-marks">

                      <strong>
                        {response.marks_obtained ?? 0}
                      </strong>

                      <span>
                        / {response.marks ?? 1}
                      </span>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}