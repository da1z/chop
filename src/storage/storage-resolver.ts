import {
	getArchivedTasksFilePath,
	getLocalStorageDir,
	getTasksFilePath,
} from "../config/paths.ts";
import { NotInitializedError } from "../errors.ts";
import type { StorageLocation } from "../types.ts";

export interface StorageInfo {
	location: StorageLocation;
	tasksPath: string;
	archivedPath: string;
}

// Resolve which storage location to use for the current project
// Resolution order: local (.chop/) first, then global
export async function resolveStorage(): Promise<StorageInfo> {
	// Check for local storage first
	const localTasksPath = await getTasksFilePath("local");
	const localFile = Bun.file(localTasksPath);

	if (await localFile.exists()) {
		return {
			location: "local",
			tasksPath: localTasksPath,
			archivedPath: await getArchivedTasksFilePath("local"),
		};
	}

	// Check for global storage
	const globalTasksPath = await getTasksFilePath("global");
	const globalFile = Bun.file(globalTasksPath);

	if (await globalFile.exists()) {
		return {
			location: "global",
			tasksPath: globalTasksPath,
			archivedPath: await getArchivedTasksFilePath("global"),
		};
	}

	// Neither exists
	throw new NotInitializedError();
}

// Check if the project has been initialized
export async function isInitialized(): Promise<boolean> {
	try {
		await resolveStorage();
		return true;
	} catch {
		return false;
	}
}

// Check if local storage exists (for init command)
export async function hasLocalStorage(): Promise<boolean> {
	const localDir = await getLocalStorageDir();
	const _localDirFile = Bun.file(localDir);
	// Check if the directory exists by checking for tasks.json
	const localTasksPath = await getTasksFilePath("local");
	return await Bun.file(localTasksPath).exists();
}
