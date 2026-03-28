import { BASE_URL } from "@/constants/config";

export async function safeJson<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(res.ok ? "Unexpected server response" : `Server error (${res.status})`);
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    return await fetch(`${BASE_URL}${path}`, { ...rest, headers });
  } catch {
    throw new Error("Could not reach server. Check your internet connection.");
  }
}
