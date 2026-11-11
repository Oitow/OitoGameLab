/** Stable seeded scenery data shared by rendering and collision adapters. */
export class WorldLayout {
  constructor(terrain, { exclude = [], treeCount = 100, rockCount = 24 } = {}) {
    this.objects = [];
    this.decorations = [];
    const spawn = terrain.findSpawn();
    const clearings = [
      { ...spawn, radius: 4.5 },
      ...exclude.map((p) => ({ ...p, radius: p.radius ?? 1.5 })),
    ];
    const extent = terrain.size / 2 - 3;
    const clear = (x, z, radius) =>
      clearings.every((p) => Math.hypot(x - p.x, z - p.z) >= radius + p.radius);
    for (const [kind, count, salt] of [
      ["tree", treeCount, 137],
      ["rock", rockCount, 751],
    ]) {
      let placed = 0;
      for (let i = 0; i < 10000 && placed < count; i++) {
        const x = (terrain.hash(i * 7 + salt, 11) - 0.5) * extent * 2;
        const z = (terrain.hash(i * 13 + salt, 29) - 0.5) * extent * 2;
        const variation = terrain.hash(i + salt, 57);
        const height = kind === "tree" ? 8 + variation * 8 : 0.6 + variation * 1.6;
        const radius = kind === "tree" ? height * 0.033 : 0.55 + variation * 0.9;
        const scale = kind === "tree" ? height / 10 : height;
        const y = terrain.height(x, z);
        if (y < (kind === "tree" ? 1.8 : 0.8)) continue;
        if (
          [
            [x, z],
            [x + radius, z],
            [x - radius, z],
            [x, z + radius],
            [x, z - radius],
          ].some(([sx, sz]) => !terrain.walkable(sx, sz) || Math.abs(terrain.height(sx, sz) - y) > radius * 0.65)
        )
          continue;
        if (!clear(x, z, radius)) continue;
        // Sparse groves leave routes between trunks. Canopies may overlap.
        if (
          this.objects.some(
            (p) => Math.hypot(x - p.x, z - p.z) < radius + p.radius + (kind === "tree" ? 3 : 0.65),
          )
        )
          continue;
        const species = terrain.noise(x * 0.035 + 20, z * 0.035) > 0.5 ? "pine" : "oak";
        this.objects.push({
          id: `${kind}-${placed++}`,
          kind,
          x,
          z,
          y,
          radius,
          height,
          scale,
          species,
          variation,
          yaw: terrain.hash(i + salt, 83) * Math.PI * 2,
          canopyRadius: height * (species === "pine" ? 0.19 : 0.27),
        });
      }
    }
    // Visual-only ground cover is deliberately independent of solid footprints.
    // Its separate sequence keeps object IDs stable when foliage budgets change.
    for (let i = 0; i < 3000 && this.decorations.length < 500; i++) {
      const x = (terrain.hash(i + 1591, 71) - 0.5) * extent * 2;
      const z = (terrain.hash(i + 1591, 97) - 0.5) * extent * 2;
      const y = terrain.height(x, z);
      if (y < 1.5 || !terrain.walkable(x, z) || !clear(x, z, 0.25)) continue;
      if (this.objects.some((o) => Math.hypot(o.x - x, o.z - z) < o.radius + 0.4)) continue;
      this.decorations.push({
        x, y, z,
        scale: 0.35 + terrain.hash(i + 1591, 19) * 0.65,
        variant: terrain.hash(i + 1591, 37) > 0.8 ? 1 : 0,
        yaw: terrain.hash(i + 1591, 53) * Math.PI * 2,
      });
    }
  }
}
