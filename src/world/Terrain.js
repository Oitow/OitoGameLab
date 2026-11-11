const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Pure seeded heightfield. Units: metres, +Y up, X/Z ground. */
export class Terrain {
  constructor(seed = 12345) {
    this.seed = seed >>> 0;
    this.size = 200;
  }
  hash(x, z) {
    const v = Math.sin(x * 127.1 + z * 311.7 + this.seed * 0.173) * 43758.5453;
    return v - Math.floor(v);
  }
  noise(x, z) {
    const ix = Math.floor(x),
      iz = Math.floor(z);
    const fx = x - ix,
      fz = z - iz;
    const u = fx * fx * (3 - 2 * fx),
      v = fz * fz * (3 - 2 * fz);
    return lerp(
      lerp(this.hash(ix, iz), this.hash(ix + 1, iz), u),
      lerp(this.hash(ix, iz + 1), this.hash(ix + 1, iz + 1), u),
      v,
    );
  }
  height(x, z) {
    const angle = Math.atan2(z, x);
    const radius = Math.hypot(x, z) / 84;
    const coastline =
      1 +
      0.09 * Math.sin(angle * 5 + this.seed) +
      0.06 * Math.cos(angle * 9 - this.seed);
    const mask = clamp((coastline - radius) * 5, 0, 1);
    const hills =
      (this.noise(x * 0.024, z * 0.024) - 0.5) * 6.5 +
      (this.noise(x * 0.068 + 8, z * 0.068 - 13) - 0.5) * 1.2;
    // Broad wavelengths keep slopes traversable at a human walking speed.
    return -2 + mask * (8 + hills);
  }
  findSpawn() {
    for (let radius = 0; radius <= 20; radius++)
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI) / 12,
          x = Math.cos(angle) * radius,
          z = Math.sin(angle) * radius;
        if (this.walkable(x, z) && this.height(x, z) > 1.1) return { x, z };
      }
    return { x: 0, z: 0 };
  }
  walkable(x, z) {
    return (
      Math.abs(x) <= this.size / 2 &&
      Math.abs(z) <= this.size / 2 &&
      this.height(x, z) > 0.45
    );
  }
}
