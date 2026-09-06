import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import { useAuth } from "../auth/AuthContext";

function Header() {
  const { connection, pendingCount, selectedBoard, syncPending } = useBoardData();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "light"; } catch { return "light"; }
  });
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  const initials = String(user?.name || "U").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

  return (
    <header className={`header ${navOpen ? "nav-open" : ""}`}>
      <NavLink to="/" className="brand" aria-label="CollabBoard home">
        <span className="brand-icon" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>CollabBoard</strong><small>{selectedBoard?.title || "Team workspace"}</small></span>
      </NavLink>
      <div className="mobile-header-controls">
        <button className="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "☾"}</button>
        <button className="menu-button" aria-label="Toggle menu" aria-expanded={navOpen} onClick={() => setNavOpen((value) => !value)}>☰</button>
      </div>
      <nav className="navigation" aria-label="Main navigation">
        <NavLink onClick={() => setNavOpen(false)} end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/">Board</NavLink>
        <NavLink onClick={() => setNavOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/column/todo">Columns</NavLink>
        <NavLink onClick={() => setNavOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/tasks">Tasks</NavLink>
      </nav>
      <button className={`offline-status status-button ${connection}`} type="button" onClick={() => connection !== "offline" && syncPending()} title="Click to retry pending synchronization">
        {connection === "offline" ? `Offline${pendingCount ? ` · ${pendingCount} pending` : ""}` : connection === "syncing" ? "Syncing…" : connection === "conflict" ? "Conflict detected" : pendingCount ? `Online · ${pendingCount} pending` : "Online"}
      </button>
      <div className="header-actions">
        <div className="profile static-profile"><span className="profile-avatar">{initials}</span><span><span className="profile-name">{user?.name}</span><small>{user?.email}</small></span></div>
        <button className="secondary-button" type="button" onClick={logout}>Sign out</button>
        <button className="desktop-theme-toggle theme-toggle" aria-label="Toggle theme" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "☾"}</button>
      </div>
    </header>
  );
}
export default Header;
