import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TEST_URL || "http://127.0.0.1:4173/game/";
await page.goto(base);
await page.locator("#characterName").fill("云归测试");
await page.locator("#characterGender").selectOption("female");
await page.getByRole("button", { name: "开始冒险", exact: true }).click();
const state = () => page.evaluate(() => window.gameDebug());
assert.equal((await state()).adventure.name, "云归测试");
assert.equal((await state()).player.hp, 120);
assert.equal((await state()).adventure.lives, 3);
console.log("PASS character creation");
await page.locator("#bagButton").click();
assert.ok(await page.locator("#adventurePanel").isVisible());
assert.equal(await page.locator(".gear-card").count(), 4);
await page.getByRole("button", { name: "返回冒险", exact: true }).click();
await page.locator("#quickCast").check();
await page.mouse.move(850, 430);
await page.keyboard.press("q");
assert.ok((await state()).cooldowns[0] > 0);
await page.locator("#saveButton").click();
const saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("shanhai.adventure.v1")),
);
assert.equal(saved.run.name, "云归测试");
assert.ok(saved.runtime.cd[0] > 0);
await page.reload();
await page.getByRole("button", { name: "继续冒险", exact: true }).click();
assert.ok((await state()).cooldowns[0] > 0);
assert.equal((await state()).adventure.name, "云归测试");
console.log("PASS save / reload preserves identity and cooldown");
await page.locator("#bagButton").click();
const wind = page
  .locator(".skill-options label")
  .filter({ hasText: "破风剑" })
  .locator("input");
await wind.uncheck();
await page.getByRole("button", { name: "返回冒险", exact: true }).click();
assert.equal((await state()).adventure.active.includes("wind"), false);
assert.equal(
  await page.locator("#skills button").last().getAttribute("aria-label"),
  "回春",
);
console.log("PASS manual active skill selection");
await page.screenshot({ path: "adventure-start.png" });
// Seed controlled, valid test fixtures through the same persistent format used by normal saves.
await page.addInitScript(() => {
  const raw = sessionStorage.getItem("__fixture");
  if (raw) {
    localStorage.setItem("shanhai.adventure.v1", raw);
    sessionStorage.removeItem("__fixture");
  }
});
async function fixture(change) {
  await page.evaluate(change);
  await page.evaluate(() =>
    sessionStorage.setItem(
      "__fixture",
      localStorage.getItem("shanhai.adventure.v1"),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "继续冒险", exact: true }).click();
}
await fixture(() => {
  const key = "shanhai.adventure.v1",
    s = JSON.parse(localStorage.getItem(key));
  s.runtime.enemies = [
    {
      x: 1,
      y: 0,
      hp: 1,
      max: 55,
      cool: 20,
      wind: 0,
      mark: null,
      boss: false,
      aggro: true,
      damage: 10,
      speed: 0,
    },
  ];
  s.runtime.p = { x: 0, y: 0, hp: 120 };
  s.runtime.cd = [0, 0, 0, 0, 0, 0];
  localStorage.setItem(key, JSON.stringify(s));
});
await page.mouse.click(776, 424);
await page.waitForFunction(() => window.gameDebug().adventure.inventory > 4);
assert.equal((await state()).adventure.inventory, 5);
console.log("PASS combat kill awards equipment");
await page.locator("#saveButton").click();
await fixture(() => {
  const key = "shanhai.adventure.v1",
    s = JSON.parse(localStorage.getItem(key));
  s.run.kills = 3;
  s.run.questRewarded = true;
  s.run.reviveItems = 1;
  s.runtime.kills = 3;
  s.runtime.enemies = [];
  s.runtime.p = { x: -5, y: 2, hp: 120 };
  localStorage.setItem(key, JSON.stringify(s));
});
await page.locator("#interactButton").click();
assert.ok((await state()).adventure.pet.bonded);
console.log("PASS fox bonding interaction");
await page.locator("#saveButton").click();
await fixture(() => {
  const key = "shanhai.adventure.v1",
    s = JSON.parse(localStorage.getItem(key));
  s.runtime.p = { x: 8, y: 4, hp: 120 };
  s.runtime.enemies = [];
  localStorage.setItem(key, JSON.stringify(s));
});
await page.locator("#interactButton").click();
assert.equal((await state()).zone, "dungeon");
assert.equal((await state()).enemies.length, 4);
console.log("PASS dungeon entry");
await page.locator("#saveButton").click();
await fixture(() => {
  const key = "shanhai.adventure.v1",
    s = JSON.parse(localStorage.getItem(key));
  s.runtime.p = { x: 0, y: 0, hp: 120 };
  s.runtime.enemies = [
    {
      x: 1,
      y: 0,
      hp: 1,
      max: 360,
      cool: 20,
      wind: 0,
      mark: null,
      boss: true,
      aggro: true,
      damage: 22,
      speed: 1.2,
    },
  ];
  localStorage.setItem(key, JSON.stringify(s));
});
await page.mouse.click(776, 424);
await page.waitForFunction(() => window.gameDebug().adventure.bossDefeated);
console.log("PASS boss defeat updates progression");
await page.locator("#saveButton").click();
await fixture(() => {
  const key = "shanhai.adventure.v1",
    s = JSON.parse(localStorage.getItem(key));
  s.runtime.p = { x: 0, y: 0, hp: 1 };
  s.runtime.invulnerable = 0;
  s.runtime.enemies = [
    {
      x: 1,
      y: 0,
      hp: 100,
      max: 100,
      cool: 0,
      wind: 0.05,
      mark: { x: 0, y: 0 },
      boss: false,
      aggro: true,
      damage: 10,
      speed: 1.5,
    },
  ];
  localStorage.setItem(key, JSON.stringify(s));
});
await page.waitForFunction(() => window.gameDebug().pendingRevive);
assert.equal((await state()).adventure.lives, 2);
await page.getByRole("button", { name: "重生", exact: true }).click();
assert.ok((await state()).player.hp > 0);
assert.equal((await state()).adventure.reincarnations, 0);
console.log("PASS death consumes a lamp and revives same life");
await page.locator("#saveButton").click();
await fixture(() => {
  const key = "shanhai.adventure.v1",
    s = JSON.parse(localStorage.getItem(key));
  s.run.lives = 0;
  s.run.reviveItems = 0;
  s.runtime.p = { x: 0, y: 0, hp: 1 };
  s.runtime.invulnerable = 0;
  s.runtime.enemies = [
    {
      x: 1,
      y: 0,
      hp: 100,
      max: 100,
      cool: 0,
      wind: 0.05,
      mark: { x: 0, y: 0 },
      boss: false,
      aggro: true,
      damage: 10,
      speed: 1.5,
    },
  ];
  localStorage.setItem(key, JSON.stringify(s));
});
await page.waitForFunction(() => window.gameDebug().adventure.ended);
await page.getByRole("button", { name: "轮回转世", exact: true }).click();
await page.locator("#characterName").fill("新一世");
await page.getByRole("button", { name: "轮回转世", exact: true }).click();
assert.equal((await state()).adventure.reincarnations, 1);
assert.equal((await state()).adventure.name, "新一世");
assert.equal((await state()).adventure.lives, 3);
console.log("PASS final death and reincarnation");
assert.deepEqual(errors, []);
await browser.close();
