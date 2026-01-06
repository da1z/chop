// Core task status
export type TaskStatus = "open" | "in-progress" | "done" | "archived";

// Task model
export interface Task {
  id: string; // format: "a1b2c3d-1"
  title: string;
  description?: string;
  status: TaskStatus;
  dependsOn: string[]; // task IDs
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Tasks file format (tasks.json)
export interface TasksFile {
  version: 1;
  lastSequence: number;
  tasks: Task[];
}

// Storage location type
export type StorageLocation = "local" | "global";

// Project-specific config
export interface ProjectConfig {
  storage: StorageLocation;
}

// Global config file format
export interface Config {
  defaultStorage: StorageLocation;
  projects: Record<string, ProjectConfig>;
}

// Edit format for YAML editing
export interface TaskEditData {
  title: string;
  description?: string;
  status: TaskStatus;
  depends_on: string[];
}
