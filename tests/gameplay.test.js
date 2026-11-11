import test from "node:test";
import assert from "node:assert/strict";
import { Inventory } from "../src/gameplay/Inventory.js";
import { InteractionSystem } from "../src/gameplay/InteractionSystem.js";
import { Terrain } from "../src/world/Terrain.js";
import { camp } from "../games/camp/game.js";

const at = (marker) => ({ x: marker.x, y: marker.groundY, z: marker.z });
const makeGame = (seed = 12345) => camp.create(new Terrain(seed));

test("inventory validates additions and spends recipes atomically", () => {
  const inventory = new Inventory(["wood", "stone"]);
  assert.equal(inventory.add("wood", 3), true);
  for (const amount of [0, -1, 0.5, NaN, Infinity])
    assert.equal(inventory.add("wood", amount), false);
  assert.equal(inventory.add("unknown"), false);
  assert.equal(inventory.spend({ wood: 3, stone: 2 }), false);
  assert.deepEqual(inventory.snapshot(), { wood: 3, stone: 0 });
  inventory.add("stone", 2);
  assert.equal(inventory.spend({ wood: 3, stone: 2 }), true);
  assert.deepEqual(inventory.snapshot(), { wood: 0, stone: 0 });
  assert.equal(inventory.spend({ wood: -2 }), false);
  assert.equal(inventory.spend({ wood: 0.5 }), false);
  assert.equal(inventory.spend({ unknown: 0 }), false);
  assert.equal(inventory.add("wood", Number.MAX_SAFE_INTEGER), true);
  assert.equal(inventory.add("wood"), false);
});

test("inventory restore rejects malformed snapshots atomically", () => {
  const inventory = new Inventory(["wood", "stone"]);
  inventory.add("wood");
  const before = inventory.snapshot();
  for (const data of [
    null,
    [],
    { wood: 1 },
    { wood: -1, stone: 0 },
    { wood: Infinity, stone: 0 },
    { wood: 1, stone: 0, gold: 1 },
    { wood: 1.5, stone: 0 },
  ]) {
    assert.equal(inventory.restore(data), false);
    assert.deepEqual(inventory.snapshot(), before);
  }
  assert.equal(inventory.restore({ wood: 5, stone: 4 }), true);
  const snapshot = inventory.snapshot();
  snapshot.wood = 500;
  assert.equal(inventory.count("wood"), 5);
});

test("interaction selects nearest eligible target with stable ties and height limits", () => {
  const system = new InteractionSystem({ range: 2 });
  const player = { x: 0, y: 0, z: 0 };
  const targets = [
    { id: 5, x: 1, y: 0, z: 0 },
    { id: 2, x: -1, y: 0, z: 0 },
    { id: 3, x: 0.2, y: 4, z: 0 },
    { id: 4, x: 8, y: 0, z: 0 },
  ];
  assert.equal(system.nearest(player, targets).id, 2);
  assert.equal(
    system.nearest(player, targets, (target) => target.id !== 2).id,
    5,
  );
  assert.equal(system.nearest({ ...player, y: 9 }, targets), null);
  assert.equal(system.nearest({ ...player, x: NaN }, targets), null);
  assert.equal(
    system.nearest(player, targets, () => false),
    null,
  );
});

test("camp objectives are deterministic, spaced and walkable across seeds", () => {
  for (const seed of [
    0,
    4294967295,
    ...Array.from({ length: 200 }, (_, i) => i * 7919),
  ]) {
    const terrain = new Terrain(seed);
    const game = camp.create(terrain);
    assert.equal(game.markers.length, 6);
    assert.deepEqual(game.markers, camp.create(new Terrain(seed)).markers);
    assert.deepEqual(
      game.markers.map((m) => m.kind),
      ["camp", "wood", "wood", "wood", "stone", "stone"],
    );
    for (const marker of game.markers) {
      assert.ok(terrain.walkable(marker.x, marker.z));
      assert.equal(marker.groundY, terrain.height(marker.x, marker.z));
      for (const other of game.markers)
        if (other !== marker) {
          assert.ok(Math.hypot(other.x - marker.x, other.z - marker.z) >= 3);
        }
    }
  }
});

test("camp gathers only nearby resources once and requires returning to camp to craft", () => {
  const game = makeGame();
  const campMarker = game.markers[0],
    firstWood = game.markers[1];
  assert.match(game.prompt(at(firstWood)), /Holz sammeln/);
  assert.match(game.interact({ x: 100, y: 0, z: 100 }), /näher/);
  assert.equal(game.inventory.count("wood"), 0);
  assert.match(game.interact(at(campMarker)), /brauchst/);
  assert.equal(game.built, false);
  game.interact(at(firstWood));
  game.interact(at(firstWood));
  assert.equal(game.inventory.count("wood"), 1);
  assert.deepEqual(game.collected, [1]);
  for (const marker of game.markers.slice(2)) game.interact(at(marker));
  assert.deepEqual(game.inventory.snapshot(), { wood: 3, stone: 2 });
  assert.equal(game.built, false);
  assert.match(game.status(), /Zurück/);
  assert.equal(game.prompt(at(campMarker)), "Lagerfeuer bauen");
  assert.match(game.interact(at(campMarker)), /gebaut/);
  assert.equal(game.built, true);
  assert.deepEqual(game.inventory.snapshot(), { wood: 0, stone: 0 });
  assert.equal(game.collected.length, 5);
  assert.ok(!game.collected.includes(0));
  assert.match(game.status(), /fertig/);
  assert.equal(game.prompt(at(campMarker)), "");
  game.interact(at(campMarker));
  assert.deepEqual(game.inventory.snapshot(), { wood: 0, stone: 0 });
});

test("camp save round-trips partial and completed progress without references", () => {
  const game = makeGame();
  game.interact(at(game.markers[1]));
  const copy = makeGame();
  assert.equal(copy.restore(JSON.parse(JSON.stringify(game.snapshot()))), true);
  assert.deepEqual(copy.snapshot(), game.snapshot());
  const data = copy.snapshot();
  data.collected.push(2);
  data.inventory.wood = 500;
  assert.equal(copy.inventory.count("wood"), 1);
  assert.deepEqual(copy.collected, [1]);
  for (const marker of game.markers.slice(2)) game.interact(at(marker));
  game.interact(at(game.markers[0]));
  assert.equal(copy.restore(game.snapshot()), true);
  assert.equal(copy.built, true);
  assert.deepEqual(copy.snapshot(), game.snapshot());
});

test("camp restore rejects impossible progression atomically", () => {
  const game = makeGame();
  game.interact(at(game.markers[1]));
  const before = game.snapshot();
  for (const data of [
    null,
    { ...before, version: 2 },
    { ...before, built: 1 },
    { ...before, collected: [0] },
    { ...before, collected: [1, 1] },
    { ...before, collected: [99] },
    { ...before, collected: ["1"] },
    { ...before, inventory: { wood: 2, stone: 0 } },
    { ...before, built: true },
    {
      ...before,
      collected: [1, 2, 3, 4, 5],
      built: true,
      inventory: { wood: 3, stone: 2 },
    },
  ]) {
    assert.equal(game.restore(data), false);
    assert.deepEqual(game.snapshot(), before);
  }
});
