import React, { useMemo, useState } from "react";
import Modal from "../Modal";

function BoardForm({ board, onSave, onClose }) {
  const defaultEmails = useMemo(() => (board?.members || []).map((member) => member.email).filter(Boolean).join(", "), [board]);
  const [title, setTitle] = useState(board?.title || "");
  const [description, setDescription] = useState(board?.description || "");
  const [memberEmails, setMemberEmails] = useState(defaultEmails);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!title.trim()) { setError("Board title is required."); return; }
    setSaving(true);
    try {
      await onSave({
        title,
        description,
        memberEmails: memberEmails.split(",").map((email) => email.trim()).filter(Boolean),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not save board.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={board ? "Edit board" : "Create a board"} eyebrow="BOARD SETTINGS" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label><span>Board title</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus placeholder="e.g. Website Redesign" /></label>
        <label><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={800} rows={4} placeholder="What is this board for?" /></label>
        <label><span>Member emails <small>(registered users, comma separated)</small></span><input value={memberEmails} onChange={(e) => setMemberEmails(e.target.value)} placeholder="maya@example.com, ravi@example.com" /></label>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : board ? "Save changes" : "Create board"}</button></div>
      </form>
    </Modal>
  );
}

export default BoardForm;
