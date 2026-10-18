export const PC_KEYS = ["q", "w", "e", "r", "d", "f"];

// PC commands are separate from touch input and world-space combat rules.
export function createPCControls(api) {
  const state = {
    move: null,
    target: null,
    inspected: null,
    attackMove: false,
    preparingAttack: false,
    hold: false,
    marker: null,
    pointer: null,
    centerHeld: false,
    quickKey: null,
  };
  const enabled = () => !api.touch.matches;
  const blocked = () => !enabled() || api.blocked();
  function stop() {
    state.move = null;
    state.target = null;
    state.attackMove = false;
    state.preparingAttack = false;
    state.hold = false;
  }
  function cancel() {
    state.quickKey = null;
    api.clearAim();
    state.preparingAttack = false;
  }
  function pick(point) {
    return (
      api
        .enemies()
        .filter((e) => e.hp > 0)
        .map((e) => {
          const q = api.project(e.x, e.y);
          const height = api.actorHeight(e);
          const dx = Math.abs(point.x - q.x),
            dy = point.y - q.y;
          return {
            e,
            score: Math.hypot(dx, dy + height * 0.5),
            hit: dx < height * 0.42 && dy < height * 0.15 && dy > -height * 1.2,
          };
        })
        .filter((v) => v.hit)
        .sort((a, b) => a.score - b.score)[0]?.e || null
    );
  }
  function selectSkill(i, keyboard = false) {
    if (blocked() || api.skills[i].disabled) return;
    cancel();
    if (api.cooldowns()[i] > 0) {
      api.notice("技能尚在冷却");
      return;
    }
    if (api.quickCast() && keyboard) {
      state.quickKey = PC_KEYS[i];
      api.select(i);
      api.notice("按住瞄准 · 松键释放 · 右键 / Esc 取消");
    } else if (api.skills[i].type === "heal") {
      api.cast(i);
      api.clearAim();
    } else {
      api.select(i);
      api.notice("左键确认施法 · 右键 / Esc 取消");
    }
  }
  function issue(point, attackMove = false) {
    stop();
    const ground = api.unproject(point.x, point.y);
    state.target = pick(point);
    state.inspected = state.target;
    state.move = {
      x: Math.max(-13, Math.min(13, ground.x)),
      y: Math.max(-13, Math.min(13, ground.y)),
    };
    state.attackMove = attackMove;
    if (state.target && api.selected() < 0) {
      const p = api.player();
      if (Math.hypot(state.target.x - p.x, state.target.y - p.y) <= 2.4) {
        api.aim({ ...state.target });
        api.attack();
      }
    }
    state.marker = { ...state.move, life: 0.65 };
    api.notice(
      state.target ? "追击攻击" : attackMove ? "攻击移动" : "前往目标位置",
    );
  }
  api.canvas.addEventListener("pointermove", (e) => {
    if (!enabled()) return;
    state.pointer = { x: e.clientX, y: e.clientY };
    api.aim(api.unproject(e.clientX, e.clientY));
  });
  api.canvas.addEventListener("pointerleave", () => (state.pointer = null));
  api.canvas.addEventListener("pointerdown", (e) => {
    if (blocked()) return;
    state.pointer = { x: e.clientX, y: e.clientY };
    api.aim(api.unproject(e.clientX, e.clientY));
    if (e.button === 2) {
      e.preventDefault();
      cancel();
      issue(state.pointer);
    } else if (e.button === 0) {
      if (api.selected() >= 0) {
        if (state.quickKey !== null) return;
        api.cast(api.selected());
        api.clearAim();
      } else if (state.preparingAttack) {
        issue(state.pointer, true);
      } else {
        if (pick(state.pointer)) issue(state.pointer);
        else {
          state.inspected = null;
          api.notice("左键点击怪物攻击 · 右键地面移动");
        }
      }
    }
  });
  addEventListener("keydown", (e) => {
    if (
      !enabled() ||
      api.menuOpen?.() ||
      e.target.closest?.('input:not([type="checkbox"]),select,textarea')
    )
      return;
    const key = e.key.toLowerCase();
    if ([...PC_KEYS, "a", "s", "h", "y", " ", "escape"].includes(key))
      e.preventDefault();
    if (e.repeat) return;
    if (key === "escape") {
      if (api.selected() >= 0 || state.preparingAttack) {
        cancel();
        api.notice("已取消指令");
      } else api.pause();
      return;
    }
    if (blocked()) return;
    if (state.pointer) api.aim(api.unproject(state.pointer.x, state.pointer.y));
    const i = PC_KEYS.indexOf(key);
    if (i >= 0) {
      selectSkill(i, true);
      return;
    }
    if (key === "a") {
      cancel();
      state.preparingAttack = true;
      api.notice("攻击移动：左键确认");
    }
    if (key === "s" || key === "h") {
      stop();
      cancel();
      state.hold = key === "h";
      api.notice(key === "h" ? "原地待命：攻击范围内敌人" : "停止移动与攻击");
    }
    if (key === "y") {
      api.camera.locked = !api.camera.locked;
      api.notice(
        api.camera.locked ? "镜头已锁定" : "镜头已解锁 · 屏幕边缘移动镜头",
      );
    }
    if (key === " ") {
      state.centerHeld = true;
    }
  });
  addEventListener("keyup", (e) => {
    if (e.key === " ") state.centerHeld = false;
    const key = e.key.toLowerCase();
    if (state.quickKey !== key) return;
    const i = PC_KEYS.indexOf(key);
    if (!blocked() && i >= 0 && api.selected() === i) {
      if (state.pointer)
        api.aim(api.unproject(state.pointer.x, state.pointer.y));
      api.cast(i);
    }
    cancel();
  });
  function update(dt) {
    if (blocked()) return;
    if (state.marker) {
      state.marker.life -= dt;
      if (state.marker.life <= 0) state.marker = null;
    }
    if (state.target?.hp <= 0) {
      state.target = null;
      if (!state.attackMove) state.move = null;
    }
    if (state.inspected?.hp <= 0) state.inspected = null;
    const player = api.player();
    if ((state.attackMove || state.hold) && !state.target) {
      const radius = state.hold ? 2.4 : 5;
      state.target =
        api
          .enemies()
          .filter(
            (e) =>
              e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) <= radius,
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - player.x, a.y - player.y) -
              Math.hypot(b.x - player.x, b.y - player.y),
          )[0] || null;
    }
    if (
      state.hold &&
      state.target &&
      Math.hypot(state.target.x - player.x, state.target.y - player.y) > 2.4
    )
      state.target = null;
    const goal = state.target || state.move;
    if (goal) {
      const distance = Math.hypot(goal.x - player.x, goal.y - player.y);
      const range = state.target ? 2.3 : 0.08;
      if (distance > range && !state.hold) {
        const step = Math.min(5 * dt, distance - range);
        player.x = Math.max(
          -13,
          Math.min(13, player.x + ((goal.x - player.x) / distance) * step),
        );
        player.y = Math.max(
          -13,
          Math.min(13, player.y + ((goal.y - player.y) / distance) * step),
        );
      } else if (state.target && distance <= 2.4 && api.selected() < 0) {
        api.aim({ ...state.target });
        api.attack();
      } else if (!state.target) {
        state.move = null;
        state.attackMove = false;
      }
    }
    if (api.camera.locked || state.centerHeld) {
      api.camera.x = player.x;
      api.camera.y = player.y;
    } else if (state.pointer) {
      const edge = 16,
        speed = 7 * dt;
      const dx =
        state.pointer.x < edge
          ? -1
          : state.pointer.x > innerWidth - edge
            ? 1
            : 0;
      const dy =
        state.pointer.y < edge
          ? -1
          : state.pointer.y > innerHeight - edge
            ? 1
            : 0;
      api.camera.x = Math.max(
        -16,
        Math.min(16, api.camera.x + (dx + dy) * speed),
      );
      api.camera.y = Math.max(
        -16,
        Math.min(16, api.camera.y + (dy - dx) * speed),
      );
    }
    if (state.pointer && api.selected() >= 0)
      api.aim(api.unproject(state.pointer.x, state.pointer.y));
  }
  function reset() {
    stop();
    state.inspected = null;
    state.marker = null;
    state.pointer = null;
    state.centerHeld = false;
    cancel();
  }
  return { state, update, reset, selectSkill };
}
