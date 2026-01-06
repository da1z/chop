import { mkdir } from "node:fs/promises";
import { dirname } from "path";
import type { Task, TasksFile, StorageLocation } from "../types.ts";
import { withLock } from "./file-lock.ts";
import { resolveStorage, type StorageInfo } from "./storage-resolver.ts";
import { getLockFilePath, getTasksFilePath, getArchivedTasksFilePath } from "../config/paths.ts";

// Create an empty tasks file structure
function createEmptyTasksFile(): TasksFile {
  return {
    version: 1,
    lastSequence: 0,
    tasks: [],
  };
}

// Task store class for managing tasks with file locking
export class TaskStore {
  private storageInfo: StorageInfo;

  private constructor(storageInfo: StorageInfo) {
    this.storageInfo = storageInfo;
  }

  // Create a TaskStore instance by resolving storage location
  static async create(): Promise<TaskStore> {
    const storageInfo = await resolveStorage();
    return new TaskStore(storageInfo);
  }

  // Create a TaskStore for a specific location (used by init)
  static async createForLocation(location: StorageLocation): Promise<TaskStore> {
    const tasksPath = await getTasksFilePath(location);
    const archivedPath = await getArchivedTasksFilePath(location);
    return new TaskStore({ location, tasksPath, archivedPath });
  }

  // Get the lock file path
  private get lockPath(): string {
    return getLockFilePath(this.storageInfo.tasksPath);
  }

  // Read tasks file (with lock)
  async readTasks(): Promise<TasksFile> {
    return withLock(this.lockPath, async () => {
      const file = Bun.file(this.storageInfo.tasksPath);
      if (!(await file.exists())) {
        return createEmptyTasksFile();
      }
      const content = await file.text();
      return JSON.parse(content) as TasksFile;
    });
  }

  // Write tasks file (with lock) - internal use only
  private async writeTasks(data: TasksFile): Promise<void> {
    await Bun.write(this.storageInfo.tasksPath, JSON.stringify(data, null, 2));
  }

  // Atomic read-modify-write operation
  async atomicUpdate<T>(
    operation: (data: TasksFile) => { data: TasksFile; result: T }
  ): Promise<T> {
    return withLock(this.lockPath, async () => {
      const file = Bun.file(this.storageInfo.tasksPath);
      let data: TasksFile;

      if (await file.exists()) {
        const content = await file.text();
        data = JSON.parse(content) as TasksFile;
      } else {
        data = createEmptyTasksFile();
      }

      const { data: newData, result } = operation(data);
      await this.writeTasks(newData);
      return result;
    });
  }

  // Read archived tasks
  async readArchivedTasks(): Promise<TasksFile> {
    return withLock(this.lockPath, async () => {
      const file = Bun.file(this.storageInfo.archivedPath);
      if (!(await file.exists())) {
        return createEmptyTasksFile();
      }
      const content = await file.text();
      return JSON.parse(content) as TasksFile;
    });
  }

  // Write archived tasks
  private async writeArchivedTasks(data: TasksFile): Promise<void> {
    await Bun.write(this.storageInfo.archivedPath, JSON.stringify(data, null, 2));
  }

  // Archive a task (move from tasks to archived)
  async archiveTask(taskId: string): Promise<Task> {
    return withLock(this.lockPath, async () => {
      // Read both files
      const tasksFile = Bun.file(this.storageInfo.tasksPath);
      const tasksContent = await tasksFile.text();
      const tasksData: TasksFile = JSON.parse(tasksContent);

      const archivedFile = Bun.file(this.storageInfo.archivedPath);
      let archivedData: TasksFile;
      if (await archivedFile.exists()) {
        const archivedContent = await archivedFile.text();
        archivedData = JSON.parse(archivedContent);
      } else {
        archivedData = createEmptyTasksFile();
      }

      // Find and remove the task from active tasks
      const taskIndex = tasksData.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found`);
      }

      const task = tasksData.tasks.splice(taskIndex, 1)[0]!;
      task.status = "archived";
      task.updatedAt = new Date().toISOString();

      // Add to archived
      archivedData.tasks.push(task);

      // Write both files
      await this.writeTasks(tasksData);
      await this.writeArchivedTasks(archivedData);

      return task;
    });
  }

  // Purge all archived tasks
  async purgeArchived(): Promise<number> {
    return withLock(this.lockPath, async () => {
      const archivedFile = Bun.file(this.storageInfo.archivedPath);
      if (!(await archivedFile.exists())) {
        return 0;
      }

      const content = await archivedFile.text();
      const data: TasksFile = JSON.parse(content);
      const count = data.tasks.length;

      // Clear archived tasks
      data.tasks = [];
      await this.writeArchivedTasks(data);

      return count;
    });
  }

  // Initialize storage (create directory and empty tasks file)
  static async initialize(location: StorageLocation): Promise<void> {
    const tasksPath = await getTasksFilePath(location);
    const dir = dirname(tasksPath);

    // Create directory if it doesn't exist
    await mkdir(dir, { recursive: true });

    // Create empty tasks file
    const emptyTasks = createEmptyTasksFile();
    await Bun.write(tasksPath, JSON.stringify(emptyTasks, null, 2));
  }

  // Get storage info
  getStorageInfo(): StorageInfo {
    return this.storageInfo;
  }
}
