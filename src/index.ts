import { Command } from "commander";
import { registerAddCommand } from "./commands/add.ts";
import { registerArchiveCommand } from "./commands/archive.ts";
import { registerCompletionCommand } from "./commands/completion.ts";
import { registerDoneCommand } from "./commands/done.ts";
import { registerEditCommand } from "./commands/edit.ts";
import { registerInitCommand } from "./commands/init.ts";
import { registerListCommand } from "./commands/list.ts";
import { registerMoveCommand } from "./commands/move.ts";
import { registerPopCommand } from "./commands/pop.ts";
import { registerPurgeCommand } from "./commands/purge.ts";
import { registerShowCommand } from "./commands/show.ts";
import { registerStatusCommand } from "./commands/status.ts";

const program = new Command();

program
	.name("chop")
	.description("Queue-based task management CLI for developers")
	.version("1.0.0");

// Register all commands
registerInitCommand(program);
registerAddCommand(program);
registerListCommand(program);
registerPopCommand(program);
registerDoneCommand(program);
registerStatusCommand(program);
registerMoveCommand(program);
registerArchiveCommand(program);
registerPurgeCommand(program);
registerEditCommand(program);
registerShowCommand(program);
registerCompletionCommand(program);

// Show help if no command provided
if (process.argv.length === 2) {
	program.help();
}

program.parse();
