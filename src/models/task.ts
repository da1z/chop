import type { Task, TaskStatus, TasksFile } from "../types.ts";
import { generateTaskId } from "./id-generator.ts";

export interface CreateTaskOptions {
  title: string;
  description?: string;
  dependsOn?: string[];
}

// Create a new task
export function createTask(
  lastSequence: number,
  options: CreateTaskOptions
): { task: Task; newSequence: number } {
  const { id, newSequence } = generateTaskId(lastSequence);
  const now = new Date().toISOString();

  const task: Task = {
    id,
    title: options.title,
    description: options.description,
    status: "open",
    dependsOn: options.dependsOn || [],
    createdAt: now,
    updatedAt: now,
  };

  return { task, newSequence };
}

// Check if a task is blocked (has incomplete dependencies)
export function isBlocked(task: Task, tasks: Task[]): boolean {
  if (task.dependsOn.length === 0) {
    return false;
  }

  return task.dependsOn.some((depId) => {
    const dep = tasks.find((t) => t.id === depId);
    // Task is blocked if dependency exists and is not done/archived
    return dep && dep.status !== "done" && dep.status !== "archived";
  });
}

// Find tasks that depend on a given task (direct dependents)
export function findDependents(taskId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.dependsOn.includes(taskId));
}

// Find all tasks that depend on a given task (recursive)
export function findAllDependents(taskId: string, tasks: Task[]): Task[] {
  const allDependents = new Set<Task>();
  const visited = new Set<string>();

  function collectDependents(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);

    const directDependents = findDependents(id, tasks);
    for (const dep of directDependents) {
      allDependents.add(dep);
      collectDependents(dep.id);
    }
  }

  collectDependents(taskId);
  return Array.from(allDependents);
}

// Find a task by ID (supports partial matching)
export function findTaskById(id: string, tasks: Task[]): Task | undefined {
  // Exact match first
  const exact = tasks.find((t) => t.id === id);
  if (exact) return exact;

  // Partial match (starts with)
  const partial = tasks.filter((t) => t.id.startsWith(id));
  if (partial.length === 1) {
    return partial[0];
  }

  return undefined;
}

// Validate a status string
export function isValidStatus(status: string): status is TaskStatus {
  return ["open", "in-progress", "done", "archived"].includes(status);
}

// Get the first available (open, unblocked) task
export function getNextAvailableTask(tasks: Task[]): Task | undefined {
  for (const task of tasks) {
    if (task.status === "open" && !isBlocked(task, tasks)) {
      return task;
    }
  }
  return undefined;
}
