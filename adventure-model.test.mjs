import test from "node:test";
import assert from "node:assert/strict";
import { skills } from "./game/rules.mjs";
import {
  ACTIVE_BOOK,
  PASSIVE_BOOK,
  createRun,
  getStats,
  getAvailable,
  equip,
  configure,
  grantLoot,
  recordKill,
  resolveDeath,
  isValidRun,
} from "./game/adventure-model.mjs";
const fresh = (seed = 42) => createRun(seed, "行者", "female");
const clone = (value) => JSON.parse(JSON.stringify(value));
function end(run) {
  while (resolveDeath(run) !== "ended") {}
  return run;
}

test("books preserve existing combat geometry; fresh run is JSON safe", () => {
  assert.equal(ACTIVE_BOOK.length, 6);
  assert.equal(PASSIVE_BOOK.length, 3);
  for (let i = 0; i < 4; i++)
    for (const key of [
      "name",
      "type",
      "range",
      "radius",
      "damage",
      "cd",
      "color",
    ])
      assert.equal(ACTIVE_BOOK[i][key], skills[i][key]);
  const run = fresh();
  assert.deepEqual(run.active, ["wind", "sweep", "thunder", "step"]);
  assert.deepEqual(getAvailable(run), {
    active: run.active,
    passive: ["vital"],
  });
  assert.deepEqual(getStats(run), { maxHp: 120, attack: 18, armor: 0 });
  assert.deepEqual(clone(run), run);
  assert.equal(isValidRun(clone(run)), true);
  assert.equal(createRun(0).gender, "male");
  assert.throws(() => createRun(NaN));
  assert.throws(() => createRun(1, "", "female"));
  assert.throws(() => createRun(1, "行者", "unknown"));
});

test("three lamps revive, fourth death ends; no automatic reincarnation", () => {
  const run = fresh();
  for (const remaining of [2, 1, 0]) {
    assert.equal(resolveDeath(run), "revive");
    assert.equal(run.lives, remaining);
    assert.equal(run.ended, false);
    assert.equal(run.reincarnations, 0);
    assert.equal(isValidRun(run), true);
  }
  assert.equal(resolveDeath(run), "ended");
  const snapshot = clone(run);
  assert.equal(resolveDeath(run), "ended");
  assert.equal(recordKill(run, true), null);
  assert.equal(grantLoot(run), null);
  assert.equal(configure(run, "active", []), false);
  assert.equal(equip(run, run.equipment.weapon), false);
  assert.deepEqual(run, snapshot);
});

test("third kill grants exactly one revival item; lamps are consumed first", () => {
  const run = fresh();
  run.pet.bonded = true;
  for (let i = 0; i < 8; i++) assert.ok(recordKill(run, i === 7));
  assert.equal(run.kills, 8);
  assert.equal(run.pet.affinity, 8);
  assert.equal(run.bossDefeated, true);
  assert.equal(run.questRewarded, true);
  assert.equal(run.reviveItems, 1);
  for (let i = 0; i < 3; i++) assert.equal(resolveDeath(run), "revive");
  assert.equal(run.reviveItems, 1);
  assert.equal(resolveDeath(run), "revive");
  assert.equal(run.reviveItems, 0);
  recordKill(run);
  assert.equal(run.reviveItems, 0);
  assert.equal(resolveDeath(run), "ended");
  assert.equal(isValidRun(run), true);
});

test("equipment swap removes unavailable skills and does not auto-fill slots", () => {
  const run = fresh();
  let gear;
  while (!gear || gear.slot !== "weapon") gear = grantLoot(run);
  gear.skills = ["frost"];
  assert.equal(equip(run, gear.id), true);
  assert.deepEqual(run.active, ["thunder", "step"]);
  assert.deepEqual(getAvailable(run).active, ["thunder", "step", "frost"]);
  assert.equal(configure(run, "active", ["wind"]), false);
  assert.equal(configure(run, "active", ["frost"]), true);
  assert.equal(equip(run, "missing"), false);
  assert.equal(isValidRun(run), true);
});

test("configuration enforces kinds, uniqueness, equipped availability and slot caps", () => {
  const run = fresh();
  run.inventory[0].skills = ["wind", "sweep", "frost"];
  run.inventory[1].skills = ["vital", "edge", "ward"];
  run.inventory[2].skills = ["thunder", "flame"];
  assert.equal(
    configure(run, "active", ["wind", "sweep", "thunder", "step", "frost"]),
    false,
  );
  assert.equal(
    configure(run, "passive", ["vital", "edge", "ward", "vital"]),
    false,
  );
  assert.equal(configure(run, "active", ["wind", "wind"]), false);
  assert.equal(configure(run, "active", ["vital"]), false);
  assert.equal(configure(run, "passive", ["wind"]), false);
  assert.equal(configure(run, "equipment", []), false);
  assert.equal(configure(run, "active", null), false);
  assert.equal(configure(run, "passive", ["vital", "edge", "ward"]), true);
  const ids = ["frost", "flame"];
  assert.equal(configure(run, "active", ids), true);
  ids.push("wind");
  assert.deepEqual(run.active, ["frost", "flame"]);
  assert.equal(configure(run, "active", []), true);
  assert.equal(configure(run, "passive", []), true);
  assert.equal(isValidRun(run), true);
});

test("seeded loot and saved RNG resume deterministically; seed changes sequence", () => {
  const a = fresh("mist"),
    b = fresh("mist"),
    c = fresh("other");
  const batch = (run) =>
    Array.from({ length: 10 }, (_, i) => grantLoot(run, i % 2 === 0));
  assert.deepEqual(batch(a), batch(b));
  assert.notDeepEqual(a.inventory.slice(4), batch(c));
  const resumed = clone(a);
  assert.deepEqual(batch(a), batch(resumed));
  assert.equal(isValidRun(a), true);
});

