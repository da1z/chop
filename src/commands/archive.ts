import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import { findTaskById, findAllDependents } from "../models/task.ts";
import { TaskNotFoundError } from "../errors.ts";
import { confirm } from "../utils/prompts.ts";

export function registerArchiveCommand(program: Command): void {
  program
    .command("archive <id>")
    .description("Archive a task")
    .action(async (id: string) => {
      try {
        const store = await TaskStore.create();
        const data = await store.readTasks();

        // Find the task
        const task = findTaskById(id, data.tasks);
        if (!task) {
          throw new TaskNotFoundError(id);
        }

        // Find all dependents (tasks that depend on this one)
        const dependents = findAllDependents(task.id, data.tasks);
        const unarchivedDependents = dependents.filter((t) => t.status !== "archived");

        if (unarchivedDependents.length > 0) {
          // Show warning about dependents
          console.log(`Warning: The following tasks depend on ${task.id}:`);
          for (const dep of unarchivedDependents) {
            console.log(`  - ${dep.id}: ${dep.title}`);
          }

          const confirmed = await confirm(
            "Archive this task and all its dependents?",
            false
          );

          if (!confirmed) {
            console.log("Archive cancelled.");
            return;
          }

          // Archive all tasks (main task + all dependents)
          const tasksToArchive = [task, ...unarchivedDependents];
          for (const t of tasksToArchive) {
            await store.archiveTask(t.id);
          }

          console.log(`Archived ${tasksToArchive.length} task(s)`);
        } else {
          // Confirm archiving single task
          const confirmed = await confirm(`Archive task ${task.id}?`, true);

          if (!confirmed) {
            console.log("Archive cancelled.");
            return;
          }

          await store.archiveTask(task.id);
          console.log(`Archived task ${task.id}`);
        }
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
