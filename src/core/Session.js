import { Terrain } from "../world/Terrain.js";
import { WorldLayout } from "../world/WorldLayout.js";
import { StaticCollisions } from "../physics/StaticCollisions.js";
import { CharacterController } from "../character/CharacterController.js";

const pose = (state) => ({ ...state });
const lerpAngle = (a, b, t) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export class Session {
  constructor(definition, seed) {
    this.definition = definition;
    this.id = definition.id;
    this.terrain = new Terrain(seed);
    this.game = definition.create(this.terrain);
    this.layout = new WorldLayout(this.terrain, {
      exclude: this.game.markers.map((marker) => ({ ...marker, radius: 2.2 })),
    });
    this.collisions = new StaticCollisions(this.layout.objects);
    this.character = new CharacterController(this.terrain, {
      collisions: this.collisions,
    });
    this.previous = pose(this.character.state);
  }
  step(dt, actions = {}) {
    this.previous = pose(this.character.state);
    this.character.step(dt, actions);
    this.game.step(dt, this.character.state);
    if (actions.interact && this.game.interact)
      return this.game.interact(this.character.state);
  }
  renderState(alpha = 1) {
    const current = this.character.state;
    const t = Math.max(0, Math.min(1, alpha));
    const result = { ...current };
    for (const key of ["x", "y", "z"])
      result[key] =
        this.previous[key] + (current[key] - this.previous[key]) * t;
    result.facing = lerpAngle(this.previous.facing, current.facing, t);
    result.phase = lerpAngle(this.previous.phase, current.phase, t);
    return result;
  }
  snapshot() {
    return {
      version: 2,
      game: this.id,
      seed: this.terrain.seed,
      player: { x: this.character.state.x, z: this.character.state.z },
      state: this.game.snapshot
        ? this.game.snapshot()
        : { collected: [...this.game.collected] },
    };
  }
  restore(data) {
    if (
      !data ||
      ![1, 2].includes(data.version) ||
      data.game !== this.id ||
      data.seed !== this.terrain.seed ||
      !Number.isFinite(data.player?.x) ||
      !Number.isFinite(data.player?.z) ||
      !this.terrain.walkable(data.player.x, data.player.z)
    )
      return false;
    if (data.version === 1 && !["explorer", "scavenger"].includes(this.id))
      return false;
    // Validate into a fresh game. Failed loads cannot partially change the running one.
    const candidate = this.definition.create(this.terrain);
    const state =
      data.version === 1 ? { collected: data.collected } : data.state;
    if (candidate.restore) {
      if (!candidate.restore(state)) return false;
    } else {
      if (
        !state ||
        !Array.isArray(state.collected) ||
        state.collected.some(
          (id) => !candidate.markers.some((m) => m.id === id),
        )
      )
        return false;
      candidate.collected = [...new Set(state.collected)];
    }
    let { x, z } = data.player;
    if (!this.collisions.isFree(x, z)) {
      if (data.version === 2) return false;
      // Legacy worlds had no colliders: return an obstructed old save to safe spawn.
      ({ x, z } = this.terrain.findSpawn());
    }
    this.game = candidate;
    this.character.reset();
    Object.assign(this.character.state, { x, z, y: this.terrain.height(x, z) });
    this.previous = pose(this.character.state);
    return true;
  }
}
