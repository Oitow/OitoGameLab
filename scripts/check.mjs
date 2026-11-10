import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
async function walk(dir) {
  const result = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...(await walk(p)));
    else if (/\.(js|mjs|cjs)$/.test(p)) result.push(p);
  }
  return result;
}
for (const file of await walk(".")) {
  const check = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (check.status !== 0) throw Error(check.stderr);
  const text = await readFile(file, "utf8");
  if (
    /^(src\/(core|world|character)|games\/)/.test(file) &&
    /from\s+['"]three|\b(document|window|localStorage)\b/.test(text)
  )
    throw Error("Simulation boundary violated: " + file);
  for (const m of text.matchAll(/from\s+['"](\.[^'"]+)['"]/g))
    await readFile(path.resolve(path.dirname(file), m[1]));
}
console.log("Syntax, local imports and simulation boundaries OK");
