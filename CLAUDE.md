# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests with Vitest
npm run db:reset     # Reset SQLite database
```

To run a single test file: `npx vitest run src/path/to/__tests__/file.test.tsx`

Requires `ANTHROPIC_API_KEY` env var. Without it, a `MockLanguageModel` is used that returns fake generated components (useful for UI development).

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates them using tool calls that manipulate an in-memory virtual file system; the result renders live in an iframe.

### Three-panel UI (`src/app/main-content.tsx`)

- **Left panel:** Chat interface (`src/components/chat/`)
- **Right panel:** Tabbed Preview / Code editor (`src/components/preview/`, `src/components/editor/`)

### Data flow

1. User message → `ChatContext` (`src/lib/contexts/chat-context.tsx`) via Vercel AI SDK's `useChat`
2. POST to `/api/chat` (`src/app/api/chat/route.ts`) with messages + serialized file system state
3. `streamText()` calls Claude with two tools: `str_replace_editor` (create/modify files) and `file_manager` (rename/delete)
4. Tool call results update `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`)
5. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) detects changes, transforms files via Babel, and re-renders in a sandboxed iframe using an import map pointing to esm.sh CDN

### Virtual file system (`src/lib/file-system.ts`)

In-memory tree — no disk writes. Serializes to JSON for API transport and Prisma storage. The same `VirtualFileSystem` class is used on both client (context) and server (tool execution in API route).

### JSX transformation (`src/lib/transform/jsx-transformer.ts`)

Babel Standalone transforms JSX → JS in the browser. Builds an import map: React/ReactDOM resolve to esm.sh CDN; user-created modules resolve to blob URLs. CSS imports are extracted and injected as `<style>` tags.

### Auth & persistence (`src/lib/auth.ts`, `src/actions/`)

JWT sessions in HttpOnly cookies (7-day expiry). Anonymous users can use the tool without login but work isn't saved. Authenticated users get projects persisted via Prisma (SQLite, `dev.db`). Project state stores both messages and file system as JSON strings.

Database schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database. Key models: `User` (id, email, password) and `Project` (id, name, userId?, messages as JSON string, data as JSON string for the virtual file system).

### AI prompt & tools (`src/lib/prompts/generation.tsx`, `src/lib/tools/`)

System prompt instructs Claude to build multi-file React apps. `str_replace_editor` handles create/view/str_replace/insert operations on files; `file_manager` handles rename/delete. Max 40 AI steps per turn (4 for mock).

### Node.js compatibility (`node-compat.cjs`)

Required shim — removes global `localStorage`/`sessionStorage` on Node.js 25+ where they conflict with SSR. Loaded via `NODE_OPTIONS='--require ./node-compat.cjs'`.

## Key path aliases

`@/*` → `src/*`

## Code style

Use comments sparingly. Only comment complex code.
