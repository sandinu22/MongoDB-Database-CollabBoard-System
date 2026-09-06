import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../services/api";
import {
  getBoardsFromCache,
  saveBoardsToCache,
  getColumnsFromCache,
  saveColumnsToCache,
  getSelectedBoardId,
  saveSelectedBoardId,
  getPendingActions,
  savePendingActions,
} from "../utils/storage";

const BoardDataContext = createContext(null);
const makeId = (prefix = "temp") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const columnDefinitions = [
  { id: "todo", title: "To Do", status: "To Do", tone: "todo" },
  { id: "doing", title: "Doing", status: "Doing", tone: "doing" },
  { id: "done", title: "Done", status: "Done", tone: "done" },
];
const emptyColumns = () => columnDefinitions.map((column) => ({ ...column, tasks: [] }));
const isTempId = (id) => String(id || "").startsWith("temp-");

function initials(name) {
  return String(name || "Unassigned").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function toneFor(name) {
  const tones = ["purple", "blue", "green"];
  const score = [...String(name || "")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[score % tones.length];
}

function normalizeTask(task, column) {
  const assignee = task.assignee || "Unassigned";
  return {
    ...task,
    id: String(task.id ?? task._id),
    boardId: String(task.boardId ?? ""),
    status: task.status || column.status,
    columnId: task.columnId || column.id,
    assignee,
    initials: task.initials || initials(assignee),
    avatarTone: task.avatarTone || toneFor(assignee),
    version: Number(task.version || 1),
  };
}

function normalizeColumns(input) {
  const source = Array.isArray(input) ? input : [];
  return columnDefinitions.map((definition) => {
    const found = source.find((column) => column.id === definition.id) || definition;
    return {
      ...definition,
      ...found,
      tasks: Array.isArray(found.tasks) ? found.tasks.map((task) => normalizeTask(task, definition)) : [],
    };
  });
}

function normalizePerson(person) {
  if (!person) return null;
  return { ...person, id: String(person.id ?? person._id) };
}

function normalizeBoard(board) {
  return {
    ...board,
    id: String(board.id ?? board._id),
    owner: normalizePerson(board.owner),
    members: Array.isArray(board.members) ? board.members.map(normalizePerson).filter(Boolean) : [],
  };
}

export function BoardDataProvider({ children }) {
  const { user, logout } = useAuth();
  const userId = user?.id;
  const cachedBoards = userId ? getBoardsFromCache(userId).map(normalizeBoard) : [];
  const cachedSelected = userId ? getSelectedBoardId(userId) : null;
  const initialSelected = cachedSelected || cachedBoards[0]?.id || null;

  const [boards, setBoards] = useState(cachedBoards);
  const [selectedBoardId, setSelectedBoardId] = useState(initialSelected);
  const selectedBoardIdRef = useRef(initialSelected);
  const [columns, setColumns] = useState(() => normalizeColumns(initialSelected && userId ? getColumnsFromCache(userId, initialSelected) : null));
  const [connection, setConnection] = useState(() => (navigator.onLine ? "online" : "offline"));
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState(null);
  const [notice, setNotice] = useState("");
  const syncRef = useRef(false);

  const selectedBoard = useMemo(() => boards.find((board) => board.id === selectedBoardId) || null, [boards, selectedBoardId]);

  const persistBoards = useCallback((next) => {
    const normalized = next.map(normalizeBoard);
    setBoards(normalized);
    if (userId) saveBoardsToCache(userId, normalized);
    return normalized;
  }, [userId]);

  const persistColumns = useCallback((boardId, next) => {
    const normalized = normalizeColumns(next);
    if (String(boardId) === String(selectedBoardIdRef.current)) setColumns(normalized);
    if (userId && boardId) saveColumnsToCache(userId, boardId, normalized);
    return normalized;
  }, [userId]);

  const setSelected = useCallback((boardId, nextColumns) => {
    selectedBoardIdRef.current = boardId || null;
    setSelectedBoardId(boardId || null);
    if (userId) saveSelectedBoardId(userId, boardId || null);
    const cached = nextColumns ?? (boardId && userId ? getColumnsFromCache(userId, boardId) : null);
    setColumns(normalizeColumns(cached));
  }, [userId]);

  const handleApiError = useCallback((error) => {
    if (error.status === 401) logout();
    if (error.network || !navigator.onLine) setConnection("offline");
  }, [logout]);

  const loadColumns = useCallback(async (boardId, { keepCache = true } = {}) => {
    if (!boardId) {
      setColumns(emptyColumns());
      return [];
    }
    const cached = userId ? getColumnsFromCache(userId, boardId) : null;
    if (keepCache && cached && String(boardId) === String(selectedBoardId)) setColumns(normalizeColumns(cached));
    if (isTempId(boardId) || !navigator.onLine) return normalizeColumns(cached);
    try {
      const response = await api.getColumns(boardId);
      setConnection("online");
      return persistColumns(boardId, response.data);
    } catch (error) {
      handleApiError(error);
      return normalizeColumns(cached);
    }
  }, [handleApiError, persistColumns, selectedBoardId, userId]);

  const refreshBoards = useCallback(async ({ preferredBoardId } = {}) => {
    if (!userId) return [];
    const cached = getBoardsFromCache(userId).map(normalizeBoard);
    if (cached.length) persistBoards(cached);
    if (!navigator.onLine) {
      setConnection("offline");
      setLoading(false);
      return cached;
    }
    try {
      const response = await api.getBoards();
      const fresh = persistBoards(response.data || []);
      setConnection("online");
      const current = preferredBoardId || selectedBoardId || getSelectedBoardId(userId);
      const nextId = fresh.some((board) => board.id === current) ? current : fresh[0]?.id || null;
      setSelected(nextId);
      if (nextId) await loadColumns(nextId, { keepCache: true });
      else setColumns(emptyColumns());
      return fresh;
    } catch (error) {
      handleApiError(error);
      return cached;
    } finally {
      setLoading(false);
    }
  }, [handleApiError, loadColumns, persistBoards, selectedBoardId, setSelected, userId]);

  const selectBoard = useCallback(async (boardId) => {
    setSelected(boardId);
    await loadColumns(boardId, { keepCache: true });
  }, [loadColumns, setSelected]);

  const getActions = useCallback(() => userId ? getPendingActions(userId) : [], [userId]);
  const saveActions = useCallback((actions) => { if (userId) savePendingActions(userId, actions); }, [userId]);
  const addAction = useCallback((action) => saveActions([...getActions(), { actionId: makeId("action"), createdAt: new Date().toISOString(), ...action }]), [getActions, saveActions]);

  const mutateActions = useCallback((mutator) => {
    const next = mutator([...getActions()]);
    saveActions(next);
    return next;
  }, [getActions, saveActions]);

  const createBoard = useCallback(async (payload) => {
    const clean = { title: payload.title.trim(), description: payload.description?.trim() || "", memberEmails: payload.memberEmails || [] };
    if (!clean.title) throw new Error("Board title is required");
    if (!navigator.onLine) {
      const tempId = makeId("temp-board");
      const local = normalizeBoard({ id: tempId, ...clean, owner: user, members: [], _offline: true });
      persistBoards([local, ...boards]);
      setSelected(tempId, emptyColumns());
      addAction({ type: "CREATE_BOARD", tempId, payload: clean });
      setNotice("Board saved offline and will be created when you reconnect.");
      return local;
    }
    try {
      const response = await api.createBoard(clean);
      const board = normalizeBoard(response.data);
      persistBoards([board, ...boards.filter((item) => item.id !== board.id)]);
      setSelected(board.id, emptyColumns());
      setNotice("Board created.");
      return board;
    } catch (error) {
      handleApiError(error);
      if (error.network) {
        const tempId = makeId("temp-board");
        const local = normalizeBoard({ id: tempId, ...clean, owner: user, members: [], _offline: true });
        persistBoards([local, ...boards]);
        setSelected(tempId, emptyColumns());
        addAction({ type: "CREATE_BOARD", tempId, payload: clean });
        setNotice("Connection was lost. Board saved offline and queued for synchronization.");
        return local;
      }
      throw error;
    }
  }, [addAction, boards, handleApiError, persistBoards, setSelected, user]);

  const updateBoard = useCallback(async (board, payload) => {
    const clean = { title: payload.title.trim(), description: payload.description?.trim() || "", memberEmails: payload.memberEmails || [] };
    if (!clean.title) throw new Error("Board title is required");
    const local = normalizeBoard({ ...board, ...clean });
    persistBoards(boards.map((item) => item.id === board.id ? local : item));
    if (isTempId(board.id)) {
      mutateActions((actions) => actions.map((action) => action.type === "CREATE_BOARD" && action.tempId === board.id ? { ...action, payload: { ...action.payload, ...clean } } : action));
      setNotice("Offline board changes saved locally.");
      return local;
    }
    if (!navigator.onLine) {
      mutateActions((actions) => {
        const existing = actions.find((action) => action.type === "UPDATE_BOARD" && action.id === board.id);
        if (existing) return actions.map((action) => action === existing ? { ...action, payload: clean } : action);
        return [...actions, { actionId: makeId("action"), createdAt: new Date().toISOString(), type: "UPDATE_BOARD", id: board.id, payload: clean }];
      });
      setNotice("Board changes saved offline.");
      return local;
    }
    try {
      const response = await api.updateBoard(board.id, clean);
      const updated = normalizeBoard(response.data);
      persistBoards(boards.map((item) => item.id === board.id ? updated : item));
      setNotice("Board updated.");
      return updated;
    } catch (error) {
      handleApiError(error);
      if (error.network) {
        addAction({ type: "UPDATE_BOARD", id: board.id, payload: clean });
        setNotice("Connection was lost. Board changes were queued for synchronization.");
        return local;
      }
      await refreshBoards({ preferredBoardId: board.id });
      throw error;
    }
  }, [addAction, boards, handleApiError, mutateActions, persistBoards, refreshBoards]);

  const deleteBoard = useCallback(async (board) => {
    const nextBoards = boards.filter((item) => item.id !== board.id);
    persistBoards(nextBoards);
    const nextId = nextBoards[0]?.id || null;
    setSelected(nextId);
    if (nextId) await loadColumns(nextId);
    else setColumns(emptyColumns());

    if (isTempId(board.id)) {
      mutateActions((actions) => actions.filter((action) => !(action.type === "CREATE_BOARD" && action.tempId === board.id) && action.payload?.boardId !== board.id && action.id !== board.id));
      return;
    }
    if (!navigator.onLine) {
      mutateActions((actions) => [
        ...actions.filter((action) => !(action.type === "UPDATE_BOARD" && action.id === board.id) && action.payload?.boardId !== board.id),
        { actionId: makeId("action"), createdAt: new Date().toISOString(), type: "DELETE_BOARD", id: board.id },
      ]);
      setNotice("Board deletion queued for synchronization.");
      return;
    }
    try {
      await api.deleteBoard(board.id);
      setNotice("Board deleted.");
    } catch (error) {
      handleApiError(error);
      if (error.network) addAction({ type: "DELETE_BOARD", id: board.id });
      else await refreshBoards();
      throw error;
    }
  }, [addAction, boards, handleApiError, loadColumns, mutateActions, persistBoards, refreshBoards, setSelected]);

  const upsertTask = useCallback((task, boardId = selectedBoardId) => {
    if (!boardId) return;
    const normalizedTask = normalizeTask(task, columnDefinitions.find((column) => column.id === task.columnId) || columnDefinitions[0]);
    const base = String(boardId) === String(selectedBoardId) ? columns : normalizeColumns(userId ? getColumnsFromCache(userId, boardId) : null);
    const without = base.map((column) => ({ ...column, tasks: column.tasks.filter((item) => item.id !== normalizedTask.id) }));
    const next = without.map((column) => column.id === normalizedTask.columnId ? { ...column, tasks: [...column.tasks, normalizedTask] } : column);
    persistColumns(boardId, next);
  }, [columns, persistColumns, selectedBoardId, userId]);

  const removeTask = useCallback((taskId, boardId = selectedBoardId) => {
    if (!boardId) return;
    const base = String(boardId) === String(selectedBoardId) ? columns : normalizeColumns(userId ? getColumnsFromCache(userId, boardId) : null);
    persistColumns(boardId, base.map((column) => ({ ...column, tasks: column.tasks.filter((item) => item.id !== String(taskId)) })));
  }, [columns, persistColumns, selectedBoardId, userId]);

  const findTask = useCallback((taskId) => columns.flatMap((column) => column.tasks).find((task) => task.id === String(taskId)) || null, [columns]);

  const createTask = useCallback(async (payload) => {
    if (!selectedBoardId) throw new Error("Create a board before adding tasks");
    const clean = { ...payload, boardId: selectedBoardId };
    if (!navigator.onLine || isTempId(selectedBoardId)) {
      const tempId = makeId("temp-task");
      const local = normalizeTask({ ...clean, id: tempId, version: 1, _offline: true }, columnDefinitions.find((column) => column.id === clean.columnId) || columnDefinitions[0]);
      upsertTask(local, selectedBoardId);
      addAction({ type: "CREATE_TASK", tempId, payload: clean });
      setNotice("Task saved offline and queued for synchronization.");
      return local;
    }
    try {
      const response = await api.createTask(clean);
      upsertTask(response.data, selectedBoardId);
      setNotice("Task created.");
      return response.data;
    } catch (error) {
      handleApiError(error);
      if (error.network) {
        const tempId = makeId("temp-task");
        const local = normalizeTask({ ...clean, id: tempId, version: 1, _offline: true }, columnDefinitions.find((column) => column.id === clean.columnId) || columnDefinitions[0]);
        upsertTask(local, selectedBoardId);
        addAction({ type: "CREATE_TASK", tempId, payload: clean });
        return local;
      }
      throw error;
    }
  }, [addAction, handleApiError, selectedBoardId, upsertTask]);

  const updateTask = useCallback(async (task, changes) => {
    const clean = { ...changes };
    if (clean.columnId) clean.status = columnDefinitions.find((column) => column.id === clean.columnId)?.status || clean.status;
    if (clean.columnId === "done" && clean.progress === undefined) clean.progress = 100;
    const local = normalizeTask({ ...task, ...clean, _pending: !navigator.onLine || isTempId(task.id) }, columnDefinitions.find((column) => column.id === (clean.columnId || task.columnId)) || columnDefinitions[0]);

    if (isTempId(task.id)) {
      upsertTask(local, task.boardId || selectedBoardId);
      mutateActions((actions) => actions.map((action) => action.type === "CREATE_TASK" && action.tempId === task.id ? { ...action, payload: { ...action.payload, ...clean } } : action));
      return local;
    }

    const payload = { ...clean, version: Number(task.version || 1) };
    if (!navigator.onLine) {
      upsertTask(local, task.boardId || selectedBoardId);
      mutateActions((actions) => {
        const existing = actions.find((action) => action.type === "UPDATE_TASK" && action.id === task.id);
        if (existing) {
          return actions.map((action) => action === existing ? { ...action, payload: { ...existing.payload, ...clean, version: existing.payload.version } } : action);
        }
        return [...actions, { actionId: makeId("action"), createdAt: new Date().toISOString(), type: "UPDATE_TASK", id: task.id, payload }];
      });
      setNotice("Task changes saved offline.");
      return local;
    }

    try {
      const response = await api.updateTask(task.id, payload);
      upsertTask(response.data, task.boardId || selectedBoardId);
      setNotice("Task updated.");
      return response.data;
    } catch (error) {
      handleApiError(error);
      if (error.status === 409) {
        setConflict({ ...error.body, taskId: task.id });
        return null;
      }
      if (error.network) {
        upsertTask(local, task.boardId || selectedBoardId);
        addAction({ type: "UPDATE_TASK", id: task.id, payload });
        return local;
      }
      throw error;
    }
  }, [addAction, handleApiError, mutateActions, selectedBoardId, upsertTask]);

  const moveTask = useCallback(async (taskId, columnId) => {
    const task = findTask(taskId);
    if (!task || task.columnId === columnId) return task;
    return updateTask(task, { columnId, progress: columnId === "done" ? 100 : (task.progress === 100 ? 50 : task.progress) });
  }, [findTask, updateTask]);

  const deleteTask = useCallback(async (task) => {
    const boardId = task.boardId || selectedBoardId;
    removeTask(task.id, boardId);
    if (isTempId(task.id)) {
      mutateActions((actions) => actions.filter((action) => !(action.type === "CREATE_TASK" && action.tempId === task.id)));
      return;
    }
    if (!navigator.onLine) {
      mutateActions((actions) => [
        ...actions.filter((action) => !(action.type === "UPDATE_TASK" && action.id === task.id)),
        { actionId: makeId("action"), createdAt: new Date().toISOString(), type: "DELETE_TASK", id: task.id },
      ]);
      setNotice("Task deletion queued for synchronization.");
      return;
    }
    try {
      await api.deleteTask(task.id);
      setNotice("Task deleted.");
    } catch (error) {
      handleApiError(error);
      if (error.network) addAction({ type: "DELETE_TASK", id: task.id });
      else await loadColumns(boardId);
      throw error;
    }
  }, [addAction, handleApiError, loadColumns, mutateActions, removeTask, selectedBoardId]);

  const syncPending = useCallback(async () => {
    if (!userId || syncRef.current || !navigator.onLine) return;
    const original = getPendingActions(userId);
    if (!original.length) {
      await refreshBoards();
      return;
    }
    syncRef.current = true;
    setSyncing(true);
    setConnection("online");
    const remaining = [];
    const boardMap = new Map();
    const taskMap = new Map();
    let resolvedSelected = selectedBoardId;

    const resolveBoardId = (id) => boardMap.get(id) || id;
    const resolveTaskId = (id) => taskMap.get(id) || id;

    for (const action of original) {
      const rewritten = {
        ...action,
        id: action.id ? resolveTaskId(resolveBoardId(action.id)) : action.id,
        payload: action.payload ? { ...action.payload, boardId: action.payload.boardId ? resolveBoardId(action.payload.boardId) : action.payload.boardId } : action.payload,
      };
      try {
        if (action.type === "CREATE_BOARD") {
          const response = await api.createBoard(action.payload);
          boardMap.set(action.tempId, response.data.id || response.data._id);
          if (resolvedSelected === action.tempId) resolvedSelected = response.data.id || response.data._id;
        } else if (action.type === "UPDATE_BOARD") {
          await api.updateBoard(resolveBoardId(action.id), action.payload);
        } else if (action.type === "DELETE_BOARD") {
          await api.deleteBoard(resolveBoardId(action.id));
        } else if (action.type === "CREATE_TASK") {
          const boardId = resolveBoardId(action.payload.boardId);
          if (isTempId(boardId)) throw Object.assign(new Error("Waiting for board synchronization"), { defer: true });
          const response = await api.createTask({ ...action.payload, boardId });
          taskMap.set(action.tempId, response.data.id || response.data._id);
        } else if (action.type === "UPDATE_TASK") {
          const taskId = resolveTaskId(action.id);
          if (isTempId(taskId)) throw Object.assign(new Error("Waiting for task synchronization"), { defer: true });
          await api.updateTask(taskId, rewritten.payload);
        } else if (action.type === "DELETE_TASK") {
          const taskId = resolveTaskId(action.id);
          if (!isTempId(taskId)) await api.deleteTask(taskId);
        }
      } catch (error) {
        const failed = { ...rewritten, id: rewritten.id ? resolveTaskId(rewritten.id) : rewritten.id };
        remaining.push(failed);
        if (error.status === 409) {
          setConflict({ ...error.body, taskId: failed.id, actionId: failed.actionId });
        }
        if (error.network) {
          setConnection("offline");
          const currentIndex = original.indexOf(action);
          for (const later of original.slice(currentIndex + 1)) {
            remaining.push({
              ...later,
              id: later.id ? resolveTaskId(resolveBoardId(later.id)) : later.id,
              payload: later.payload ? { ...later.payload, boardId: later.payload.boardId ? resolveBoardId(later.payload.boardId) : later.payload.boardId } : later.payload,
            });
          }
          break;
        }
      }
    }

    savePendingActions(userId, remaining);
    if (resolvedSelected && resolvedSelected !== selectedBoardId) setSelected(resolvedSelected);
    if (navigator.onLine) {
      await refreshBoards({ preferredBoardId: resolvedSelected });
      setNotice(remaining.length ? `${remaining.length} change${remaining.length === 1 ? "" : "s"} still need attention.` : "Offline changes synchronized.");
    }
    setSyncing(false);
    syncRef.current = false;
  }, [refreshBoards, selectedBoardId, setSelected, userId]);

  const resolveConflictLoadLatest = useCallback(() => {
    if (!conflict?.serverTask) { setConflict(null); return; }
    const serverTask = conflict.serverTask;
    upsertTask(serverTask, serverTask.boardId || selectedBoardId);
    mutateActions((actions) => actions.filter((action) => action.actionId !== conflict.actionId && !(action.type === "UPDATE_TASK" && action.id === conflict.taskId)));
    setConflict(null);
    setNotice("Latest server version loaded.");
  }, [conflict, mutateActions, selectedBoardId, upsertTask]);

  useEffect(() => {
    if (userId && navigator.onLine && getPendingActions(userId).length) syncPending();
    else refreshBoards();
  }, []); // provider is remounted for each authenticated session

  useEffect(() => {
    const online = () => { setConnection("online"); syncPending(); };
    const offline = () => setConnection("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [syncPending]);

  const pendingCount = userId ? getPendingActions(userId).length : 0;
  const value = useMemo(() => ({
    boards,
    selectedBoard,
    selectedBoardId,
    columns,
    loading,
    connection: syncing ? "syncing" : conflict ? "conflict" : connection,
    pendingCount,
    conflict,
    notice,
    clearNotice: () => setNotice(""),
    resolveConflictLoadLatest,
    refreshBoards,
    loadColumns,
    selectBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    findTask,
    syncPending,
  }), [boards, selectedBoard, selectedBoardId, columns, loading, syncing, conflict, connection, pendingCount, notice, resolveConflictLoadLatest, refreshBoards, loadColumns, selectBoard, createBoard, updateBoard, deleteBoard, createTask, updateTask, moveTask, deleteTask, findTask, syncPending]);

  return <BoardDataContext.Provider value={value}>{children}</BoardDataContext.Provider>;
}

export function useBoardData() {
  const value = useContext(BoardDataContext);
  if (!value) throw new Error("useBoardData must be used inside BoardDataProvider");
  return value;
}
