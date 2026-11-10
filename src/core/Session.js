import { Terrain } from "../world/Terrain.js";
import { CharacterController } from "../character/CharacterController.js";
export class Session {
  constructor(definition, seed) {
    this.id = definition.id;
    this.terrain = new Terrain(seed);
    this.character = new CharacterController(this.terrain);
    this.game = definition.create(this.terrain);
  }
  step(dt, actions) {
    this.character.step(dt, actions);
    this.game.step(dt, this.character.state);
  }
  snapshot() {
    return {
      version: 1,
      game: this.id,
      seed: this.terrain.seed,
      player: { x: this.character.state.x, z: this.character.state.z },
      collected: [...this.game.collected],
    };
  }
  restore(data) {
    if (
      !data ||
      data.version !== 1 ||
      data.game !== this.id ||
      data.seed !== this.terrain.seed ||
      !Number.isFinite(data.player?.x) ||
      !Number.isFinite(data.player?.z) ||
      !this.terrain.walkable(data.player.x, data.player.z) ||
      !Array.isArray(data.collected) ||
      data.collected.some((id) => !this.game.markers.some((m) => m.id === id))
    )
      return false;
    const s = this.character.state;
    s.x = data.player.x;
    s.z = data.player.z;
    s.y = this.terrain.height(s.x, s.z);
    s.vx = s.vz = s.vy = 0;
    s.grounded = true;
    this.game.collected = [...new Set(data.collected)];
    return true;
  }
}
