import type { AuthResult, DaySummary, Food, FoodEntry, MealType, User } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  /** Origin of the Next.js app, e.g. http://localhost:3000. Empty for same-origin web. */
  baseUrl?: string;
  /**
   * Supplies a bearer token. The web app omits this and relies on the
   * session cookie; the mobile app reads one from secure storage.
   */
  getToken?: () => string | null | Promise<string | null>;
}

export interface LogEntryInput {
  foodId?: string;
  name?: string;
  quantity?: number;
  meal: MealType;
  date: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export function createApiClient({ baseUrl = "", getToken }: ApiClientOptions = {}) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("content-type", "application/json");

    const token = await getToken?.();
    if (token) headers.set("authorization", `Bearer ${token}`);

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(payload?.error ?? `Request failed (${response.status})`, response.status);
    }
    return payload as T;
  }

  return {
    signup: (input: { email: string; password: string; name?: string }) =>
      request<AuthResult>("/api/auth/signup", { method: "POST", body: JSON.stringify(input) }),

    login: (input: { email: string; password: string }) =>
      request<AuthResult>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),

    logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

    me: () => request<{ user: User }>("/api/auth/me"),

    updateGoal: (dailyCalorieGoal: number) =>
      request<{ user: User }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ dailyCalorieGoal }),
      }),

    /** Search the food library. With no query, returns the user's most-logged foods. */
    searchFoods: (query?: string) =>
      request<{ foods: Food[]; source: "search" | "recent" }>(
        `/api/foods${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      ),

    getDay: (date: string) => request<DaySummary>(`/api/entries?date=${encodeURIComponent(date)}`),

    logEntry: (input: LogEntryInput) =>
      request<{ entry: FoodEntry }>("/api/entries", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    deleteEntry: (id: string) =>
      request<{ ok: true }>(`/api/entries/${id}`, { method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
