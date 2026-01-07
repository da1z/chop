import type { Task, TaskStatus } from "../types.ts";
import { generateTaskId } from "./id-generator.ts";

export interface CreateTaskOptions {
	title: string;
	description?: string;
	dependsOn?: string[];
	status?: "draft" | "open";
}

// Create a new task
export function createTask(
	lastSequence: number,
	options: CreateTaskOptions,
): { task: Task; newSequence: number } {
	const { id, newSequence } = generateTaskId(lastSequence);
	const now = new Date().toISOString();

	const task: Task = {
		id,
		title: options.title,
		description: options.description,
		status: options.status ?? "open",
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
	return ["draft", "open", "in-progress", "done", "archived"].includes(status);
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

// Detect circular dependencies
// Returns the cycle path if a circular dependency is found, null otherwise
// For new tasks, pass taskId as the new task's prospective ID
// For existing tasks being edited, pass the existing task's ID
export function detectCircularDependency(
	taskId: string,
	dependsOn: string[],
	tasks: Task[],
): string[] | null {
	// Build a dependency map from existing tasks
	const dependencyMap = new Map<string, string[]>();
	for (const task of tasks) {
		dependencyMap.set(task.id, task.dependsOn);
	}

	// Override or add the target task's dependencies
	dependencyMap.set(taskId, dependsOn);

	// DFS to detect cycle starting from taskId
	const visited = new Set<string>();
	const recursionStack = new Set<string>();
	const path: string[] = [];

	function dfs(currentId: string): string[] | null {
		visited.add(currentId);
		recursionStack.add(currentId);
		path.push(currentId);

		const deps = dependencyMap.get(currentId) || [];
		for (const depId of deps) {
			// If we find the starting point (taskId) in the dependencies, we have a cycle
			if (depId === taskId && recursionStack.has(taskId)) {
				// Return the cycle path including the return to taskId
				return [...path, taskId];
			}

			if (!visited.has(depId)) {
				const cycle = dfs(depId);
				if (cycle) return cycle;
			} else if (recursionStack.has(depId)) {
				// Found a cycle that doesn't involve taskId - but we only care about cycles involving taskId
				// This shouldn't happen if we're only traversing from taskId
				const cycleStart = path.indexOf(depId);
				return [...path.slice(cycleStart), depId];
			}
		}

		path.pop();
		recursionStack.delete(currentId);
		return null;
	}

	return dfs(taskId);
}
