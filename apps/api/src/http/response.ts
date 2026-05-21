export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export function json(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  };
}

export function problem(statusCode: number, message: string): ApiResponse {
  return json(statusCode, { error: message });
}
