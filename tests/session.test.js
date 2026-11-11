import test from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/core/Session.js";
import { SaveStore } from "../src/storage/SaveStore.js";
import { games } from "../games/registry.js";
test("all games save and restore through the storage adapter", () => {
  for (const definition of games.values()) {
    const session = new Session(definition, 12345),
      data = new Map(),
      storage = {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => data.set(k, v),
      };
    const store = new SaveStore(storage);
    store.save(session);
    const restored = store.load(games, (d, s) => new Session(d, s));
    assert.deepEqual(restored.snapshot(), session.snapshot());
  }
});
test("legacy explorer save migrates and interpolation does not mutate simulation", () => {
  const session = new Session(games.get("explorer"), 12345),
    p = session.terrain.findSpawn();
  assert.equal(
    session.restore({
      version: 1,
      game: "explorer",
      seed: 12345,
      player: p,
      collected: [],
    }),
    true,
  );
  session.step(1 / 60, { x: 1 });
  const snapshot = session.snapshot();
  const halfway = session.renderState(0.5);
  assert.ok(halfway.x <= session.character.state.x);
  assert.deepEqual(session.snapshot(), snapshot);
  assert.equal(snapshot.version, 2);
});
test("invalid camp state is rejected atomically", () => {
  const session = new Session(games.get("camp"), 12345),
    before = session.snapshot();
  assert.equal(
    session.restore({ ...before, state: { ...before.state, built: true } }),
    false,
  );
  assert.deepEqual(session.snapshot(), before);
});
