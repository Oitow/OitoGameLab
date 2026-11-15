import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('Erlenwacht regenerates a connected lantern trail and accessible combat clearings', () => {
  const runtime = vm.createContext({ tri() {}, solid() {} });
  for (const file of ['world-art.js', 'world-gen.js']) {
    const url = new URL('../prototypes/erlenwacht/' + file, import.meta.url);
    vm.runInContext(readFileSync(url, 'utf8'), runtime);
  }
  const world = runtime.ErlenWorld;
  runtime.ground = world.ground;
  function generate(seed) {
    world.generate(seed);
    assert.equal(world.encounters.length, 6);
    assert.ok(world.goal.z - world.spawn.z > 400);
    for (let z = world.spawn.z; z < world.goal.z - 5; z += .5) {
      assert.ok(world.walkable(world.path(z), z), 'blocked trail at ' + z);
    }
    for (const spot of world.encounters) assert.ok(world.walkable(spot.x, spot.z));
    return JSON.stringify([world.spawn, world.goal, world.encounters, world.obstacles]);
  }
  const original = generate(4831);
  assert.notEqual(original, generate(17));
  assert.equal(original, generate(4831));
});
