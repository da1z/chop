import { test, expect, describe } from "bun:test";
import {
  createTask,
  isBlocked,
  findDependents,
  findAllDependents,
  findTaskById,
  isValidStatus,
  getNextAvailableTask,
} from "../../src/models/task.ts";
import type { Task } from "../../src/types.ts";

// Helper to create a mock task
function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "abc1234-1",
    title: "Test Task",
    status: "open",
    dependsOn: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("createTask", () => {
  test("creates task with required fields", () => {
    const { task, newSequence } = createTask(0, { title: "My Task" });

    expect(task.title).toBe("My Task");
    expect(task.status).toBe("open");
    expect(task.dependsOn).toEqual([]);
    expect(task.id).toMatch(/^[a-f0-9]{7}-1$/);
    expect(newSequence).toBe(1);
  });

  test("creates task with optional fields", () => {
    const { task } = createTask(5, {
      title: "My Task",
      description: "A description",
      dependsOn: ["abc1234-1"],
    });

    expect(task.description).toBe("A description");
    expect(task.dependsOn).toEqual(["abc1234-1"]);
  });
});

describe("isBlocked", () => {
  test("returns false for task with no dependencies", () => {
    const task = mockTask({ dependsOn: [] });
    expect(isBlocked(task, [])).toBe(false);
  });

  test("returns false when all dependencies are done", () => {
    const dep = mockTask({ id: "dep1234-1", status: "done" });
    const task = mockTask({ dependsOn: ["dep1234-1"] });
    expect(isBlocked(task, [dep, task])).toBe(false);
  });

  test("returns false when all dependencies are archived", () => {
    const dep = mockTask({ id: "dep1234-1", status: "archived" });
    const task = mockTask({ dependsOn: ["dep1234-1"] });
    expect(isBlocked(task, [dep, task])).toBe(false);
  });

  test("returns true when dependency is open", () => {
    const dep = mockTask({ id: "dep1234-1", status: "open" });
    const task = mockTask({ dependsOn: ["dep1234-1"] });
    expect(isBlocked(task, [dep, task])).toBe(true);
  });

  test("returns true when dependency is in-progress", () => {
    const dep = mockTask({ id: "dep1234-1", status: "in-progress" });
    const task = mockTask({ dependsOn: ["dep1234-1"] });
    expect(isBlocked(task, [dep, task])).toBe(true);
  });
});

describe("findDependents", () => {
  test("finds direct dependents", () => {
    const task1 = mockTask({ id: "task1-1" });
    const task2 = mockTask({ id: "task2-2", dependsOn: ["task1-1"] });
    const task3 = mockTask({ id: "task3-3", dependsOn: ["task1-1"] });
    const task4 = mockTask({ id: "task4-4" });

    const dependents = findDependents("task1-1", [task1, task2, task3, task4]);

    expect(dependents).toHaveLength(2);
    expect(dependents.map((t) => t.id)).toContain("task2-2");
    expect(dependents.map((t) => t.id)).toContain("task3-3");
  });
});

describe("findAllDependents", () => {
  test("finds recursive dependents", () => {
    const task1 = mockTask({ id: "task1-1" });
    const task2 = mockTask({ id: "task2-2", dependsOn: ["task1-1"] });
    const task3 = mockTask({ id: "task3-3", dependsOn: ["task2-2"] });
    const task4 = mockTask({ id: "task4-4" });

    const dependents = findAllDependents("task1-1", [task1, task2, task3, task4]);

    expect(dependents).toHaveLength(2);
    expect(dependents.map((t) => t.id)).toContain("task2-2");
    expect(dependents.map((t) => t.id)).toContain("task3-3");
  });
});

describe("findTaskById", () => {
  test("finds exact match", () => {
    const task = mockTask({ id: "abc1234-1" });
    const result = findTaskById("abc1234-1", [task]);
    expect(result).toBe(task);
  });

  test("finds partial match", () => {
    const task = mockTask({ id: "abc1234-1" });
    const result = findTaskById("abc1234", [task]);
    expect(result).toBe(task);
  });

  test("returns undefined for no match", () => {
    const task = mockTask({ id: "abc1234-1" });
    const result = findTaskById("xyz9999-9", [task]);
    expect(result).toBeUndefined();
  });
});

describe("isValidStatus", () => {
  test("returns true for valid statuses", () => {
    expect(isValidStatus("draft")).toBe(true);
    expect(isValidStatus("open")).toBe(true);
    expect(isValidStatus("in-progress")).toBe(true);
    expect(isValidStatus("done")).toBe(true);
    expect(isValidStatus("archived")).toBe(true);
  });

  test("returns false for invalid statuses", () => {
    expect(isValidStatus("invalid")).toBe(false);
    expect(isValidStatus("")).toBe(false);
    expect(isValidStatus("OPEN")).toBe(false);
  });
});

describe("getNextAvailableTask", () => {
  test("returns first open unblocked task", () => {
    const task1 = mockTask({ id: "task1-1", status: "done" });
    const task2 = mockTask({ id: "task2-2", status: "open" });
    const task3 = mockTask({ id: "task3-3", status: "open" });

    const result = getNextAvailableTask([task1, task2, task3]);
    expect(result?.id).toBe("task2-2");
  });

  test("skips blocked tasks", () => {
    const task1 = mockTask({ id: "task1-1", status: "open" });
    const task2 = mockTask({ id: "task2-2", status: "open", dependsOn: ["task1-1"] });

    const result = getNextAvailableTask([task1, task2]);
    expect(result?.id).toBe("task1-1");
  });

  test("returns undefined when no tasks available", () => {
    const task1 = mockTask({ id: "task1-1", status: "done" });
    const task2 = mockTask({ id: "task2-2", status: "in-progress" });

    const result = getNextAvailableTask([task1, task2]);
    expect(result).toBeUndefined();
  });
});
