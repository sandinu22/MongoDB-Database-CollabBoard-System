import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Board from "./components/Board";
import BoardPage from "./pages/BoardPage";
import ColumnPage from "./pages/ColumnPage";
import TaskPage from "./pages/TaskPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { BoardDataProvider, useBoardData } from "./context/BoardDataContext";
import "./App.css";

function Home() {
  const { columns, selectedBoard, loading } = useBoardData();
  const totalTasks = columns.reduce((sum, column) => sum + column.tasks.length, 0);
  return (
    <>
      <section className="welcome">
        <div>
          <span className="eyebrow">TEAM WORKSPACE</span>
          <h1>{selectedBoard?.title || "CollabBoard"}</h1>
          <p>{selectedBoard?.description || "Plan, organise and track your team's work with protected boards, persistent tasks and offline support."}</p>
        </div>
        <div className="summary">
          <div className="summary-item"><strong>{String(totalTasks).padStart(2, "0")}</strong><span>Total Tasks</span></div>
          <div className="summary-item"><strong>{loading ? "…" : "03"}</strong><span>Columns</span></div>
          <div className="live-status"><span className="status-dot" />Persistent</div>
        </div>
      </section>
      <Board />
    </>
  );
}

function Workspace() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="app-loading">Loading CollabBoard…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <BoardDataProvider>
      <div className="app">
        <Header />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/board/:boardId" element={<BoardPage />} />
            <Route path="/column/:columnId" element={<ColumnPage />} />
            <Route path="/tasks" element={<TaskPage />} />
            <Route path="/task/:taskId" element={<TaskPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="footer"><span>CollabBoard · M1 + M2 + M3</span></footer>
      </div>
    </BoardDataProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={<Workspace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