test("loot budgets, zero-to-three skills and stash cap retain equipped items", () => {
  const seen = new Set();
  for (let seed = 0; seed < 15; seed++) {
    const run = fresh(seed);
    const original = clone(run.inventory);
    for (let i = 0; i < 36; i++) {
      const gear = grantLoot(run, i % 2 === 0);
      seen.add(gear.skills.length);
      assert.ok(gear.power >= 1 && gear.power <= 12);
      assert.equal(new Set(gear.skills).size, gear.skills.length);
      assert.equal(isValidRun(run), true);
    }
    assert.equal(run.inventory.length, 40);
    assert.equal(grantLoot(run, true), null);
    assert.deepEqual(run.inventory.slice(0, 4), original);
    for (let i = 0; i < 3; i++) recordKill(run);
    assert.equal(run.questRewarded, true);
    assert.equal(run.inventory.length, 40);
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
});

test("stats remain bounded and passives only apply when configured", () => {
  const run = fresh();
  for (const gear of run.inventory) gear.power = 12;
  run.inventory[1].skills = ["vital", "edge", "ward"];
  configure(run, "passive", ["vital", "edge", "ward"]);
  assert.deepEqual(getStats(run), { maxHp: 156, attack: 34, armor: 10 });
  configure(run, "passive", []);
  assert.deepEqual(getStats(run), { maxHp: 136, attack: 30, armor: 8 });
});

test("legacy requires ended run, progress and earned equipped loot or bonded pet", () => {
  const run = fresh();
  assert.throws(() => createRun(1, "后人", "male", run));
  run.pet.bonded = true;
  const noProgress = createRun(1, "后人", "male", end(run));
  assert.equal(noProgress.legacy, null);
  assert.equal(noProgress.pet.bonded, false);
  assert.equal(noProgress.reincarnations, 1);
  const earned = fresh();
  for (let i = 0; i < 3; i++) recordKill(earned);
  const noEquip = createRun(5, "后人", "male", end(clone(earned)));
  assert.equal(noEquip.legacy, null);
  equip(earned, earned.inventory[4].id);
  const next = createRun(5, "后人", "male", end(earned));
  assert.deepEqual(next.legacy, {
    type: "relic",
    description: "旧物余温：生命上限+5",
  });
  assert.equal(getStats(next).maxHp, 125);
  assert.equal(next.inventory.length, 4);
  assert.equal(next.active.length, 4);
  assert.equal(isValidRun(next), true);
  assert.deepEqual(next, createRun(5, "后人", "male", earned));
  const pet = fresh();
  pet.pet.bonded = true;
  for (let i = 0; i < 3; i++) recordKill(pet);
  const inherited = createRun(8, "后人", "female", end(pet));
  assert.equal(inherited.legacy.type, "pet");
  assert.equal(inherited.pet.affinity, 5);
  assert.equal(getStats(inherited).maxHp, 120);
});

test("history is concise and repeated no-progress reincarnation never stacks legacy", () => {
  let run = fresh();
  for (let i = 0; i < 9; i++) run = createRun(i, "后人", "male", end(run));
  assert.equal(run.reincarnations, 9);
  assert.equal(run.history.length, 5);
  assert.equal(run.legacy, null);
  assert.equal(getStats(run).maxHp, 120);
  assert.equal(isValidRun(run), true);
});

test("storage validation rejects malformed or executable/unbounded saved fields", () => {
  const mutations = [
    (r) => (r.version = 2),
    (r) => (r.rng = -1),
    (r) => (r.seed = Infinity),
    (r) => (r.lives = 4),
    (r) => (r.lives = 0.5),
    (r) => (r.reviveItems = 2),
    (r) => (r.reviveItems = 1),
    (r) => (r.kills = 3),
    (r) => (r.ended = true),
    (r) => (r.bossDefeated = true),
    (r) => (r.equipment.weapon = "missing"),
    (r) => (r.equipment.weapon = r.equipment.coat),
    (r) => (r.active = ["flame"]),
    (r) => (r.active = ["wind", "wind"]),
    (r) => (r.passive = ["edge"]),
    (r) => (r.gender = "other"),
    (r) => (r.inventory[0].skills = ["eval"]),
    (r) => r.inventory[0].skills.push("thunder", "step"),
    (r) => (r.inventory[0].power = 13),
    (r) => (r.inventory[0].power = NaN),
    (r) => (r.inventory[1].id = r.inventory[0].id),
    (r) => (r.inventory[0].color = "url(javascript:evil)"),
    (r) => (r.inventory[0].effect = "eval()"),
    (r) => (r.execute = () => 0),
    (r) => (r.pet.affinity = 101),
    (r) => (r.pet.bonded = "yes"),
    (r) => (r.legacy = { type: "relic", description: "evil" }),
    (r) => (r.history = [{ name: "x", kills: 0, bossDefeated: false }]),
    (r) => (r.nextGearId = 0),
  ];
  for (const mutate of mutations) {
    const run = fresh();
    mutate(run);
    assert.equal(isValidRun(run), false, String(mutate));
  }
  for (const invalid of [null, undefined, [], {}, "run", 42])
    assert.equal(isValidRun(invalid), false);
  assert.equal(isValidRun(fresh()), true);
  // Display strings are deliberately plain data: the renderer must use textContent.
  assert.equal(isValidRun(createRun(1, "<img src=x>", "male")), true);
});
