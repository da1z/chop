import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { withLock } from "../../src/storage/file-lock.ts";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync, unlinkSync } from "node:fs";

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
});
