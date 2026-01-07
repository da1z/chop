import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";
import { createTask } from "../models/task.ts";
import { selectTasks } from "../utils/prompts.ts";
import { formatTaskDetail } from "../utils/display.ts";

// Collect multiple --depends-on values
function collectDependencies(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function registerAddCommand(program: Command): void {
  program
    .command("add <title>")
    .alias("a")
    .description("Add a new task to the queue")
    .option("-t, --top", "Add to top of queue")
    .option("-b, --bottom", "Add to bottom of queue (default)")
    .option("-d, --desc <description>", "Add description")
    .option("--draft", "Create task as draft status")
    .option("--depends-on [id]", "Add dependency (can be repeated)", collectDependencies, [])
    .action(async (title: string, options) => {
      try {
        const store = await TaskStore.create();

        // Handle interactive dependency selection if --depends-on used without value
        let dependsOn: string[] = options.dependsOn;

        // Check if --depends-on was used with no value (will be empty string)
        if (dependsOn.includes("")) {
          // Remove empty strings
          dependsOn = dependsOn.filter((id: string) => id !== "");

          // Show interactive picker
          const tasksData = await store.readTasks();
          const availableTasks = tasksData.tasks
            .filter((t) => t.status !== "archived")
            .map((t) => ({ id: t.id, title: t.title }));

          const selectedIds = await selectTasks("Select tasks to depend on:", availableTasks);
          dependsOn = [...dependsOn, ...selectedIds];
        }

        const newTask = await store.atomicUpdate((data) => {
          const { task, newSequence } = createTask(data.lastSequence, {
            title,
            description: options.desc,
            dependsOn,
            status: options.draft ? "draft" : "open",
          });

          if (options.top) {
            data.tasks.unshift(task);
          } else {
            data.tasks.push(task);
          }

          data.lastSequence = newSequence;

          return { data, result: task };
        });

        console.log(`Added task: ${newTask.id}`);
        console.log(formatTaskDetail(newTask));
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
