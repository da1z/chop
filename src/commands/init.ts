import type { Command } from "commander";
import { AlreadyInitializedError } from "../errors.ts";
import { isInitialized } from "../storage/storage-resolver.ts";
import { TaskStore } from "../storage/task-store.ts";
import type { StorageLocation } from "../types.ts";
import { getGitRepoRoot } from "../utils/git.ts";
import { confirm, select } from "../utils/prompts.ts";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize chop for the current repository")
    .action(async () => {
      try {
        // Check if already initialized
        if (await isInitialized()) {
          throw new AlreadyInitializedError();
        }

        // Prompt for storage location
        const location = await select<StorageLocation>(
          "Where would you like to store tasks?",
          [
            {
              value: "local",
              label: "Local (in .chop/ directory in this repo)",
            },
            { value: "global", label: "Global (~/.local/share/chop/)" },
          ]
        );

        // Initialize storage
        await TaskStore.initialize(location);

        // If local, ask about gitignore
        if (location === "local") {
          const addToGitignore = await confirm(
            "Add .chop/ to .gitignore? (Choose no to share tasks with your team)",
            true
          );

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
