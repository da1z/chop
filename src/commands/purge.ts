import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import { confirm } from "../utils/prompts.ts";

interface PurgeOptions {
	yes?: boolean;
}

export function registerPurgeCommand(program: Command): void {
	program
		.command("purge")
		.description("Permanently delete all archived tasks")
		.option("-y, --yes", "Skip confirmation prompt")
		.action(async (options: PurgeOptions) => {
			try {
				const store = await TaskStore.create();
				const archivedData = await store.readArchivedTasks();

				if (archivedData.tasks.length === 0) {
					console.log("No archived tasks to purge.");
					return;
				}

				console.log(`Found ${archivedData.tasks.length} archived task(s).`);

				let confirmed: boolean;
				if (options.yes) {
					confirmed = true;
				} else {
					confirmed = await confirm(
						"Permanently delete all archived tasks? This cannot be undone.",
						false,
					);
				}

				if (!confirmed) {
					console.log("Purge cancelled.");
					return;
				}

				const count = await store.purgeArchived();
				console.log(`Purged ${count} archived task(s).`);
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
