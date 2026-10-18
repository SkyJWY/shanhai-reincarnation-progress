import { isValidRun } from "./adventure-model.mjs";
const KEY = "shanhai.adventure.v1",
  BACKUP = KEY + ".backup";
export function validSnapshot(value) {
  const r = value?.runtime;
  return (
    value?.version === 1 &&
    isValidRun(value.run) &&
    r &&
    ["overworld", "dungeon"].includes(r.zone) &&
    r.p &&
    ["x", "y", "hp"].every((k) => Number.isFinite(r.p[k])) &&
    r.p.hp >= 0 &&
    Array.isArray(r.enemies) &&
    r.enemies.length <= 40 &&
    r.enemies.every(
      (e) =>
        ["x", "y", "hp", "max", "cool", "wind"].every((k) =>
          Number.isFinite(e[k]),
        ) &&
        e.max > 0 &&
        (e.mark === null ||
          (e.mark && Number.isFinite(e.mark.x) && Number.isFinite(e.mark.y))),
    ) &&
    Array.isArray(r.cd) &&
    r.cd.length === 6 &&
    r.cd.every((v) => Number.isFinite(v) && v >= 0) &&
    r.pet &&
    ["x", "y", "hp", "cool"].every((k) => Number.isFinite(r.pet[k])) &&
    ["time", "kills", "attackCd", "invulnerable"].every(
      (k) => Number.isFinite(r[k]) && r[k] >= 0,
    ) &&
    typeof r.pendingRevive === "boolean"
  );
}
export function readSave(storage = localStorage) {
  for (const key of [KEY, BACKUP]) {
    try {
      const value = JSON.parse(storage.getItem(key));
      if (validSnapshot(value)) return { value, recovered: key === BACKUP };
    } catch {}
  }
  return null;
}
export function writeSave(run, runtime, storage = localStorage) {
  const value = { version: 1, savedAt: new Date().toISOString(), run, runtime };
  if (!validSnapshot(value)) throw new Error("存档校验失败，未覆盖旧进度");
  const previous = storage.getItem(KEY);
  if (previous) {
    try {
      if (validSnapshot(JSON.parse(previous)))
        storage.setItem(BACKUP, previous);
    } catch {}
  }
  storage.setItem(KEY, JSON.stringify(value));
  return value.savedAt;
}
