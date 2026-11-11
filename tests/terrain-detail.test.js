import test from "node:test";
import assert from "node:assert/strict";
import { terrainChunk, terrainDetail } from "../src/render/TerrainGeometry.js";
import { Terrain } from "../src/world/Terrain.js";

test("terrain levels have valid topology, upward surface winding and lower distant budgets", () => {
  const terrain = new Terrain(12345);
  const budgets = [];
  for (const n of [32, 16, 8]) {
    const { positions, indices, surfaceVertices } = terrainChunk(terrain, 0, 0, 64, n);
    assert.equal(surfaceVertices, (n + 1) ** 2);
    assert.equal(positions.length / 3, surfaceVertices + n * 4);
    assert.equal(indices.length / 3, n * n * 2 + n * 8);
    assert.ok([...positions].every(Number.isFinite));
    assert.ok([...indices].every((i) => i < positions.length / 3));
    for (let i = 0; i < n * n * 6; i += 3) {
      const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]].map((v) => v * 3);
      const normalY = (positions[b + 2] - positions[a + 2]) * (positions[c] - positions[a]) - (positions[b] - positions[a]) * (positions[c + 2] - positions[a + 2]);
      assert.ok(normalY > 0);
    }
    budgets.push(indices.length / 3);
  }
  assert.ok(budgets[2] < budgets[0] / 8);
  assert.deepEqual(terrainDetail.balanced, [0, 96, 176]);
  assert.ok(terrainDetail.economy[1] < terrainDetail.crisp[1]);
});

test("adjacent different-resolution chunks share exact boundary samples and skirt downwards", () => {
  const terrain = new Terrain(77);
  const fine = terrainChunk(terrain, -64, -64, 64, 32);
  const coarse = terrainChunk(terrain, 0, -64, 64, 8);
  for (let z = 0; z <= 8; z++) {
    const a = (z * 4 * 33 + 32) * 3, b = z * 9 * 3;
    assert.equal(fine.positions[a] - 32, coarse.positions[b] + 32);
    assert.equal(fine.positions[a + 1], coarse.positions[b + 1]);
    assert.equal(fine.positions[a + 2], coarse.positions[b + 2]);
  }
  for (let i = coarse.surfaceVertices * 3; i < coarse.positions.length; i += 3) {
    const x = coarse.positions[i] + 32, z = coarse.positions[i + 2] - 32;
    assert.ok(Math.abs(coarse.positions[i + 1] - (terrain.height(x, z) - 8)) < 0.00001);
  }
  assert.deepEqual(fine, terrainChunk(terrain, -64, -64, 64, 32));
});
