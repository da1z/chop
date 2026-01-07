import type { Command } from "commander";
import { TaskNotFoundError } from "../errors.ts";
import { findTaskById } from "../models/task.ts";
import { TaskStore } from "../storage/task-store.ts";
import { error, success } from "../utils/display.ts";

export function registerDoneCommand(program: Command): void {
	program
		.command("done <id>")
		.alias("d")
		.description("Mark a task as done")
		.action(async (id: string) => {
			try {
				const store = await TaskStore.create();

				await store.atomicUpdate((data) => {
					const task = findTaskById(id, data.tasks);

					if (!task) {
						throw new TaskNotFoundError(id);
					}

					task.status = "done";
					task.updatedAt = new Date().toISOString();

					return { data, result: task };
				});

				console.log(success(`Marked task ${id} as done`));
			} catch (err) {
				if (err instanceof Error) {
					console.error(error(err.message));
				} else {
					console.error(error("An unexpected error occurred"));
				}
				process.exit(1);
			}
		});
}
