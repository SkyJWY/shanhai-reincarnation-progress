import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.TEST_URL || "http://127.0.0.1:4173/game/");
await page.getByRole("button", { name: "开始冒险", exact: true }).tap();
const selectors = [
  "#stick",
  "#attack",
  "#skills button:nth-child(1)",
  "#skills button:nth-child(2)",
  "#skills button:nth-child(3)",
  "#skills button:nth-child(4)",
  "#skills button:nth-child(5)",
  "#skills button:nth-child(6)",
  "#bagButton",
  "#saveButton",
  "#interactButton",
  "#pauseGame",
];
for (const [width, height] of [
  [932, 430],
  [844, 390],
  [667, 375],
  [568, 320],
  [640, 280],
  [568, 240],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(
    ({ width, height }) =>
      Math.abs(document.body.getBoundingClientRect().width - width) < 1 &&
      Math.abs(document.body.getBoundingClientRect().height - height) < 1,
    { width, height },
  );
  const rects = [];
  for (const selector of selectors) {
    const r = await page.locator(selector).boundingBox();
    assert.ok(r, selector);
    assert.ok(r.width >= 44 && r.height >= 44, `${selector} touch target`);
    assert.ok(
      r.x >= 0 &&
        r.y >= 0 &&
        r.x + r.width <= width + 1 &&
        r.y + r.height <= height + 1,
      `${width}x${height} ${selector} bounds`,
    );
    rects.push(r);
  }
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i],
        b = rects[j];
      assert.ok(
        !(
          Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) + 1 &&
          Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y) + 1
        ),
        `${width}x${height} overlap ${selectors[i]} ${selectors[j]}`,
      );
    }
  for (const selector of [
    "#bagButton",
    "#saveButton",
    "#interactButton",
    "#attack",
  ]) {
    const r = await page.locator(selector).boundingBox();
    assert.ok(
      await page.evaluate(
        ({ selector, r }) => {
          const e = document.querySelector(selector),
            top = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return top === e || e.contains(top);
        },
        { selector, r },
      ),
      `hit target ${selector}`,
    );
  }
  await page.locator("#bagButton").tap();
  await page.waitForTimeout(60);
  const panel = await page.locator("#adventurePanel").boundingBox();
  assert.ok(
    panel.y >= 0 && panel.y + panel.height <= height + 1,
    "panel bounds",
  );
  await page.locator("#adventureClose").tap();
  console.log(
    `PASS full adventure HUD bounds, touch size, spacing and hit testing ${width}x${height}`,
  );
  if (height === 240) await page.screenshot({ path: "mobile-short-v041.png" });
}
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(100);
await page.screenshot({ path: "mobile-v041.png" });
await page.locator("#bagButton").tap();
await page.screenshot({ path: "mobile-bag-v041.png" });
assert.deepEqual(errors, []);
await browser.close();
