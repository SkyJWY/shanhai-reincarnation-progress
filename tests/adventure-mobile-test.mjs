import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.TEST_URL || "http://127.0.0.1:4173/game/");
await page.locator("#characterName").fill("手机游侠");
await page.getByRole("button", { name: "开始冒险", exact: true }).tap();
await page.locator("#bagButton").tap();
assert.ok(await page.locator("#adventurePanel").isVisible());
await page.screenshot({ path: "adventure-mobile-bag.png" });
const cdp = await page.context().newCDPSession(page);
const r = await page.locator("#adventureBody").boundingBox();
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height - 20, id: 1 }],
});
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [{ x: r.x + r.width / 2, y: r.y + 30, id: 1 }],
});
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await page.waitForTimeout(100);
assert.ok(
  await page.locator("#adventureBody").evaluate((e) => e.scrollTop > 0),
);
const check = page
  .locator(".skill-options label")
  .filter({ hasText: "破风剑" })
  .locator("input");
await check.scrollIntoViewIfNeeded();
await check.tap();
assert.equal(
  await page.evaluate(() =>
    window.gameDebug().adventure.active.includes("wind"),
  ),
  false,
);
await page.getByRole("button", { name: "返回冒险", exact: true }).tap();
await page.getByRole("button", { name: "回春", exact: true }).tap();
assert.ok(await page.evaluate(() => window.gameDebug().cooldowns[5] > 0));
await page.screenshot({ path: "adventure-mobile.png" });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.locator("#saveButton").tap();
assert.ok(
  await page.evaluate(() =>
    Boolean(localStorage.getItem("shanhai.adventure.v1")),
  ),
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS mobile create, bag drag-scroll, checkbox configuration, casting, save and layout",
);
