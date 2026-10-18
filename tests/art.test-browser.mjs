import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch();const base=process.env.TEST_BASE||'http://127.0.0.1:4173';const errors=[];
for(const [name,viewport,mobile] of [['desktop',{width:1440,height:900},false],['phone',{width:844,height:390},true],['portrait',{width:390,height:844},true]]){
 const page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/game/gallery.html`);await page.waitForTimeout(500);await page.screenshot({path:`art-${name}-village.png`});
 for(const [view,title] of [['temple','镇灵古寺'],['hero','游侠与灵狐'],['village','青岚渡']]){const b=page.locator(`[data-view=${view}]`);if(mobile)await b.tap();else await b.click();assert.equal(await page.locator('#title').textContent(),title);await page.waitForTimeout(100);if(name==='desktop')await page.screenshot({path:`art-desktop-${view}.png`});}
 assert.equal(await page.evaluate(()=>localStorage.length),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(name!=='portrait'){await page.goto(`${base}/game/`);await page.locator('#characterName').fill('青岚游侠');await page.getByRole('button',{name:'开始冒险',exact:true}).click();await page.waitForTimeout(600);await page.screenshot({path:`art-${name}-game.png`});assert.ok(await page.evaluate(()=>window.gameDebug().adventure));await page.locator('#bagButton').click();await page.screenshot({path:`art-${name}-inventory.png`});}
 console.log('PASS',name,'gallery scenes, no storage writes, no horizontal overflow',name!=='portrait'?'game start and inventory':'');await page.close();
}
assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');await browser.close();
