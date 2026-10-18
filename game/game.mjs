import { skills, clamp, distance, target, hits } from "./rules.mjs";
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
  keys = new Set(),
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
  keys.clear();
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
  x: W / 2 + (x - (p?.x || 0) - y + (p?.y || 0)) * scale,
  y: H * 0.5 + (x - (p?.x || 0) + y - (p?.y || 0)) * scale * 0.52 - z,
});
function unproject(x, y) {
  const a = (x - W / 2) / scale,
    b = (y - H * 0.5) / (scale * 0.52);
  return { x: (p?.x || 0) + (a + b) / 2, y: (p?.y || 0) + (b - a) / 2 };
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
  keys.clear();
  joy = { x: 0, y: 0 };
  $("modal").close();
  spawn();
}
function hurt(e, n) {
  e.hp -= n;
  fx.push({ kind: "text", x: e.x, y: e.y, text: `−${n}`, life: 0.7, max: 0.7 });
  if (e.hp <= 0) kills++;
}
function cast(i) {
  if (paused || orientationBlocked || p.hp <= 0) return;
  const s = skills[i];
  if (cd[i] > 0) {
    notice(`${s.name}尚在冷却`);
    return;
  }
  cd[i] = s.cd;
  const origin = { ...p },
    point = { ...aim };
  if (s.type === "dash") {
    const end = target(p, aim, s.range);
    p.x = clamp(end.x, -13, 13);
    p.y = clamp(end.y, -13, 13);
    invulnerable = 0.25;
    fx.push({ kind: "ring", ...origin, life: 0.4, max: 0.4, color: s.color });
  } else if (s.type === "heal") {
    p.hp = Math.min(100, p.hp + 35);
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
    .forEach((e) => hurt(e, 18));
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
  keys.clear();
  clearAim();
  joy = { x: 0, y: 0 };
  if (paused) {
    $("modalTitle").textContent = "歇剑片刻";
    $("result").textContent = "战斗与冷却已暂停";
    $("resume").hidden = false;
    $("modal").showModal();
  } else $("modal").close();
}
skills.forEach((s, i) => {
  const b = document.createElement("button");
  b.innerHTML = `<b>${s.key.toUpperCase()}</b>${s.name}<em></em>`;
  b.setAttribute("aria-label", s.name);
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
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
canvas.addEventListener("pointermove", (e) => {
  aim = unproject(e.clientX, e.clientY);
});
canvas.addEventListener("pointerdown", (e) => {
  aim = unproject(e.clientX, e.clientY);
  if (e.button === 0) attack();
  else {
    clearAim();
    notice("已取消施法");
  }
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["1", "2", "3", "4", "f", "g", "w", "a", "s", "d", "escape"].includes(k))
    e.preventDefault();
  if (e.repeat) return;
  if (k === "escape") {
    if (selected >= 0) {
      clearAim();
      notice("已取消施法");
      return;
    }
    pause();
    return;
  }
  keys.add(k);
  const i = skills.findIndex((s) => s.key === k);
  if (i >= 0 && !paused && !orientationBlocked) {
    selected = i;
    cancelArmed = false;
  }
});
addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  keys.delete(k);
  const i = skills.findIndex((s) => s.key === k);
  if (i >= 0 && selected === i) {
    cast(i);
    selected = -1;
  }
});
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
  let sx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + joy.x,
    sy = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0) + joy.y;
  let vx = sx + sy,
    vy = sy - sx,
    d = Math.hypot(vx, vy);
  if (d > 0) {
    p.x = clamp(p.x + (vx / d) * 5 * dt, -13, 13);
    p.y = clamp(p.y + (vy / d) * 5 * dt, -13, 13);
  }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    e.cool -= dt;
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0) {
        if (distance(p, e.mark) < 1.65 && invulnerable <= 0) {
          p.hp = Math.max(0, p.hp - 12);
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
      if (d < 2 && e.cool <= 0) {
        e.wind = 0.8;
        e.mark = { x: p.x, y: p.y };
      } else if (d > 1.3) {
        e.x += ((p.x - e.x) / d) * 1.8 * dt;
        e.y += ((p.y - e.y) / d) * 1.8 * dt;
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
  if (!enemies.length) spawn();
  if (p.hp <= 0) {
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
    s = scale / 22;
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.scale(s, s);
  ctx.fillStyle = "#071b1766";
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 6, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = hero ? "#e2d9b4" : "#a36e69";
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(-13, -4);
  ctx.lineTo(14, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hero ? "#467c77" : "#583f48";
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
    ctx.strokeStyle = "#dfe9d7";
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
  for (const e of enemies)
    if (e.mark) {
      circle(e.mark, 1.65, "#eb796b33", "#f99e89");
      circle(e.mark, 1.65 * (1 - e.wind / 0.8), "#eb796b44");
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
  $("health").style.width = `${p.hp}%`;
  $("status").textContent = `命息 ${p.hp} / 100`;
  $("stats").textContent =
    `第 ${wave} 波 · 击败 ${kills} · ${Math.floor(time)} 秒`;
  [...$("skills").children].forEach((b, i) => {
    b.querySelector("em").textContent = cd[i] > 0 ? cd[i].toFixed(1) : "";
    b.classList.toggle("selected", selected === i);
  });
}
window.gameDebug = () => ({
  player: { ...p },
  wave,
  kills,
  paused,
  cooldowns: [...cd],
  enemies: enemies.map((e) => ({ x: e.x, y: e.y, hp: e.hp })),
  selected,
  cancelArmed,
  orientationBlocked,
  scale,
  heroScreen: project(p.x, p.y),
});
reset();
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.04);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
