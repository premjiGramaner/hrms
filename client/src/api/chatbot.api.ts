/**
 * Chatbot API client.
 *
 * Calls the FastAPI chatbot service (port 8000) using the same Bearer token
 * already stored in localStorage by the existing HRMS auth flow.
 */

import { STORAGE_KEYS } from "../constants/storage";

const CHATBOT_BASE_URL =
  (import.meta.env.VITE_CHATBOT_BASE_URL as string) || "http://localhost:8000";

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  answer: string;
  session_id: string;
}

async function chatbotFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(STORAGE_KEYS.token);

  const res = await fetch(`${CHATBOT_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

/** Send a message to the HRMS chatbot. */
export const sendChatMessage = (body: ChatRequest): Promise<ChatResponse> =>
  chatbotFetch<ChatResponse>("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** Health check — returns true if chatbot server is reachable. */
export const checkChatbotHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${CHATBOT_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
};
