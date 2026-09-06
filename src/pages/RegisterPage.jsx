import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try { await register({ name: form.name, email: form.email, password: form.password }); navigate("/", { replace: true }); }
    catch (err) { setError(err.message || "Registration failed."); }
    finally { setBusy(false); }
  };
  return <main className="auth-page"><section className="auth-card">
    <Link to="/" className="auth-brand"><span className="brand-icon"><i/><i/><i/></span><span><strong>CollabBoard</strong><small>Team workspace</small></span></Link>
    <div className="auth-copy"><span className="section-kicker">GET STARTED</span><h1>Create your account</h1><p>Create a protected account, then build your first collaborative board.</p></div>
    <form className="form-stack" onSubmit={submit}>
      <label><span>Full name</span><input value={form.name} onChange={(e) => update("name", e.target.value)} required minLength="2" autoComplete="name" /></label>
      <label><span>Email address</span><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required autoComplete="email" /></label>
      <label><span>Password</span><input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength="8" autoComplete="new-password" /></label>
      <label><span>Confirm password</span><input type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} required minLength="8" autoComplete="new-password" /></label>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
    </form>
    <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
  </section></main>;
}
export default RegisterPage;
