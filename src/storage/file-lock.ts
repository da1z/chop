import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { LockError } from "../errors.ts";

// Retry delays in milliseconds (exponential backoff)
const RETRY_DELAYS = [100, 200, 400, 800, 1600];

// Stale lock threshold (60 seconds)
const STALE_LOCK_MS = 60_000;

interface LockInfo {
  pid: number;
  timestamp: number;
}

// Sleep for a given number of milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if a lock file is stale
function isLockStale(lockPath: string): boolean {
  try {
    const content = readFileSync(lockPath, "utf-8");
    const lockInfo: LockInfo = JSON.parse(content);
    const age = Date.now() - lockInfo.timestamp;
    return age > STALE_LOCK_MS;
  } catch {
    // If we can't read the lock file, assume it's stale
    return true;
  }
}

// Try to acquire a lock file
function tryAcquireLock(lockPath: string): boolean {
  try {
    // O_CREAT | O_EXCL | O_WRONLY - create exclusively, fail if exists
    const fd = openSync(lockPath, "wx");
    const lockInfo: LockInfo = {
      pid: process.pid,
      timestamp: Date.now(),
    };
    // Write to fd before closing to avoid race condition where lock file
    // exists but is empty
    writeSync(fd, JSON.stringify(lockInfo));
    closeSync(fd);
    return true;
  } catch (error: unknown) {
    // File already exists (another process has the lock)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      return false;
    }
    // Some other error - rethrow
    throw error;
  }
}

// Release a lock file
function releaseLock(lockPath: string): void {
  try {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  } catch {
    // Ignore errors when releasing - the lock might already be gone
  }
}

// Acquire a lock with retries
async function acquireLock(lockPath: string): Promise<void> {
  // First attempt
  if (tryAcquireLock(lockPath)) {
    return;
  }

  // Check if existing lock is stale and remove it
  if (isLockStale(lockPath)) {
    releaseLock(lockPath);
    if (tryAcquireLock(lockPath)) {
      return;
    }
  }

  // Retry with exponential backoff
  for (const delay of RETRY_DELAYS) {
    await sleep(delay);

    // Check for stale lock again
    if (isLockStale(lockPath)) {
      releaseLock(lockPath);
    }

    if (tryAcquireLock(lockPath)) {
      return;
    }
  }

  // Failed to acquire lock after all retries
  throw new LockError();
}

// Execute an operation with a file lock
export async function withLock<T>(
  lockPath: string,
  operation: () => Promise<T>
): Promise<T> {
  await acquireLock(lockPath);
  try {
    return await operation();
  } finally {
    releaseLock(lockPath);
  }
}
