import { getAuthToken } from "../utils/storage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (cause) {
    const error = new Error("Network request failed");
    error.network = true;
    error.cause = cause;
    throw error;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || body.errors?.join(", ") || "Request failed");
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export const register = (payload) => apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const login = (payload) => apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const getMe = () => apiRequest("/api/auth/me");

export const getBoards = () => apiRequest("/api/boards");
export const getBoard = (id) => apiRequest(`/api/boards/${id}`);
export const createBoard = (payload) => apiRequest("/api/boards", { method: "POST", body: JSON.stringify(payload) });
export const updateBoard = (id, payload) => apiRequest(`/api/boards/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteBoard = (id) => apiRequest(`/api/boards/${id}`, { method: "DELETE" });

export const getColumns = (boardId) => apiRequest(`/api/columns?boardId=${encodeURIComponent(boardId)}`);
export const getTasks = (boardId) => apiRequest(`/api/tasks?boardId=${encodeURIComponent(boardId)}`);
export const createTask = (payload) => apiRequest("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
export const updateTask = (id, payload) => apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteTask = (id) => apiRequest(`/api/tasks/${id}`, { method: "DELETE" });
