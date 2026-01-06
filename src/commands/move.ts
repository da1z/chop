import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import { findTaskById } from "../models/task.ts";
import { TaskNotFoundError, ChopError } from "../errors.ts";

export function registerMoveCommand(program: Command): void {
  program
    .command("move <id>")
    .description("Move a task in the queue")
    .option("-t, --top", "Move to top of queue")
    .option("-b, --bottom", "Move to bottom of queue")
    .action(async (id: string, options) => {
      try {
        if (!options.top && !options.bottom) {
          throw new ChopError("Must specify --top or --bottom");
        }

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
          if (options.top) {
            data.tasks.unshift(task);
          } else {
            data.tasks.push(task);
          }

          return { data, result: task };
        });

        const position = options.top ? "top" : "bottom";
        console.log(`Moved task ${id} to ${position}`);
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
