import { User } from "firebase/auth";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://omen-proxy.shnkadir.workers.dev")
  .replace(/\/$/, "");

export interface DreamAnalysis {
  interpretation: string;
  primaryEmotion: string;
  moodScore: number;
  archetypes: string[];
  gorsel_betimleme: string;
  gorsel_url?: string;
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

async function apiRequest<T>(
  user: User,
  path: string,
  options: { method?: "POST" | "DELETE"; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new ApiError(payload.error ?? "INTERNAL_ERROR", response.status);
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ApiError("TIMEOUT", 408);
    throw new ApiError("NETWORK_ERROR", 0);
  } finally {
    clearTimeout(timeout);
  }
}

export const analyzeDreamApi = (
  user: User,
  dream: string,
  previousDream: string,
) => apiRequest<DreamAnalysis>(user, "/analyze", {
  body: { dream, previousDream },
  timeoutMs: 35_000,
});

export const claimDailyCredit = (user: User) =>
  apiRequest(user, "/credits/daily");

export const claimAdReward = (user: User) =>
  apiRequest(user, "/credits/reward");

export const reportAiContent = (user: User, requestId: string, reason: string) =>
  apiRequest(user, "/report", { body: { requestId, reason } });

export const deleteAccountAndData = (user: User) =>
  apiRequest(user, "/account", { method: "DELETE", timeoutMs: 40_000 });

export const legalUrls = {
  privacy: `${API_URL}/privacy`,
  deletion: `${API_URL}/delete-account`,
};
