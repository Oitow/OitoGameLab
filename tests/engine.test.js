import test from "node:test";
import assert from "node:assert/strict";
import { Terrain } from "../src/world/Terrain.js";
import { CharacterController } from "../src/character/CharacterController.js";
import { FixedStep } from "../src/core/FixedStep.js";
import { Session } from "../src/core/Session.js";
import { explorer } from "../games/explorer/game.js";
import { scavenger } from "../games/scavenger/game.js";
const flat = {
  findSpawn: () => ({ x: 0, z: 0 }),
  height: () => 0,
  walkable: (x, z) => Math.abs(x) < 100 && Math.abs(z) < 100,
};
test("same seed reproduces terrain, different seeds vary it", () => {
  const a = new Terrain(123),
    b = new Terrain(123),
    c = new Terrain(456);
  for (let x = -30; x < 30; x += 3) {
    assert.equal(a.height(x, 7), b.height(x, 7));
    assert.ok(Number.isFinite(a.height(x, 7)));
  }
  assert.notEqual(a.height(4, 4), c.height(4, 4));
});
test("spawn stays dry across 200 seeds including uint32 boundaries", () => {
  for (const seed of [
    0,
    4294967295,
    ...Array.from({ length: 200 }, (_, i) => i * 7919),
  ]) {
    const t = new Terrain(seed),
      p = t.findSpawn();
    assert.ok(t.walkable(p.x, p.z));
    assert.ok(t.height(p.x, p.z) > 1.1);
  }
});
test("movement is independent of render rate", () => {
  function run(rate) {
    const c = new CharacterController(flat),
      clock = new FixedStep();
    for (let i = 0; i < rate * 2; i++)
      clock.advance(1 / rate, (dt) => c.step(dt, { x: 1, z: 0 }));
    return c.state.x;
  }
  assert.ok(Math.abs(run(30) - run(144)) < 1e-8);
});
test("diagonal speed is normalized", () => {
  const a = new CharacterController(flat),
    b = new CharacterController(flat);
  for (let i = 0; i < 120; i++) {
    a.step(1 / 60, { x: 1, z: 0 });
    b.step(1 / 60, { x: 1, z: 1 });
  }
  assert.ok(Math.abs(a.state.x - Math.hypot(b.state.x, b.state.z)) < 1e-8);
});
test("jump rises, rejects air jumps, and lands", () => {
  const c = new CharacterController(flat);
  c.step(1 / 60, { jump: true });
  assert.ok(c.state.y > 0);
  const v = c.state.vy;
  c.step(1 / 60, { jump: true });
  assert.ok(c.state.vy < v);
  for (let i = 0; i < 120; i++) c.step(1 / 60, {});
  assert.equal(c.state.y, 0);
  assert.equal(c.state.grounded, true);
});
test("shoreline blocks movement", () => {
  const c = new CharacterController({ ...flat, walkable: (x) => x < 1 });
  for (let i = 0; i < 300; i++) c.step(1 / 60, { x: 1 });
  assert.ok(c.state.x < 1);
});
test("fixed loop caps background catch-up and resets remainder", () => {
  const clock = new FixedStep();
  let n = 0;
  clock.advance(100, () => n++);
  assert.equal(n, 5);
  clock.advance(1 / 120, () => n++);
  clock.reset();
  clock.advance(1 / 120, () => n++);
  assert.equal(n, 5);
});
test("both games run with the same engine and seeded collectible placement", () => {
  for (const def of [explorer, scavenger]) {
    const s = new Session(def, 12345);
    s.step(1 / 60, { x: 1 });
    assert.ok(Number.isFinite(s.character.state.y));
  }
  for (let seed = 0; seed < 100; seed++) {
    const s = new Session(scavenger, seed);
    assert.equal(s.game.markers.length, 8);
    assert.deepEqual(s.game.markers, new Session(scavenger, seed).game.markers);
  }
});
test("collection is one-time, win state and save round-trip work", () => {
  const s = new Session(scavenger, 2);
  for (const m of s.game.markers) {
    Object.assign(s.character.state, { x: m.x, z: m.z, y: m.y - 0.8 });
    s.game.step(0, s.character.state);
    s.game.step(0, s.character.state);
  }
  assert.equal(s.game.collected.length, 8);
  assert.match(s.game.status(), /Alle/);
  const copy = new Session(scavenger, 2);
  assert.equal(copy.restore(JSON.parse(JSON.stringify(s.snapshot()))), true);
  assert.deepEqual(copy.snapshot(), s.snapshot());
});
test("invalid saves are rejected without modifying session", () => {
  const s = new Session(scavenger, 2),
    before = s.snapshot();
  for (const patch of [
    { version: 99 },
    { game: "other" },
    { seed: 3 },
    { player: { x: NaN, z: 0 } },
    { player: { x: 999, z: 999 } },
    { state: { collected: [999] } },
    { state: { collected: null } },
  ]) {
    assert.equal(s.restore({ ...before, ...patch }), false);
    assert.deepEqual(s.snapshot(), before);
  }
  assert.equal(s.restore(null), false);
});
