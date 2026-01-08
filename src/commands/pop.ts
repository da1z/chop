import type { Command } from "commander";
import { getNextAvailableTask } from "../models/task.ts";
import { TaskStore } from "../storage/task-store.ts";
import { error, formatTaskDetail, info } from "../utils/display.ts";

export function registerPopCommand(program: Command): void {
	program
		.command("pop")
		.alias("p")
		.description("Get the next available task and mark it as in-progress")
		.action(async () => {
			try {
				const store = await TaskStore.create();

				const result = await store.atomicUpdate((data) => {
					const task = getNextAvailableTask(data.tasks);

					if (!task) {
						return { data, result: null };
					}

					// Mark as in-progress
					task.status = "in-progress";
					task.updatedAt = new Date().toISOString();

					return { data, result: task };
				});

				if (!result) {
					console.log(info("No tasks available"));
					return;
				}

				const tasksData = await store.readTasks();
				console.log(formatTaskDetail(result, tasksData.tasks));
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
