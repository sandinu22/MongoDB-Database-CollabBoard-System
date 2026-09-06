import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Column from "./Column";
import BoardForm from "./forms/BoardForm";
import TaskForm from "./forms/TaskForm";
import { useBoardData } from "../context/BoardDataContext";
import { useAuth } from "../auth/AuthContext";

function Board() {
  const { user } = useAuth();
  const {
    boards, selectedBoard, selectedBoardId, selectBoard, columns, createBoard, updateBoard, deleteBoard,
    createTask, moveTask, conflict, resolveConflictLoadLatest, notice, clearNotice, loading,
  } = useBoardData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [boardForm, setBoardForm] = useState(null);
  const [taskForm, setTaskForm] = useState(null);

  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => {
        const matchesQuery = !q || [task.title, task.description, task.assignee].filter(Boolean).some((field) => String(field).toLowerCase().includes(q));
        const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
        return matchesQuery && matchesPriority;
      }),
    }));
  }, [columns, query, priorityFilter]);

  const totalTasks = columns.reduce((sum, column) => sum + column.tasks.length, 0);
  const doneTasks = columns.find((column) => column.id === "done")?.tasks.length || 0;
  const overallProgress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const people = [selectedBoard?.owner, ...(selectedBoard?.members || [])].filter(Boolean);
  const isOwner = selectedBoard?.owner?.id === user?.id || selectedBoard?.owner?._id === user?.id || selectedBoard?._offline;

  const confirmDeleteBoard = async () => {
    if (!selectedBoard || !window.confirm(`Delete “${selectedBoard.title}” and all of its tasks?`)) return;
    try { await deleteBoard(selectedBoard); } catch (error) { window.alert(error.message); }
  };

  if (!loading && !boards.length) {
    return <section className="empty-workspace"><div className="empty-workspace-card"><span className="section-kicker">YOUR WORKSPACE</span><h2>Create your first board</h2><p>Boards and tasks are stored in MongoDB. Once created, the board will also be cached locally for temporary offline access.</p><button className="primary-button" onClick={() => setBoardForm({ mode: "create" })}>＋ Create Board</button></div>{boardForm && <BoardForm onClose={() => setBoardForm(null)} onSave={createBoard} />}</section>;
  }

  return (
    <section className="board-section" id="board">
      {(notice || conflict) && <div className={`system-banner ${conflict ? "conflict-banner" : ""}`}>
        <span>{conflict ? "A newer version of this task exists on the server. Your older copy was not allowed to overwrite it." : notice}</span>
        <div>{conflict && <button type="button" onClick={resolveConflictLoadLatest}>Load latest version</button>}<button type="button" onClick={clearNotice}>×</button></div>
      </div>}
      <div className="current-board-hero"><div><span className="section-kicker">CURRENT BOARD</span><h2>{selectedBoard?.title || "Loading…"}</h2><p>{selectedBoard?.description || "No description"}</p></div><div className="current-board-stat"><strong>{overallProgress}%</strong><span>complete</span></div></div>
      <div className="board-toolbar">
        <div className="board-heading board-heading-expanded">
          <div><span className="small">BOARD VIEW</span><div className="board-title-row"><select className="board-select" value={selectedBoardId || ""} onChange={(e) => selectBoard(e.target.value)}>{boards.map((board) => <option value={board.id} key={board.id}>{board.title}{board._offline ? " (offline)" : ""}</option>)}</select></div></div>
          <span className="focus-chip"><b>{totalTasks}</b> tasks</span>
          <div className="board-crud"><button className="secondary-button" onClick={() => setBoardForm({ mode: "create" })}>＋ Board</button>{selectedBoard && isOwner && <><button className="secondary-button" onClick={() => setBoardForm({ mode: "edit", board: selectedBoard })}>Edit</button><button className="secondary-button danger-soft" onClick={confirmDeleteBoard}>Delete</button></>}</div>
        </div>
        <div className="toolbar-actions">
          <div className="search-wrapper"><span className="search-icon">⌕</span><input className="search-input" type="search" placeholder="Search tasks or people..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <label className="filter-wrapper"><span className="filter-icon">☷</span><select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option value="All">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select></label>
          <button className="primary-button" type="button" onClick={() => setTaskForm({ initialColumnId: "todo" })} disabled={!selectedBoard}><span>＋</span> New Task</button>
        </div>
      </div>
      <div className="board-main">
        <div className="kanban-board">
          {filteredColumns.map((column) => <Column key={column.id} {...column} count={column.tasks.length} onOpen={() => navigate(`/column/${column.id}`)} onAddTask={() => setTaskForm({ initialColumnId: column.id })} onMoveTask={moveTask} />)}
        </div>
        <aside className="board-members">
          <div className="members-header"><div><span className="section-kicker">COLLABORATORS</span><h3>Team members</h3></div><span className="member-count">{people.length}</span></div>
          <div className="member-summary">Registered members with access to this board</div>
          <ul className="members-list">{people.length ? people.map((person) => {
            const personTasks = columns.flatMap((column) => column.tasks.map((task) => ({ ...task, column: column.title }))).filter((task) => task.assignee === person.name);
            const completed = personTasks.filter((task) => task.column === "Done").length;
            const initials = person.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
            return <li key={person.id || person.email} className="member-item"><div className="member-info"><span className="member-avatar blue">{initials}<i className="online-dot" /></span><div><strong>{person.name}</strong><small>{person.email}{selectedBoard?.owner?.id === person.id ? " · Owner" : ""}</small></div></div><div className="member-workload"><div className="workload-label"><span>{personTasks.length} tasks</span><b>{completed} done</b></div><div className="workload-track"><span style={{ width: `${personTasks.length ? (completed / personTasks.length) * 100 : 0}%` }} /></div></div><div className="member-task-list">{personTasks.slice(0, 4).map((task) => <Link key={task.id} to={`/task/${task.id}`} className="member-task"><span className="member-task-status" /><span className="task-title">{task.title}</span><small>{task.column}</small></Link>)}</div></li>;
          }) : <li className="member-empty">No collaborators yet. The board owner can add registered users by email.</li>}</ul>
        </aside>
      </div>
      {boardForm?.mode === "create" && <BoardForm onClose={() => setBoardForm(null)} onSave={createBoard} />}
      {boardForm?.mode === "edit" && <BoardForm board={boardForm.board} onClose={() => setBoardForm(null)} onSave={(payload) => updateBoard(boardForm.board, payload)} />}
      {taskForm && <TaskForm initialColumnId={taskForm.initialColumnId} board={selectedBoard} currentUser={user} onClose={() => setTaskForm(null)} onSave={createTask} />}
    </section>
  );
}

export default Board;
