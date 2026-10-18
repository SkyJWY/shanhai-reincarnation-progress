// Pure, JSON-safe progression. No effects/scripts are accepted from saved content.
export const ACTIVE_BOOK = Object.freeze(
  [
    {
      id: "wind",
      name: "破风剑",
      type: "line",
      range: 9,
      radius: 0.65,
      damage: 32,
      cd: 2,
      color: "#8fe5dc",
    },
    {
      id: "sweep",
      name: "横扫",
      type: "cone",
      range: 4,
      radius: Math.PI / 3,
      damage: 40,
      cd: 5,
      color: "#e5cf83",
    },
    {
      id: "thunder",
      name: "落雷",
      type: "circle",
      range: 10,
      radius: 2.3,
      damage: 52,
      cd: 7,
      color: "#b9a4ff",
    },
    {
      id: "step",
      name: "燕回步",
      type: "dash",
      range: 5,
      radius: 0,
      damage: 0,
      cd: 4,
      color: "#93d9ce",
    },
    {
      id: "frost",
      name: "霜刃",
      type: "line",
      range: 8,
      radius: 1,
      damage: 28,
      cd: 3,
      color: "#a1dfff",
    },
    {
      id: "flame",
      name: "流火",
      type: "circle",
      range: 8,
      radius: 2,
      damage: 42,
      cd: 6,
      color: "#ffab78",
    },
  ].map((s) => Object.freeze({ ...s, kind: "active" })),
);
export const PASSIVE_BOOK = Object.freeze(
  [
    { id: "vital", name: "养元", description: "+20生命上限" },
    { id: "edge", name: "砺锋", description: "+4普攻伤害" },
    { id: "ward", name: "护体", description: "每次受击减伤2" },
  ].map((s) => Object.freeze({ ...s, kind: "passive" })),
);
const SLOTS = ["weapon", "coat", "charm", "boots"];
const ACTIVE = ACTIVE_BOOK.map((s) => s.id),
  PASSIVE = PASSIVE_BOOK.map((s) => s.id);
const ALL = [...ACTIVE, ...PASSIVE];
const COLORS = ["#b6c6bd", "#8fe5dc", "#b9a4ff", "#e5cf83"];
const uint = (n) => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
const count = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;
const text = (s, max = 80) =>
  typeof s === "string" && s.length > 0 && s.length <= max;
const exact = (o, keys) =>
  o !== null &&
  typeof o === "object" &&
  !Array.isArray(o) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(o)) &&
  Object.keys(o).length === keys.length &&
  keys.every((k) => Object.hasOwn(o, k));
const list = (a, allowed, max) =>
  Array.isArray(a) &&
  a.length <= max &&
  new Set(a).size === a.length &&
  a.every((id) => allowed.includes(id));
function seedValue(seed) {
  if (uint(seed)) return seed;
  if (!text(seed, 256))
    throw new TypeError("seed must be uint32 or a nonempty string");
  let n = 2166136261;
  for (const c of seed) n = Math.imul(n ^ c.codePointAt(0), 16777619) >>> 0;
  return n;
}
function random(run) {
  run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0;
  return run.rng / 4294967296;
}
const pick = (run, a) => a[Math.floor(random(run) * a.length)];
const legacyDescriptions = {
  relic: "旧物余温：生命上限+5",
  pet: "阿雪记得你：初始亲密度5",
};

