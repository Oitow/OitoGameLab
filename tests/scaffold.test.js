import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  mkdir,
  symlink,
  readdir,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createGame } from "../scripts/new-game.mjs";

async function project(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "oito-scaffold-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "package.json"), '{"type":"module"}');
  return root;
}

test("generated module is importable, playable and validates game saves", async (t) => {
  const root = await project(t);
  const title = 'Mine "A" ${notCode}';
  const result = await createGame(root, "mini-mine", title);
  assert.equal(result.id, "mini-mine");
  const { game } = await import(pathToFileURL(result.files[0]).href);
  assert.equal(game.id, "mini-mine");
  assert.equal(game.name, title);
  const terrain = {
    findSpawn: () => ({ x: 0, z: 0 }),
    height: () => 1,
    walkable: () => true,
  };
  const state = game.create(terrain);
  assert.equal(state.markers.length, 1);
  state.step(1 / 60, { x: 0, y: 1, z: 0 });
  assert.deepEqual(state.collected, []);
  const marker = state.markers[0];
  state.step(1 / 60, { ...marker, y: 1 });
  state.step(1 / 60, { ...marker, y: 1 });
  assert.deepEqual(state.collected, [0]);
  assert.match(state.status(), /Ziel erreicht/);
  const copy = game.create(terrain);
  assert.equal(copy.restore(state.snapshot()), true);
  assert.deepEqual(copy.collected, [0]);
  assert.equal(copy.restore({ version: 1, collected: [99] }), false);
  assert.deepEqual(copy.collected, [0]);
  assert.match(await readFile(result.files[1], "utf8"), /games\/registry.js/);
});

test("rejects traversal, unsafe, reserved and overlong ids before writing", async (t) => {
  const root = await project(t);
  for (const slug of [
    "../escape",
    "/escape",
    "a/b",
    "a\\b",
    "a..b",
    "UPPER",
    "1game",
    "a--b",
    "a-",
    "",
    "constructor",
    "registry",
    "con",
    "com1",
    "a".repeat(49),
  ])
    await assert.rejects(createGame(root, slug), /Game id|Reserved/);
  assert.deepEqual(await readdir(root), ["package.json"]);
});

test("existing game and files are never overwritten", async (t) => {
  const root = await project(t);
  const first = await createGame(root, "fish", "Fishing");
  await writeFile(first.files[0], "// valuable existing work\n");
  await assert.rejects(createGame(root, "fish", "Changed"), /already exists/);
  assert.equal(
    await readFile(first.files[0], "utf8"),
    "// valuable existing work\n",
  );
  await writeFile(path.join(root, "games", "blocked"), "existing file");
  await assert.rejects(createGame(root, "blocked"), /already exists/);
  assert.equal(
    await readFile(path.join(root, "games", "blocked"), "utf8"),
    "existing file",
  );
});

test("refuses symlinked games directory and existing symlink target", async (t) => {
  const root = await project(t);
  const outside = await project(t);
  await symlink(outside, path.join(root, "games"), "dir");
  await assert.rejects(createGame(root, "fish"), /real directory/);
  assert.deepEqual(await readdir(outside), ["package.json"]);
  await rm(path.join(root, "games"));
  await mkdir(path.join(root, "games"));
  await symlink(outside, path.join(root, "games", "fish"), "dir");
  await assert.rejects(createGame(root, "fish"), /already exists/);
});

test("invalid titles fail before writing and CLI prints actionable usage", async (t) => {
  const root = await project(t);
  for (const title of ["", "  ", "line\nbreak", "x".repeat(81)])
    await assert.rejects(createGame(root, "fish", title), /Title/);
  assert.deepEqual(await readdir(root), ["package.json"]);
  const run = spawnSync(
    process.execPath,
    [path.resolve("scripts/new-game.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Usage:/);
});
