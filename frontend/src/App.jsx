import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ExamManagement from "./pages/ExamManagement";
import CandidateStart from "./pages/CandidateStart";
import CandidateExam from "./pages/CandidateExam";
import ExamResults from "./pages/ExamResults";
import CandidateResponses from "./pages/CandidateResponses";

import CodingQuestionManagement from "./pages/CodingQuestionManagement";
import CodingTestCaseManagement from "./pages/CodingTestCaseManagement";
import CodingExam from "./pages/CodingExam";
import CodingResult from "./pages/CodingResult";
import CodingResultDetails from "./pages/CodingResultDetails";
import CodingExamManagement from "./pages/CodingExamManagement";
import CodingStart from "./pages/CodingStart";
import CodingSubmissionCode from "./pages/CodingSubmissionCode";

function App() {
  const [admin, setAdmin] = useState(() => {
    const token = localStorage.getItem("adminToken");

    return token
      ? {
          username: "admin",
          role: "admin",
        }
      : null;
  });

  const handleLogin = (adminData) => {
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setAdmin(null);
  };

  return (
    <BrowserRouter>
      <Routes>

        {/* =========================================
            CANDIDATE ROUTES
           ========================================= */}

        <Route
          path="/candidate/start"
          element={<CandidateStart />}
        />

        <Route
          path="/candidate/exam/:attemptId"
          element={<CandidateExam />}
        />

        <Route
          path="/admin/exams/:examId/results/:attemptId"
          element={
            admin ? (
              <CandidateResponses />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* =========================================
            CODING CANDIDATE ROUTES
           ========================================= */}

        {/* Coding exam start page */}
        <Route
          path="/coding-exam/:examId"
          element={<CodingStart />}
        />

        {/* Coding exam workspace */}
        <Route
          path="/coding-exam/:examId/attempt/:attemptId"
          element={<CodingExam />}
        />

        {/* Coding candidate result */}
        <Route
  path="/admin/coding-exams/:examId/results"
  element={
    admin ? (
      <CodingResult />
    ) : (
      <Navigate to="/admin/login" replace />
    )
  }
/>

        {/* =========================================
            ADMIN LOGIN
           ========================================= */}

        <Route
          path="/admin/login"
          element={
            admin ? (
              <Navigate to="/admin" replace />
            ) : (
              <AdminLogin onLogin={handleLogin} />
            )
          }
        />

        {/* =========================================
            ADMIN DASHBOARD
           ========================================= */}

        <Route
          path="/admin"
          element={
            admin ? (
              <AdminDashboard
                admin={admin}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* =========================================
            NORMAL EXAM MANAGEMENT
           ========================================= */}

        <Route
          path="/admin/exams/:examId"
          element={
            admin ? (
              <ExamManagement />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        <Route
          path="/admin/exams/:examId/results"
          element={
            admin ? (
              <ExamResults />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* =========================================
            CODING EXAM ADMIN MANAGEMENT
           ========================================= */}

        {/* Coding exam list/create/publish */}
        <Route
          path="/admin/coding-exams"
          element={
            admin ? (
              <CodingExamManagement />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* Coding questions */}
        <Route
          path="/admin/coding-exams/:examId"
          element={
            admin ? (
              <CodingQuestionManagement />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* Coding test cases */}
        <Route
          path="/admin/coding-exams/:examId/questions/:questionId"
          element={
            admin ? (
              <CodingTestCaseManagement />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* Coding candidate result details */}
        <Route
          path="/admin/coding-results/:attemptId"
          element={
            admin ? (
              <CodingResultDetails />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* Submitted source code */}
        <Route
          path="/admin/coding-results/:attemptId/question/:questionId/code"
          element={
            admin ? (
              <CodingSubmissionCode />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* =========================================
            DEFAULT ROUTE
           ========================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/candidate/start?examId=1"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;