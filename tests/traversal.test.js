import test from "node:test";
import assert from "node:assert/strict";
import { CharacterController } from "../src/character/CharacterController.js";
import { StaticCollisions } from "../src/physics/StaticCollisions.js";
import { WorldLayout } from "../src/world/WorldLayout.js";
import { Terrain } from "../src/world/Terrain.js";

const flat = {
  size: 70,
  findSpawn: () => ({ x: 0, z: 0 }),
  height: () => 0,
  walkable: () => true,
};

test("swept static collision stops long moves rather than tunneling", () => {
  const collisions = new StaticCollisions([
    { id: "rock", x: 2, z: 0, radius: 0.5 },
  ]);
  const result = collisions.move(0, 0, 20, 0, 0.35);
  assert.ok(result.blocked);
  assert.ok(result.x <= 1.15001 && result.x >= 1.149);
  assert.equal(result.z, 0);
  assert.ok(collisions.isFree(result.x, result.z, 0.35));
});

test("glancing contact slides and permits moving away from a collider", () => {
  const collisions = new StaticCollisions([{ x: 2, z: 0, radius: 0.6 }]);
  const result = collisions.move(0, 0, 3, 0.7, 0.35);
  assert.ok(result.blocked);
  assert.ok(
    result.z > 0.7,
    "collision removes inward displacement but preserves tangent movement",
  );
  assert.ok(collisions.isFree(result.x, result.z));
  const away = collisions.move(1.05, 0, -1, 0, 0.35);
  assert.ok(Math.abs(away.x - 0.05) < 1e-5);
  assert.equal(away.blocked, false);
});

test("multiple static obstacles cannot be crossed at their junction", () => {
  const collisions = new StaticCollisions([
    { x: 2, z: -0.6, radius: 0.5 },
    { x: 2, z: 0.6, radius: 0.5 },
  ]);
  let p = { x: 0, z: 0 };
  for (let i = 0; i < 200; i++) {
    p = collisions.move(p.x, p.z, 0.1, 0.001);
    assert.ok(collisions.isFree(p.x, p.z));
  }
  assert.ok(p.x < 2);
});

test("controller respects solid footprints even while jumping", () => {
  const collisions = new StaticCollisions([{ x: 2, z: 0, radius: 0.5 }]);
  const controller = new CharacterController(flat, { collisions });
  for (let i = 0; i < 120; i++)
    controller.step(1 / 60, { x: 1, jump: i === 12 });
  assert.ok(controller.state.x <= 1.15001);
  assert.ok(collisions.isFree(controller.state.x, controller.state.z));
  assert.ok(Number.isFinite(controller.state.y));
});

test("steep uphill terrain is blocked while contours and gentle slopes remain walkable", () => {
  const steep = { ...flat, height: (x) => 2 * x };
  const blocked = new CharacterController(steep);
  for (let i = 0; i < 60; i++) blocked.step(1 / 60, { x: 1 });
  assert.equal(blocked.state.x, 0);
  for (let i = 0; i < 60; i++) blocked.step(1 / 60, { z: 1 });
  assert.ok(blocked.state.z > 3);
  const gentle = new CharacterController({ ...flat, height: (x) => x * 0.4 });
  for (let i = 0; i < 60; i++) gentle.step(1 / 60, { x: 1 });
  assert.ok(gentle.state.x > 3);
  assert.equal(gentle.state.y, gentle.state.x * 0.4);
});

test("coyote time allows a jump shortly after leaving a ledge, but expires", () => {
  const ledge = { ...flat, height: (x) => (x < 0.1 ? 0 : -2) };
  const controller = new CharacterController(ledge);
  while (controller.state.grounded) controller.step(1 / 60, { x: 1 });
  controller.step(1 / 60, { jump: true });
  assert.ok(controller.state.vy > 0);
  const late = new CharacterController(ledge);
  while (late.state.grounded) late.step(1 / 60, { x: 1 });
  for (let i = 0; i < 8; i++) late.step(1 / 60, {});
  late.step(1 / 60, { jump: true });
  assert.ok(
    late.state.vy < 0,
    "expired coyote time does not create a midair jump",
  );
});

test("jump pressed just before landing is buffered for the following grounded tick", () => {
  const controller = new CharacterController(flat);
  Object.assign(controller.state, { y: 0.03, vy: -3, grounded: false });
  controller.coyoteRemaining = 0;
  controller.step(1 / 60, { jump: true });
  assert.equal(controller.state.grounded, true);
  controller.step(1 / 60, {});
  assert.equal(controller.state.grounded, false);
  assert.ok(controller.state.vy > 0);
  assert.ok(controller.state.y > 0);
});

test("reset clears queued jump and restores grounded spawn", () => {
  const controller = new CharacterController(flat);
  controller.step(1 / 60, { jump: true });
  controller.step(1 / 60, { jump: true });
  controller.reset();
  controller.step(1 / 60, {});
  assert.equal(controller.state.grounded, true);
  assert.equal(controller.state.y, 0);
  assert.equal(controller.jumpBufferRemaining, 0);
});

test("world layout is seeded, uses clear spawn and game-target exclusions", () => {
  for (let seed = 0; seed < 30; seed++) {
    const terrain = new Terrain(seed);
    const excluded = { x: 8, z: 0, radius: 2 };
    const layout = new WorldLayout(terrain, { exclude: [excluded] });
    assert.deepEqual(
      layout.objects,
      new WorldLayout(terrain, { exclude: [excluded] }).objects,
    );
    assert.equal(layout.objects.filter((o) => o.kind === "tree").length, 800);
    assert.equal(layout.objects.filter((o) => o.kind === "rock").length, 160);
    const spawn = terrain.findSpawn();
    for (const o of layout.objects) {
      assert.ok(terrain.walkable(o.x, o.z));
      assert.ok(Math.hypot(o.x - spawn.x, o.z - spawn.z) >= 4.5 + o.radius);
      assert.ok(
        Math.hypot(o.x - excluded.x, o.z - excluded.z) >=
          excluded.radius + o.radius,
      );
      assert.ok(Number.isFinite(o.height) && o.height > 0);
    }
  }
  assert.notDeepEqual(
    new WorldLayout(new Terrain(1)).objects,
    new WorldLayout(new Terrain(2)).objects,
  );
});
