import { isBlocked } from "../models/task.ts";
import type { Task } from "../types.ts";

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

// Status display styles
const statusStyles: Record<string, { text: string; color: string }> = {
	draft: { text: "draft", color: colors.cyan },
	open: { text: "open", color: colors.blue },
	"in-progress": { text: "in-progress", color: colors.yellow },
	done: { text: "done", color: colors.green },
	archived: { text: "archived", color: colors.dim },
};

// Format a task status for display
function formatStatus(status: string): string {
	const style = statusStyles[status] || { text: status, color: colors.reset };
	return `${style.color}${style.text}${colors.reset}`;
}

// ANSI escape sequence pattern for stripping color codes
// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for matching ANSI escape sequences
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

// Get visible length of a string (excluding ANSI codes)
function visibleLength(str: string): number {
	return str.replace(ANSI_PATTERN, "").length;
}

// Pad a string to a specific width
function pad(str: string, width: number): string {
	const len = visibleLength(str);
	const padding = width - len;
	return str + " ".repeat(Math.max(0, padding));
}

// Truncate a string to a max visible length, accounting for ANSI codes
function truncate(str: string, maxLength: number): string {
	if (maxLength <= 0) return "";
	if (visibleLength(str) <= maxLength) return str;

	// Simple truncation: iterate through and count visible chars
	let result = "";
	let visible = 0;
	let i = 0;

	while (i < str.length && visible < maxLength - 1) {
		// Check for ANSI escape sequence
		if (str[i] === "\x1b" && str[i + 1] === "[") {
			const end = str.indexOf("m", i);
			if (end !== -1) {
				result += str.slice(i, end + 1);
				i = end + 1;
				continue;
			}
		}
		result += str[i];
		visible++;
		i++;
	}

	return `${result}\u2026`; // ellipsis character
}

// Get terminal width or default
function getTerminalWidth(): number {
	return process.stdout.columns || 80;
}

// Format a single task for list display
export function formatTaskRow(task: Task, allTasks: Task[]): string {
	const blocked = task.status === "open" && isBlocked(task, allTasks);
	const blockedMarker = blocked ? `${colors.dim}[blocked]${colors.reset} ` : "";

	const id = pad(task.id, 12);
	const status = pad(formatStatus(task.status), 22); // Extra width for ANSI codes

	// Calculate available width for title: terminal width - id (12) - status (12) - spaces (2)
	const termWidth = getTerminalWidth();
	const titleMaxWidth = termWidth - 12 - 12 - 2;

	const blockedMarkerLen = visibleLength(blockedMarker);
	const titleWidth = titleMaxWidth - blockedMarkerLen;
	const truncatedTitle = truncate(task.title, titleWidth);
	const title = blockedMarker + truncatedTitle;

	return `${id} ${status} ${title}`;
}

// Format task list as a table
export function formatTaskTable(tasks: Task[], allTasks: Task[]): string {
	if (tasks.length === 0) {
		return "No tasks found.";
	}

	const header = `${pad("ID", 12)} ${pad("STATUS", 12)} TITLE`;
	const separator = "-".repeat(60);
	const rows = tasks.map((task) => formatTaskRow(task, allTasks));

	return [header, separator, ...rows].join("\n");
}

// Format a single task for detailed display (after pop, add, etc.)
export function formatTaskDetail(task: Task, allTasks?: Task[]): string {
	const lines = [
		`${colors.cyan}ID:${colors.reset} ${task.id}`,
		`${colors.cyan}Title:${colors.reset} ${task.title}`,
		`${colors.cyan}Status:${colors.reset} ${formatStatus(task.status)}`,
	];

	if (task.description) {
		lines.push(`${colors.cyan}Description:${colors.reset}`);
		lines.push(
			task.description
				.split("\n")
				.map((l) => `  ${l}`)
				.join("\n"),
		);
	}

	if (task.dependsOn.length > 0) {
		lines.push(
			`${colors.cyan}Depends on:${colors.reset} ${task.dependsOn.join(", ")}`,
		);
	}

	if (allTasks && task.status === "open" && isBlocked(task, allTasks)) {
		lines.push(`${colors.yellow}⚠ Blocked by dependencies${colors.reset}`);
	}

	return lines.join("\n");
}

// Format success message
export function success(message: string): string {
	return `${colors.green}✓${colors.reset} ${message}`;
}

// Format warning message
export function warning(message: string): string {
	return `${colors.yellow}⚠${colors.reset} ${message}`;
}

// Format info message
export function info(message: string): string {
	return `${colors.cyan}ℹ${colors.reset} ${message}`;
}

// Format error message
export function error(message: string): string {
	return `${colors.red}✗${colors.reset} ${message}`;
}
