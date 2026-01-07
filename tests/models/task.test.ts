import { test, expect, describe } from "bun:test";
import {
  createTask,
  isBlocked,
  findDependents,
  findAllDependents,
  findTaskById,
  isValidStatus,
  getNextAvailableTask,
  detectCircularDependency,
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

  test("creates task with draft status", () => {
    const { task } = createTask(0, {
      title: "Draft Task",
      status: "draft",
    });

    expect(task.status).toBe("draft");
  });

  test("creates task with open status by default", () => {
    const { task } = createTask(0, { title: "Open Task" });

    expect(task.status).toBe("open");
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

describe("detectCircularDependency", () => {
  test("returns null for no dependencies", () => {
    const result = detectCircularDependency("task1-1", [], []);
    expect(result).toBeNull();
  });

  test("returns null for valid linear dependencies", () => {
    const task1 = mockTask({ id: "task1-1", dependsOn: [] });
    const task2 = mockTask({ id: "task2-2", dependsOn: ["task1-1"] });

    // Adding task3 that depends on task2
    const result = detectCircularDependency("task3-3", ["task2-2"], [task1, task2]);
    expect(result).toBeNull();
  });

  test("detects direct self-reference", () => {
    const result = detectCircularDependency("task1-1", ["task1-1"], []);
    expect(result).toEqual(["task1-1", "task1-1"]);
  });

  test("detects simple two-task cycle (a → b → a)", () => {
    const taskA = mockTask({ id: "task-a", dependsOn: [] });

    // Adding task-b that depends on task-a, where task-a will then depend on task-b
    // First add task-b depending on task-a
    const taskB = mockTask({ id: "task-b", dependsOn: ["task-a"] });

    // Now try to make task-a depend on task-b - should detect cycle
    const result = detectCircularDependency("task-a", ["task-b"], [taskA, taskB]);
    expect(result).toEqual(["task-a", "task-b", "task-a"]);
  });

  test("detects three-task cycle (a → b → c → a)", () => {
    const taskA = mockTask({ id: "task-a", dependsOn: [] });
    const taskB = mockTask({ id: "task-b", dependsOn: ["task-a"] });
    const taskC = mockTask({ id: "task-c", dependsOn: ["task-b"] });

    // Try to make task-a depend on task-c - should detect cycle
    const result = detectCircularDependency("task-a", ["task-c"], [taskA, taskB, taskC]);
    expect(result).toEqual(["task-a", "task-c", "task-b", "task-a"]);
  });

  test("returns null when editing task without creating cycle", () => {
    const taskA = mockTask({ id: "task-a", dependsOn: [] });
    const taskB = mockTask({ id: "task-b", dependsOn: ["task-a"] });

    // Editing task-b to still depend on task-a (no change, no cycle)
    const result = detectCircularDependency("task-b", ["task-a"], [taskA, taskB]);
    expect(result).toBeNull();
  });

  test("detects cycle when new task would create circular path", () => {
    // task-a depends on task-b
    const taskA = mockTask({ id: "task-a", dependsOn: ["task-b"] });
    const taskB = mockTask({ id: "task-b", dependsOn: [] });

    // Try to add new task-c where task-b → task-c and task-c → task-a
    // This doesn't create a cycle, but if we try task-c → task-a with task-a → task-b → task-c
    // Let's first set up: task-b depends on task-c
    const taskBWithDep = mockTask({ id: "task-b", dependsOn: ["task-c"] });

    // Now add task-c that depends on task-a (a → b → c → a cycle)
    const result = detectCircularDependency("task-c", ["task-a"], [taskA, taskBWithDep]);
    expect(result).toEqual(["task-c", "task-a", "task-b", "task-c"]);
  });

  test("allows valid dependency chains", () => {
    const task1 = mockTask({ id: "task1-1", dependsOn: [] });
    const task2 = mockTask({ id: "task2-2", dependsOn: [] });
    const task3 = mockTask({ id: "task3-3", dependsOn: ["task1-1"] });

    // New task depending on both task2 and task3 is fine
    const result = detectCircularDependency("task4-4", ["task2-2", "task3-3"], [task1, task2, task3]);
    expect(result).toBeNull();
  });
});

// Additional edge case tests added after code review
describe("detectCircularDependency edge cases", () => {
  test("allows diamond dependencies (not a cycle)", () => {
    // A depends on B and C, both B and C depend on D
    const taskD = mockTask({ id: "task-d", dependsOn: [] });
    const taskB = mockTask({ id: "task-b", dependsOn: ["task-d"] });
    const taskC = mockTask({ id: "task-c", dependsOn: ["task-d"] });

    // Adding task-a that depends on both B and C - should be allowed
    const result = detectCircularDependency("task-a", ["task-b", "task-c"], [taskD, taskB, taskC]);
    expect(result).toBeNull();
  });

  test("detects cycle when only one of multiple dependencies creates it", () => {
    // B depends on A (creates cycle if A depends on B)
    // C has no dependencies
    const taskB = mockTask({ id: "task-b", dependsOn: ["task-a"] });
    const taskC = mockTask({ id: "task-c", dependsOn: [] });
    const taskA = mockTask({ id: "task-a", dependsOn: [] });

    // Adding dependency from A to [B, C] - B creates cycle, C doesn't
    const result = detectCircularDependency("task-a", ["task-b", "task-c"], [taskA, taskB, taskC]);
    expect(result).toEqual(["task-a", "task-b", "task-a"]);
  });

  test("handles non-existent dependency IDs gracefully", () => {
    const taskA = mockTask({ id: "task-a", dependsOn: [] });

    // Adding dependency on non-existent task - should not cause error
    const result = detectCircularDependency("task-b", ["non-existent", "task-a"], [taskA]);
    expect(result).toBeNull();
  });
});
