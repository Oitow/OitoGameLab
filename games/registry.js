import { explorer } from "./explorer/game.js";
import { scavenger } from "./scavenger/game.js";
import { camp } from "./camp/game.js";

// Add new definitions here; the menu is built from this registry.
export const games = new Map(
  [explorer, scavenger, camp].map((game) => [game.id, game]),
);
export function getGameDefinition(id) {
  return games.get(id) || explorer;
}
