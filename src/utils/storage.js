const AUTH_TOKEN_KEY = "collabboard:auth-token";
const AUTH_USER_KEY = "collabboard:auth-user";
const prefix = (userId) => `collabboard:v3:${userId || "anonymous"}`;

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache failures must never prevent the application from rendering.
  }
}

export const getAuthToken = () => {
  try { return localStorage.getItem(AUTH_TOKEN_KEY) || ""; } catch { return ""; }
};
export const saveAuthToken = (token) => {
  try { localStorage.setItem(AUTH_TOKEN_KEY, token); } catch {}
};
export const removeAuthToken = () => {
  try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
};
export const getAuthUser = () => read(AUTH_USER_KEY, null);
export const saveAuthUser = (user) => write(AUTH_USER_KEY, user);
export const removeAuthUser = () => {
  try { localStorage.removeItem(AUTH_USER_KEY); } catch {}
};

export const getBoardsFromCache = (userId) => read(`${prefix(userId)}:boards`, []);
export const saveBoardsToCache = (userId, boards) => write(`${prefix(userId)}:boards`, boards);
export const getSelectedBoardId = (userId) => read(`${prefix(userId)}:selected-board-id`, null);
export const saveSelectedBoardId = (userId, boardId) => write(`${prefix(userId)}:selected-board-id`, boardId);
export const getColumnsFromCache = (userId, boardId) => read(`${prefix(userId)}:columns:${boardId}`, null);
export const saveColumnsToCache = (userId, boardId, columns) => write(`${prefix(userId)}:columns:${boardId}`, columns);
export const getPendingActions = (userId) => read(`${prefix(userId)}:pending-actions`, []);
export const savePendingActions = (userId, actions) => write(`${prefix(userId)}:pending-actions`, actions);
export const addPendingAction = (userId, action) => {
  savePendingActions(userId, [...getPendingActions(userId), action]);
};

export function clearUserApplicationCache(userId) {
  try {
    const userPrefix = `${prefix(userId)}:`;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(userPrefix)) localStorage.removeItem(key);
    });
  } catch {}
}
