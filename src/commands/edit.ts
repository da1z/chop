import type { Command } from "commander";
import { tmpdir } from "os";
import { join } from "path";
import { unlinkSync } from "node:fs";
import { TaskStore } from "../storage/task-store.ts";
import { findTaskById, isValidStatus, detectCircularDependency } from "../models/task.ts";
import { TaskNotFoundError, ChopError, InvalidStatusError, CircularDependencyError } from "../errors.ts";
import type { Task, TaskStatus, TaskEditData } from "../types.ts";

// Convert a task to YAML-like format for editing
function taskToYaml(task: Task): string {
  const lines: string[] = [];

  lines.push(`title: ${task.title}`);

  if (task.description) {
    lines.push("description: |");
    for (const line of task.description.split("\n")) {
      lines.push(`  ${line}`);
    }
  } else {
    lines.push("description:");
  }

  lines.push(`status: ${task.status}`);

  if (task.dependsOn.length > 0) {
    lines.push("depends_on:");
    for (const dep of task.dependsOn) {
      lines.push(`  - ${dep}`);
    }
  } else {
    lines.push("depends_on:");
  }

  return lines.join("\n") + "\n";
}

// Parse YAML-like format back to task edit data
function yamlToTaskEdit(content: string): TaskEditData {
  const lines = content.split("\n");
  const result: TaskEditData = {
    title: "",
    status: "open",
    depends_on: [],
  };

  let inDescription = false;
  let descriptionLines: string[] = [];
  let inDependsOn = false;

  for (const line of lines) {
    // Check for field starts
    if (line.startsWith("title:")) {
      inDescription = false;
      inDependsOn = false;
      result.title = line.slice("title:".length).trim();
    } else if (line.startsWith("description:")) {
      inDescription = true;
      inDependsOn = false;
      descriptionLines = [];
      const inline = line.slice("description:".length).trim();
      if (inline && inline !== "|") {
        descriptionLines.push(inline);
        inDescription = false;
      }
    } else if (line.startsWith("status:")) {
      inDescription = false;
      inDependsOn = false;
      result.status = line.slice("status:".length).trim() as TaskStatus;
    } else if (line.startsWith("depends_on:")) {
      inDescription = false;
      inDependsOn = true;
      result.depends_on = [];
    } else if (inDescription && (line.startsWith("  ") || line === "")) {
      // Description continuation (indented lines)
      if (line.startsWith("  ")) {
        descriptionLines.push(line.slice(2));
      } else if (line === "" && descriptionLines.length > 0) {
        descriptionLines.push("");
      }
    } else if (inDependsOn && line.startsWith("  - ")) {
      // Depends on list item
      result.depends_on.push(line.slice(4).trim());
    } else if (line.trim() && !line.startsWith(" ")) {
      // New field - end description
      inDescription = false;
      inDependsOn = false;
    }
  }

  // Set description if we collected any lines
  if (descriptionLines.length > 0) {
    // Trim trailing empty lines
    while (descriptionLines.length > 0 && descriptionLines[descriptionLines.length - 1] === "") {
      descriptionLines.pop();
    }
    result.description = descriptionLines.join("\n");
  }

  return result;
}

interface EditOptions {
  title?: string;
  desc?: string;
}

export function registerEditCommand(program: Command): void {
  program
    .command("edit <id>")
    .alias("e")
    .description("Edit a task in your default editor")
    .option("-t, --title <title>", "Set task title directly")
    .option("-d, --desc <description>", "Set task description directly")
    .action(async (id: string, options: EditOptions) => {
      try {
        const store = await TaskStore.create();

        // Inline edit mode: if --title or --desc provided, update directly
        if (options.title !== undefined || options.desc !== undefined) {
          // Validate title is not empty if provided
          if (options.title !== undefined && options.title.trim() === "") {
            throw new ChopError("Title cannot be empty");
          }

          const updatedTask = await store.atomicUpdate((data) => {
            const task = findTaskById(id, data.tasks);
            if (!task) {
              throw new TaskNotFoundError(id);
            }

            if (options.title !== undefined) {
              task.title = options.title.trim();
            }
            if (options.desc !== undefined) {
              task.description = options.desc.trim() || undefined;
            }
            task.updatedAt = new Date().toISOString();

            return { data, result: task };
          });

          console.log(`Updated task ${updatedTask.id}`);
          return;
        }

        // Editor mode: open task in external editor
        const data = await store.readTasks();

        // Find the task
        const task = findTaskById(id, data.tasks);
        if (!task) {
          throw new TaskNotFoundError(id);
        }

        // Create temp file with YAML content
        const tempPath = join(tmpdir(), `chop-edit-${task.id}.yaml`);
        const originalContent = taskToYaml(task);
        await Bun.write(tempPath, originalContent);

        // Get editor from environment and parse into command + args
        const editorEnv = process.env.EDITOR || process.env.VISUAL || "vi";
        const editorParts = editorEnv.split(/\s+/).filter(Boolean);
        const editorCmd = editorParts[0] || "vi";
        const editorArgs = [...editorParts.slice(1), tempPath];

        // Open editor
        const proc = Bun.spawn([editorCmd, ...editorArgs], {
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });
        await proc.exited;

        // Read edited content
        const editedContent = await Bun.file(tempPath).text();

        // Check if content was changed
        if (editedContent.trim() === "" || editedContent === originalContent) {
          console.log("No changes made. Edit cancelled.");
          // Clean up temp file
          unlinkSync(tempPath);
          return;
        }

        // Parse edited content
        const editData = yamlToTaskEdit(editedContent);

        // Validate
        if (!editData.title) {
          throw new ChopError("Title cannot be empty");
        }

        if (!isValidStatus(editData.status)) {
          throw new InvalidStatusError(editData.status);
        }

        // Apply changes
        await store.atomicUpdate((data) => {
          const task = findTaskById(id, data.tasks);
          if (!task) {
            throw new TaskNotFoundError(id);
          }

          // Check for circular dependencies before updating
          const cyclePath = detectCircularDependency(task.id, editData.depends_on, data.tasks);
          if (cyclePath) {
            throw new CircularDependencyError(cyclePath);
          }

          task.title = editData.title;
          task.description = editData.description;
          task.status = editData.status;
          task.dependsOn = editData.depends_on;
          task.updatedAt = new Date().toISOString();

          return { data, result: task };
        });

        console.log(`Updated task ${task.id}`);

        // Clean up temp file
        unlinkSync(tempPath);
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