export function createRun(
  seed,
  name = "无名",
  gender = "male",
  previous = null,
) {
  if (!text(name) || !["male", "female"].includes(gender))
    throw new TypeError("Invalid identity");
  if (previous !== null && (!isValidRun(previous) || !previous.ended))
    throw new TypeError("Previous run must be valid and ended");
  const initial = [
    ["初行剑", "weapon", ["wind", "sweep"]],
    ["布衣", "coat", ["vital"]],
    ["雷纹佩", "charm", ["thunder"]],
    ["轻靴", "boots", ["step"]],
  ];
  const inventory = initial.map(([name, slot, skills], i) => ({
    id: `start-${i}`,
    name,
    slot,
    color: COLORS[0],
    power: 0,
    skills,
  }));
  const normalized = seedValue(seed);
  const run = {
    version: 1,
    seed: normalized,
    rng: normalized,
    name,
    gender,
    reincarnations: previous ? previous.reincarnations + 1 : 0,
    inventory,
    equipment: Object.fromEntries(inventory.map((g) => [g.slot, g.id])),
    active: ["wind", "sweep", "thunder", "step"],
    passive: ["vital"],
    kills: 0,
    bossDefeated: false,
    questRewarded: false,
    lives: 3,
    reviveItems: 0,
    ended: false,
    pet: { name: "阿雪", bonded: false, affinity: 0 },
    legacy: null,
    history: previous
      ? [
          ...previous.history,
          {
            name: previous.name,
            kills: previous.kills,
            bossDefeated: previous.bossDefeated,
          },
        ].slice(-5)
      : [],
    nextGearId: 1,
  };
  // At most one weak, non-stacking inheritance; an equipped earned item or a bonded pet is required.
  if (previous?.kills >= 3) {
    const options = [];
    if (previous.pet.bonded) options.push("pet");
    if (Object.values(previous.equipment).some((id) => id.startsWith("loot-")))
      options.push("relic");
    if (options.length) {
      const type = pick(run, options);
      run.legacy = { type, description: legacyDescriptions[type] };
      if (type === "pet") run.pet = { name: "阿雪", bonded: true, affinity: 5 };
    }
  }
  return run;
}
export function getAvailable(run) {
  const ids = new Set(
    run.inventory
      .filter((g) => run.equipment[g.slot] === g.id)
      .flatMap((g) => g.skills),
  );
  return {
    active: ACTIVE.filter((id) => ids.has(id)),
    passive: PASSIVE.filter((id) => ids.has(id)),
  };
}
export function getStats(run) {
  const power = Object.fromEntries(
    SLOTS.map((slot) => [
      slot,
      run.inventory.find((g) => g.id === run.equipment[slot])?.power || 0,
    ]),
  );
  return {
    maxHp:
      100 +
      power.coat * 3 +
      (run.passive.includes("vital") ? 20 : 0) +
      (run.legacy?.type === "relic" ? 5 : 0),
    attack: 18 + power.weapon + (run.passive.includes("edge") ? 4 : 0),
    armor: Math.min(
      12,
      Math.floor((power.charm + power.boots) / 3) +
        (run.passive.includes("ward") ? 2 : 0),
    ),
  };
}
export function equip(run, gearId) {
  const gear = run.inventory.find((g) => g.id === gearId);
  if (run.ended || !gear) return false;
  run.equipment[gear.slot] = gearId;
  const available = getAvailable(run);
  for (const kind of ["active", "passive"])
    run[kind] = run[kind]
      .filter((id) => available[kind].includes(id))
      .slice(0, kind === "active" ? 4 : 3);
  return true;
}
export function configure(run, kind, ids) {
  if (
    run.ended ||
    !["active", "passive"].includes(kind) ||
    !list(ids, getAvailable(run)[kind], kind === "active" ? 4 : 3)
  )
    return false;
  run[kind] = [...ids];
  return true;
}
export function grantLoot(run, boss = false) {
  if (run.ended || run.nextGearId >= 1000000000) return null;
  // A full stash rejects new loot rather than silently deleting player items.
  if (run.inventory.length >= 40) return null;
  const slot = pick(run, SLOTS),
    skills = [],
    pool = [...ALL];
  const skillCount = Math.floor(random(run) * 4);
  for (let i = 0; i < skillCount; i++)
    skills.push(pool.splice(Math.floor(random(run) * pool.length), 1)[0]);
  const gear = {
    id: `loot-${run.nextGearId++}`,
    name:
      pick(run, ["青岚", "流云", "寒星", "赤霞"]) +
      { weapon: "剑", coat: "衣", charm: "佩", boots: "靴" }[slot],
    slot,
    color: pick(run, COLORS),
    power: Math.min(12, 1 + Math.floor(random(run) * 9) + (boss ? 3 : 0)),
    skills,
  };
  run.inventory.push(gear);
  return gear;
}
export function recordKill(run, boss = false) {
  if (run.ended) return null;
  run.kills = Math.min(1000000000, run.kills + 1);
  if (run.pet.bonded) run.pet.affinity = Math.min(100, run.pet.affinity + 1);
  if (boss) run.bossDefeated = true;
  if (run.kills >= 3 && !run.questRewarded) {
    run.questRewarded = true;
    run.reviveItems++;
  }
  return grantLoot(run, boss);
}
export function resolveDeath(run) {
  if (run.ended) return "ended";
  if (run.lives > 0) {
    run.lives--;
    return "revive";
  }
  if (run.reviveItems > 0) {
    run.reviveItems--;
    return "revive";
  }
  run.ended = true;
  return "ended";
}

