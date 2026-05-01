import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { checkAuth } from "./auth-embed";

// Mock createServerSupabaseClient
const mockGetUser = vi.fn();
vi.mock("./supabase/server", () => ({
  createServerSupabaseClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock getEmbedSecret
vi.mock("./supabase-env", () => ({
  getEmbedSecret: () => "test-secret-123",
}));

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

describe("checkAuth", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it("autoriza con sesión Supabase válida", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const req = makeRequest("https://x/api/tasks/abc");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: true, via: "session" });
  });

  it("autoriza con embedToken válido en query", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("https://x/api/tasks/abc?embedToken=test-secret-123");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: true, via: "token" });
  });

  it("rechaza si no hay sesión ni token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("https://x/api/tasks/abc");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: false });
  });

  it("rechaza si embedToken es incorrecto", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("https://x/api/tasks/abc?embedToken=wrong");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: false });
  });

  it("prioriza sesión sobre token (si ambos son válidos)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const req = makeRequest("https://x/api/tasks/abc?embedToken=test-secret-123");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: true, via: "session" });
  });
});
