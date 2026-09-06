import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import { useAuth } from "../auth/AuthContext";
import TaskForm from "./forms/TaskForm";

function TaskCard({ task }) {
  const { selectedBoard, updateTask, deleteTask } = useBoardData();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const remove = async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    try { await deleteTask(task); } catch (error) { window.alert(error.message); }
  };
  return <>
    <article className={`task-card ${task._pending || task._offline ? "pending-card" : ""}`} draggable={!editing} onDragStart={(event) => { event.dataTransfer.setData("text/collabboard-task", task.id); event.dataTransfer.effectAllowed = "move"; }}>
      <div className="task-top"><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><div className="crud-buttons task-crud"><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setEditing(true); }}>Edit</button><button type="button" onClick={remove}>Delete</button></div></div>
      <h3><Link to={`/task/${task.id}`} className="task-link">{task.title}</Link></h3><p>{task.description}</p>
      <div className="task-bottom"><div className="assignee"><span className={`task-avatar ${task.avatarTone}`}>{task.initials}</span><span>{task.assignee}</span></div><div className="meta"><span>◷ {task.due || "No date"}</span>{task.comments > 0 && <span>◌ {task.comments}</span>}</div></div>
      {task.progress !== undefined && <div className="progress"><div className="progress-info"><span>{task._pending || task._offline ? "Pending sync" : "Progress"}</span><strong>{task.progress}%</strong></div><div className="progress-track"><span style={{ width: `${task.progress}%` }} /></div></div>}
    </article>
    {editing && <TaskForm task={task} board={selectedBoard} currentUser={user} onClose={() => setEditing(false)} onSave={(changes) => updateTask(task, changes)} />}
  </>;
}
export default TaskCard;
