import { test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getSession } from "../auth";

beforeEach(() => {
  vi.clearAllMocks();
});

test("getSession returns null when no cookie is present", async () => {
  (cookies as any).mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  });

  const result = await getSession();

  expect(result).toBeNull();
});

test("getSession returns null when JWT verification fails", async () => {
  (cookies as any).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "invalid-token" }),
  });
  (jwtVerify as any).mockRejectedValue(new Error("invalid signature"));

  const result = await getSession();

  expect(result).toBeNull();
});

test("getSession returns SessionPayload when JWT is valid", async () => {
  const mockPayload = {
    userId: "user-123",
    email: "test@example.com",
    expiresAt: new Date("2026-04-01"),
  };

  (cookies as any).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "valid-token" }),
  });
  (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

  const result = await getSession();

  expect(result).toEqual(mockPayload);
});
