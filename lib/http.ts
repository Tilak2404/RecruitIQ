export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? ((await response.json()) as { success?: boolean; data?: T; error?: string }) : null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? "Request failed");
  }

  return payload.data as T;
}
