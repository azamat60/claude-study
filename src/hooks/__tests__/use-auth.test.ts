import { renderHook, act } from "@testing-library/react";
import { test, expect, vi, beforeEach, describe } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("signIn", () => {
  test("returns the result from the signIn action", async () => {
    (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "proj-1" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("sets isLoading to true during sign-in and false after", async () => {
    let resolveSignIn: (v: any) => void;
    (signInAction as any).mockImplementation(
      () => new Promise((res) => { resolveSignIn = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signIn("user@example.com", "password");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn!({ success: false, error: "Invalid credentials" });
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("sets isLoading to false even when signIn action throws", async () => {
    (signInAction as any).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-in fails", async () => {
    (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "wrongpassword");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("calls signIn action with correct email and password", async () => {
    (signInAction as any).mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("test@example.com", "mypassword");
    });

    expect(signInAction).toHaveBeenCalledWith("test@example.com", "mypassword");
  });
});

describe("signUp", () => {
  test("returns the result from the signUp action", async () => {
    (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  });

  test("sets isLoading to false even when signUp action throws", async () => {
    (signUpAction as any).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("user@example.com", "password").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-up fails", async () => {
    (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("existing@example.com", "password123");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("calls signUp action with correct email and password", async () => {
    (signUpAction as any).mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "securepass");
    });

    expect(signUpAction).toHaveBeenCalledWith("new@example.com", "securepass");
  });
});

describe("post-sign-in routing", () => {
  test("saves anon work as a new project and navigates to it when anon messages exist", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "build a button" }],
      fileSystemData: { "/": { type: "dir" }, "/App.tsx": { type: "file" } },
    };
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(anonWork);
    (createProject as any).mockResolvedValue({ id: "anon-proj-42" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj-42");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("does not save anon work when anon data has no messages", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
    (getProjects as any).mockResolvedValue([{ id: "existing-proj" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(clearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });

  test("does not save anon work when getAnonWorkData returns null", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([{ id: "recent-proj" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/recent-proj");
  });

  test("navigates to the most recent existing project when no anon work", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([
      { id: "proj-recent" },
      { id: "proj-older" },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-recent");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates a new project and navigates to it when user has no existing projects", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "brand-new-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [],
        data: {},
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new-proj");
  });

  test("newly created fallback project has a non-empty name", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "new-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    const callArg = (createProject as any).mock.calls[0][0];
    expect(typeof callArg.name).toBe("string");
    expect(callArg.name.length).toBeGreaterThan(0);
  });

  test("same post-sign-in routing applies after successful signUp", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([{ id: "first-proj" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/first-proj");
  });
});
