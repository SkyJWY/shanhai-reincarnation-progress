import test from "node:test";
import assert from "node:assert/strict";
import { skills, target, hits, distance } from "./game/rules.mjs";
const p = { x: 0, y: 0 },
  aim = { x: 10, y: 0 };
test("aim is clamped to spell range", () =>
  assert.equal(distance(p, target(p, aim, 5)), 5));
test("zero-distance targeting is finite", () =>
  assert.deepEqual(target(p, p, 5), p));
test("line excludes targets behind and outside width", () => {
  assert.ok(hits(skills[0], p, aim, { x: 5, y: 0 }));
  assert.ok(!hits(skills[0], p, aim, { x: -1, y: 0 }));
  assert.ok(!hits(skills[0], p, aim, { x: 5, y: 3 }));
});
test("cone limits angle and distance", () => {
  assert.ok(hits(skills[1], p, aim, { x: 2, y: 0 }));
  assert.ok(!hits(skills[1], p, aim, { x: 0, y: 2 }));
  assert.ok(!hits(skills[1], p, aim, { x: 7, y: 0 }));
});
test("circle uses clamped landing point", () => {
  assert.ok(hits(skills[2], p, { x: 30, y: 0 }, { x: 10, y: 0 }));
  assert.ok(!hits(skills[2], p, { x: 30, y: 0 }, { x: 30, y: 0 }));
});
test("six independent keys and positive cooldowns", () => {
  assert.deepEqual(
    skills.map((s) => s.key),
    ["1", "2", "3", "4", "f", "g"],
  );
  assert.ok(skills.every((s) => s.cd > 0));
});
