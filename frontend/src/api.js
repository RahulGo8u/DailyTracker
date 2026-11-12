const API_URL = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    const error = new Error("Could not reach the server");
    error.status = 0;
    throw error;
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data.detail === "string" ? data.detail : "Request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

export const login = (credential) =>
  request("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });

export const logout = () => request("/api/auth/logout", { method: "POST" });

export const me = () => request("/api/auth/me");

export const getCategories = () => request("/api/categories");

export const createCategory = (name) =>
  request("/api/categories", { method: "POST", body: JSON.stringify({ name }) });

export const renameCategory = (id, name) =>
  request(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });

export const getCurrentActivity = () => request("/api/activities/current");

export const startActivity = (categoryId, name) =>
  request("/api/activities/start", {
    method: "POST",
    body: JSON.stringify({ category_id: categoryId, name }),
  });

export const stopActivity = () => request("/api/activities/stop", { method: "POST" });

export const getToday = () => request("/api/activities");

export const deleteActivity = (id) => request(`/api/activities/${id}`, { method: "DELETE" });

export const getDailySummary = () => request("/api/summary/daily");

export const getWeeklySummary = () => request("/api/summary/weekly");
