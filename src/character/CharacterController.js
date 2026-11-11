import { Stats } from "./Stats.js";
const MOVE_SPEED = 5.3;
const JUMP_SPEED = 7.4;
const GRAVITY = 19;
const COYOTE_SECONDS = 0.1;
const JUMP_BUFFER_SECONDS = 0.12;
const MAX_SLOPE = Math.tan(Math.PI / 4);
const GROUND_SNAP = 0.25;

export class CharacterController {
  constructor(terrain, { collisions = null, radius = 0.35, profile = {} } = {}) {
    this.profile = profile;
    this.stats = new Stats({ speed: profile.speed ?? MOVE_SPEED, jump: profile.jump ?? JUMP_SPEED, health: profile.health ?? 100, stamina: profile.stamina ?? 100 });
    this.terrain = terrain;
    this.collisions = collisions;
    this.radius = radius;
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
    this.coyoteRemaining = COYOTE_SECONDS;
    this.jumpBufferRemaining = 0;
  }

  canMove(fromX, fromZ, x, z) {
    if (!this.terrain.walkable(x, z)) return false;
    const rise = this.terrain.height(x, z) - this.terrain.height(fromX, fromZ);
    if (rise <= 1e-6) return true;
    // Reject uphill movement on surfaces steeper than 45 degrees, while still
    // allowing travel along contours or downhill. Sample the continuous terrain.
    const offset = 0.08;
    const slopeX =
      (this.terrain.height(x + offset, z) -
        this.terrain.height(x - offset, z)) /
      (2 * offset);
    const slopeZ =
      (this.terrain.height(x, z + offset) -
        this.terrain.height(x, z - offset)) /
      (2 * offset);
    return (
      Math.hypot(slopeX, slopeZ) <= MAX_SLOPE + 1e-6 &&
      rise <= Math.hypot(x - fromX, z - fromZ) * MAX_SLOPE + 1e-6
    );
  }

  step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const s = this.state;
    this.jumpBufferRemaining = input.jump
      ? JUMP_BUFFER_SECONDS
      : Math.max(0, this.jumpBufferRemaining - dt);
    this.coyoteRemaining = s.grounded
      ? COYOTE_SECONDS
      : Math.max(0, this.coyoteRemaining - dt);
    if (this.jumpBufferRemaining > 0 && this.coyoteRemaining > 0) {
      s.vy = this.stats.value("jump");
      s.grounded = false;
      this.jumpBufferRemaining = this.coyoteRemaining = 0;
    }

    let { x = 0, z = 0 } = input;
    if (!Number.isFinite(x)) x = 0;
    if (!Number.isFinite(z)) z = 0;
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    const blend = 1 - Math.exp(-(length > 0 ? 11 : 8) * dt);
    s.vx += (x * this.stats.value("speed") - s.vx) * blend;
    s.vz += (z * this.stats.value("speed") - s.vz) * blend;

    const oldX = s.x,
      oldZ = s.z;
    // Small terrain probes also protect shoreline/slope boundaries on a long
    // caller-provided step. Collider movement itself uses a continuous sweep.
    const probes = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vz) * dt) / 0.1));
    for (let i = 0; i < probes; i++) {
      const dx = (s.vx * dt) / probes,
        dz = (s.vz * dt) / probes;
      let nx = s.x,
        nz = s.z;
      if (this.canMove(nx, nz, nx + dx, nz)) nx += dx;
      if (this.canMove(nx, nz, nx, nz + dz)) nz += dz;
      if (this.collisions) {
        const result = this.collisions.move(
          s.x,
          s.z,
          nx - s.x,
          nz - s.z,
          this.radius,
        );
        if (this.canMove(s.x, s.z, result.x, result.z)) {
          nx = result.x;
          nz = result.z;
        } else {
          nx = s.x;
          nz = s.z;
        }
      }
      s.x = nx;
      s.z = nz;
    }
    s.vx = (s.x - oldX) / dt;
    s.vz = (s.z - oldZ) / dt;
    s.landing = Math.max(0, s.landing - dt * 5);
    const floor = this.terrain.height(s.x, s.z);
    if (s.grounded && s.y - floor > GROUND_SNAP) s.grounded = false;
    if (!s.grounded) {
      s.vy -= GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y <= floor && s.vy <= 0) {
        s.y = floor;
        s.vy = 0;
        s.grounded = true;
        s.landing = 1;
      }
    } else s.y = floor;

    const speed = Math.hypot(s.vx, s.vz);
    if (speed > 0.12) {
      const angle = Math.atan2(s.vx, s.vz) - s.facing;
      s.facing +=
        Math.atan2(Math.sin(angle), Math.cos(angle)) * (1 - Math.exp(-13 * dt));
    }
    s.phase = (s.phase + speed * dt * (this.profile.stride ?? 2.6)) % (Math.PI * 2);
  }
}
