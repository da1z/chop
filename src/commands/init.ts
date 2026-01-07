import type { Command } from "commander";
import { AlreadyInitializedError, ChopError } from "../errors.ts";
import { isInitialized } from "../storage/storage-resolver.ts";
import { TaskStore } from "../storage/task-store.ts";
import type { StorageLocation } from "../types.ts";
import { getGitRepoRoot } from "../utils/git.ts";
import { confirm, select } from "../utils/prompts.ts";

interface InitOptions {
  local?: boolean;
  global?: boolean;
  gitignore?: boolean;
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize chop for the current repository")
    .option("-l, --local", "Use local storage (.chop/ directory)")
    .option("-g, --global", "Use global storage (~/.local/share/chop/)")
    .option("--gitignore", "Add .chop/ to .gitignore (local storage only)")
    .option("--no-gitignore", "Do not add .chop/ to .gitignore")
    .action(async (options: InitOptions) => {
      try {
        // Check if already initialized
        if (await isInitialized()) {
          throw new AlreadyInitializedError();
        }

        // Validate conflicting options
        if (options.local && options.global) {
          throw new ChopError("Cannot use both --local and --global");
        }

        // Warn if gitignore flags are used with global storage
        if (options.global && options.gitignore !== undefined) {
          console.log(
            "Note: --gitignore/--no-gitignore has no effect with global storage"
          );
        }

        // Determine storage location
        let location: StorageLocation;
        if (options.local) {
          location = "local";
        } else if (options.global) {
          location = "global";
        } else {
          // Prompt for storage location (will error if not interactive)
          location = await select<StorageLocation>(
            "Where would you like to store tasks?",
            [
              {
                value: "local",
                label: "Local (in .chop/ directory in this repo)",
              },
              { value: "global", label: "Global (~/.local/share/chop/)" },
            ]
          );
        }

        // Initialize storage
        await TaskStore.initialize(location);

        // If local, handle gitignore
        if (location === "local") {
          let addToGitignore: boolean;
          if (options.gitignore !== undefined) {
            // Explicit flag provided
            addToGitignore = options.gitignore;
          } else {
            // Prompt (will error if not interactive)
            addToGitignore = await confirm(
              "Add .chop/ to .gitignore? (Choose no to share tasks with your team)",
              true
            );
          }

          if (addToGitignore) {
            const repoRoot = await getGitRepoRoot();
            const gitignorePath = `${repoRoot}/.gitignore`;
            const gitignoreFile = Bun.file(gitignorePath);

            let content = "";
            if (await gitignoreFile.exists()) {
              content = await gitignoreFile.text();
            }

            // Check if .chop is already in gitignore
            if (!content.includes(".chop")) {
              const newContent =
                content + (content.endsWith("\n") ? "" : "\n") + ".chop/\n";
              await Bun.write(gitignorePath, newContent);
              console.log("Added .chop/ to .gitignore");
            }
          }
        }

        console.log(`Initialized chop with ${location} storage.`);
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
