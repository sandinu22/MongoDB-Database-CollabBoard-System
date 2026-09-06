import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try { await login({ email, password }); navigate(location.state?.from || "/", { replace: true }); }
    catch (err) { setError(err.message || "Login failed."); }
    finally { setBusy(false); }
  };

  return <main className="auth-page"><section className="auth-card">
    <Link to="/" className="auth-brand"><span className="brand-icon"><i/><i/><i/></span><span><strong>CollabBoard</strong><small>Team workspace</small></span></Link>
    <div className="auth-copy"><span className="section-kicker">WELCOME BACK</span><h1>Sign in to your workspace</h1><p>Your boards and tasks are protected with JWT authentication.</p></div>
    <form className="form-stack" onSubmit={submit}>
      <label><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
      <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
    </form>
    <p className="auth-switch">New to CollabBoard? <Link to="/register">Create an account</Link></p>
  </section></main>;
}
export default LoginPage;
