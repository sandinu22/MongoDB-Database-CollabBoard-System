import React, { useState } from "react";
import { useParams, Link, NavLink } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import { useAuth } from "../auth/AuthContext";
import TaskForm from "../components/forms/TaskForm";

function ColumnPage() {
  const { columnId } = useParams();
  const { columns, selectedBoard, createTask, moveTask } = useBoardData();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const column = columns.find((item) => item.id === columnId);
  if (!column) return <div className="empty-state"><p>Column not found.</p><Link to="/">Back to board</Link></div>;
  const totalTasks = columns.reduce((sum, item) => sum + item.tasks.length, 0);
  const doneTasks = columns.find((item) => item.id === "done")?.tasks.length || 0;
  const overallDone = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const columnProgress = column.id === "done" ? 100 : column.tasks.length ? Math.round(column.tasks.reduce((sum, task) => sum + (Number(task.progress) || 0), 0) / column.tasks.length) : 0;

  return <div className="column-page">
    <div className="page-breadcrumb"><Link to="/">Board</Link><span>/</span><b>{column.title}</b></div>
    <div className="column-switcher" aria-label="Switch board column">{columns.map((item) => <NavLink key={item.id} to={`/column/${item.id}`} className={({ isActive }) => `column-tab ${item.tone} ${isActive ? "active" : ""}`}><span className="column-dot"/><span>{item.title}</span><b>{item.tasks.length}</b></NavLink>)}</div>
    <header className="page-hero"><div><span className={`hero-dot ${column.tone}`}/><span className="section-kicker">COLUMN OVERVIEW</span><h1>{column.title}</h1><p>{column.tasks.length} tasks in this stage. Drag cards on the main board or edit a task to move it.</p></div><div className="page-hero-actions"><button className="primary-button" onClick={() => setCreating(true)}>＋ Add Task</button><Link className="ghost-button" to="/">← Back to board</Link></div></header>
    <section className="analytics-grid">
      <div className="chart-card bar-card"><div className="chart-card-header"><div><span className="chart-eyebrow">TASK COMPLETION</span><h2>Progress vs 100%</h2></div><strong className="big-stat">{columnProgress}%</strong></div><div className="bar-chart">{column.tasks.map((task) => { const progress = column.id === "done" ? 100 : Number(task.progress) || 0; return <div className="bar-row" key={task.id}><div className="bar-label"><span>{task.title}</span><b>{progress}%</b></div><div className="bar-track"><span style={{ width: `${progress}%` }}/><i/></div></div>; })}</div><div className="chart-legend"><span><i className="legend-fill"/> Completed</span><span><i className="legend-target"/> 100% target</span></div></div>
      <div className="chart-card pie-card"><div className="chart-card-header"><div><span className="chart-eyebrow">OVERALL WORK DONE</span><h2>Board completion</h2></div></div><div className="pie-wrap"><div className="pie-chart" style={{ "--done": `${overallDone}%` }}><div className="pie-center"><strong>{overallDone}%</strong><span>done</span></div></div><div className="pie-copy"><h3>{doneTasks} of {totalTasks} tasks</h3><p>Completed across {selectedBoard?.title || "the current board"}.</p></div></div><div className="pie-stats"><div><b>{doneTasks}</b><span>Done</span></div><div><b>{totalTasks - doneTasks}</b><span>Remaining</span></div><div><b>{totalTasks}</b><span>Total</span></div></div></div>
    </section>
    <section className="column-task-table" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const taskId = event.dataTransfer.getData("text/collabboard-task"); if (taskId) moveTask(taskId, column.id); }}><div className="table-header"><div><span className="chart-eyebrow">TASKS</span><h2>Work in {column.title}</h2></div><span>{column.tasks.length} items</span></div><div className="table-list">{column.tasks.map((task) => { const progress = column.id === "done" ? 100 : (Number(task.progress) || 0); return <Link className="table-task" key={task.id} to={`/task/${task.id}`} draggable onDragStart={(event) => event.dataTransfer.setData("text/collabboard-task", task.id)}><span className={`task-avatar ${task.avatarTone}`}>{task.initials}</span><div><strong>{task.title}</strong><small>{task.assignee} · {task.due || "No due date"}</small></div><div className="table-progress"><div><span style={{ width: `${progress}%` }}/></div><b>{progress}%</b></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span>→</span></Link>; })}</div></section>
    {creating && <TaskForm initialColumnId={column.id} board={selectedBoard} currentUser={user} onClose={() => setCreating(false)} onSave={createTask}/>} 
  </div>;
}
export default ColumnPage;
