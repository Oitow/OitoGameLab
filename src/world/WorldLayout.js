/** Stable seeded scenery data shared by rendering and collision adapters. */
export class WorldLayout {
  constructor(terrain, { exclude = [], treeCount = 100, rockCount = 24 } = {}) {
    this.objects = [];
    const spawn = terrain.findSpawn();
    const clearings = [
      { ...spawn, radius: 4.5 },
      ...exclude.map((p) => ({ ...p, radius: p.radius ?? 1.5 })),
    ];
    const extent = Math.min(terrain.size / 2 - 3, 30);
    for (const [kind, count, salt] of [
      ["tree", treeCount, 137],
      ["rock", rockCount, 751],
    ]) {
      let placed = 0;
      for (let i = 0; i < 6000 && placed < count; i++) {
        const x = (terrain.hash(i * 7 + salt, 11) - 0.5) * extent * 2;
        const z = (terrain.hash(i * 13 + salt, 29) - 0.5) * extent * 2;
        const scale = 0.75 + terrain.hash(i + salt, 57) * 0.65;
        const radius = (kind === "tree" ? 0.23 : 0.62) * scale;
        const height = (kind === "tree" ? 3.2 : 0.85) * scale;
        const y = terrain.height(x, z);
        if (y < (kind === "tree" ? 1.35 : 0.8)) continue;
        if (
          [
            [x, z],
            [x + radius, z],
            [x - radius, z],
            [x, z + radius],
            [x, z - radius],
          ].some(([sx, sz]) => !terrain.walkable(sx, sz))
        )
          continue;
        if (
          clearings.some(
            (p) => Math.hypot(x - p.x, z - p.z) < radius + p.radius,
          )
        )
          continue;
        if (
          this.objects.some(
            (p) => Math.hypot(x - p.x, z - p.z) < radius + p.radius + 0.65,
          )
        )
          continue;
        this.objects.push({
          id: `${kind}-${placed++}`,
          kind,
          x,
          z,
          y,
          radius,
          height,
          scale,
        });
      }
    }
  }
}
