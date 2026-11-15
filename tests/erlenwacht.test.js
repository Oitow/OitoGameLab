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

test('a timed dodge inside a shrinking strike ring refreshes Bruch once', () => {
  const listeners = {};
  const node = () => ({
    classList: {toggle() {}}, setAttribute() {}, appendChild() {},
    addEventListener() {}, querySelector: node, remove() {}
  });
  const runtime = vm.createContext({
    AbortController, document: {body: node(), createElement: node},
    window: {addEventListener(event, callback) { listeners[event] = callback; }}
  });
  const url = new URL('../prototypes/erlenwacht/combat.js', import.meta.url);
  vm.runInContext(readFileSync(url, 'utf8'), runtime);
  const combat = runtime.ErlenCombat;
  const player = {x: 0, z: 0, yaw: 0};
  combat.start({ground: () => 0, walkable: () => true, spawn: player, encounters: [player]});
  const press = code => listeners.keydown({code, preventDefault() {}});
  const tick = () => combat.update(1 / 60, player);
  // Enemy 1 starts winding at 1.36s, and releases at about 2.18s.
  for (let i = 0; i < 120; i++) tick();
  press('Digit2');
  assert.ok(tick().cast > 0);
  press('Space');
  assert.ok(tick().dashed);
  press('Digit3');
  assert.equal(tick().dashed, false);
  for (let i = 0; i < 36; i++) tick();
  press('Digit2');
  assert.ok(tick().cast > 0, 'countercast before the usual 3.6s cooldown');
});
