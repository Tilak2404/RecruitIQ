export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text.slice(0, 200)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Expected JSON, got ${contentType}: ${text.slice(0, 200)}`);
  }

  const payload = await response.json() as { success?: boolean; data?: T; error?: string } | T;

  if (payload && typeof payload === "object" && !Array.isArray(payload) && "success" in payload) {
    const wrapped = payload as { success?: boolean; data?: T; error?: string };
    if (wrapped.success === false) {
      throw new Error(wrapped.error ?? "Unexpected server error");
    }

    if ("data" in wrapped) {
      return wrapped.data as T;
    }
  }

  return payload as T;
}