export function isValidRun(raw) {
  try {
    return validate(raw);
  } catch {
    return false;
  }
}
function validate(r) {
  if (
    !exact(r, [
      "version",
      "seed",
      "rng",
      "name",
      "gender",
      "reincarnations",
      "inventory",
      "equipment",
      "active",
      "passive",
      "kills",
      "bossDefeated",
      "questRewarded",
      "lives",
      "reviveItems",
      "ended",
      "pet",
      "legacy",
      "history",
      "nextGearId",
    ]) ||
    r.version !== 1 ||
    !uint(r.seed) ||
    !uint(r.rng) ||
    !text(r.name) ||
    !["male", "female"].includes(r.gender) ||
    !count(r.reincarnations) ||
    !count(r.kills) ||
    !count(r.nextGearId) ||
    r.nextGearId < 1 ||
    !["bossDefeated", "questRewarded", "ended"].every(
      (k) => typeof r[k] === "boolean",
    ) ||
    !Number.isInteger(r.lives) ||
    r.lives < 0 ||
    r.lives > 3 ||
    ![0, 1].includes(r.reviveItems) ||
    r.questRewarded !== r.kills >= 3 ||
    (r.reviveItems && !r.questRewarded) ||
    (r.bossDefeated && !r.kills) ||
    (r.ended && (r.lives || r.reviveItems))
  )
    return false;
  if (
    !Array.isArray(r.inventory) ||
    r.inventory.length < 4 ||
    r.inventory.length > 40
  )
    return false;
  const gearIds = new Set();
  for (const g of r.inventory) {
    if (
      !exact(g, ["id", "name", "slot", "color", "power", "skills"]) ||
      !text(g.id) ||
      !/^(start-[0-3]|loot-[1-9]\d*)$/.test(g.id) ||
      gearIds.has(g.id) ||
      (g.id.startsWith("loot-") && Number(g.id.slice(5)) >= r.nextGearId) ||
      !text(g.name) ||
      !SLOTS.includes(g.slot) ||
      !COLORS.includes(g.color) ||
      !Number.isInteger(g.power) ||
      g.power < 0 ||
      g.power > 12 ||
      !list(g.skills, ALL, 3)
    )
      return false;
    gearIds.add(g.id);
  }
  if (
    !exact(r.equipment, SLOTS) ||
    !SLOTS.every((slot) =>
      r.inventory.some((g) => g.id === r.equipment[slot] && g.slot === slot),
    )
  )
    return false;
  const available = getAvailable(r);
  if (
    !list(r.active, available.active, 4) ||
    !list(r.passive, available.passive, 3)
  )
    return false;
  if (
    !exact(r.pet, ["name", "bonded", "affinity"]) ||
    r.pet.name !== "阿雪" ||
    typeof r.pet.bonded !== "boolean" ||
    !Number.isInteger(r.pet.affinity) ||
    r.pet.affinity < 0 ||
    r.pet.affinity > 100
  )
    return false;
  if (
    r.legacy !== null &&
    (!exact(r.legacy, ["type", "description"]) ||
      !Object.hasOwn(legacyDescriptions, r.legacy.type) ||
      r.legacy.description !== legacyDescriptions[r.legacy.type] ||
      !r.reincarnations)
  )
    return false;
  return (
    Array.isArray(r.history) &&
    r.history.length <= 5 &&
    r.history.length <= r.reincarnations &&
    r.history.every(
      (h) =>
        exact(h, ["name", "kills", "bossDefeated"]) &&
        text(h.name) &&
        count(h.kills) &&
        typeof h.bossDefeated === "boolean" &&
        (!h.bossDefeated || h.kills > 0),
    )
  );
}
