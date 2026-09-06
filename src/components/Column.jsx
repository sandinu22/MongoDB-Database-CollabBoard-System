import React from "react";
import TaskCard from "./TaskCard";

function Column({ id, title, count, tone, tasks, onOpen, onAddTask, onMoveTask }) {
  const progressTasks = tasks.filter((task) => typeof task.progress === "number");
  const avgProgress = progressTasks.length ? Math.round(progressTasks.reduce((sum, task) => sum + task.progress, 0) / progressTasks.length) : title === "Done" ? 100 : 0;
  return (
    <section className={`column ${tone}`} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const taskId = event.dataTransfer.getData("text/collabboard-task"); if (taskId) onMoveTask(taskId, id); }}>
      <div className="column-header"><button className="column-title column-title-button" type="button" onClick={onOpen}><span className="column-dot" /><h2>{title}</h2><span className="count">{count}</span></button><span className="drop-label">Drop here</span></div>
      <div className="column-mini-progress"><div><span>{title === "Done" ? "Completed" : "Progress"}</span><strong>{avgProgress}%</strong></div><div className="mini-track"><span style={{ width: `${avgProgress}%` }} /></div></div>
      <div className="cards">{tasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>
      <button className="add-task" type="button" onClick={onAddTask}>＋ Add task</button>
    </section>
  );
}
export default Column;
