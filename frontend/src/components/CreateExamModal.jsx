import { useState } from "react";

const API_URL = "https://exam-platform-qhk8.onrender.com";
import "./CreateExamModal.css";

export default function CreateExamModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [cutoff, setCutoff] = useState(40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();

  setLoading(true);
  setError("");

  try {
    const token = localStorage.getItem("adminToken");

    const response = await fetch(`${API_URL}/api/exams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        durationMinutes: Number(duration),
        cutoffPercentage: Number(cutoff),
      }),
    });

    const data = await response.json();

    console.log("CREATE EXAM RESPONSE:", data);

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to create exam"
      );
    }

    onCreated(data);
    onClose();

  } catch (error) {
    console.error("CREATE EXAM ERROR:", error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="modal-overlay">
      <div className="exam-modal">

        <div className="modal-header">
          <div>
            <span className="card-eyebrow">
              EXAM MANAGEMENT
            </span>

            <h2>Create New Exam</h2>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          <label>EXAM TITLE</label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mangalore Recruitment Test"
            required
          />

          <label>DESCRIPTION</label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical, aptitude and verbal assessment"
            rows="3"
          />

          <div className="form-row">

            <div>
              <label>DURATION (MINUTES)</label>

              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div>
              <label>CUTOFF (%)</label>

              <input
                type="number"
                min="0"
                max="100"
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
              />
            </div>

          </div>

          {error && (
            <div className="dashboard-error">
              {error}
            </div>
          )}

          <div className="modal-actions">

            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
  type="submit"
  className="create-exam-submit"
  disabled={loading}
>
  {loading ? "Creating..." : "Create Exam"}
</button>

          </div>

        </form>
      </div>
    </div>
  );
}