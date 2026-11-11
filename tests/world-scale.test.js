import test from "node:test";
import assert from "node:assert/strict";
import { Terrain } from "../src/world/Terrain.js";
import { WorldLayout } from "../src/world/WorldLayout.js";
import { StaticCollisions } from "../src/physics/StaticCollisions.js";

test("human-scale island provides a broad, gently rolling interior and bounded shore", () => {
  for (const seed of [0, 1, 12345, 4294967295]) {
    const terrain = new Terrain(seed);
    assert.equal(terrain.size, 200);
    for (let x = -45; x <= 45; x += 5)
      for (let z = -45; z <= 45; z += 5) {
        assert.ok(terrain.walkable(x, z));
        const y = terrain.height(x, z);
        for (const [dx, dz] of [[0.5, 0], [0, 0.5]])
          assert.ok(Math.abs(terrain.height(x + dx, z + dz) - y) / 0.5 < 0.6);
      }
    assert.ok(!terrain.walkable(101, 0));
    assert.ok(!terrain.walkable(0, -101));
    assert.ok(terrain.height(100, 100) < 0);
  }
});

test("seeded scenery spans the larger island with human-scale tree species", () => {
  for (const seed of [0, 7, 12345]) {
    const layout = new WorldLayout(new Terrain(seed));
    const trees = layout.objects.filter((o) => o.kind === "tree");
    assert.ok(trees.some((o) => Math.hypot(o.x, o.z) > 60));
    assert.deepEqual(new Set(trees.map((o) => o.species)), new Set(["oak", "pine"]));
    for (const tree of trees) {
      assert.ok(tree.height >= 8 && tree.height <= 16);
      assert.ok(tree.radius > 0.25 && tree.radius < 0.6);
      assert.ok(tree.canopyRadius > tree.radius);
      assert.ok(tree.yaw >= 0 && tree.yaw < Math.PI * 2);
    }
  }
});

test("ground cover is deterministic, bounded and never adds solid colliders", () => {
  const terrain = new Terrain(12345);
  const excluded = { x: 8, z: 0, radius: 3 };
  const a = new WorldLayout(terrain, { exclude: [excluded] });
  const b = new WorldLayout(terrain, { exclude: [excluded] });
  assert.deepEqual(a.decorations, b.decorations);
  assert.equal(a.decorations.length, 500);
  const collisions = new StaticCollisions(a.objects);
  assert.equal(collisions.objects.length, a.objects.length);
  for (const plant of a.decorations) {
    assert.ok(terrain.walkable(plant.x, plant.z));
    assert.equal(plant.y, terrain.height(plant.x, plant.z));
    assert.ok(Math.hypot(plant.x - excluded.x, plant.z - excluded.z) >= 3.25);
    assert.ok(collisions.isFree(plant.x, plant.z, 0.4));
  }
});
