export const scavenger = {
  id: "scavenger",
  name: "Kristallsuche",
  create(terrain) {
    const markers = [];
    for (let i = 0; i < 2000 && markers.length < 8; i++) {
      const x = (terrain.hash(i, 41) - 0.5) * 42,
        z = (terrain.hash(i, 93) - 0.5) * 42;
      if (
        terrain.walkable(x, z) &&
        Math.hypot(x, z) > 3 &&
        markers.every((m) => Math.hypot(x - m.x, z - m.z) > 3)
      )
        markers.push({
          id: markers.length,
          x,
          z,
          y: terrain.height(x, z) + 0.8,
        });
    }
    return {
      markers,
      collected: [],
      step(dt, player) {
        for (const m of markers)
          if (
            !this.collected.includes(m.id) &&
            Math.hypot(player.x - m.x, player.z - m.z) < 1.3 &&
            Math.abs(player.y - (m.y - 0.8)) < 2
          )
            this.collected.push(m.id);
      },
      status() {
        return this.collected.length === markers.length
          ? "Alle Kristalle gefunden! Neue Insel?"
          : `Kristalle ${this.collected.length} / ${markers.length}`;
      },
    };
  },
};
