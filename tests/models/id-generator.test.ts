import { test, expect, describe } from "bun:test";
import { generateTaskId, parseTaskId } from "../../src/models/id-generator.ts";

describe("generateTaskId", () => {
  test("generates ID in correct format", () => {
    const { id, newSequence } = generateTaskId(0);

    // ID should be in format: 7-char-hash-sequence
    expect(id).toMatch(/^[a-f0-9]{7}-\d+$/);
    expect(newSequence).toBe(1);
  });

  test("increments sequence number", () => {
    const { newSequence: seq1 } = generateTaskId(5);
    const { newSequence: seq2 } = generateTaskId(10);

    expect(seq1).toBe(6);
    expect(seq2).toBe(11);
  });

  test("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const { id } = generateTaskId(i);
      ids.add(id);
    }
    expect(ids.size).toBe(100);
  });
});

describe("parseTaskId", () => {
  test("parses valid ID", () => {
    const result = parseTaskId("a1b2c3d-42");
    expect(result).toEqual({
      hash: "a1b2c3d",
      sequence: 42,
    });
  });

  test("returns null for invalid ID", () => {
    expect(parseTaskId("invalid")).toBeNull();
    expect(parseTaskId("abc-1")).toBeNull(); // hash too short
    expect(parseTaskId("a1b2c3d-")).toBeNull(); // missing sequence
    expect(parseTaskId("a1b2c3d-abc")).toBeNull(); // non-numeric sequence
  });
});
