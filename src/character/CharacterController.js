export class CharacterController {
  constructor(terrain) {
    this.terrain = terrain;
    this.reset();
  }
  reset() {
    const p = this.terrain.findSpawn();
    this.state = {
      ...p,
      y: this.terrain.height(p.x, p.z),
      vx: 0,
      vz: 0,
      vy: 0,
      grounded: true,
      facing: 0,
      phase: 0,
      landing: 0,
    };
  }
  step(dt, input) {
    const s = this.state;
    let { x = 0, z = 0 } = input;
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    const blend = 1 - Math.exp(-(length > 0 ? 11 : 8) * dt);
    s.vx += (x * 5.3 - s.vx) * blend;
    s.vz += (z * 5.3 - s.vz) * blend;
    // Axis-separated shoreline sliding; scenery is decorative in this milestone.
    const nx = s.x + s.vx * dt,
      nz = s.z + s.vz * dt;
    if (this.terrain.walkable(nx, s.z)) s.x = nx;
    else s.vx = 0;
    if (this.terrain.walkable(s.x, nz)) s.z = nz;
    else s.vz = 0;
    if (input.jump && s.grounded) {
      s.vy = 7.4;
      s.grounded = false;
    }
    s.landing = Math.max(0, s.landing - dt * 5);
    const floor = this.terrain.height(s.x, s.z);
    if (!s.grounded) {
      s.vy -= 19 * dt;
      s.y += s.vy * dt;
      if (s.y <= floor) {
        s.y = floor;
        s.vy = 0;
        s.grounded = true;
        s.landing = 1;
      }
    } else s.y = floor;
    const speed = Math.hypot(s.vx, s.vz);
    if (speed > 0.12) {
      const a = Math.atan2(s.vx, s.vz) - s.facing;
      s.facing +=
        Math.atan2(Math.sin(a), Math.cos(a)) * (1 - Math.exp(-13 * dt));
    }
    s.phase = (s.phase + speed * dt * 2.6) % (Math.PI * 2);
  }
}
