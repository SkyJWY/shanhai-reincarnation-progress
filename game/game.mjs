import {
  skills as baseSkills,
  clamp,
  distance,
  target,
  hits,
} from "./rules.mjs";
import {
  ACTIVE_BOOK,
  getStats,
  recordKill,
  resolveDeath,
} from "./adventure-model.mjs";
import { createAdventureUI } from "./adventure-ui.mjs";
import { LANDMARKS, createWorld, nearestLandmark } from "./adventure-world.mjs";
let skills = baseSkills.map((s, i) => ({
  ...s,
  id: ["wind", "sweep", "thunder", "step", "flash", "heal"][i],
}));
let run = null,
  adventure = null,
  zone = "overworld",
  pendingRevive = false,
  savedZones = {},
  skillCooldowns = {},
  autosave = 0;
let pet = { x: 0, y: 0, hp: 40, cool: 0 };
const trial = new URLSearchParams(location.search).get("mode") === "trial";
const stats = () =>
  run ? getStats(run) : { maxHp: 100, attack: 18, armor: 0 };
import { PC_KEYS, createPCControls } from "./pc-controls.mjs";
const camera = { x: 0, y: 0, locked: true };
let pc = null;
const $ = (id) => document.getElementById(id),
  canvas = $("world"),
  ctx = canvas.getContext("2d");
let W,
  H,
  scale,
  p,
  enemies,
  fx,
  cd,
  time,
  kills,
  wave,
  paused = false,
  selected = -1,
  aim = { x: 4, y: 0 },
  joy = { x: 0, y: 0 },
  attackCd = 0,
  invulnerable = 0;
const touch = matchMedia("(pointer: coarse)");
let orientationBlocked = false,
  cancelArmed = false,
  skillPointer = null;
