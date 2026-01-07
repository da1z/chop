import type { Command } from "commander";
import { InvalidStatusError, TaskNotFoundError } from "../errors.ts";
import { findTaskById, isValidStatus } from "../models/task.ts";
import { TaskStore } from "../storage/task-store.ts";
import type { TaskStatus } from "../types.ts";

export function registerStatusCommand(program: Command): void {
	program
		.command("status <id> <status>")
		.description("Change task status (draft, open, in-progress, done)")
		.action(async (id: string, status: string) => {
			try {
				// Validate status
				if (!isValidStatus(status) || status === "archived") {
					throw new InvalidStatusError(status);
				}

				const store = await TaskStore.create();

				await store.atomicUpdate((data) => {
					const task = findTaskById(id, data.tasks);

					if (!task) {
						throw new TaskNotFoundError(id);
					}

					task.status = status as TaskStatus;
					task.updatedAt = new Date().toISOString();

					return { data, result: task };
				});

				console.log(`Changed task ${id} status to ${status}`);
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
