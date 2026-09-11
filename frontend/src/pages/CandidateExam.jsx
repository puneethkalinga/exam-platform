import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import "./CandidateExam.css";

const API_URL = "";

export default function CandidateExam() {
  const { attemptId } = useParams();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [timeLeft, setTimeLeft] = useState(null);

  /*
   * Prevent duplicate loading caused by React StrictMode.
   */
  const loadStartedRef = useRef(false);

  /*
   * Prevent multiple submit requests.
   */
  const submitStartedRef = useRef(false);

  /*
   * Prevent timer/tab-switch detection before
   * the examination has successfully loaded.
   */
  const examLoadedRef = useRef(false);

  /*
   * Debounce timers for text inputs.
   */
  const debounceTimersRef = useRef({});

  /* =========================================================
     SUBMIT EXAM
  ========================================================= */

  const handleSubmit = async (
    automatic = false,
    reason = "manual"
  ) => {
    /*
     * Prevent multiple submissions.
     */
    if (
      submitStartedRef.current ||
      submitting ||
      submitted
    ) {
      return;
    }

    /*
     * Manual submission confirmation.
     */
    if (!automatic) {
      const confirmed = window.confirm(
        "Are you sure you want to submit the examination?"
      );

      if (!confirmed) {
        return;
      }
    }

    /*
     * Lock submission immediately.
     */
    submitStartedRef.current = true;

    /*
     * Stop exam interaction immediately.
     */
    examLoadedRef.current = false;

    try {
      setSubmitting(true);

      console.log(
        automatic
          ? `AUTOMATIC SUBMISSION - REASON: ${reason}`
          : "MANUAL SUBMISSION",
        attemptId
      );

      let allAnswers = answers;
      try {
        const local = JSON.parse(
          localStorage.getItem(`localAnswers_${attemptId}`) || "{}"
        );
        allAnswers = { ...answers, ...local };
      } catch (e) {
        console.error("Local answers read error:", e);
      }

      const response = await fetch(
        `${API_URL}/api/attempts/${attemptId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: allAnswers,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "SUBMIT ATTEMPT STATUS:",
        response.status
      );

      console.log(
        "SUBMIT ATTEMPT RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to submit exam"
        );
      }

      /*
       * Clear local attempt information.
       */
      localStorage.removeItem("attemptId");
      localStorage.removeItem("exam");
      localStorage.removeItem(`localAnswers_${attemptId}`);

      /*
       * Examination is successfully terminated.
       */
      setSubmitted(true);
      setSubmitting(false);

    } catch (err) {
      console.error(
        "SUBMIT EXAM ERROR:",
        err
      );

      /*
       * If submission failed, unlock so another
       * submission can be attempted.
       */
      submitStartedRef.current = false;

      /*
       * If this was not a tab switch, allow the
       * candidate to see the error.
       */
      if (reason === "TAB_SWITCH") {
        console.error(
          "TAB SWITCH SUBMISSION FAILED:",
          err
        );
      }

      setSubmitting(false);

      alert(
        err.message ||
          "Failed to submit exam"
      );
    }
  };

  /* =========================================================
     LOAD QUESTIONS
  ========================================================= */

  useEffect(() => {
    if (!attemptId) {
      setError("Invalid exam attempt");
      setLoading(false);
      return;
    }

    if (loadStartedRef.current) {
      return;
    }

    loadStartedRef.current = true;

    loadQuestions();
  }, [attemptId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError("");

      console.log(
        "LOADING QUESTIONS FOR ATTEMPT:",
        attemptId
      );

      const response = await fetch(
        `${API_URL}/api/attempts/${attemptId}/questions`
      );

      const data = await response.json();

      console.log(
        "QUESTIONS RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load questions"
        );
      }

      /* -------------------------------------------------------
         QUESTIONS
      ------------------------------------------------------- */

      const loadedQuestions =
        data.questions || [];

      setQuestions(loadedQuestions);

      /* -------------------------------------------------------
         SERVER TIMER
      ------------------------------------------------------- */

      if (
        typeof data.remainingSeconds !==
        "number"
      ) {
        throw new Error(
          "Unable to determine examination time"
        );
      }

      const serverRemainingSeconds =
        Math.max(
          0,
          Math.floor(
            Number(
              data.remainingSeconds
            )
          )
        );

      console.log(
        "SERVER REMAINING SECONDS:",
        serverRemainingSeconds
      );

      console.log(
        "SERVER EXPIRES AT:",
        data.expiresAt
      );

      /*
       * Mark exam as loaded BEFORE starting
       * timer and tab-switch detection.
       */
      examLoadedRef.current = true;

      setTimeLeft(
        serverRemainingSeconds
      );

      /* -------------------------------------------------------
         RESTORE ANSWERS
      ------------------------------------------------------- */

      const restoredAnswers = {};

      if (
        Array.isArray(data.answers)
      ) {
        data.answers.forEach(
          (answer) => {
            restoredAnswers[
              answer.question_id
            ] =
              answer.selected_answer;
          }
        );
      }

      // Merge any answers previously saved in local storage
      try {
        const localSaved = JSON.parse(
          localStorage.getItem(`localAnswers_${attemptId}`) || "{}"
        );
        Object.assign(restoredAnswers, localSaved);
      } catch (e) {
        console.error("Local storage load error:", e);
      }

      setAnswers(
        restoredAnswers
      );

    } catch (err) {
      console.error(
        "LOAD QUESTIONS ERROR:",
        err
      );

      examLoadedRef.current = false;

      setError(
        err.message ||
          "Failed to load examination"
      );

    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     TIMER
  ========================================================= */

  useEffect(() => {
    /*
     * Do nothing until the exam has loaded.
     */
    if (
      !examLoadedRef.current ||
      timeLeft === null ||
      submitted ||
      submitting
    ) {
      return;
    }

    console.log(
      "TIMER:",
      timeLeft
    );

    /*
     * Time has expired.
     */
    if (timeLeft <= 0) {
      console.log(
        "TIME EXPIRED - AUTO SUBMIT"
      );

      handleSubmit(
        true,
        "TIME_EXPIRED"
      );

      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(
        (previous) => {
          if (
            previous === null
          ) {
            return null;
          }

          return Math.max(
            0,
            previous - 1
          );
        }
      );
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [
    timeLeft,
    submitted,
    submitting,
  ]);

  /* =========================================================
     TAB SWITCH DETECTION
  ========================================================= */

  useEffect(() => {
    const handleVisibilityChange = () => {
      /*
       * document.hidden becomes true when the candidate:
       *
       * - switches browser tab
       * - minimizes the browser
       * - switches to another application in many cases
       * - moves the page out of visibility
       */

      if (
        document.hidden &&
        examLoadedRef.current &&
        !submitted &&
        !submitting &&
        !submitStartedRef.current
      ) {
        console.log(
          "TAB SWITCH DETECTED - TERMINATING EXAM"
        );

        handleSubmit(
          true,
          "TAB_SWITCH"
        );
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    submitted,
    submitting,
  ]);

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  const formatTime = (seconds) => {
    if (
      seconds === null ||
      seconds === undefined
    ) {
      return "--:--";
    }

    const safeSeconds =
      Math.max(
        0,
        Number(seconds)
      );

    const minutes =
      Math.floor(
        safeSeconds / 60
      );

    const remainingSeconds =
      safeSeconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  /* =========================================================
     SAVE ANSWER
  ========================================================= */

  const saveAnswer = async (
    questionId,
    answer
  ) => {
    try {
      console.log(
        "SENDING ANSWER:",
        {
          attemptId,
          questionId,
          selectedAnswer:
            answer,
        }
      );

      const response =
        await fetch(
          `${API_URL}/api/attempts/${attemptId}/answers`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              questionId,
              selectedAnswer:
                answer,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "SAVE ANSWER STATUS:",
        response.status
      );

      console.log(
        "SAVE ANSWER RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save answer"
        );
      }

      return true;

    } catch (err) {
      console.error(
        "SAVE ANSWER ERROR:",
        err
      );

      /*
       * Server says attempt is no longer active.
       */
      if (
        err.message ===
          "Exam attempt is not active" ||
        err.message ===
          "Examination time has expired"
      ) {
        examLoadedRef.current =
          false;

        setError(
          err.message
        );

        return false;
      }

      // Silent resilience: Answer is safely persisted in browser localStorage and will sync on submit
      return false;
    }
  };

  /* =========================================================
     HANDLE ANSWER
  ========================================================= */

  const handleAnswer = async (
    questionId,
    answer,
    isText = false
  ) => {
    if (
      submitting ||
      submitted ||
      !examLoadedRef.current
    ) {
      return;
    }

    /*
     * Update UI and persist to localStorage immediately.
     */
    setAnswers((previous) => {
      const updated = {
        ...previous,
        [questionId]: answer,
      };
      try {
        localStorage.setItem(
          `localAnswers_${attemptId}`,
          JSON.stringify(updated)
        );
      } catch (e) {
        console.error("Local storage save error:", e);
      }
      return updated;
    });

    /*
     * Save to backend in background.
     * Debounce text inputs to avoid flooding requests on every keystroke.
     */
    if (isText) {
      if (debounceTimersRef.current[questionId]) {
        clearTimeout(debounceTimersRef.current[questionId]);
      }
      debounceTimersRef.current[questionId] = setTimeout(() => {
        saveAnswer(questionId, answer);
      }, 700);
    } else {
      saveAnswer(questionId, answer);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="candidate-exam-loading">
        Loading examination...
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="candidate-exam-error">

        <h2>
          Unable to load examination
        </h2>

        <p>
          {error}
        </p>

      </div>
    );
  }

  /* =========================================================
     SUBMITTED
  ========================================================= */

  if (submitted) {
    return (
      <div className="exam-submitted-page">

        <div className="exam-submitted-card">

          <div className="submitted-icon">
            ✓
          </div>

          <span className="submitted-label">
            EXAMINATION COMPLETE
          </span>

          <h1>
            Exam Submitted
          </h1>

          <p>
            Your examination has been
            successfully submitted.
          </p>

          <div className="submitted-notice">
            Your responses have been
            recorded and will be evaluated
            by the examination administrator.
          </div>

          <div className="submitted-message">
            You may now close this window.
          </div>

        </div>

      </div>
    );
  }

  /* =========================================================
     NO QUESTIONS
  ========================================================= */

  if (
    questions.length === 0
  ) {
    return (
      <div className="candidate-exam-error">

        <h2>
          No questions available
        </h2>

        <p>
          This examination does not
          contain any questions.
        </p>

      </div>
    );
  }

  /* =========================================================
     CURRENT QUESTION
  ========================================================= */

  const question =
    questions[currentIndex];

  const hasOptions = Boolean(
    question?.option_a ||
    question?.option_b ||
    question?.option_c ||
    question?.option_d
  );

  const answeredCount =
    Object.values(
      answers
    ).filter((val) => val && String(val).trim().length > 0).length;

  /* =========================================================
     RENDER EXAM
  ========================================================= */

  return (
    <div className="candidate-exam">

      {/* HEADER */}

      <header className="candidate-exam-header">

        <div className="candidate-exam-brand">
          XEVOTECH

          <span>
            EXAM PROTOCOL
          </span>
        </div>

        <div className="candidate-exam-progress">
          Question{" "}

          <strong>
            {currentIndex + 1}
          </strong>

          {" "} / {questions.length}
        </div>

        <div className="candidate-timer">

          <span>
            TIME LEFT
          </span>

          <strong>
            {formatTime(
              timeLeft
            )}
          </strong>

        </div>

      </header>

      {/* MAIN */}

      <main className="candidate-exam-main">

        <div className="candidate-exam-top">

          <div>

            <span>
              QUESTION
            </span>

            <h1>
              {currentIndex + 1}
            </h1>

          </div>

          <div className="answered-counter">

            {answeredCount} /{" "}
            {questions.length}{" "}
            answered

          </div>

        </div>

        {/* QUESTION */}

        <section className="exam-question-card">

          <div className="question-category">

            {question.category ||
              "Technical"}

            {question.difficulty && (
              <span>
                {question.difficulty}
              </span>
            )}

          </div>

         <div
  className={
  /pseudocode|integer|set\s+\w+\s*=|while\s*\(|for\s*\(|print\s+/i.test(
    question.question_text
  )
    ? "exam-question-text code-question"
    : "exam-question-text"
}
>
  {question.question_text}
</div>

          {/* OPTIONS OR WRITTEN TEXTAREA */}
          {hasOptions ? (
            <div className="exam-options">
              {[
                [
                  "A",
                  question.option_a,
                ],
                [
                  "B",
                  question.option_b,
                ],
                [
                  "C",
                  question.option_c,
                ],
                [
                  "D",
                  question.option_d,
                ],
              ].map(
                ([letter, text]) => (
                  <button
                    key={letter}
                    type="button"
                    className={
                      answers[
                        question.id
                      ] === letter
                        ? "exam-option selected"
                        : "exam-option"
                    }
                    onClick={() =>
                      handleAnswer(
                        question.id,
                        letter
                      )
                    }
                    disabled={
                      submitting ||
                      submitted
                    }
                  >
                    <span className="option-letter">
                      {letter}
                    </span>
                    <span className="option-text">
                      {text}
                    </span>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="written-answer-container">
              <div className="written-answer-toolbar">
                <span className="written-answer-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", verticalAlign: "middle" }}>
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Type Your Response
                </span>
                <span className="written-word-badge">
                  {answers[question.id] && answers[question.id].trim()
                    ? `${answers[question.id].trim().split(/\s+/).filter(Boolean).length} words`
                    : "0 words"}
                </span>
              </div>
              <textarea
                className="written-answer-textarea"
                placeholder="Type your response here... You can write freely, and your progress is saved automatically as you type."
                value={answers[question.id] || ""}
                onChange={(e) =>
                  handleAnswer(
                    question.id,
                    e.target.value,
                    true
                  )
                }
                disabled={
                  submitting ||
                  submitted
                }
                rows={8}
              />
              <div className="written-answer-footer">
                <span className="written-autosave-info">
                  ✓ Auto-saved
                </span>
                <span className="written-char-count">
                  {(answers[question.id] || "").length} characters
                </span>
              </div>
            </div>
          )}

        </section>

        {/* NAVIGATION */}

        <div className="exam-navigation">

          <button
            type="button"
            className="exam-nav-button"

            disabled={
              currentIndex === 0 ||
              submitting
            }

            onClick={() =>
              setCurrentIndex(
                currentIndex - 1
              )
            }
          >
            ← Previous
          </button>

          {/* QUESTION DOTS */}

          <div className="question-dots">

            {questions.map(
              (item, index) => (

                <button
                  type="button"
                  key={item.id}

                  className={
                    `question-dot ${
                      index ===
                      currentIndex
                        ? "active"
                        : ""
                    } ${
                      answers[
                        item.id
                      ] &&
                      String(
                        answers[
                          item.id
                        ]
                      ).trim().length > 0
                        ? "answered"
                        : ""
                    }`
                  }

                  onClick={() =>
                    setCurrentIndex(
                      index
                    )
                  }

                  disabled={
                    submitting
                  }
                >
                  {index + 1}
                </button>

              )
            )}

          </div>

          {/* NEXT / SUBMIT */}

          {currentIndex ===
          questions.length - 1 ? (

            <button
              type="button"
              className="submit-exam-button"

              onClick={() =>
                handleSubmit(false)
              }

              disabled={
                submitting
              }
            >
              {submitting
                ? "SUBMITTING..."
                : "SUBMIT EXAM →"}
            </button>

          ) : (

            <button
              type="button"
              className="exam-nav-button next"

              onClick={() =>
                setCurrentIndex(
                  currentIndex + 1
                )
              }

              disabled={
                submitting
              }
            >
              Next →
            </button>

          )}

        </div>

      </main>

    </div>
  );
}