function clearAim() {
  selected = -1;
  cancelArmed = false;
  skillPointer = null;
  document.body.classList.remove("aiming", "cancel-armed");
}
function syncOrientation() {
  orientationBlocked = touch.matches && innerHeight > innerWidth;
  document.body.classList.toggle("portrait-blocked", orientationBlocked);
  clearAim();
  pc?.reset();
  joy = { x: 0, y: 0 };
  if ($("stick")) $("stick").firstElementChild.style.transform = "none";
}
const decor = Array.from({ length: 80 }, (_, i) => ({
  x: Math.sin(i * 42.3) * 20,
  y: Math.cos(i * 17.7) * 20,
  h: 30 + (i % 5) * 10,
}));
function resize() {
  W = innerWidth;
  H = innerHeight;
  const d = Math.min(devicePixelRatio, 2);
  canvas.width = W * d;
  canvas.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  scale = touch.matches
    ? clamp(H / 11, 30, 46)
    : clamp(Math.min(W / 24, H / 16), 32, 64);
  syncOrientation();
}
addEventListener("resize", resize);
resize();
const project = (x, y, z = 0) => ({
  x:
    W / 2 +
    (x -
      (touch.matches ? p?.x || 0 : camera.x) -
      y +
      (touch.matches ? p?.y || 0 : camera.y)) *
      scale,
  y:
    H * 0.5 +
    (x -
      (touch.matches ? p?.x || 0 : camera.x) +
      y -
      (touch.matches ? p?.y || 0 : camera.y)) *
      scale *
      0.52 -
    z,
});
function unproject(x, y) {
  const a = (x - W / 2) / scale,
    b = (y - H * 0.5) / (scale * 0.52);
  return {
    x: (touch.matches ? p?.x || 0 : camera.x) + (a + b) / 2,
    y: (touch.matches ? p?.y || 0 : camera.y) + (b - a) / 2,
  };
}
function path(points, fill, stroke) {
  ctx.beginPath();
  points.forEach((v, i) => {
    const q = project(v.x, v.y, v.z || 0);
    i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
  });
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function circle(pos, r, color, outline) {
  path(
    Array.from({ length: 48 }, (_, i) => ({
      x: pos.x + Math.cos((i * Math.PI) / 24) * r,
      y: pos.y + Math.sin((i * Math.PI) / 24) * r,
    })),
    color,
    outline,
  );
}
function shape(s, origin, point, alpha = 0.3) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const a = Math.atan2(point.y - origin.y, point.x - origin.x),
    r = s.range;
  if (s.type === "circle")
    circle(target(origin, point, r), s.radius, s.color, s.color);
  else if (s.type === "cone")
    path(
      [
        origin,
        ...Array.from({ length: 25 }, (_, i) => ({
          x: origin.x + Math.cos(a - s.radius / 2 + (s.radius * i) / 24) * r,
          y: origin.y + Math.sin(a - s.radius / 2 + (s.radius * i) / 24) * r,
        })),
      ],
      s.color,
      s.color,
    );
  else if (s.type === "line") {
    const nx = -Math.sin(a) * s.radius,
      ny = Math.cos(a) * s.radius,
      ex = origin.x + Math.cos(a) * r,
      ey = origin.y + Math.sin(a) * r;
    path(
      [
        { x: origin.x + nx, y: origin.y + ny },
        { x: ex + nx, y: ey + ny },
        { x: ex - nx, y: ey - ny },
        { x: origin.x - nx, y: origin.y - ny },
      ],
      s.color,
      s.color,
    );
  } else circle(target(origin, point, r), 0.7, s.color, s.color);
  ctx.restore();
}
function notice(t) {
  $("toast").textContent = t;
}
function spawn() {
  wave++;
  for (let i = 0; i < Math.min(3 + wave, 10); i++) {
    const a = i * 2.4 + wave,
      r = 9 + (i % 3);
    enemies.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      hp: 55 + wave * 5,
      max: 55 + wave * 5,
      wind: 0,
      cool: 1 + i * 0.15,
      mark: null,
    });
  }
  notice(`第 ${wave} 波 · 妖影渐近`);
}
function reset() {
  p = { x: 0, y: 0, hp: 100 };
  camera.x = 0;
  camera.y = 0;
  enemies = [];
  fx = [];
  cd = skills.map(() => 0);
  time = 0;
  kills = 0;
  wave = 0;
  attackCd = 0;
  invulnerable = 1;
  clearAim();
  paused = false;
  pc?.reset();
  joy = { x: 0, y: 0 };
  $("modal").close();
  spawn();
}
function hurt(e, n) {
  e.hp -= n;
  if (run) e.aggro = true;
  fx.push({ kind: "text", x: e.x, y: e.y, text: `−${n}`, life: 0.7, max: 0.7 });
  if (e.hp <= 0) {
    kills++;
    if (run) {
      const gear = recordKill(run, Boolean(e.boss));
      notice(gear ? `获得 ${gear.name} · 已收入行囊` : "行囊已满，未收取装备");
    }
  }
}
function cast(i) {
  if (paused || orientationBlocked || p.hp <= 0) return;
  const s = skills[i];
  if (s.disabled) {
    notice("此槽位未配置装备技能");
    return;
  }
  if (cd[i] > 0) {
    notice(`${s.name}尚在冷却`);
    return;
  }
  cd[i] = s.cd;
  skillCooldowns[s.id] = s.cd;
  const origin = { ...p },
    point = { ...aim };
  if (s.type === "dash") {
    const end = target(p, aim, s.range);
    p.x = clamp(end.x, -13, 13);
    p.y = clamp(end.y, -13, 13);
    invulnerable = 0.25;
    fx.push({ kind: "ring", ...origin, life: 0.4, max: 0.4, color: s.color });
  } else if (s.type === "heal") {
    p.hp = Math.min(stats().maxHp, p.hp + 35);
    fx.push({ kind: "ring", ...p, life: 0.6, max: 0.6, color: s.color });
  } else if (s.type === "circle") {
    fx.push({
      kind: "spell",
      s,
      origin,
      point,
      life: 0.65,
      max: 0.65,
      pending: true,
    });
  } else {
    enemies
      .filter((e) => e.hp > 0 && hits(s, origin, point, e))
      .forEach((e) => hurt(e, s.damage));
    fx.push({ kind: "spell", s, origin, point, life: 0.3, max: 0.3 });
  }
  notice(`${s.name} · 已释放`);
}
function attack() {
  if (paused || orientationBlocked || p.hp <= 0 || attackCd > 0) return;
  attackCd = 0.42;
  const s = {
    type: "cone",
    range: 2.7,
    radius: Math.PI * 0.65,
    color: "#f6e2a7",
  };
  enemies
    .filter((e) => e.hp > 0 && hits(s, p, aim, e))
    .forEach((e) => hurt(e, stats().attack));
  fx.push({
    kind: "spell",
    s,
    origin: { ...p },
    point: { ...aim },
    life: 0.18,
    max: 0.18,
  });
}
function pause() {
  if (p.hp <= 0 || orientationBlocked) return;
  paused = !paused;
  pc?.reset();
  clearAim();
  joy = { x: 0, y: 0 };
  if (paused) {
    $("restart").hidden = Boolean(run);
    $("modalTitle").textContent = "歇剑片刻";
    $("result").textContent = "战斗与冷却已暂停";
    $("resume").hidden = false;
    $("modal").showModal();
  } else $("modal").close();
}
skills.forEach((s, i) => {
  const b = document.createElement("button");
  b.innerHTML = `<b>${(touch.matches ? s.key : PC_KEYS[i]).toUpperCase()}</b>${s.name}<em></em>`;
  b.setAttribute("aria-label", s.name);
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    s = skills[i];
    if (s.disabled) {
      notice("此槽位未配置装备技能");
      return;
    }
    if (!touch.matches) {
      pc.selectSkill(i);
      return;
    }
    if (paused || orientationBlocked || skillPointer !== null) return;
    if (cd[i] > 0) {
      notice(`${s.name}尚在冷却`);
      return;
    }
    selected = i;
    skillPointer = e.pointerId;
    cancelArmed = false;
    document.body.classList.add("aiming");
    notice("拖动瞄准 · 移入右上取消区后松手取消");
    b.setPointerCapture(e.pointerId);
    b.dataset.x = e.clientX;
    b.dataset.y = e.clientY;
    const nearest = enemies
      .filter((e) => e.hp > 0)
      .sort((a, b) => distance(p, a) - distance(p, b))[0];
    aim = nearest ? { ...nearest } : { x: p.x + 5, y: p.y };
  });
  function updateAim(e) {
    s = skills[i];
    const r = $("cancelCast").getBoundingClientRect();
    cancelArmed =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;
    document.body.classList.toggle("cancel-armed", cancelArmed);
    $("cancelCast").textContent = cancelArmed ? "松手取消" : "拖入取消";
    const dx = e.clientX - Number(b.dataset.x),
      dy = e.clientY - Number(b.dataset.y);
    if (Math.hypot(dx, dy) > 8 && !cancelArmed) {
      const vx = dx + dy / 0.52,
        vy = dy / 0.52 - dx;
      const length = Math.hypot(vx, vy);
      const reach = s.range * Math.min(1, Math.hypot(dx, dy) / 72);
      aim = { x: p.x + (vx / length) * reach, y: p.y + (vy / length) * reach };
    }
  }
  b.addEventListener("pointermove", (e) => {
    if (selected === i && skillPointer === e.pointerId) updateAim(e);
  });
  b.addEventListener("pointerup", (e) => {
    if (skillPointer !== e.pointerId) return;
    updateAim(e);
    if (selected === i && !cancelArmed) cast(i);
    else notice("已取消施法 · 不消耗冷却");
    clearAim();
  });
  b.addEventListener("pointercancel", (e) => {
    if (skillPointer === e.pointerId) clearAim();
  });
  b.addEventListener("lostpointercapture", (e) => {
    if (skillPointer === e.pointerId) clearAim();
  });
  $("skills").append(b);
});
pc = createPCControls({
  canvas,
  touch,
  skills,
  camera,
  project,
  unproject,
  player: () => p,
  enemies: () => enemies,
  cooldowns: () => cd,
  blocked: () => paused || orientationBlocked || p.hp <= 0,
  actorHeight: (e) => ((48 * scale) / 22) * (e?.boss ? 1.7 : 1),
  menuOpen: () => $("adventurePanel").open,
  selected: () => selected,
  select: (i) => {
    selected = i;
  },
  clearAim,
  aim: (point) => {
    aim = point;
  },
  cast,
  attack,
  pause,
  notice,
  quickCast: () => $("quickCast").checked,
});
canvas.addEventListener("pointermove", (e) => {
  if (touch.matches) aim = unproject(e.clientX, e.clientY);
});
canvas.addEventListener("pointerdown", (e) => {
  if (touch.matches) {
    aim = unproject(e.clientX, e.clientY);
    if (e.button === 0) attack();
  }
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("blur", () => {
  if (!paused && p?.hp > 0) pause();
});
$("modal").addEventListener("cancel", (e) => {
  e.preventDefault();
  if (p.hp > 0) pause();
});
$("resume").onclick = pause;
$("pauseGame").onclick = pause;
$("restart").onclick = reset;
$("attack").onpointerdown = (e) => {
  e.preventDefault();
  const near = enemies
    .filter((e) => e.hp > 0)
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  if (near) aim = { ...near };
  attack();
};
const stick = $("stick");
function moveStick(e) {
  const r = stick.getBoundingClientRect(),
    x = (e.clientX - r.left - r.width / 2) / (r.width * 0.32),
    y = (e.clientY - r.top - r.height / 2) / (r.height * 0.32),
    d = Math.max(1, Math.hypot(x, y));
  joy = { x: x / d, y: y / d };
  stick.firstElementChild.style.transform = `translate(${joy.x * 30}px,${joy.y * 30}px)`;
}
stick.onpointerdown = (e) => {
  if (paused || orientationBlocked) return;
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
};
stick.onpointermove = (e) => {
  if (stick.hasPointerCapture(e.pointerId)) moveStick(e);
};
stick.onpointerup = stick.onpointercancel = () => {
  joy = { x: 0, y: 0 };
  stick.firstElementChild.style.transform = "none";
};
function update(dt) {
  if (paused || orientationBlocked) return;
  time += dt;
  attackCd = Math.max(0, attackCd - dt);
  invulnerable = Math.max(0, invulnerable - dt);
  cd = cd.map((v) => Math.max(0, v - dt));
  for (const id of Object.keys(skillCooldowns))
    skillCooldowns[id] = Math.max(0, skillCooldowns[id] - dt);
  skills.forEach((s, i) => {
    skillCooldowns[s.id] = cd[i];
  });
  pc.update(dt);
  let sx = joy.x,
    sy = joy.y;
  let vx = sx + sy,
    vy = sy - sx,
    d = Math.hypot(vx, vy);
  if (d > 0) {
    p.x = clamp(p.x + (vx / d) * 5 * dt, -13, 13);
    p.y = clamp(p.y + (vy / d) * 5 * dt, -13, 13);
  }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (run) {
      if (distance(e, p) < 6) e.aggro = true;
      if (!e.aggro) continue;
    }
    e.cool -= dt;
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0) {
        const radius = e.boss ? 3 : 1.65;
        if (
          run &&
          run.pet.bonded &&
          pet.hp > 0 &&
          distance(pet, e.mark) < radius
        )
          pet.hp = Math.max(0, pet.hp - (e.damage || 12));
        if (distance(p, e.mark) < radius && invulnerable <= 0) {
          p.hp = Math.max(
            0,
            p.hp - Math.max(1, (e.damage || 12) - stats().armor),
          );
          invulnerable = 0.3;
          notice("受到攻击 · 注意红色预警");
        }
        fx.push({
          kind: "ring",
          ...e.mark,
          life: 0.3,
          max: 0.3,
          color: "#ed8d79",
        });
        e.cool = 1.2;
        e.mark = null;
      }
    } else {
      const d = distance(e, p);
      if (d < (e.boss ? 4 : 2) && e.cool <= 0) {
        e.wind = e.boss ? 1.2 : 0.8;
        e.mark = { x: p.x, y: p.y };
      } else if (d > 1.3) {
        const speed = (e.speed || 1.8) * (e.boss && e.hp < e.max / 2 ? 1.4 : 1);
        e.x += ((p.x - e.x) / d) * speed * dt;
        e.y += ((p.y - e.y) / d) * speed * dt;
      }
    }
  }
  for (const f of fx) {
    f.life -= dt;
    if (f.pending && f.life <= 0) {
      f.pending = false;
      enemies
        .filter((e) => e.hp > 0 && hits(f.s, f.origin, f.point, e))
        .forEach((e) => hurt(e, f.s.damage));
      fx.push({
        kind: "ring",
        ...target(f.origin, f.point, f.s.range),
        life: 0.4,
        max: 0.4,
        color: f.s.color,
      });
    }
  }
  fx = fx.filter((f) => f.life > 0);
  enemies = enemies.filter((e) => e.hp > 0);
  if (!enemies.length && !run) spawn();
  if (run) {
    updatePet(dt);
    autosave += dt;
    if (autosave >= 5) {
      adventure.save();
      autosave = 0;
    }
  }
  if (p.hp <= 0) {
    if (run) {
      pendingRevive = resolveDeath(run) === "revive";
      adventure.save();
      showDeath();
      return;
    }
    paused = true;
    clearAim();
    $("modalTitle").textContent = "此番试炼，暂告一段";
    $("result").textContent =
      `击败 ${kills} 个妖影，抵达第 ${wave} 波。原型不计正式轮回。`;
    $("resume").hidden = true;
    $("modal").showModal();
  }
}
function actor(o, hero) {
  const q = project(o.x, o.y),
    s = (scale / 22) * (o.boss ? 1.7 : 1);
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.scale(s, s);
  ctx.fillStyle = "#071b1766";
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 6, 0, 0, 7);
  ctx.fill();
  const coat = run?.inventory.find((g) => g.id === run.equipment.coat);
  ctx.fillStyle = hero
    ? coat?.color || "#e2d9b4"
    : o.boss
      ? "#887a9c"
      : "#a36e69";
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(-13, -4);
  ctx.lineTo(14, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hero
    ? run?.gender === "female"
      ? "#75577b"
      : "#467c77"
    : "#583f48";
  ctx.fillRect(-7, -25, 14, 15);
  ctx.fillStyle = hero ? "#e8c7a3" : "#ceb49b";
  ctx.beginPath();
  ctx.arc(0, -36, 7, 0, 7);
  ctx.fill();
  ctx.fillStyle = hero ? "#243d38" : "#604348";
  ctx.beginPath();
  ctx.moveTo(-15, -38);
  ctx.lineTo(0, -48);
  ctx.lineTo(15, -38);
  ctx.closePath();
  ctx.fill();
  if (hero) {
    const weapon = run?.inventory.find((g) => g.id === run.equipment.weapon);
    ctx.strokeStyle = weapon?.color || "#dfe9d7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, -13);
    ctx.lineTo(26, -37);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#291f26";
    ctx.fillRect(-14, -55, 28, 3);
    ctx.fillStyle = "#df9687";
    ctx.fillRect(-14, -55, (28 * o.hp) / o.max, 3);
  }
  ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#193d3a");
  g.addColorStop(1, "#102722");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  path(
    [
      { x: -14, y: -14 },
      { x: 14, y: -14 },
      { x: 14, y: 14 },
      { x: -14, y: 14 },
    ],
    "#35514a",
    "#6c8971",
  );
  for (let x = -12; x <= 12; x += 2)
    for (let y = -12; y <= 12; y += 2) {
      path(
        [
          { x, y },
          { x: x + 1.92, y },
          { x: x + 1.92, y: y + 1.92 },
          { x, y: y + 1.92 },
        ],
        ((x + y) / 2) % 2 ? "#3a554b" : "#3d584d",
      );
    }
  circle({ x: 0, y: 0 }, 4, null, "#83927866");
  circle({ x: 0, y: 0 }, 4.5, null, "#83927844");
  for (const b of decor) {
    if (Math.abs(b.x) < 14 && Math.abs(b.y) < 14) continue;
    const q = project(b.x, b.y);
    ctx.strokeStyle = "#537f65";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(q.x - 4, q.y - b.h);
    ctx.stroke();
    ctx.fillStyle = "#305e4e";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(
        q.x + (i % 2 ? 9 : -9),
        q.y - b.h + i * 14,
        17,
        5,
        i % 2 ? 0.5 : -0.5,
        0,
        7,
      );
      ctx.fill();
    }
  }
  drawAdventure();
  for (const e of enemies)
    if (e.mark) {
      const radius = e.boss ? 3 : 1.65,
        duration = e.boss ? 1.2 : 0.8;
      circle(e.mark, radius, "#eb796b33", "#f99e89");
      circle(e.mark, radius * (1 - e.wind / duration), "#eb796b44");
    }
  if (!touch.matches) {
    if (pc.state.marker) circle(pc.state.marker, 0.35, null, "#b4e69c");
    if (pc.state.inspected) circle(pc.state.inspected, 0.65, null, "#ffc078");
    if (pc.state.preparingAttack) circle(p, 2.7, null, "#e7cf8d");
  }
  if (selected >= 0) {
    const preview = cancelArmed
      ? { ...skills[selected], color: "#ef7777" }
      : skills[selected];
    circle(p, preview.range, null, cancelArmed ? "#ef777799" : "#c5dfc399");
    shape(preview, p, aim, 0.45);
  }
  for (const f of fx) {
    if (f.kind === "spell")
      shape(f.s, f.origin, f.point, f.pending ? 0.35 : (f.life / f.max) * 0.7);
    else if (f.kind === "ring") {
      ctx.globalAlpha = f.life / f.max;
      circle(f, 1 + (1 - f.life / f.max) * 2, null, f.color);
      ctx.globalAlpha = 1;
    }
  }
  [...enemies.map((e) => ({ o: e, hero: false })), { o: p, hero: true }]
    .sort((a, b) => a.o.x + a.o.y - b.o.x - b.o.y)
    .forEach((v) => actor(v.o, v.hero));
  for (const f of fx)
    if (f.kind === "text") {
      const q = project(f.x, f.y, 45 + (1 - f.life / f.max) * 25);
      ctx.fillStyle = "#fff0c4";
      ctx.font = "bold 16px system-ui";
      ctx.fillText(f.text, q.x, q.y);
    }
  $("health").style.width = `${(p.hp / stats().maxHp) * 100}%`;
  $("status").textContent = `命息 ${p.hp} / ${stats().maxHp}`;
  $("stats").textContent = run
    ? `命灯 ${run.lives} · 续命符 ${run.reviveItems} · 轮回 ${run.reincarnations}`
    : `第 ${wave} 波 · 击败 ${kills} · ${Math.floor(time)} 秒`;
  if (run) updateAdventureHUD();
  [...$("skills").children].forEach((b, i) => {
    b.querySelector("em").textContent = cd[i] > 0 ? cd[i].toFixed(1) : "";
    b.classList.toggle("selected", selected === i);
  });
}
window.gameDebug = () => ({
  adventure: run
    ? {
        name: run.name,
        gender: run.gender,
        lives: run.lives,
        reviveItems: run.reviveItems,
        ended: run.ended,
        reincarnations: run.reincarnations,
        inventory: run.inventory.length,
        active: [...run.active],
        passive: [...run.passive],
        pet: { ...run.pet },
        bossDefeated: run.bossDefeated,
      }
    : null,
  zone,
  pendingRevive,
  player: { ...p },
  wave,
  kills,
  paused,
  cooldowns: [...cd],
  enemies: enemies.map((e) => ({ x: e.x, y: e.y, hp: e.hp })),
  selected,
  pc: pc
    ? {
        move: pc.state.move,
        target: pc.state.target
          ? {
              x: pc.state.target.x,
              y: pc.state.target.y,
              hp: pc.state.target.hp,
            }
          : null,
        attackMove: pc.state.attackMove,
        preparingAttack: pc.state.preparingAttack,
        hold: pc.state.hold,
      }
    : null,
  camera: { ...camera },
  cancelArmed,
  orientationBlocked,
  scale,
  heroScreen: project(p.x, p.y),
});
function refreshEquipment() {
  skills.forEach((s, i) => {
    skillCooldowns[s.id] = cd[i] || 0;
  });
  const next = run.active.map((id) => ACTIVE_BOOK.find((s) => s.id === id));
  const revised = baseSkills.map((base, i) =>
    i < 4
      ? next[i]
        ? { ...next[i], key: base.key }
        : { ...base, id: `empty${i}`, name: "空槽", disabled: true }
      : { ...base, id: i === 4 ? "flash" : "heal" },
  );
  skills.splice(0, skills.length, ...revised);
  cd = skills.map((s) => skillCooldowns[s.id] || 0);
  p.hp = Math.min(p.hp, stats().maxHp);
  [...$("skills").children].forEach((b, i) => {
    b.innerHTML = `<b>${(touch.matches ? baseSkills[i].key : PC_KEYS[i]).toUpperCase()}</b><span></span><em></em>`;
    b.querySelector("span").textContent = skills[i].name;
    b.setAttribute("aria-label", skills[i].name);
    b.classList.toggle("empty", Boolean(skills[i].disabled));
  });
  clearAim();
  pc?.reset();
}
function captureAdventure() {
  return {
    p: { ...p },
    enemies: enemies.filter((e) => e.hp > 0),
    fx: fx.filter((f) => f.pending),
    cd: [...cd],
    skillCooldowns: { ...skillCooldowns },
    time,
    kills,
    attackCd,
    invulnerable,
    zone,
    pet: { ...pet },
    pendingRevive,
    savedZones,
  };
}
function startAdventure(next, snapshot = null) {
  run = next;
  reset();
  zone = "overworld";
  savedZones = {};
  skillCooldowns = {};
  pendingRevive = false;
  pet = { x: 0, y: 0, hp: 40, cool: 0 };
  p = { x: 0, y: 0, hp: stats().maxHp };
  enemies = createWorld(run.seed, zone);
  kills = run.kills;
  refreshEquipment();
  if (snapshot) {
    p = { ...snapshot.p };
    enemies = snapshot.enemies;
    fx = Array.isArray(snapshot.fx) ? snapshot.fx : [];
    cd = [...snapshot.cd];
    skillCooldowns = snapshot.skillCooldowns || {};
    time = snapshot.time;
    kills = snapshot.kills;
    attackCd = snapshot.attackCd;
    invulnerable = snapshot.invulnerable;
    zone = snapshot.zone;
    pet = { ...snapshot.pet };
    pendingRevive = snapshot.pendingRevive;
    savedZones = snapshot.savedZones || {};
  }
  camera.x = p.x;
  camera.y = p.y;
  autosave = 0;
  paused = false;
  $("resume").hidden = false;
  $("restart").textContent = "返回归魂碑";
  if (p.hp <= 0 || run.ended) showDeath();
  else
    notice(
      snapshot ? "已恢复同一世的冒险" : "先清除三名妖影，再与西侧灵狐结缘",
    );
  adventure.save();
}
function showDeath() {
  paused = true;
  pc.reset();
  clearAim();
  $("restart").hidden = false;
  $("modalTitle").textContent = run.ended ? "命火已尽 · 本世终" : "命灯照归途";
  $("result").textContent = run.ended
    ? `${run.name} 本世击败 ${run.kills} 名敌人。可开启新的轮回。`
    : `重生机会已消耗；剩余命灯 ${run.lives}，续命符 ${run.reviveItems}。`;
  $("resume").hidden = true;
  $("restart").textContent = run.ended ? "轮回转世" : "重生";
  if (!$("modal").open) $("modal").showModal();
}
function restartAdventure() {
  if (!run) {
    reset();
    return;
  }
  if (run.ended) {
    $("modal").close();
    adventure.welcome(run);
    return;
  }
  if (!pendingRevive) {
    notice("仅死亡后可重生；请前往归魂碑休整");
    return;
  }
  savedZones[zone] = enemies;
  pendingRevive = false;
  zone = "overworld";
  p = { x: 0, y: 0, hp: stats().maxHp };
  enemies = savedZones.overworld || createWorld(run.seed, "overworld");
  fx = [];
  pet = { x: 0, y: 0, hp: 40, cool: 0 };
  pc.reset();
  camera.x = 0;
  camera.y = 0;
  invulnerable = 2;
  paused = false;
  $("modal").close();
  $("resume").hidden = false;
  adventure.save();
}
function inCombat() {
  return enemies.some((e) => e.hp > 0 && (e.wind > 0 || distance(e, p) < 6));
}
function interact() {
  if (!run || paused || orientationBlocked || p.hp <= 0) return;
  const mark = nearestLandmark(zone, p);
  if (mark.distance > 2.6) {
    notice(`靠近${mark.name}后再交互`);
    return;
  }
  if (inCombat()) {
    notice("附近有敌人，先脱战再交互");
    return;
  }
  if (mark.id === "camp") {
    p.hp = stats().maxHp;
    pet.hp = 40;
    pet.cool = 0;
    adventure.save();
    notice("归魂碑：生命与灵宠已恢复，进度已保存");
  }
  if (mark.id === "fox") {
    if (run.kills < 3) {
      notice("先清除三名妖影，解除灵狐周围的邪气");
      return;
    }
    run.pet.bonded = true;
    pet.hp = 40;
    pet.x = p.x - 1;
    pet.y = p.y;
    adventure.save();
    notice(`${run.pet.name}与你结缘，从此并肩同行`);
  }
  if (mark.id === "gate" || mark.id === "exit") {
    if (mark.id === "gate" && run.kills < 3) {
      notice("清除三名妖影后，古寺封印才会解除");
      return;
    }
    savedZones[zone] = enemies;
    zone = mark.id === "gate" ? "dungeon" : "overworld";
    enemies = savedZones[zone] || createWorld(run.seed, zone);
    p.x = zone === "dungeon" ? -9 : 7;
    p.y = zone === "dungeon" ? -9 : 3;
    pet.x = p.x - 1;
    pet.y = p.y;
    fx = [];
    pc.reset();
    camera.x = p.x;
    camera.y = p.y;
    adventure.save();
    notice(
      zone === "dungeon" ? "古寺：寻找镇寺石魁，避开其蓄力重击" : "返回山野",
    );
  }
}
function updatePet(dt) {
  if (!run.pet.bonded || pet.hp <= 0) return;
  const d = distance(pet, p);
  if (d > 1.3) {
    const step = Math.min(d - 1.3, 6 * dt);
    pet.x += ((p.x - pet.x) / d) * step;
    pet.y += ((p.y - pet.y) / d) * step;
  }
  pet.cool = Math.max(0, pet.cool - dt);
  if (pet.cool > 0) return;
  const enemy = enemies
    .filter((e) => e.hp > 0 && distance(e, pet) < 5 && e.aggro)
    .sort((a, b) => distance(a, pet) - distance(b, pet))[0];
  if (enemy) {
    hurt(enemy, 8);
    pet.cool = 2.5;
    fx.push({
      kind: "ring",
      x: enemy.x,
      y: enemy.y,
      color: "#d9e9c1",
      life: 0.35,
      max: 0.35,
    });
  }
}
function updateAdventureHUD() {
  const task = run.bossDefeated
    ? "古寺已通关 · 返回归魂碑保存"
    : run.kills < 3
      ? `清除妖影 ${run.kills}/3 · 获得续命符`
      : !run.pet.bonded
        ? "西侧灵狐等待结缘 · 坐标 -5, 2"
        : zone === "overworld"
          ? "前往东侧古寺入口 · 坐标 8, 4"
          : "击败镇寺石魁 · 坐标 7, 7";
  $("questHUD").textContent =
    `${zone === "dungeon" ? "古寺" : "山野"} · ${task}`;
  const near = nearestLandmark(zone, p);
  $("interactButton").textContent =
    near.distance <= 2.6 ? `${near.name} · 交互` : "交互 T";
}
function drawAdventure() {
  if (!run) return;
  const mapSize = touch.matches ? 86 : 130,
    mapX = touch.matches ? 24 : 28,
    mapY = touch.matches ? 114 : 300;
  ctx.fillStyle = "#102b24bb";
  ctx.fillRect(mapX, mapY, mapSize, mapSize);
  ctx.strokeStyle = "#8fa384";
  ctx.strokeRect(mapX, mapY, mapSize, mapSize);
  const dot = (v, color, r) => {
    const x = mapX + mapSize / 2 + ((v.x - v.y) * mapSize) / 60,
      y = mapY + mapSize / 2 + ((v.x + v.y) * mapSize) / 60;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const v of LANDMARKS[zone]) dot(v, v.color, 4);
  for (const e of enemies)
    if (e.hp > 0) dot(e, e.boss ? "#f8a354" : "#cf8278", e.boss ? 4 : 2);
  dot(p, "#f7f4c9", 4);
  for (const mark of LANDMARKS[zone]) {
    const q = project(mark.x, mark.y);
    circle(mark, 0.8, "#b3c99633", mark.color);
    ctx.fillStyle = mark.color;
    ctx.fillRect(q.x - 8, q.y - 42, 16, 35);
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      mark.id === "fox" && run.pet.bonded ? "灵契旧址" : mark.name,
      q.x,
      q.y - 51,
    );
    ctx.textAlign = "start";
  }
  if (run.pet.bonded && pet.hp > 0) {
    const q = project(pet.x, pet.y);
    circle(pet, 0.3, "#071b1766");
    ctx.fillStyle = "#e7e7ce";
    ctx.beginPath();
    ctx.ellipse(q.x, q.y - 10, 14, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(q.x + 6, q.y - 14);
    ctx.lineTo(q.x + 10, q.y - 27);
    ctx.lineTo(q.x + 16, q.y - 14);
    ctx.fill();
    ctx.fillStyle = "#9abb8b";
    ctx.fillRect(q.x - 15, q.y - 33, (30 * Math.max(0, pet.hp)) / 40, 3);
  }
}
adventure = createAdventureUI({
  run: () => run,
  capture: captureAdventure,
  start: startAdventure,
  notice,
  changed: refreshEquipment,
  canConfigure: () => !inCombat(),
  petDown: () => pet.hp <= 0,
  interact,
  menu: (open) => {
    paused = open;
    pc?.reset();
    clearAim();
  },
});
$("restart").onclick = restartAdventure;
reset();
if (!trial) {
  paused = true;
  adventure.welcome();
} else {
  document.body.classList.add("trial-mode");
}
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.04);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
