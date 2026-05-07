import { describe, expect, it } from "vitest";
import { json, problem } from "../src/http/response";

describe("http response helpers", () => {
  it("returns JSON response", () => {
    expect(json(201, { ok: true })).toEqual({
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: "{\"ok\":true}"
    });
  });

  it("returns problem response", () => {
    expect(problem(400, "Bad input")).toEqual({
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: "{\"error\":\"Bad input\"}"
    });
  });
});
