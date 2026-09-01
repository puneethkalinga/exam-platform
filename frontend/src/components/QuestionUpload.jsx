import { useState } from "react";
import "./QuestionUpload.css";

const API_URL = "https://exam-platform-qhk8.onrender.com";

export default function QuestionUpload({ examId }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!examId) {
      setMessage("Please select an exam first.");
      return;
    }

    if (!file) {
      setMessage("Please select an Excel file.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("adminToken");

      const formData = new FormData();

      formData.append("examId", examId);
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/upload/questions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      console.log("UPLOAD RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Upload failed"
        );
      }

      setMessage(
        `✅ ${data.message}. Imported: ${data.imported}`
      );

      setFile(null);

    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      setMessage(
        `❌ ${error.message}`
      );

    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="question-upload">

    <div className="upload-header">
      <div>
        <span className="upload-eyebrow">
          QUESTION BANK
        </span>

        <h2>Upload Question Bank</h2>

        <p>
          Import multiple-choice questions directly
          into your selected examination.
        </p>
      </div>

      <div className="upload-icon">
        ↑
      </div>
    </div>

    <div className="selected-exam">
      <span>SELECTED EXAM</span>

      <strong>
        {examId || "No exam selected"}
      </strong>
    </div>

    <label className="file-drop">

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          setFile(e.target.files[0]);
          setMessage("");
        }}
      />

      <div className="file-icon">
        XLS
      </div>

      <div className="file-text">
        <strong>
          {file
            ? file.name
            : "Choose your Excel file"}
        </strong>

        <span>
          {file
            ? "File selected successfully"
            : "Drag & drop or click to browse"}
        </span>
      </div>

      <span className="browse-button">
        Browse
      </span>

    </label>

    <button
      className="upload-button"
      onClick={handleUpload}
      disabled={loading || !file || !examId}
    >
      {loading
        ? "IMPORTING..."
        : "IMPORT QUESTIONS"}

      {!loading && <span>→</span>}
    </button>

    {message && (
      <div
        className={
          message.startsWith("✅")
            ? "upload-success"
            : "upload-error"
        }
      >
        {message}
      </div>
    )}

    <div className="upload-info">
      <span>i</span>
      Supported formats: XLSX, XLS
    </div>

  </div>
);
}