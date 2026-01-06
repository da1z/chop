# Chop CLI Specification

A simple, file-based task management CLI tool designed for developers working across multiple repositories.

## Overview

**Name:** `chop` (short alias: `ch`)
**Purpose:** Queue-based task management with dependency support, optimized for multi-process concurrent access.

## Core Concepts

### Task Model

Each task contains:
- **ID**: Hybrid format - short hash (7 chars) + sequential number (e.g., `a1b2c3d-1`)
- **Title**: Short description (required)
- **Description**: Optional longer details
- **Status**: `open` | `in-progress` | `done` | `archived`
- **Dependencies**: List of task IDs this task depends on
- **Created**: Timestamp of creation
- **Updated**: Timestamp of last modification

### Project Detection

Projects are identified by git repository:
1. First, attempt to use git remote origin URL as project identifier (survives cloning to different paths)
2. Fall back to git repository root path for local-only repos
3. Error if run outside a git repository

### Storage Strategy

Two storage modes, configured per-project during `chop init`:

1. **Local storage** (in-repo): `.chop/tasks.json` in repository root
   - Can be committed (team shared) or gitignored (personal)

2. **Global storage**: `~/.local/share/chop/<project-id>/tasks.json`
   - Never pollutes the repository
   - Project ID derived from remote URL or repo path

**Resolution order:**
1. Check for `.chop/tasks.json` in repo root
2. Fall back to global storage location
3. Error if neither exists (requires `chop init`)

**Archive storage:** Archived tasks are moved to a separate file (`tasks.archived.json`) to avoid loading them into memory during normal operations.

### Concurrency Model

File locking with retry strategy to handle multiple processes:
- Use OS-level file locks when reading/writing
- Retry up to 5 times with exponential backoff (100ms, 200ms, 400ms, 800ms, 1600ms)
- Critical for `chop pop` to ensure atomic "get + mark in-progress" operation
- Works correctly across multiple checkouts of the same repository sharing global storage

## Commands

### Initialization

```
chop init
```

Interactive setup prompting for:
1. Storage location: local (in-repo) or global
2. If local: add to .gitignore? (y/n)

Creates the storage directory and empty tasks file.

### Adding Tasks

```
chop add <title> [options]
```

Options:
- `--top` / `-t`: Add to top of queue (default: bottom)
- `--bottom` / `-b`: Add to bottom of queue (explicit)
- `--desc <description>` / `-d`: Add description
- `--depends-on <id>`: Add dependency (can be repeated)

If `--depends-on` is used without an ID, show interactive picker of existing tasks.

Examples:
```
chop add "Implement login page"
chop add "Write tests" --top
chop add "Deploy to staging" --depends-on a1b2c3d-1 --depends-on e5f6g7h-2
```

### Listing Tasks

```
chop list [options]
```

Options:
- `--open` / `-o`: Show only open tasks (default behavior)
- `--progress` / `-p`: Show only in-progress tasks
- `--done`: Show only done tasks
- `--all` / `-a`: Show all non-archived tasks

Output format (compact table):
```
ID          STATUS       TITLE
a1b2c3d-1   open         Implement login page
e5f6g7h-2   in-progress  Write unit tests
f8g9h0i-3   open         [blocked] Deploy to staging
```

Tasks with incomplete dependencies are marked `[blocked]` but still shown.

### Getting Next Task

```
chop pop
```

Atomically:
1. Find the first `open` task (by creation order) that has no incomplete dependencies
2. Mark it as `in-progress`
3. Display the task details

If no tasks available, print "No tasks available" and exit with code 0.

Tasks with incomplete dependencies are silently skipped.

### Completing Tasks

```
chop done <id>
```

Mark a task as `done`. Requires explicit task ID since multiple tasks can be in-progress.

### Changing Status

```
chop status <id> <status>
```

Change task status to: `open`, `in-progress`, or `done`.

Examples:
```
chop status a1b2c3d-1 in-progress
chop status e5f6g7h-2 open
```

### Archiving Tasks

```
chop archive <id>
```

Move a task to archived storage. Requires confirmation.

Cascade behavior:
- If task has dependents (other tasks depend on it), show warning listing affected tasks
- Prompt for confirmation to archive all affected tasks together
- On confirm, archive the task and all its dependents

When archiving a task that depends on other tasks, just remove the dependency links.

### Purging Archives

```
chop purge
```

Permanently delete all archived tasks. Requires confirmation.

### Editing Tasks

```
chop edit <id>
```

Opens task in `$EDITOR` (or `vi` if not set) as a temporary file with YAML/JSON format:
```yaml
title: Implement login page
description: |
  Create login form with email/password
  Add validation and error handling
status: open
depends_on:
  - a1b2c3d-1
```

Save and close to apply changes. Cancel (exit without saving or delete content) to abort.

### Moving Tasks

```
chop move <id> [options]
```

Options:
- `--top` / `-t`: Move to top of queue
- `--bottom` / `-b`: Move to bottom of queue

Examples:
```
chop move a1b2c3d-1 --top
chop move e5f6g7h-2 --bottom
```

### Help

```
chop
chop --help
chop <command> --help
```

Running `chop` with no arguments shows help.

## File Formats

### tasks.json

```json
{
  "version": 1,
  "lastSequence": 3,
  "tasks": [
    {
      "id": "a1b2c3d-1",
      "title": "Implement login page",
      "description": "Create login form with validation",
      "status": "open",
      "dependsOn": [],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### tasks.archived.json

Same format as tasks.json, containing only archived tasks.

### config.json

Located at `.chop/config.json` (local) or `~/.config/chop/config.json` (global):

```json
{
  "defaultStorage": "global",
  "projects": {
    "github.com/user/repo": {
      "storage": "local"
    }
  }
}
```

## Error Handling

Errors are concise one-liners:
- `Error: Not in a git repository`
- `Error: Project not initialized. Run 'chop init'`
- `Error: Task a1b2c3d-1 not found`
- `Error: Cannot acquire lock. Another process is accessing tasks`
- `Error: Task has unarchived dependents: e5f6g7h-2, f8g9h0i-3`

## Exit Codes

- `0`: Success
- `1`: Error (with message to stderr)

## Implementation Notes

### Technology Stack
- Runtime: Bun
- Language: TypeScript
- Argument parsing: Built-in or minimal dependency
- File locking: OS-level locks via Bun APIs

### Concurrency Safety

For operations that modify state (`pop`, `done`, `status`, `add`, etc.):
1. Acquire exclusive file lock
2. Read current state
3. Validate operation is still valid
4. Write updated state
5. Release lock

This ensures correctness when:
- Multiple terminal sessions in same repo
- Multiple checkouts of same repo sharing global storage
- CI/CD pipelines running concurrent tasks

### ID Generation

1. Generate random bytes and create short hash (7 chars)
2. Increment `lastSequence` counter
3. Combine: `{hash}-{sequence}`

This provides:
- Uniqueness (hash prevents collisions)
- Human-friendliness (sequence for easy reference)
- Merge safety (hash portion prevents conflicts)

## Future Considerations (Not in v1)

- Shell completions (bash/zsh/fish)
- Integration hooks (on-status-change scripts)
- Cross-project dependencies
- Priority levels
- Tags/labels for filtering
- Time tracking
