const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ApiClientOptions {
  token?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & ApiClientOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
