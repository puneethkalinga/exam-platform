import { useState } from "react";
import "./AdminLogin.css";

const API_URL = "";

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      let data = {};
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(data.message || "Invalid username or password");
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error("Server is waking up (cold start). Please wait 10 seconds and try again.");
        }
        throw new Error(data.message || `Login failed (${response.status}). Please try again.`);
      }

      localStorage.setItem("adminToken", data.token);
      onLogin(data.admin);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <div className="login-container">

        <div className="brand-section">
          <img src="/xevotech.jpeg" alt="Xevotech Logo" className="brand-logo" />

          <div className="brand-name">
            XEVOTECH
          </div>

          <div className="brand-divider" />

          <span className="protocol-label">
            EXAM PROTOCOL
          </span>
        </div>

        <div className="login-card">

          <div className="login-header">
            <span className="eyebrow">
              ADMIN PORTAL
            </span>

            <h1>
              Welcome back.
            </h1>

            <p>
              Manage examinations, candidates and
              recruitment results.
            </p>
          </div>

          <form onSubmit={handleLogin}>

            <div className="input-group">
              <label>USERNAME</label>

              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                required
              />
            </div>

            <div className="input-group">
              <label>PASSWORD</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? "AUTHENTICATING..."
                  : "SIGN IN"}
              </span>

              {!loading && <span>→</span>}
            </button>

          </form>

          <div className="security-note">
            <span className="security-dot" />
            Secure administrator access
          </div>
        </div>

        <p className="login-footer">
          Xevotech Technologies · Exam Protocol
        </p>

      </div>
    </div>
  );
}
