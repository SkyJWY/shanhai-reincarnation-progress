import {
  ACTIVE_BOOK,
  PASSIVE_BOOK,
  createRun,
  getStats,
  getAvailable,
  equip,
  configure,
} from "./adventure-model.mjs";
import { readSave, writeSave } from "./adventure-store.mjs";
const $ = (id) => document.getElementById(id);
const names = { weapon: "兵器", coat: "衣袍", charm: "法宝", boots: "足具" };
const make = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
export function createAdventureUI(api) {
  const panel = $("adventurePanel"),
    body = $("adventureBody");
  let previous = null;
  function save() {
    if (!api.run()) return false;
    try {
      writeSave(api.run(), api.capture());
      $("saveStatus").textContent = "已保存到此浏览器";
      return true;
    } catch (error) {
      $("saveStatus").textContent = `保存失败：${error.message}`;
      api.notice("存档未保存，请勿关闭页面");
      return false;
    }
  }
  function close() {
    panel.close();
    api.menu(false);
  }
  function open(title) {
    api.menu(true);
    body.replaceChildren();
    $("adventureTitle").textContent = title;
    if (!panel.open) panel.showModal();
  }
  function button(text, fn, parent = body) {
    const b = make("button", text);
    b.onclick = fn;
    parent.append(b);
    return b;
  }
  function welcome(endedRun = null) {
    previous = endedRun;
    open(endedRun ? "渡过忘川 · 开启下一世" : "山海轮回 · 初入人间");
    const saved = readSave();
    body.append(
      make(
        "p",
        endedRun
          ? "本世命火已尽。前世经历已记录，新的一世将使用新的世界种子。"
          : "第二阶段探索原型：寻找灵狐、收集装备、闯入古寺挑战守关者。",
      ),
    );
    if (saved && !endedRun) {
      body.append(
        make(
          "p",
          `${saved.value.run.name} · 轮回 ${saved.value.run.reincarnations} 次${saved.recovered ? " · 主存档异常，已找到备份" : ""}`,
        ),
      );
      button("继续冒险", () => {
        panel.close();
        api.start(saved.value.run, saved.value.runtime);
      });
      body.append(
        make("p", "存档仅保存在当前设备、当前浏览器；无跨设备云存档。"),
      );
      // A living run is never silently replaced by a new game.
      return;
    }
    const form = make("form");
    form.className = "character-form";
    const label = make("label", "角色姓名");
    const input = make("input");
    input.id = "characterName";
    input.name = "name";
    input.maxLength = 16;
    input.required = true;
    input.value = endedRun ? "云归" : "沈砚";
    label.append(input);
    const genderLabel = make("label", "性别");
    const select = make("select");
    select.id = "characterGender";
    for (const [value, name] of [
      ["male", "男"],
      ["female", "女"],
    ]) {
      const option = make("option", name);
      option.value = value;
      select.append(option);
    }
    genderLabel.append(select);
    form.append(label, genderLabel);
    const submit = make("button", endedRun ? "轮回转世" : "开始冒险");
    submit.type = "submit";
    form.append(submit);
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
      const run = createRun(seed, name, select.value, previous);
      panel.close();
      api.start(run);
      save();
    };
    body.append(form);
    if (endedRun)
      body.append(
        make(
          "p",
          `上一世：${endedRun.name}，击败 ${endedRun.kills} 名敌人。遗泽取自真实经历，不保证每次继承。`,
        ),
      );
  }
  function inventory() {
    const run = api.run();
    if (!run || run.ended || api.capture().p.hp <= 0 || $("modal").open) return;
    open("行囊 · 装备与技能");
    const stats = getStats(run),
      canEdit = api.canConfigure();
    body.append(
      make(
        "p",
        `${run.name} · ${run.gender === "female" ? "女" : "男"} · 轮回 ${run.reincarnations} 次 | 生命上限 ${stats.maxHp} · 普攻 ${stats.attack} · 减伤 ${stats.armor}`,
      ),
    );
    body.append(
      make(
        "p",
        canEdit
          ? "已脱战，可更换装备与配置技能。"
          : "附近有敌人：装备与技能配置已锁定，先脱战。",
      ),
    );
    if (run.legacy)
      body.append(make("p", `前世遗泽：${run.legacy.description}`));
    const rows = make("div", undefined, "gear-grid");
    for (const gear of run.inventory) {
      const card = make("article", undefined, "gear-card");
      const worn = run.equipment[gear.slot] === gear.id;
      card.append(make("strong", `${worn ? "✓ " : ""}${gear.name}`));
      card.append(
        make(
          "p",
          `${names[gear.slot]} · 强度 ${gear.power} · ${gear.skills.length} 个技能`,
        ),
      );
      card.append(
        make(
          "small",
          gear.skills
            .map(
              (id) =>
                [...ACTIVE_BOOK, ...PASSIVE_BOOK].find((s) => s.id === id)
                  ?.name || id,
            )
            .join(" / ") || "无附带技能",
        ),
      );
      const b = button(
        worn ? "已装备" : "装备",
        () => {
          if (!api.canConfigure()) return;
          if (equip(run, gear.id)) {
            api.changed();
            save();
            inventory();
          }
        },
        card,
      );
      b.disabled = worn || !canEdit;
      rows.append(card);
    }
    body.append(rows);
    const available = getAvailable(run);
    for (const [kind, title, book, max] of [
      ["active", "装备主动（最多4个）", ACTIVE_BOOK, 4],
      ["passive", "装备被动（最多3个）", PASSIVE_BOOK, 3],
    ]) {
      body.append(make("h3", title));
      const group = make("div", undefined, "skill-options");
      for (const id of available[kind]) {
        const skill = book.find((s) => s.id === id);
        const label = make("label");
        const check = make("input");
        check.type = "checkbox";
        check.checked = run[kind].includes(id);
        check.disabled = !canEdit;
        check.onchange = () => {
          const ids = check.checked
            ? [...run[kind], id]
            : run[kind].filter((v) => v !== id);
          if (ids.length > max || !configure(run, kind, ids)) {
            check.checked = !check.checked;
            api.notice(`最多生效 ${max} 个`);
            return;
          }
          api.changed();
          save();
        };
        label.append(
          check,
          document.createTextNode(
            skill.name + (skill.description ? ` · ${skill.description}` : ""),
          ),
        );
        group.append(label);
      }
      body.append(group);
    }
    body.append(make("h3", "灵契伙伴"));
    body.append(
      make(
        "p",
        run.pet.bonded
          ? `${run.pet.name} · 羁绊 ${run.pet.affinity} · ${api.petDown() ? "归契休养：回归魂碑恢复" : "出战中：自动辅助攻击"}`
          : "尚未结缘。清除三名妖影后，到西侧灵狐处交互。",
      ),
    );
    body.append(
      make(
        "p",
        `命灯 ${run.lives} · 续命符 ${run.reviveItems} · ${run.bossDefeated ? "已击败古寺守关者" : "古寺尚未通关"}`,
      ),
    );
    if (run.history.length) {
      body.append(make("h3", "最近五世记忆"));
      for (const life of run.history)
        body.append(
          make(
            "p",
            `${life.name} · 击败 ${life.kills} · ${life.bossDefeated ? "古寺通关" : "宿愿未竟"}`,
          ),
        );
    }
    body.append(
      make(
        "p",
        "本地自动保存，不同设备／浏览器不共享。清理浏览器数据会丢失存档。",
      ),
    );
    button("保存进度", save);
    button("返回冒险", close);
  }
  $("bagButton").onclick = inventory;
  $("saveButton").onclick = save;
  $("interactButton").onclick = () => api.interact();
  $("adventureClose").onclick = () => {
    if (api.run() && !api.run().ended) close();
  };
  panel.addEventListener("cancel", (e) => {
    e.preventDefault();
    if (api.run() && !api.run().ended) close();
  });
  addEventListener("keydown", (e) => {
    if (
      e.target.closest?.('input:not([type="checkbox"]),select,textarea') ||
      panel.open
    )
      return;
    if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      inventory();
    }
    if (e.key.toLowerCase() === "t") {
      e.preventDefault();
      api.interact();
    }
  });
  let lastY = 0;
  body.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) lastY = e.touches[0].clientY;
    },
    { passive: true },
  );
  body.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 1) {
        body.scrollTop += lastY - e.touches[0].clientY;
        lastY = e.touches[0].clientY;
      }
    },
    { passive: true },
  );
  addEventListener("pagehide", save);
  addEventListener("visibilitychange", () => {
    if (document.hidden) save();
  });
  return { welcome, inventory, save, close };
}
