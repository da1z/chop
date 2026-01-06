import type { Task } from "../types.ts";
import { isBlocked } from "../models/task.ts";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Status display styles
const statusStyles: Record<string, { text: string; color: string }> = {
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

// Pad a string to a specific width
function pad(str: string, width: number): string {
  const visibleLength = str.replace(/\x1b\[[0-9;]*m/g, "").length;
  const padding = width - visibleLength;
  return str + " ".repeat(Math.max(0, padding));
}

// Format a single task for list display
export function formatTaskRow(task: Task, allTasks: Task[]): string {
  const blocked = task.status === "open" && isBlocked(task, allTasks);
  const blockedMarker = blocked ? `${colors.dim}[blocked]${colors.reset} ` : "";

  const id = pad(task.id, 12);
  const status = pad(formatStatus(task.status), 22); // Extra width for ANSI codes
  const title = blockedMarker + task.title;

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
    lines.push(task.description.split("\n").map((l) => `  ${l}`).join("\n"));
  }

  if (task.dependsOn.length > 0) {
    lines.push(`${colors.cyan}Depends on:${colors.reset} ${task.dependsOn.join(", ")}`);
  }

  if (allTasks && task.status === "open" && isBlocked(task, allTasks)) {
    lines.push(`${colors.yellow}Status: BLOCKED${colors.reset}`);
  }

  return lines.join("\n");
}

// Format success message
export function success(message: string): string {
  return `${colors.green}${message}${colors.reset}`;
}

// Format error message
export function error(message: string): string {
  return message; // Errors go to stderr, keep simple
}
