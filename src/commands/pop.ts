import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import { getNextAvailableTask } from "../models/task.ts";
import { formatTaskDetail } from "../utils/display.ts";

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

          return { data, result: task };
        });

        if (!result) {
          console.log("No tasks available");
          return;
        }

        const tasksData = await store.readTasks();
        console.log(formatTaskDetail(result, tasksData.tasks));
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
