const EPSILON = 1e-5;

/**
 * Swept circles for static X/Z footprints only. Obstacles have no dynamic bodies,
 * height response, or walkable tops: their footprint remains solid while jumping.
 * A full 3D physics adapter should replace this when those features are required.
 */
export class StaticCollisions {
  constructor(objects = []) {
    this.objects = objects.map(({ id, x, z, radius }) => ({
      id,
      x,
      z,
      radius,
    }));
    if (
      this.objects.some(
        (o) =>
          !Number.isFinite(o.x) ||
          !Number.isFinite(o.z) ||
          !Number.isFinite(o.radius) ||
          o.radius <= 0,
      )
    ) {
      throw new TypeError(
        "Static collider positions and positive radii must be finite",
      );
    }
  }

  isFree(x, z, radius = 0.35) {
    return this.objects.every(
      (o) => Math.hypot(x - o.x, z - o.z) >= radius + o.radius - EPSILON,
    );
  }

  move(x, z, dx, dz, radius = 0.35) {
    let blocked = false;
    // Recover small overlaps deterministically (e.g. after changing body radius).
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (const o of this.objects) {
        const ox = x - o.x,
          oz = z - o.z;
        const distance = Math.hypot(ox, oz),
          clearance = o.radius + radius;
        if (distance < clearance - EPSILON) {
          const nx = distance > EPSILON ? ox / distance : 1;
          const nz = distance > EPSILON ? oz / distance : 0;
          x = o.x + nx * (clearance + EPSILON);
          z = o.z + nz * (clearance + EPSILON);
          blocked = changed = true;
        }
      }
      if (!changed) break;
    }

    for (let pass = 0; pass < 5 && Math.hypot(dx, dz) > EPSILON; pass++) {
      const lengthSquared = dx * dx + dz * dz;
      let firstTime = 1,
        hit = null;
      for (const o of this.objects) {
        const ox = x - o.x,
          oz = z - o.z,
          clearance = radius + o.radius;
        const approach = ox * dx + oz * dz;
        if (approach >= 0) continue;
        const discriminant =
          approach * approach -
          lengthSquared * (ox * ox + oz * oz - clearance * clearance);
        if (discriminant < 0) continue;
        const time = (-approach - Math.sqrt(discriminant)) / lengthSquared;
        if (time >= -EPSILON && time < firstTime) {
          firstTime = Math.max(0, time);
          hit = o;
        }
      }
      if (!hit) {
        x += dx;
        z += dz;
        break;
      }
      blocked = true;
      const travel = Math.max(
        0,
        firstTime - EPSILON / Math.sqrt(lengthSquared),
      );
      x += dx * travel;
      z += dz * travel;
      const nx = (x - hit.x) / Math.hypot(x - hit.x, z - hit.z);
      const nz = (z - hit.z) / Math.hypot(x - hit.x, z - hit.z);
      dx *= 1 - travel;
      dz *= 1 - travel;
      const intoSurface = dx * nx + dz * nz;
      if (intoSurface < 0) {
        dx -= intoSurface * nx;
        dz -= intoSurface * nz;
      }
    }
    return { x, z, blocked };
  }
}
