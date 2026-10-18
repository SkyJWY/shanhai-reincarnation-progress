export const skills = [
  {
    key: "1",
    name: "破风剑",
    type: "line",
    range: 9,
    radius: 0.65,
    damage: 32,
    cd: 2,
    color: "#8fe5dc",
  },
  {
    key: "2",
    name: "横扫",
    type: "cone",
    range: 4,
    radius: Math.PI / 3,
    damage: 40,
    cd: 5,
    color: "#e5cf83",
  },
  {
    key: "3",
    name: "落雷",
    type: "circle",
    range: 10,
    radius: 2.3,
    damage: 52,
    cd: 7,
    color: "#b9a4ff",
  },
  {
    key: "4",
    name: "燕回步",
    type: "dash",
    range: 5,
    radius: 0,
    damage: 0,
    cd: 4,
    color: "#93d9ce",
  },
  {
    key: "f",
    name: "闪现",
    type: "dash",
    range: 7,
    radius: 0,
    damage: 0,
    cd: 12,
    color: "#edc788",
  },
  {
    key: "g",
    name: "回春",
    type: "heal",
    range: 0,
    radius: 0,
    damage: 0,
    cd: 16,
    color: "#9fe0ad",
  },
];
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function target(origin, point, range) {
  const d = distance(origin, point);
  const k = d ? Math.min(1, range / d) : 0;
  return {
    x: origin.x + (point.x - origin.x) * k,
    y: origin.y + (point.y - origin.y) * k,
  };
}
export function hits(s, p, aim, e) {
  const dx = aim.x - p.x,
    dy = aim.y - p.y,
    a = Math.atan2(dy, dx),
    ex = e.x - p.x,
    ey = e.y - p.y;
  if (s.type === "circle")
    return distance(target(p, aim, s.range), e) <= s.radius + 0.35;
  const along = ex * Math.cos(a) + ey * Math.sin(a),
    side = Math.abs(-ex * Math.sin(a) + ey * Math.cos(a));
  if (s.type === "line")
    return along >= 0 && along <= s.range && side <= s.radius + 0.35;
  if (s.type === "cone")
    return (
      distance(p, e) <= s.range + 0.35 &&
      along >= 0 &&
      Math.abs(Math.atan2(side, along)) <= s.radius / 2
    );
  return false;
}
