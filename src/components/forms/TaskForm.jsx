import React, { useMemo, useState } from "react";
import Modal from "../Modal";

const statusByColumn = { todo: "To Do", doing: "Doing", done: "Done" };

function TaskForm({ task, initialColumnId = "todo", board, currentUser, onSave, onClose }) {
  const people = useMemo(() => {
    const map = new Map();
    [board?.owner, ...(board?.members || [])].filter(Boolean).forEach((person) => map.set(person.id || person._id || person.email, person));
    if (currentUser) map.set(currentUser.id, currentUser);
    return [...map.values()];
  }, [board, currentUser]);

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "Medium",
    assignee: task?.assignee || currentUser?.name || "Unassigned",
    assignedTo: task?.assignedTo || "",
    due: task?.due || "",
    comments: task?.comments ?? 0,
    progress: task?.progress ?? 0,
    columnId: task?.columnId || initialColumnId,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const chooseAssignee = (value) => {
    const person = people.find((item) => String(item.id || item._id) === value);
    setForm((current) => ({ ...current, assignedTo: value, assignee: person?.name || (value ? current.assignee : "Unassigned") }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Task title is required."); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        due: form.due.trim(),
        comments: Number(form.comments || 0),
        progress: form.columnId === "done" ? 100 : Number(form.progress || 0),
        status: statusByColumn[form.columnId],
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not save task.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={task ? "Edit task" : "Create a task"} eyebrow="TASK MANAGEMENT" onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2"><span>Task title</span><input value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={180} autoFocus placeholder="What needs to be done?" /></label>
        <label className="span-2"><span>Description</span><textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} maxLength={2000} /></label>
        <label><span>Stage</span><select value={form.columnId} onChange={(e) => update("columnId", e.target.value)}><option value="todo">To Do</option><option value="doing">Doing</option><option value="done">Done</option></select></label>
        <label><span>Priority</span><select value={form.priority} onChange={(e) => update("priority", e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
        <label><span>Assignee</span><select value={form.assignedTo || ""} onChange={(e) => chooseAssignee(e.target.value)}><option value="">Unassigned / custom</option>{people.map((person) => <option key={person.id || person._id} value={person.id || person._id}>{person.name}</option>)}</select></label>
        <label><span>Assignee display name</span><input value={form.assignee} onChange={(e) => update("assignee", e.target.value)} maxLength={120} /></label>
        <label><span>Due date / label</span><input value={form.due} onChange={(e) => update("due", e.target.value)} placeholder="e.g. Sep 12" maxLength={80} /></label>
        <label><span>Progress (%)</span><input type="number" min="0" max="100" value={form.columnId === "done" ? 100 : form.progress} disabled={form.columnId === "done"} onChange={(e) => update("progress", e.target.value)} /></label>
        <label><span>Comments count</span><input type="number" min="0" value={form.comments} onChange={(e) => update("comments", e.target.value)} /></label>
        <div className="form-hint">Changes use optimistic version checks. If somebody saved a newer version first, CollabBoard will show a conflict instead of overwriting it.</div>
        {error && <div className="form-error span-2">{error}</div>}
        <div className="form-actions span-2"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : task ? "Save task" : "Create task"}</button></div>
      </form>
    </Modal>
  );
}

export default TaskForm;
