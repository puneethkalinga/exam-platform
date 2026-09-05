import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import "./CodingExam.css";

const API_URL =
  "https://exam-platform-qhk8.onrender.com";

const defaultCode = {
  c: `#include <stdio.h>

int main() {
    // Write your code here

    return 0;
}`,

  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here

    return 0;
}`,

  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your code here
    }
}`,

  python: `# Write your code here
`,
};

const CodingExam = () => {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();

  // =====================================================
  // CODING AUTHENTICATION
  // =====================================================

  

  // =====================================================
  // EXAM DATA
  // =====================================================

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // =====================================================
  // CODE EDITOR
  // =====================================================

  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(defaultCode.cpp);

  // =====================================================
  // EXECUTION
  // =====================================================

  const [runningCode, setRunningCode] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);

  const [customInput, setCustomInput] = useState("");

  const [output, setOutput] = useState("");
  const [outputStatus, setOutputStatus] = useState("");

  const [submissionResult, setSubmissionResult] =
    useState(null);

  // =====================================================
  // EXAM SUBMISSION
  // =====================================================

  const [submittingExam, setSubmittingExam] =
    useState(false);

  // =====================================================
  // UI / DRAFT
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const saveTimer = useRef(null);
  const timeoutHandled = useRef(false);

  const lastFocusState = useRef(null);

  const currentQuestion =
    questions[currentIndex];

  // =====================================================
  // SECURITY EVENT LOGGING
  // =====================================================

  const logSecurityEvent = async (
    eventType,
    eventData = {}
  ) => {
    try {
      if (!attemptId) {
        return;
      }

      await fetch(
        `${API_URL}/api/coding-security/attempt/${attemptId}/events`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            
          },

          body: JSON.stringify({
            event_type: eventType,
            event_data: eventData,
          }),
        }
      );
    } catch (error) {
      // Security logging must never interrupt the exam.
      console.error(
        "Security event logging failed:",
        error
      );
    }
  };

  // =====================================================
  // SECURITY - TAB SWITCH / WINDOW FOCUS
  // =====================================================

  useEffect(() => {
    if (!attemptId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastFocusState.current = "hidden";

        logSecurityEvent("TAB_SWITCH", {
          visibility: "hidden",
        });
      } else {
        lastFocusState.current = "visible";

        logSecurityEvent("WINDOW_FOCUS", {
          visibility: "visible",
        });
      }
    };

    const handleBlur = () => {
      if (lastFocusState.current === "hidden") {
        return;
      }

      lastFocusState.current = "blur";

      logSecurityEvent("WINDOW_BLUR");
    };

    const handleFocus = () => {
      if (lastFocusState.current === "visible") {
        return;
      }

      lastFocusState.current = "visible";

      logSecurityEvent("WINDOW_FOCUS");
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "blur",
      handleBlur
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "blur",
        handleBlur
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [attemptId]);

  // =====================================================
  // SECURITY - COPY / PASTE / CUT / RIGHT CLICK
  // =====================================================

  useEffect(() => {
    if (!attemptId) return;

    const handleCopy = () => {
      logSecurityEvent("COPY_ATTEMPT");
    };

    const handlePaste = () => {
      logSecurityEvent("PASTE_ATTEMPT");
    };

    const handleCut = () => {
      logSecurityEvent("CUT_ATTEMPT");
    };

    const handleContextMenu = (event) => {
      event.preventDefault();

      logSecurityEvent("RIGHT_CLICK");
    };

    document.addEventListener(
      "copy",
      handleCopy
    );

    document.addEventListener(
      "paste",
      handlePaste
    );

    document.addEventListener(
      "cut",
      handleCut
    );

    document.addEventListener(
      "contextmenu",
      handleContextMenu
    );

    return () => {
      document.removeEventListener(
        "copy",
        handleCopy
      );

      document.removeEventListener(
        "paste",
        handlePaste
      );

      document.removeEventListener(
        "cut",
        handleCut
      );

      document.removeEventListener(
        "contextmenu",
        handleContextMenu
      );
    };
  }, [attemptId]);

  // =====================================================
  // SECURITY - FULLSCREEN MONITORING
  // =====================================================

  useEffect(() => {
    if (!attemptId) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logSecurityEvent("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, [attemptId]);

  // =====================================================
  // SECURITY - PAGE REFRESH / CLOSE
  // =====================================================

  useEffect(() => {
    if (!attemptId) return;

    const handleBeforeUnload = () => {
      logSecurityEvent("PAGE_REFRESH");
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [attemptId]);

  // =====================================================
  // LOAD WORKSPACE
  // =====================================================

  useEffect(() => {
    if (!attemptId) {
      navigate(`/coding-exam/${examId}`);
      return;
    }

    loadWorkspace();
  }, [attemptId]);

  // =====================================================
  // SERVER-SIDE TIMER
  // =====================================================

  useEffect(() => {
    if (!attempt?.ends_at) {
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(
        attempt.ends_at
      ).getTime();

      const now = Date.now();

      const seconds = Math.max(
        0,
        Math.floor(
          (endTime - now) / 1000
        )
      );

      setRemainingSeconds(seconds);

      if (
        seconds <= 0 &&
        !timeoutHandled.current
      ) {
        timeoutHandled.current = true;
        handleTimeout();
      }
    };

    updateTimer();

    const timer = setInterval(
      updateTimer,
      1000
    );

    return () => {
      clearInterval(timer);
    };
  }, [attempt]);

  // =====================================================
  // LOAD DRAFT WHEN QUESTION CHANGES
  // =====================================================

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    loadDraft(currentQuestion.id);
  }, [currentQuestion?.id]);

  // =====================================================
  // AUTO SAVE
  // =====================================================

  useEffect(() => {
    if (!currentQuestion || !attempt) {
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      saveDraft();
    }, 1200);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [
    code,
    language,
    currentQuestion?.id,
  ]);

  // =====================================================
  // LOAD WORKSPACE
  // =====================================================

  const loadWorkspace = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/coding-workspace/attempt/${attemptId}`,
        {
          method: "GET",
          headers: {
            
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load coding exam"
        );
      }

      setAttempt(data.attempt);
      setQuestions(data.questions || []);

      const languages =
        data.attempt.allowed_languages || [];

      if (languages.length > 0) {
        const firstLanguage = languages[0];

        setLanguage(firstLanguage);

        setCode(
          defaultCode[firstLanguage] || ""
        );
      }
    } catch (error) {
      console.error(
        "Workspace load error:",
        error
      );

      alert(
        error.message ||
          "Unable to load coding exam"
      );

      navigate(`/coding-exam/${examId}`);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD DRAFT
  // =====================================================

  const loadDraft = async (questionId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/coding-workspace/attempt/${attemptId}/question/${questionId}/draft`,
        {
          method: "GET",
          headers: {
            
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.draft) {
        setLanguage(data.draft.language);

        setCode(
          data.draft.source_code || ""
        );

        setSubmissionResult(null);
        setOutput("");
        setOutputStatus("");

        return;
      }

      const allowedLanguages =
        attempt?.allowed_languages || [];

      const initialLanguage =
        allowedLanguages.includes(language)
          ? language
          : allowedLanguages[0] || "cpp";

      setLanguage(initialLanguage);

      setCode(
        defaultCode[initialLanguage] || ""
      );

      setSubmissionResult(null);
      setOutput("");
      setOutputStatus("");
    } catch (error) {
      console.error(
        "Draft load error:",
        error
      );
    }
  };

  // =====================================================
  // SAVE DRAFT
  // =====================================================

  const saveDraft = async () => {
    if (!currentQuestion || !attempt) {
      return;
    }

    if (remainingSeconds <= 0) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/coding-workspace/attempt/${attemptId}/question/${currentQuestion.id}/draft`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            
          },

          body: JSON.stringify({
            language,
            source_code: code,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();

        console.error(
          "Draft save failed:",
          data.message
        );
      }
    } catch (error) {
      console.error(
        "Draft save error:",
        error
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // CHANGE LANGUAGE
  // =====================================================

  const changeLanguage = async (
    newLanguage
  ) => {
    if (newLanguage === language) {
      return;
    }

    await saveDraft();

    setLanguage(newLanguage);

    setCode(
      defaultCode[newLanguage] || ""
    );

    setOutput("");
    setOutputStatus("");
    setSubmissionResult(null);
  };

  // =====================================================
  // SELECT QUESTION
  // =====================================================

  const selectQuestion = async (index) => {
    if (index === currentIndex) {
      return;
    }

    await saveDraft();

    setOutput("");
    setOutputStatus("");
    setSubmissionResult(null);
    setCustomInput("");

    setCurrentIndex(index);
  };

  // =====================================================
  // FORMAT TIMER
  // =====================================================

  const formatTime = (seconds) => {
    const minutes = Math.floor(
      seconds / 60
    );

    const secs = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  // =====================================================
  // RUN CODE
  // =====================================================

  const handleRunCode = async () => {
    if (!currentQuestion) {
      return;
    }

    if (!code.trim()) {
      setOutputStatus("error");

      setOutput(
        "Please write some code first."
      );

      return;
    }

    if (remainingSeconds <= 0) {
      setOutputStatus("error");

      setOutput(
        "The coding exam time has expired."
      );

      return;
    }

    try {
      setRunningCode(true);

      setOutputStatus("info");

      setOutput("Running code...");

      const response = await fetch(
        `${API_URL}/api/coding-execution/attempt/${attemptId}/run`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            
          },

          body: JSON.stringify({
            question_id:
              currentQuestion.id,

            language,

            source_code: code,

            custom_input:
              customInput || "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Code execution failed"
        );
      }

      let result = "";

      if (data.status) {
        result +=
          `Status: ${data.status}\n\n`;
      }

      if (data.compile_output) {
        result +=
          `Compilation Output:\n${data.compile_output}\n\n`;
      }

      if (data.stderr) {
        result +=
          `Error:\n${data.stderr}\n\n`;
      }

      if (data.stdout) {
        result +=
          `Output:\n${data.stdout}`;
      }

      if (
        !data.stdout &&
        !data.stderr &&
        !data.compile_output
      ) {
        result += "No output.";
      }

      setOutput(result);

      if (data.status === "Accepted") {
        setOutputStatus("success");
      } else if (
        data.status === "Processing"
      ) {
        setOutputStatus("info");
      } else {
        setOutputStatus("error");
      }
    } catch (error) {
      console.error(
        "Run code error:",
        error
      );

      setOutputStatus("error");

      setOutput(
        error.message ||
          "Unable to execute code."
      );
    } finally {
      setRunningCode(false);
    }
  };

  // =====================================================
  // SUBMIT ONE QUESTION
  // =====================================================

  const handleSubmitCode = async () => {
    if (!currentQuestion) {
      return;
    }

    if (!code.trim()) {
      alert(
        "Please write some code before submitting."
      );

      return;
    }

    if (remainingSeconds <= 0) {
      alert(
        "The coding exam time has expired."
      );

      return;
    }

    const confirmed = window.confirm(
      "Submit this solution for evaluation?\n\nYou can still improve this solution later. The best score for this problem will count."
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmittingCode(true);

      setOutputStatus("info");

      setOutput(
        "Evaluating your solution against hidden test cases..."
      );

      await saveDraft();

      const response = await fetch(
        `${API_URL}/api/coding-execution/attempt/${attemptId}/submit`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            
          },

          body: JSON.stringify({
            question_id:
              currentQuestion.id,

            language,

            source_code: code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Submission failed."
        );
      }

      setSubmissionResult(
        data.result
      );

      if (
        data.result.status ===
        "Accepted"
      ) {
        setOutputStatus("success");
      } else {
        setOutputStatus("error");
      }

      setOutput(
        [
          `Status: ${data.result.status}`,
          "",
          `Tests Passed: ${data.result.passed_tests}/${data.result.total_tests}`,
          `Marks Obtained: ${data.result.marks_obtained}/${currentQuestion.marks}`,
          `Execution Time: ${
            data.result.execution_time_ms ||
            0
          } ms`,
        ].join("\n")
      );
    } catch (error) {
      console.error(
        "Submit solution error:",
        error
      );

      setOutputStatus("error");

      setOutput(
        error.message ||
          "Submission failed."
      );
    } finally {
      setSubmittingCode(false);
    }
  };

  // =====================================================
  // SUBMIT ENTIRE CODING EXAM
  // =====================================================

  const handleSubmitExam = async (
    automatic = false
  ) => {
    if (submittingExam) {
      return;
    }

    if (!automatic) {
      const confirmed = window.confirm(
        "Are you sure you want to submit the coding examination?\n\nOnce submitted, you cannot continue the exam."
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSubmittingExam(true);

      await saveDraft();

      const response = await fetch(
        `${API_URL}/api/coding-execution/attempt/${attemptId}/submit-exam`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to submit coding exam."
        );
      }

      // Log final submission.
      await logSecurityEvent(
        "EXAM_SUBMITTED",
        {
          automatic,
        }
      );

      localStorage.setItem(
        "codingExamResult",
        JSON.stringify(data.result)
      );

      navigate(
        `/coding-exam/${examId}/result/${attemptId}`,
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Submit coding exam error:",
        error
      );

      alert(
        error.message ||
          "Failed to submit coding exam."
      );

      setSubmittingExam(false);
    }
  };

  // =====================================================
  // TIMEOUT
  // =====================================================

  const handleTimeout = async () => {
    if (submittingExam) {
      return;
    }

    try {
      await logSecurityEvent(
        "EXAM_TIMEOUT"
      );

      await handleSubmitExam(true);
    } catch (error) {
      console.error(
        "Automatic submission error:",
        error
      );

      alert(
        "Time is up. Unable to submit automatically. Please try again."
      );

      setSubmittingExam(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="coding-exam-loading">
        Loading coding environment...
      </div>
    );
  }

  // =====================================================
  // EMPTY EXAM
  // =====================================================

  if (
    !attempt ||
    questions.length === 0
  ) {
    return (
      <div className="coding-exam-loading">
        No coding questions available.
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="coding-exam-page">

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="coding-topbar">

        <div className="coding-brand">
          <strong>
            {attempt.title}
          </strong>

          <span>
            {questions.length} Problems
          </span>
        </div>

        <div
          className={
            remainingSeconds <= 300
              ? "coding-timer danger"
              : "coding-timer"
          }
        >
          <span>
            Time Left
          </span>

          <strong>
            {formatTime(
              remainingSeconds
            )}
          </strong>
        </div>

        <div className="coding-top-actions">

          <span className="save-status">
            {saving
              ? "Saving..."
              : "Saved"}
          </span>

          <button
            className="submit-exam-btn"
            onClick={() =>
              handleSubmitExam(false)
            }
            disabled={
              submittingExam
            }
          >
            {submittingExam
              ? "Submitting..."
              : "Submit Exam"}
          </button>

        </div>

      </header>

      {/* =================================================
          WORKSPACE
      ================================================= */}

      <div className="coding-workspace">

        {/* =================================================
            PROBLEM SIDEBAR
        ================================================= */}

        <aside className="coding-sidebar">

          <div className="sidebar-title">
            Problems
          </div>

          {questions.map(
            (question, index) => (
              <button
                key={question.id}
                className={
                  index === currentIndex
                    ? "problem-nav active"
                    : "problem-nav"
                }
                onClick={() =>
                  selectQuestion(index)
                }
                disabled={
                  submittingExam
                }
              >
                <span>
                  {index + 1}
                </span>

                <div>
                  <strong>
                    {question.title}
                  </strong>

                  <small>
                    {question.marks} marks
                  </small>
                </div>
              </button>
            )
          )}

        </aside>

        {/* =================================================
            MAIN AREA
        ================================================= */}

        <main className="coding-main">

          {/* =================================================
              PROBLEM STATEMENT
          ================================================= */}

          <section className="problem-panel">

            <div className="problem-header">

              <div>

                <span>
                  Problem{" "}
                  {currentIndex + 1}
                </span>

                <h1>
                  {currentQuestion.title}
                </h1>

              </div>

              <span className="problem-marks">
                {currentQuestion.marks} Marks
              </span>

            </div>

            <div className="problem-content">

              <p>
                {currentQuestion.description}
              </p>

              {currentQuestion.input_format && (
                <>
                  <h3>
                    Input Format
                  </h3>

                  <p>
                    {
                      currentQuestion.input_format
                    }
                  </p>
                </>
              )}

              {currentQuestion.output_format && (
                <>
                  <h3>
                    Output Format
                  </h3>

                  <p>
                    {
                      currentQuestion.output_format
                    }
                  </p>
                </>
              )}

              {currentQuestion.constraints && (
                <>
                  <h3>
                    Constraints
                  </h3>

                  <pre>
                    {
                      currentQuestion.constraints
                    }
                  </pre>
                </>
              )}

              {currentQuestion.sample_input && (
                <div className="sample-grid">

                  <div>
                    <h3>
                      Sample Input
                    </h3>

                    <pre>
                      {
                        currentQuestion.sample_input
                      }
                    </pre>
                  </div>

                  <div>
                    <h3>
                      Sample Output
                    </h3>

                    <pre>
                      {
                        currentQuestion.sample_output
                      }
                    </pre>
                  </div>

                </div>
              )}

              {currentQuestion.explanation && (
                <>
                  <h3>
                    Explanation
                  </h3>

                  <p>
                    {
                      currentQuestion.explanation
                    }
                  </p>
                </>
              )}

            </div>

          </section>

          {/* =================================================
              CODE EDITOR
          ================================================= */}

          <section className="editor-section">

            <div className="editor-header">

              <div className="language-wrapper">

                <label>
                  Language
                </label>

                <select
                  value={language}
                  onChange={(e) =>
                    changeLanguage(
                      e.target.value
                    )
                  }
                  disabled={
                    submittingExam ||
                    submittingCode
                  }
                >

                  {(
                    attempt.allowed_languages ||
                    []
                  ).map((lang) => (
                    <option
                      value={lang}
                      key={lang}
                    >
                      {lang.toUpperCase()}
                    </option>
                  ))}

                </select>

              </div>

              <div className="editor-actions">

                <button
                  className="run-code-btn"
                  onClick={
                    handleRunCode
                  }
                  disabled={
                    runningCode ||
                    submittingCode ||
                    submittingExam
                  }
                >
                  {runningCode
                    ? "Running..."
                    : "▶ Run Code"}
                </button>

                <button
                  className="submit-code-btn"
                  onClick={
                    handleSubmitCode
                  }
                  disabled={
                    runningCode ||
                    submittingCode ||
                    submittingExam
                  }
                >
                  {submittingCode
                    ? "Evaluating..."
                    : "Submit Solution"}
                </button>

              </div>

            </div>

            {/* =================================================
                MONACO EDITOR
            ================================================= */}

            <div className="monaco-container">

              <Editor
                height="440px"
                language={
                  language === "cpp"
                    ? "cpp"
                    : language
                }
                value={code}
                onChange={(value) =>
                  setCode(
                    value || ""
                  )
                }
                theme="vs-dark"
                options={{
                  minimap: {
                    enabled: false,
                  },

                  fontSize: 14,

                  automaticLayout: true,

                  scrollBeyondLastLine:
                    false,

                  padding: {
                    top: 12,
                  },

                  readOnly:
                    submittingExam ||
                    submittingCode,
                }}
              />

            </div>

            {/* =================================================
                CUSTOM INPUT
            ================================================= */}

            <div className="custom-input-panel">

              <label>
                Custom Input
              </label>

              <textarea
                value={customInput}
                onChange={(e) =>
                  setCustomInput(
                    e.target.value
                  )
                }
                placeholder="Enter custom input for testing..."
                disabled={
                  runningCode ||
                  submittingCode ||
                  submittingExam
                }
              />

            </div>

            {/* =================================================
                OUTPUT
            ================================================= */}

            <div className="output-panel">

              <div className="output-header">

                <span>
                  Output
                </span>

                {outputStatus && (
                  <span
                    className={`output-status ${outputStatus}`}
                  >
                    {outputStatus}
                  </span>
                )}

              </div>

              <pre>
                {output ||
                  "Run your code to see the output here."}
              </pre>

            </div>

            {/* =================================================
                SUBMISSION RESULT
            ================================================= */}

            {submissionResult && (
              <div className="submission-summary">

                <strong>
                  Last Submission
                </strong>

                <span>
                  Status:{" "}
                  {
                    submissionResult.status
                  }
                </span>

                <span>
                  Tests:{" "}
                  {
                    submissionResult.passed_tests
                  }
                  /
                  {
                    submissionResult.total_tests
                  }
                </span>

                <span>
                  Marks:{" "}
                  {
                    submissionResult.marks_obtained
                  }
                  /
                  {
                    currentQuestion.marks
                  }
                </span>

              </div>
            )}

          </section>

        </main>

      </div>

    </div>
  );
};

export default CodingExam;