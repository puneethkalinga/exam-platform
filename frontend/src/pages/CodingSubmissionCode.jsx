import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import "./CodingSubmissionCode.css";

const API_URL =
  "";

const CodingSubmissionCode = () => {
  const {
    attemptId,
    questionId,
  } = useParams();

  const navigate = useNavigate();

  const [submission, setSubmission] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const getAdminHeaders = () => {
    const token =
      localStorage.getItem("adminToken");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  useEffect(() => {
    loadCode();
  }, [attemptId, questionId]);

  const loadCode = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/coding-results/admin/attempt/${attemptId}/question/${questionId}/code`,
        {
          method: "GET",
          headers: {
            ...getAdminHeaders(),
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load submitted code."
        );
      }

      setSubmission(
        data.submission
      );
    } catch (error) {
      console.error(
        "Submitted code error:",
        error
      );

      alert(
        error.message ||
          "Unable to load submitted code."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="submission-code-loading">
        Loading submitted code...
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="submission-code-loading">
        Submission not found.
      </div>
    );
  }

  return (
    <div className="submission-code-page">

      <header className="submission-code-header">

        <div>
          <button
            className="submission-back-button"
            onClick={() =>
              navigate(-1)
            }
          >
            ← Back
          </button>

          <h1>
            Submitted Code
          </h1>

          <p>
            {submission.question_title ||
              "Coding Problem"}
          </p>
        </div>

        <div className="submission-meta">

          <span>
            Language
          </span>

          <strong>
            {submission.language
              ? submission.language.toUpperCase()
              : "-"}
          </strong>

        </div>

      </header>

      <main className="submission-code-container">

        <section className="submission-info">

          <div>
            <span>
              Status
            </span>

            <strong>
              {submission.status ||
                "-"}
            </strong>
          </div>

          <div>
            <span>
              Tests
            </span>

            <strong>
              {
                submission.passed_tests ||
                0
              }
              /
              {
                submission.total_tests ||
                0
              }
            </strong>
          </div>

          <div>
            <span>
              Marks
            </span>

            <strong>
              {
                submission.marks_obtained ||
                0
              }
            </strong>
          </div>

          <div>
            <span>
              Submitted
            </span>

            <strong>
              {submission.submitted_at
                ? new Date(
                    submission.submitted_at
                  ).toLocaleString()
                : "-"}
            </strong>
          </div>

        </section>

        <section className="submitted-code-panel">

          <div className="submitted-code-panel-header">
            <strong>
              Source Code
            </strong>
          </div>

          <Editor
            height="650px"
            language={
              submission.language ===
              "cpp"
                ? "cpp"
                : submission.language ||
                  "plaintext"
            }
            value={
              submission.source_code ||
              ""
            }
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: {
                enabled: false,
              },
              automaticLayout: true,
              fontSize: 14,
              scrollBeyondLastLine: false,
            }}
          />

        </section>

      </main>

    </div>
  );
};

export default CodingSubmissionCode;
