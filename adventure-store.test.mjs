import test from "node:test";
import assert from "node:assert/strict";
import { createRun } from "./game/adventure-model.mjs";
import { createWorld } from "./game/adventure-world.mjs";
import { readSave, writeSave, validSnapshot } from "./game/adventure-store.mjs";
const runtime = () => ({
  p: { x: 0, y: 0, hp: 100 },
  enemies: createWorld(9, "overworld"),
  fx: [],
  cd: [2, 0, 0, 0, 0, 0],
  skillCooldowns: { wind: 2 },
  time: 4,
  kills: 0,
  attackCd: 0.2,
  invulnerable: 0,
  zone: "overworld",
  pet: { x: 0, y: 0, hp: 40, cool: 0 },
  pendingRevive: false,
  savedZones: {},
});
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) || null, setItem: (k, v) => m.set(k, v) };
};
test("world seed repeats but different seeds alter encounters", () => {
  assert.deepEqual(createWorld(9, "overworld"), createWorld(9, "overworld"));
  assert.notDeepEqual(
    createWorld(9, "overworld"),
    createWorld(10, "overworld"),
  );
  assert.equal(createWorld(9, "dungeon").filter((e) => e.boss).length, 1);
});
test("save roundtrip preserves cooldown and enemy status", () => {
  const storage = memory(),
    run = createRun(9, "测试", "female");
  const r = runtime();
  writeSave(run, r, storage);
  const saved = readSave(storage);
  assert.deepEqual(saved.value.run, run);
  assert.deepEqual(saved.value.runtime, r);
  assert.equal(saved.recovered, false);
});
test("backup survives corrupted current snapshot", () => {
  const storage = memory(),
    run = createRun(9, "测试", "male");
  writeSave(run, runtime(), storage);
  run.lives = 2;
  writeSave(run, runtime(), storage);
  storage.setItem("shanhai.adventure.v1", "broken");
  assert.equal(readSave(storage).recovered, true);
  assert.equal(readSave(storage).value.run.lives, 3);
});
test("invalid snapshot cannot replace save", () => {
  const storage = memory(),
    run = createRun(9, "测试", "male");
  writeSave(run, runtime(), storage);
  const r = runtime();
  r.cd[0] = -1;
  assert.throws(() => writeSave(run, r, storage));
  assert.equal(readSave(storage).value.runtime.cd[0], 2);
  assert.equal(validSnapshot(null), false);
});
