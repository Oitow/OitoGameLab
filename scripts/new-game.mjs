import { lstat, mkdir, realpath, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESERVED = new Set([
  "constructor",
  "prototype",
  "registry",
  "index",
  "src",
  "node-modules",
  "con",
  "prn",
  "aux",
  "nul",
]);

function validateSlug(slug) {
  if (
    typeof slug !== "string" ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 48
  )
    throw new Error(
      "Game id must be 1–48 lowercase letters/digits with single hyphens, beginning with a letter.",
    );
  if (RESERVED.has(slug) || /^(com|lpt)[1-9]$/.test(slug))
    throw new Error(`Reserved game id: ${slug}`);
}

function source(slug, title) {
  return `// Generated starter: replace this one-goal loop with your own mechanic.\nexport const game = {
  id: ${JSON.stringify(slug)},
  name: ${JSON.stringify(title)},
  create(terrain) {
    const spawn = terrain.findSpawn();
    const candidates = [
      { x: spawn.x + 3, z: spawn.z },
      { x: spawn.x - 3, z: spawn.z },
      { x: spawn.x, z: spawn.z + 3 },
      { x: spawn.x, z: spawn.z - 3 },
    ];
    const goal = candidates.find(p => terrain.walkable(p.x, p.z)) || spawn;
    const markers = [{ id: 0, x: goal.x, z: goal.z, y: terrain.height(goal.x, goal.z) + 0.8 }];
    return {
      markers,
      collected: [],
      step(dt, player) {
        if (!this.collected.length && Math.hypot(player.x - goal.x, player.z - goal.z) < 1.3 &&
            Math.abs(player.y - terrain.height(goal.x, goal.z)) < 2) this.collected.push(0);
      },
      status() {
        return this.collected.length ? "Ziel erreicht! Neue Welt?" : "Finde den Kristall";
      },
      snapshot() {
        return { version: 1, collected: [...this.collected] };
      },
      restore(data) {
        if (!data || data.version !== 1 || !Array.isArray(data.collected) ||
            data.collected.length > 1 || data.collected.some(id => id !== 0)) return false;
        this.collected = [...data.collected];
        return true;
      },
    };
  },
};\n`;
}

/** Create a starter without modifying the registry or overwriting existing work. */
export async function createGame(root, slug, title = slug) {
  validateSlug(slug);
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 80 ||
    /[\r\n\x00-\x1f]/.test(title)
  )
    throw new Error("Title must be one line of 1–80 printable characters.");
  const rootPath = await realpath(root);
  if (!(await lstat(rootPath)).isDirectory())
    throw new Error("Project root must be a directory.");
  const gamesPath = path.join(rootPath, "games");
  try {
    await mkdir(gamesPath);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const gamesStat = await lstat(gamesPath);
  if (
    gamesStat.isSymbolicLink() ||
    !gamesStat.isDirectory() ||
    (await realpath(gamesPath)) !== gamesPath
  )
    throw new Error("games must be a real directory inside the project root.");
  const directory = path.join(gamesPath, slug);
  try {
    await mkdir(directory);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        `Game path already exists; refusing to overwrite: games/${slug}`,
      );
    throw error;
  }
  try {
    await writeFile(
      path.join(directory, "game.js"),
      source(slug, title.trim()),
      { flag: "wx" },
    );
    await writeFile(
      path.join(directory, "README.md"),
      `# ${title.trim()}\n\nGenerated one-crystal starter. Replace its rules with one small playable mechanic.\n\n- Game id: \`${slug}\`\n- Export: \`game\` from \`game.js\`\n- Register it in \`games/registry.js\`; see \`docs/NEW_GAME.md\`.\n- Reuse shared terrain, character, interaction and inventory systems.\n- Add behavioral tests and playtest touch, keyboard, pause and save/load.\n- Starter goal placement is intentionally simple; verify reachable objectives for your final game.\n`,
      { flag: "wx" },
    );
  } catch (error) {
    // This directory was created by this call; never remove a pre-existing game.
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return {
    id: slug,
    directory,
    files: [path.join(directory, "game.js"), path.join(directory, "README.md")],
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [slug, ...title] = process.argv.slice(2);
  try {
    if (!slug)
      throw new Error("Usage: node scripts/new-game.mjs <slug> [title]");
    const created = await createGame(
      process.cwd(),
      slug,
      title.length ? title.join(" ") : slug,
    );
    console.log(
      `Created games/${created.id}/game.js and README.md.\nNext: register its game export in games/registry.js; follow docs/NEW_GAME.md.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
