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

  return await response.json() as T;
}

