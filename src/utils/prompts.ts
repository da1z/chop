import prompts from "prompts";
import { NonInteractiveError } from "../errors.ts";

// Check if running in an interactive terminal
export function isInteractive(): boolean {
	return Boolean(process.stdin.isTTY);
}

// Helper to ensure we're in interactive mode before prompting
function requireInteractive(action: string): void {
	if (!isInteractive()) {
		throw new NonInteractiveError(
			`Cannot ${action} in non-interactive mode. Use command-line flags instead.`,
		);
	}
}

// Prompt for a yes/no confirmation
export async function confirm(
	message: string,
	defaultYes = false,
): Promise<boolean> {
	requireInteractive("prompt for confirmation");
	const response = await prompts({
		type: "confirm",
		name: "value",
		message,
		initial: defaultYes,
	});

	// Handle cancellation (Ctrl+C)
	if (response.value === undefined) {
		process.exit(0);
	}

	return response.value;
}

// Prompt for text input
export async function prompt(
	message: string,
	defaultValue?: string,
): Promise<string> {
	requireInteractive("prompt for input");
	const response = await prompts({
		type: "text",
		name: "value",
		message,
		initial: defaultValue,
	});

	// Handle cancellation (Ctrl+C)
	if (response.value === undefined) {
		process.exit(0);
	}

	return response.value;
}

// Prompt for a selection from a list of options
export async function select<T extends string>(
	message: string,
	options: { value: T; label: string }[],
): Promise<T> {
	requireInteractive("select from options");
	const response = await prompts({
		type: "select",
		name: "value",
		message,
		choices: options.map((opt) => ({
			title: opt.label,
			value: opt.value,
		})),
	});

	// Handle cancellation (Ctrl+C)
	if (response.value === undefined) {
		process.exit(0);
	}

	return response.value;
}

// Prompt for selecting multiple tasks (for --depends-on without ID)
export async function selectTasks(
	message: string,
	tasks: { id: string; title: string }[],
): Promise<string[]> {
	requireInteractive("select tasks");

	if (tasks.length === 0) {
		console.log("No tasks available to select.");
		return [];
	}

	const response = await prompts({
		type: "multiselect",
		name: "value",
		message,
		choices: tasks.map((task) => ({
			title: `${task.id} - ${task.title}`,
			value: task.id,
		})),
		hint: "- Space to select. Return to submit",
		instructions: false,
	});

	// Handle cancellation (Ctrl+C)
	if (response.value === undefined) {
		process.exit(0);
	}

	return response.value;
}
