import type { Command } from "commander";
import { TaskNotFoundError } from "../errors.ts";
import { findTaskById } from "../models/task.ts";
import { TaskStore } from "../storage/task-store.ts";
import { error, formatTaskDetail } from "../utils/display.ts";

export function registerShowCommand(program: Command): void {
	program
		.command("show <id>")
		.alias("s")
		.description("Display full task info by ID")
		.action(async (id: string) => {
			try {
				const store = await TaskStore.create();
				const tasksData = await store.readTasks();
				const task = findTaskById(id, tasksData.tasks);

				if (!task) {
					throw new TaskNotFoundError(id);
				}

				console.log(formatTaskDetail(task, tasksData.tasks));
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
