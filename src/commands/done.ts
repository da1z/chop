import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import { findTaskById } from "../models/task.ts";
import { TaskNotFoundError } from "../errors.ts";

export function registerDoneCommand(program: Command): void {
  program
    .command("done <id>")
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

          return { data, result: task };
        });

        console.log(`Marked task ${id} as done`);
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
