import test from "node:test";
import assert from "node:assert/strict";
import { Generator } from "../src/procedural/Generator.js";
import { createCharacterProfile } from "../src/character/CharacterProfile.js";
import { Stats } from "../src/character/Stats.js";
import { locomotionPose } from "../src/character/AnimationPose.js";
import { StaticCollisions } from "../src/physics/StaticCollisions.js";
import { CharacterController } from "../src/character/CharacterController.js";

test("named generation streams are deterministic and isolated from consumption", () => {
  const a = new Generator(42), b = new Generator(42);
  assert.deepEqual(Array.from({ length: 100 }, () => a.next()), Array.from({ length: 100 }, () => b.next()));
  const stream = a.fork("world");
  a.next();
  assert.equal(stream.next(), a.fork("world").next());
  assert.notEqual(a.fork("world").next(), a.fork("character").next());
  assert.deepEqual(createCharacterProfile(42), createCharacterProfile(42));
  assert.notDeepEqual(createCharacterProfile(42), createCharacterProfile(43));
});

test("stats modifiers compose, resources clamp and traversal consumes speed", () => {
  const stats = new Stats({ health: 100, speed: 5 });
  stats.setModifier("boots", "speed", { add: 1, multiply: 2 });
  assert.equal(stats.value("speed"), 12);
  stats.removeModifier("boots");
  assert.equal(stats.value("speed"), 5);
  assert.equal(stats.change("health", -200), 0);
  assert.equal(stats.change("health", 300), 100);
  assert.throws(() => stats.setModifier("bad", "speed", { multiply: NaN }));
  const terrain = { findSpawn: () => ({ x: 0, z: 0 }), height: () => 0, walkable: () => true };
  const character = new CharacterController(terrain, { profile: { speed: 3 } });
  for (let i = 0; i < 120; i++) character.step(1 / 60, { x: 1 });
  assert.ok(character.state.vx <= 3.001);
  character.stats.setModifier("slow", "speed", { multiply: 0.5 });
  for (let i = 0; i < 120; i++) character.step(1 / 60, { x: 1 });
  assert.ok(Math.abs(character.state.vx - 1.5) < 0.001);
});

test("spatial broad phase agrees with full sweep across bins and long moves", () => {
  const objects = Array.from({ length: 500 }, (_, i) => ({ id: i, x: i % 25 * 10 - 120, z: Math.floor(i / 25) * 10 - 100, radius: 1 + i % 3 }));
  const indexed = new StaticCollisions(objects);
  const full = new StaticCollisions(objects);
  full.candidates = () => full.objects;
  for (let i = 0; i < 100; i++) {
    const x = i * 3.17 - 140, z = i * 1.89 - 110;
    assert.equal(indexed.isFree(x, z), full.isFree(x, z));
    assert.deepEqual(indexed.move(x, z, 30, -19), full.move(x, z, 30, -19));
  }
  assert.ok(indexed.candidates(0, 0).length < 15);
});

test("animation pose stays finite for idle, moving, jumping and landing states", () => {
  for (const grounded of [true, false]) for (const vy of [-4, 0, 5]) {
    const state = { vx: 2, vz: 3, phase: 1.2, grounded, vy, landing: 0.5 };
    const original = { ...state };
    for (const i of [0, 1]) assert.ok(Object.values(locomotionPose(state, i)).every(Number.isFinite));
    assert.deepEqual(state, original);
  }
});
