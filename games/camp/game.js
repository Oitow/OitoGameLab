import { Inventory } from "../../src/gameplay/Inventory.js";
import { InteractionSystem } from "../../src/gameplay/InteractionSystem.js";

const recipe = Object.freeze({ wood: 3, stone: 2 });
const labels = { wood: "Holz", stone: "Stein" };

export const camp = {
  id: "camp",
  name: "Lagerbau",
  create(terrain) {
    const markers = createMarkers(terrain);
    const interaction = new InteractionSystem();
    return {
      markers,
      collected: [],
      inventory: new Inventory(["wood", "stone"]),
      built: false,
      step() {},
      target(player) {
        return interaction.nearest(
          player,
          markers,
          (marker) => !this.built && !this.collected.includes(marker.id),
        );
      },
      prompt(player) {
        const target = this.target(player);
        if (!target) return "";
        return target.kind === "camp"
          ? this.inventory.canAfford(recipe)
            ? "Lagerfeuer bauen"
            : "Lagerfeuer: 3 Holz + 2 Stein"
          : `${labels[target.kind]} sammeln`;
      },
      interact(player) {
        if (this.built) return "Dein Lagerfeuer ist fertig!";
        const target = this.target(player);
        if (!target) return "Komm näher an Holz, Stein oder den Lagerplatz.";
        if (target.kind === "camp") {
          if (!this.inventory.spend(recipe))
            return "Du brauchst 3 Holz und 2 Stein.";
          this.built = true;
          return "Lagerfeuer gebaut — dein Lager ist bereit!";
        }
        this.inventory.add(target.kind);
        this.collected.push(target.id);
        return `${labels[target.kind]} gesammelt.`;
      },
      status() {
        if (this.built) return "Lager fertig! Neue Insel?";
        if (this.inventory.canAfford(recipe))
          return "Zurück zum Lagerplatz → Lagerfeuer bauen";
        return `Lagerbau · Holz ${this.inventory.count("wood")}/3 · Stein ${this.inventory.count("stone")}/2`;
      },
      snapshot() {
        return {
          version: 1,
          collected: [...this.collected],
          inventory: this.inventory.snapshot(),
          built: this.built,
        };
      },
      restore(data) {
        if (
          !data ||
          data.version !== 1 ||
          typeof data.built !== "boolean" ||
          !Array.isArray(data.collected) ||
          new Set(data.collected).size !== data.collected.length ||
          data.collected.some(
            (id) =>
              !Number.isInteger(id) ||
              !markers.some((m) => m.id === id && m.kind !== "camp"),
          )
        )
          return false;
        const candidate = new Inventory(["wood", "stone"]);
        if (!candidate.restore(data.inventory)) return false;
        const expected = { wood: 0, stone: 0 };
        for (const id of data.collected)
          expected[markers.find((m) => m.id === id).kind]++;
        if (data.built) {
          if (expected.wood !== recipe.wood || expected.stone !== recipe.stone)
            return false;
          expected.wood -= recipe.wood;
          expected.stone -= recipe.stone;
        }
        if (
          candidate.count("wood") !== expected.wood ||
          candidate.count("stone") !== expected.stone
        )
          return false;
        // Commit only after every field and progression invariant has passed.
        this.collected = [...data.collected];
        this.inventory = candidate;
        this.built = data.built;
        return true;
      },
    };
  },
};

function createMarkers(terrain) {
  const spawn = terrain.findSpawn();
  const marker = (id, kind, x, z) => {
    const groundY = terrain.height(x, z);
    return { id, kind, x, z, y: groundY + 0.55, groundY };
  };
  const markers = [marker(0, "camp", spawn.x, spawn.z)];
  const kinds = ["wood", "wood", "wood", "stone", "stone"];
  // A sampled dry, gentle route to camp prevents isolated or cliff-top objectives.
  for (let attempt = 0; attempt < 3000 && markers.length < 6; attempt++) {
    const angle = terrain.hash(attempt + 300, 127) * Math.PI * 2;
    const radius =
      attempt < 1800
        ? 6 + terrain.hash(attempt + 300, 211) * 9
        : 3 + terrain.hash(attempt + 300, 211) * 7;
    const x = spawn.x + Math.cos(angle) * radius;
    const z = spawn.z + Math.sin(angle) * radius;
    if (markers.some((m) => Math.hypot(m.x - x, m.z - z) < 3)) continue;
    if (!hasGentleRoute(terrain, spawn, { x, z })) continue;
    markers.push(marker(markers.length, kinds[markers.length - 1], x, z));
  }
  if (markers.length !== 6)
    throw new Error("Kein erreichbarer Lagerplatz für diesen Welt-Seed.");
  return markers;
}

function hasGentleRoute(terrain, start, end) {
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const steps = Math.ceil(distance / 0.4);
  let previousHeight = terrain.height(start.x, start.z);
  for (let step = 1; step <= steps; step++) {
    const x = start.x + ((end.x - start.x) * step) / steps;
    const z = start.z + ((end.z - start.z) * step) / steps;
    const height = terrain.height(x, z);
    if (
      !terrain.walkable(x, z) ||
      !Number.isFinite(height) ||
      Math.abs(height - previousHeight) / (distance / steps) > 0.55
    )
      return false;
    previousHeight = height;
  }
  return true;
}
