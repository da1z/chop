import { homedir } from "os";
import { join } from "path";
import { getGitRepoRoot, getProjectId } from "../utils/git.ts";

// Get the global storage directory (~/.local/share/chop)
export function getGlobalStorageDir(): string {
  return join(homedir(), ".local", "share", "chop");
}

// Get the global config directory (~/.config/chop)
export function getGlobalConfigDir(): string {
  return join(homedir(), ".config", "chop");
}

// Get the local storage directory (.chop in repo root)
export async function getLocalStorageDir(): Promise<string> {
  const repoRoot = await getGitRepoRoot();
  return join(repoRoot, ".chop");
}

// Get the path to the tasks file for a given storage location
export async function getTasksFilePath(
  location: "local" | "global"
): Promise<string> {
  if (location === "local") {
    const localDir = await getLocalStorageDir();
    return join(localDir, "tasks.json");
  }

  const projectId = await getProjectId();
  return join(getGlobalStorageDir(), projectId, "tasks.json");
}

// Get the path to the archived tasks file
export async function getArchivedTasksFilePath(
  location: "local" | "global"
): Promise<string> {
  if (location === "local") {
    const localDir = await getLocalStorageDir();
    return join(localDir, "tasks.archived.json");
  }

  const projectId = await getProjectId();
  return join(getGlobalStorageDir(), projectId, "tasks.archived.json");
}

// Get the lock file path for a given tasks file
export function getLockFilePath(tasksFilePath: string): string {
  return tasksFilePath + ".lock";
}

// Get the local config file path (.chop/config.json)
export async function getLocalConfigPath(): Promise<string> {
  const localDir = await getLocalStorageDir();
  return join(localDir, "config.json");
}

// Get the global config file path (~/.config/chop/config.json)
export function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), "config.json");
}
