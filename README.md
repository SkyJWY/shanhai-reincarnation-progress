# 山海轮回 — 浏览器探索原型

- 进度页：`index.html`
- 冒险模式：`game/`
- 操作回归试炼：`game/?mode=trial`（不读写正式冒险存档）

## 本地运行

```sh
python3 -m http.server 4173 --bind 127.0.0.1
# 打开 http://127.0.0.1:4173/game/
```

## 测试

```sh
npm test
npm ci
npx playwright install chromium
npm run test:adventure
npm run test:playthrough
npm run test:mobile
# 可设置 TEST_URL 为线上 game/ 地址进行部署后验证
```

`test:adventure` 用正常 UI 创建角色、保存续玩，并用受控本地存档测试罕见边界（死亡、轮回、Boss）。`test:playthrough` 不注入战斗状态，通过实际鼠标和键盘从新角色打通山野与古寺。手机测试是 Chromium 触屏模拟，不等于实体手机或 QQ 内置浏览器验证。

## 代码边界

- `rules.mjs`：共用施法几何。
- `pc-controls.mjs`：PC 指令与镜头，独立于手机触控。
- `adventure-model.mjs`：确定性掉落、装备、技能配置、死亡与轮回。
- `adventure-world.mjs`：有界地图遭遇与地标。
- `adventure-store.mjs`：本地存档校验、读写与备份。
- `adventure-ui.mjs`：角色创建、行囊与技能配置。
- `game.mjs`：战斗循环、触控、绘制与系统整合。

## 原型限制

程序绘制等距占位美术，并非正式 3D 资产。仅有一处山野、一处副本；装备仅改变简化颜色，未实现完整模块化换装。技能是已测试机制组合，内容不是实时 AI 生成。存档在当前浏览器 localStorage 中，包含身份、角色与世界状态，有一份旧存档备份；没有账号、云同步或防作弊保证。传承当前仅有弱器缘／灵缘，技能残忆与复杂宿缘后续扩展。

自动部署仅上传 `index.html` 与 `game/`，不会上传测试、依赖或任何本机配置。
