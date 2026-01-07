import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import type { Task } from "../types.ts";
import { formatTaskTable } from "../utils/display.ts";

export function registerListCommand(program: Command): void {
	program
		.command("list")
		.alias("ls")
		.description("List tasks")
		.option("-o, --open", "Show only open and draft tasks (default)")
		.option("-p, --progress", "Show only in-progress tasks")
		.option("--done", "Show only done tasks")
		.option("-a, --all", "Show all non-archived tasks")
		.action(async (options) => {
			try {
				const store = await TaskStore.create();
				const data = await store.readTasks();

				let filteredTasks: Task[];

				if (options.all) {
					// All non-archived tasks
					filteredTasks = data.tasks.filter((t) => t.status !== "archived");
				} else if (options.progress) {
					// Only in-progress
					filteredTasks = data.tasks.filter((t) => t.status === "in-progress");
				} else if (options.done) {
					// Only done
					filteredTasks = data.tasks.filter((t) => t.status === "done");
				} else {
					// Default: open and draft
					filteredTasks = data.tasks.filter(
						(t) => t.status === "open" || t.status === "draft",
					);
				}

				console.log(formatTaskTable(filteredTasks, data.tasks));
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
