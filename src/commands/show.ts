import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import { findTaskById } from "../models/task.ts";
import { formatTaskDetail } from "../utils/display.ts";
import { TaskNotFoundError } from "../errors.ts";

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
