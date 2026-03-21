import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result",
  result?: string
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "1", toolName, args, state, result } as ToolInvocation;
  }
  return { toolCallId: "1", toolName, args, state } as ToolInvocation;
}

test("str_replace_editor create shows 'Creating <path>'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "call"
      )}
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("str_replace_editor str_replace shows 'Editing <path>'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "str_replace", path: "/Card.jsx" },
        "result",
        "Success"
      )}
    />
  );
  expect(screen.getByText("Editing /Card.jsx")).toBeDefined();
});

test("str_replace_editor insert shows 'Editing <path>'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "insert", path: "/Card.jsx" },
        "result",
        "Success"
      )}
    />
  );
  expect(screen.getByText("Editing /Card.jsx")).toBeDefined();
});

test("str_replace_editor view shows 'Reading <path>'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "view", path: "/App.jsx" },
        "call"
      )}
    />
  );
  expect(screen.getByText("Reading /App.jsx")).toBeDefined();
});

test("str_replace_editor undo_edit shows 'Undoing edit on <path>'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "undo_edit", path: "/App.jsx" },
        "call"
      )}
    />
  );
  expect(screen.getByText("Undoing edit on /App.jsx")).toBeDefined();
});

test("file_manager rename shows 'Renaming <path>'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "file_manager",
        { command: "rename", path: "/App.jsx", new_path: "/NewApp.jsx" },
        "result",
        "Success"
      )}
    />
  );
  expect(screen.getByText("Renaming /App.jsx")).toBeDefined();
});

test("file_manager delete shows 'Deleting <path>'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "file_manager",
        { command: "delete", path: "/App.jsx" },
        "call"
      )}
    />
  );
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("unknown tool falls back to raw tool name", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("some_other_tool", {}, "call")}
    />
  );
  expect(screen.getByText("some_other_tool")).toBeDefined();
});

test("shows green dot when state is result with result value", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result",
        "Success"
      )}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("shows spinner when state is call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "call"
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});
