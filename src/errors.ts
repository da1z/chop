// Base error class for chop
export class ChopError extends Error {
	constructor(message: string) {
		super(`Error: ${message}`);
		this.name = "ChopError";
	}
}

// Not in a git repository
export class NotInGitRepoError extends ChopError {
	constructor() {
		super("Not in a git repository");
	}
}

// Project not initialized
export class NotInitializedError extends ChopError {
	constructor() {
		super("Project not initialized. Run 'chop init'");
	}
}

// Task not found
export class TaskNotFoundError extends ChopError {
	constructor(id: string) {
		super(`Task ${id} not found`);
	}
}

// Cannot acquire lock
export class LockError extends ChopError {
	constructor() {
		super("Cannot acquire lock. Another process is accessing tasks");
	}
}

// Invalid task status
export class InvalidStatusError extends ChopError {
	constructor(status: string) {
		super(`Invalid status: ${status}. Use: draft, open, in-progress, or done`);
	}
}

// Task has unarchived dependents
export class HasDependentsError extends ChopError {
	constructor(dependentIds: string[]) {
		super(`Task has unarchived dependents: ${dependentIds.join(", ")}`);
	}
}

// Already initialized
export class AlreadyInitializedError extends ChopError {
	constructor() {
		super("Project already initialized");
	}
}

// Circular dependency detected
export class CircularDependencyError extends ChopError {
	constructor(cyclePath: string[]) {
		super(`Circular dependency detected: ${cyclePath.join(" → ")}`);
	}
}

// Non-interactive terminal requires explicit options
export class NonInteractiveError extends ChopError {}
