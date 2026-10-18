import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.TEST_URL || "http://127.0.0.1:4173/game/");
await page.getByRole("button", { name: "开始冒险", exact: true }).click();
await page.locator("#quickCast").check();
const state = () => page.evaluate(() => window.gameDebug());
const position = (s, e) => ({
  x: 720 + (e.x - s.camera.x - e.y + s.camera.y) * s.scale,
  y: 450 + (e.x - s.camera.x + e.y - s.camera.y) * s.scale * 0.52,
});
async function walk(goal) {
  for (let i = 0; i < 80; i++) {
    const s = await state();
    if (Math.hypot(s.player.x - goal.x, s.player.y - goal.y) < 1.5) {
      await page.keyboard.press("s");
      return;
    }
    const q = position(s, goal);
    await page.mouse.click(
      Math.max(270, Math.min(1200, q.x)),
      Math.max(180, Math.min(650, q.y)),
      { button: "right" },
    );
    await page.waitForTimeout(180);
  }
  throw Error("walk timed out");
}
async function fightAll() {
  for (let i = 0; i < 240; i++) {
    const s = await state();
    if (!s.enemies.length) return;
    if (s.player.hp <= 0) {
      if (s.adventure.ended) throw Error("run ended");
      await page.getByRole("button", { name: "重生", exact: true }).click();
      continue;
    }
    const e = s.enemies.reduce((best, e) =>
      Math.hypot(e.x - s.player.x, e.y - s.player.y) <
      Math.hypot(best.x - s.player.x, best.y - s.player.y)
        ? e
        : best,
    );
    const q = position(s, e);
    if (q.x > 270 && q.x < 1200 && q.y > 180 && q.y < 680) {
      await page.mouse.click(q.x, q.y - 35, { button: "right" });
      await page.mouse.move(q.x, q.y);
      for (const [j, key] of ["q", "w", "e"].entries())
        if (s.cooldowns[j] === 0) await page.keyboard.press(key);
    } else
      await page.mouse.click(
        Math.max(280, Math.min(1180, q.x)),
        Math.max(190, Math.min(640, q.y)),
        { button: "right" },
      );
    if (s.player.hp < 75 && s.cooldowns[5] === 0)
      await page.keyboard.press("f");
    await page.waitForTimeout(180);
  }
  throw Error("fight timed out");
}
await fightAll();
let s = await state();
assert.equal(s.adventure.inventory, 10);
console.log("PASS clean gameplay: defeated six overworld enemies, six drops");
await walk({ x: -5, y: 2 });
await page.keyboard.press("t");
assert.ok((await state()).adventure.pet.bonded);
await walk({ x: 0, y: 0 });
await page.keyboard.press("t");
await walk({ x: 8, y: 4 });
await page.keyboard.press("t");
assert.equal((await state()).zone, "dungeon");
console.log("PASS clean gameplay: bonded fox, rested, entered dungeon");
await fightAll();
s = await state();
assert.ok(s.adventure.bossDefeated);
console.log(
  "PASS clean gameplay: defeated dungeon boss",
  JSON.stringify({
    hp: s.player.hp,
    lives: s.adventure.lives,
    inventory: s.adventure.inventory,
  }),
);
await page.screenshot({ path: "adventure-cleared.png" });
assert.deepEqual(errors, []);
await browser.close();
