import React, { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import { useAuth } from "../auth/AuthContext";
import TaskForm from "../components/forms/TaskForm";

function TaskPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { columns, selectedBoard, createTask, updateTask, deleteTask, conflict, resolveConflictLoadLatest } = useBoardData();
  const allTasks = columns.flatMap((column) => column.tasks.map((task) => ({ ...task, column: column.title, columnId: column.id })));
  const [memberFilter, setMemberFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const selected = taskId ? allTasks.find((task) => task.id === String(taskId)) : allTasks[0] || null;
  const assignees = [...new Set(allTasks.map((task) => task.assignee).filter(Boolean))];
  const visibleTasks = useMemo(() => allTasks.filter((task) => (memberFilter === "All" || task.assignee === memberFilter) && (priorityFilter === "All" || task.priority === priorityFilter)), [allTasks, memberFilter, priorityFilter]);

  const remove = async (task) => {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    try { await deleteTask(task); if (task.id === selected?.id) navigate("/tasks"); } catch (error) { window.alert(error.message); }
  };

  return <div className="task-page">
    {conflict && <div className="system-banner conflict-banner"><span>This task changed on the server after you loaded it. The newer copy was protected.</span><button type="button" onClick={resolveConflictLoadLatest}>Load latest version</button></div>}
    <div className="page-breadcrumb"><Link to="/">Board</Link><span>/</span><b>All Tasks</b>{selected && <><span>/</span><b>{selected.title}</b></>}</div>
    <header className="task-page-hero"><div><span className="section-kicker">TASK MANAGEMENT</span><h1>All tasks</h1><p>Browse, create, edit, delete and move tasks stored in MongoDB for {selectedBoard?.title || "the current board"}.</p></div><button className="primary-button crud-add" type="button" onClick={() => setCreating(true)}>＋ Add Task</button></header>
    {!allTasks.length ? <div className="empty-workspace-card compact-empty"><h2>No tasks yet</h2><p>Create the first task for this board.</p><button className="primary-button" onClick={() => setCreating(true)}>＋ Create Task</button></div> : <div className="task-browser">
      <section className="all-tasks-panel"><div className="task-browser-head"><div><span className="section-kicker">TASK DIRECTORY</span><h2>Every task</h2></div><span className="task-count">{visibleTasks.length} shown</span></div><div className="task-filters"><label><span>Member</span><select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}><option>All</option>{assignees.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>Priority</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select></label><button className="secondary-button" type="button" onClick={() => { setMemberFilter("All"); setPriorityFilter("All"); }}>Reset</button></div>
      <div className="task-directory">{visibleTasks.map((task) => { const progress = task.columnId === "done" ? 100 : Number(task.progress) || 0; return <Link to={`/task/${task.id}`} className={`directory-task ${selected?.id === task.id ? "selected" : ""}`} key={task.id}><span className={`task-avatar ${task.avatarTone}`}>{task.initials}</span><div className="directory-main"><strong>{task.title}</strong><small>{task.assignee} · {task.column} · {task.due || "No due date"}</small></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="directory-progress">{progress}%</span><div className="crud-buttons" onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}><button className="crud-view" type="button" onClick={() => navigate(`/task/${task.id}`)}>View</button><button className="crud-edit" type="button" onClick={() => setEditing(task)}>Edit</button><button className="crud-delete" type="button" onClick={() => remove(task)}>Delete</button></div></Link>; })}</div></section>
      {selected && <article className="task-detail-card"><div className="task-detail-top"><Link className="back-link" to={`/column/${selected.columnId}`}>← {selected.column}</Link><div className="crud-buttons"><button className="crud-edit" type="button" onClick={() => setEditing(selected)}>Edit</button><button className="crud-delete" type="button" onClick={() => remove(selected)}>Delete</button></div></div><div className="task-title-block"><span className={`priority ${selected.priority.toLowerCase()}`}>{selected.priority}</span><h2>{selected.title}</h2><p>{selected.description || "No description provided."}</p></div><div className="task-info-grid"><div><span>Assignee</span><div className="person"><span className={`task-avatar ${selected.avatarTone}`}>{selected.initials}</span><div><strong>{selected.assignee}</strong><small>Team member</small></div></div></div><div><span>Due date</span><strong>◷ {selected.due || "Not set"}</strong></div><div><span>Comments</span><strong>◌ {selected.comments || 0}</strong></div><div><span>Stage</span><strong>{selected.column}</strong></div></div><div className="task-progress-panel"><div className="progress-info"><span>Task progress · version {selected.version}</span><strong>{selected.columnId === "done" ? 100 : Number(selected.progress) || 0}%</strong></div><div className="progress-large-track"><span style={{ width: `${selected.columnId === "done" ? 100 : Number(selected.progress) || 0}%` }}/></div><div className="progress-target"><span>0%</span><span>100% complete</span></div></div></article>}
    </div>}
    {creating && <TaskForm board={selectedBoard} currentUser={user} onClose={() => setCreating(false)} onSave={createTask}/>} 
    {editing && <TaskForm task={editing} board={selectedBoard} currentUser={user} onClose={() => setEditing(null)} onSave={(changes) => updateTask(editing, changes)}/>} 
  </div>;
}
export default TaskPage;
