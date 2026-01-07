import { test, expect, describe } from "bun:test";
import {
  ChopError,
  NotInGitRepoError,
  NotInitializedError,
  TaskNotFoundError,
  LockError,
  InvalidStatusError,
  HasDependentsError,
  AlreadyInitializedError,
} from "../src/errors.ts";

describe("ChopError", () => {
  test("creates error with message prefix", () => {
    const error = new ChopError("test message");
    expect(error.message).toBe("Error: test message");
    expect(error.name).toBe("ChopError");
  });

  test("is an instance of Error", () => {
    const error = new ChopError("test");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("NotInGitRepoError", () => {
  test("creates error with correct message", () => {
    const error = new NotInGitRepoError();
    expect(error.message).toBe("Error: Not in a git repository");
    expect(error.name).toBe("ChopError");
  });
});

describe("NotInitializedError", () => {
  test("creates error with correct message", () => {
    const error = new NotInitializedError();
    expect(error.message).toBe("Error: Project not initialized. Run 'chop init'");
    expect(error.name).toBe("ChopError");
  });
});

describe("TaskNotFoundError", () => {
  test("creates error with task id in message", () => {
    const error = new TaskNotFoundError("abc123");
    expect(error.message).toBe("Error: Task abc123 not found");
    expect(error.name).toBe("ChopError");
  });
});

describe("LockError", () => {
  test("creates error with correct message", () => {
    const error = new LockError();
    expect(error.message).toBe("Error: Cannot acquire lock. Another process is accessing tasks");
    expect(error.name).toBe("ChopError");
  });
});

describe("InvalidStatusError", () => {
  test("creates error with status in message", () => {
    const error = new InvalidStatusError("invalid-status");
    expect(error.message).toBe("Error: Invalid status: invalid-status. Use: draft, open, in-progress, or done");
    expect(error.name).toBe("ChopError");
  });
});

describe("HasDependentsError", () => {
  test("creates error with single dependent id", () => {
    const error = new HasDependentsError(["task1"]);
    expect(error.message).toBe("Error: Task has unarchived dependents: task1");
    expect(error.name).toBe("ChopError");
  });

  test("creates error with multiple dependent ids", () => {
    const error = new HasDependentsError(["task1", "task2", "task3"]);
    expect(error.message).toBe("Error: Task has unarchived dependents: task1, task2, task3");
    expect(error.name).toBe("ChopError");
  });
});

describe("AlreadyInitializedError", () => {
  test("creates error with correct message", () => {
    const error = new AlreadyInitializedError();
    expect(error.message).toBe("Error: Project already initialized");
    expect(error.name).toBe("ChopError");
  });
});
