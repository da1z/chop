# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**chop** is a queue-based task management CLI for developers. It stores tasks per git repository with support for both local (`.chop/`) and global (`~/.local/share/chop/`) storage. Tasks support dependencies and statuses: `draft`, `open`, `in-progress`, `done`, `archived`.

## Commands

```bash
bun install          # Install dependencies
bun test             # Run all tests
bun test tests/models/task.test.ts  # Run a single test file
bun run typecheck    # Type check with tsc
bun run build        # Build to ./dist
bun run index.ts     # Run the CLI directly
```

## Architecture

**Entry Point**: `index.ts` → `src/index.ts` (Commander.js CLI setup)

**Core Layers**:
- `src/commands/` - CLI command handlers (init, add, list, pop, done, status, move, archive, purge, edit, show, completion)
- `src/storage/` - Data persistence layer
  - `task-store.ts` - Main API for reading/writing tasks with atomic operations
  - `storage-resolver.ts` - Determines local vs global storage location
  - `file-lock.ts` - Cross-process file locking with exponential backoff
- `src/models/` - Domain logic
  - `task.ts` - Task operations (create, find, dependency checking)
  - `id-generator.ts` - Generates `{7-char-hash}-{sequence}` task IDs
- `src/types.ts` - TypeScript interfaces for Task, TasksFile, Config
- `src/errors.ts` - Custom error classes (ChopError subclasses)
- `src/config/paths.ts` - Path resolution for storage files
- `src/utils/` - Display formatting and interactive prompts

**Concurrency**: All task modifications use `withLock()` for atomic read-modify-write operations. The `TaskStore.atomicUpdate()` method is the primary way to safely modify tasks.

**Storage**: Tasks stored in `tasks.json`, archived tasks in `tasks.archived.json`. Project identification uses git remote URL or repo path.

## Specification

See `specs/chop.md` for the complete CLI specification including all commands, options, and behaviors.
