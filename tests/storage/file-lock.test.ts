import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LockError } from "../../src/errors.ts";
import { withLock } from "../../src/storage/file-lock.ts";

describe("withLock", () => {
	const testLockPath = join(tmpdir(), `chop-test-${Date.now()}.lock`);

	afterEach(() => {
		// Clean up any leftover lock files
		try {
			if (existsSync(testLockPath)) {
				unlinkSync(testLockPath);
			}
		} catch {
			// Ignore cleanup errors
		}
	});

	test("acquires and releases lock", async () => {
		let executed = false;

		await withLock(testLockPath, async () => {
			executed = true;
			// Lock file should exist during operation
			expect(existsSync(testLockPath)).toBe(true);
		});

		expect(executed).toBe(true);
		// Lock file should be released after operation
		expect(existsSync(testLockPath)).toBe(false);
	});

	test("releases lock on error", async () => {
		const testError = new Error("Test error");

		try {
			await withLock(testLockPath, async () => {
				throw testError;
			});
		} catch (error) {
			expect(error).toBe(testError);
		}

		// Lock should still be released
		expect(existsSync(testLockPath)).toBe(false);
	});

	test("returns operation result", async () => {
		const result = await withLock(testLockPath, async () => {
			return { value: 42 };
		});

		expect(result).toEqual({ value: 42 });
	});

	test("handles concurrent lock attempts", async () => {
		const results: number[] = [];

		// Start first lock operation
		const op1 = withLock(testLockPath, async () => {
			results.push(1);
			await Bun.sleep(50);
			results.push(2);
			return "op1";
		});

		// Wait a bit then start second operation
		await Bun.sleep(10);
		const op2 = withLock(testLockPath, async () => {
			results.push(3);
			return "op2";
		});

		// Both should complete
		const [r1, r2] = await Promise.all([op1, op2]);

		expect(r1).toBe("op1");
		expect(r2).toBe("op2");

		// Operations should be serialized
		// op1 should start first, complete, then op2 runs
		expect(results[0]).toBe(1);
		expect(results[1]).toBe(2);
		expect(results[2]).toBe(3);
	});

	test("removes stale lock and acquires new lock", async () => {
		// Create a stale lock file (timestamp from 2 minutes ago)
		const staleLockInfo = {
			pid: 99999,
			timestamp: Date.now() - 120_000, // 2 minutes ago
		};
		writeFileSync(testLockPath, JSON.stringify(staleLockInfo));

		let executed = false;

		// Should detect stale lock, remove it, and acquire
		await withLock(testLockPath, async () => {
			executed = true;
			expect(existsSync(testLockPath)).toBe(true);
		});

		expect(executed).toBe(true);
		expect(existsSync(testLockPath)).toBe(false);
	});

	test("handles invalid lock file content as stale", async () => {
		// Create a lock file with invalid JSON
		writeFileSync(testLockPath, "invalid json content");

		let executed = false;

		// Should treat unparseable lock as stale and acquire
		await withLock(testLockPath, async () => {
			executed = true;
		});

		expect(executed).toBe(true);
	});

	test("throws LockError when lock cannot be acquired after retries", async () => {
		// Create a fresh (non-stale) lock file that won't be removed
		const freshLockInfo = {
			pid: process.pid,
			timestamp: Date.now(),
		};
		writeFileSync(testLockPath, JSON.stringify(freshLockInfo));

		// Mock by making the lock file appear fresh every time by keeping it updated
		const intervalId = setInterval(() => {
			try {
				writeFileSync(
					testLockPath,
					JSON.stringify({
						pid: process.pid,
						timestamp: Date.now(),
					}),
				);
			} catch {
				// Lock might be removed, ignore
			}
		}, 50);

		try {
			await expect(
				withLock(testLockPath, async () => {
					return "should not execute";
				}),
			).rejects.toThrow(LockError);
		} finally {
			clearInterval(intervalId);
		}
	});
});
