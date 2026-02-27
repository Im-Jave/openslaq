import { describe, test, expect } from "bun:test";

function getApiUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

describe("CORS", () => {
  test("allows http://localhost:3000 origin", async () => {
    const res = await fetch(`${getApiUrl()}/api/users/me`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
      },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("allows http://tauri.localhost origin", async () => {
    const res = await fetch(`${getApiUrl()}/api/users/me`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://tauri.localhost",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
      },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://tauri.localhost",
    );
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("allows requests without Origin header (native clients)", async () => {
    const res = await fetch(`${getApiUrl()}/health`);
    expect(res.status).toBe(200);
  });

  test("rejects unknown origin", async () => {
    const res = await fetch(`${getApiUrl()}/api/users/me`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://evil.example.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
      },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    expect(allowOrigin).not.toBe("http://evil.example.com");
  });
});
