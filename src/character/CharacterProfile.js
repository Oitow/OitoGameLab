import { Generator } from "../procedural/Generator.js";
/** Immutable seed-derived identity; gameplay values stay separate from mesh proportions. */
export function createCharacterProfile(seed) {
  const random = new Generator(seed, "character-v1");
  return Object.freeze({
    height: random.range(1.88, 2.08),
    build: random.range(0.92, 1.1),
    skin: random.pick([0xd9a078, 0xb97d56, 0x85563f, 0xe5bc99]),
    tunic: random.pick([0x387c79, 0x657d43, 0x526b91, 0x865a69]),
    hair: random.pick([0x493a30, 0x302c2b, 0x8d603a, 0xc2aa77]),
    stride: random.range(2.45, 2.75),
    speed: 5.3,
    jump: 7.4,
    health: 100,
    stamina: 100,
  });
}
