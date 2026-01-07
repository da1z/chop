import type { Command } from "commander";
import { ChopError, TaskNotFoundError } from "../errors.ts";
import { findTaskById } from "../models/task.ts";
import { TaskStore } from "../storage/task-store.ts";

async function moveTask(id: string, position: "top" | "bottom"): Promise<void> {
	const store = await TaskStore.create();

	await store.atomicUpdate((data) => {
		const task = findTaskById(id, data.tasks);

		if (!task) {
			throw new TaskNotFoundError(id);
		}

		// Find and remove the task from its current position
		const index = data.tasks.findIndex((t) => t.id === task.id);
		data.tasks.splice(index, 1);

		// Insert at new position
		if (position === "top") {
			data.tasks.unshift(task);
		} else {
			data.tasks.push(task);
		}

		task.updatedAt = new Date().toISOString();

		return { data, result: task };
	});

	console.log(`Moved task ${id} to ${position}`);
}

export function registerMoveCommand(program: Command): void {
	program
		.command("move <id>")
		.alias("mv")
		.description("Move a task in the queue")
		.option("-t, --top", "Move to top of queue")
		.option("-b, --bottom", "Move to bottom of queue")
		.action(async (id: string, options) => {
			try {
				if (!options.top && !options.bottom) {
					throw new ChopError("Must specify --top or --bottom");
				}

				await moveTask(id, options.top ? "top" : "bottom");
			} catch (error) {
				if (error instanceof Error) {
					console.error(error.message);
				} else {
					console.error("An unexpected error occurred");
				}
				process.exit(1);
			}
		});

	// Shortcut: mt <id> = move <id> --top
	program
		.command("mt <id>")
		.description("Move a task to top of queue (alias for move --top)")
		.action(async (id: string) => {
			try {
				await moveTask(id, "top");
			} catch (error) {
				if (error instanceof Error) {
					console.error(error.message);
				} else {
					console.error("An unexpected error occurred");
				}
				process.exit(1);
			}
		});

	// Shortcut: mb <id> = move <id> --bottom
	program
		.command("mb <id>")
		.description("Move a task to bottom of queue (alias for move --bottom)")
		.action(async (id: string) => {
			try {
				await moveTask(id, "bottom");
			} catch (error) {
				if (error instanceof Error) {
					console.error(error.message);
				} else {
					console.error("An unexpected error occurred");
				}
				process.exit(1);
			}
		});
}
