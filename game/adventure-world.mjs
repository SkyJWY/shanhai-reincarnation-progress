export const LANDMARKS = {
  overworld: [
    { id: "camp", x: 0, y: 0, name: "归魂碑", color: "#d5c28b" },
    { id: "fox", x: -5, y: 2, name: "受困灵狐", color: "#dae4da" },
    { id: "gate", x: 8, y: 4, name: "古寺入口", color: "#bda9d4" },
  ],
  dungeon: [{ id: "exit", x: -9, y: -9, name: "离开古寺", color: "#d5c28b" }],
};
export function createWorld(seed, zone) {
  let rng = seed >>> 0;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const sites =
    zone === "dungeon"
      ? [
          [-4, -2],
          [2, -4],
          [4, 3],
        ]
      : [
          [-8, -5],
          [-5, -8],
          [7, -5],
          [10, -1],
          [-9, 6],
          [4, 9],
        ];
  const enemies = sites.map(([x, y], i) => {
    const hp = zone === "dungeon" ? 75 : 55;
    return {
      x: x + (random() - 0.5) * 2,
      y: y + (random() - 0.5) * 2,
      hp,
      max: hp,
      cool: 1,
      wind: 0,
      mark: null,
      boss: false,
      name: ["山魈", "游魂", "苔妖"][Math.floor(random() * 3)],
      damage: 10,
      speed: 1.5,
      aggro: false,
    };
  });
  if (zone === "dungeon")
    enemies.push({
      x: 7,
      y: 7,
      hp: 360,
      max: 360,
      cool: 1.5,
      wind: 0,
      mark: null,
      boss: true,
      name: "镇寺石魁",
      damage: 22,
      speed: 1.2,
      aggro: false,
    });
  return enemies;
}
export function nearestLandmark(zone, point) {
  return LANDMARKS[zone]
    .map((v) => ({ ...v, distance: Math.hypot(point.x - v.x, point.y - v.y) }))
    .sort((a, b) => a.distance - b.distance)[0];
}
