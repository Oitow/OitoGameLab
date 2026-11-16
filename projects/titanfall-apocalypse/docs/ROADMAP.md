# Titan Apocalypse — development roadmap

## Status
The GitHub Pages build on `main` remains the playable v0.2 baseline.
This branch is intentionally **unmerged** and includes isolated modules not yet wired into the running demo.

## Current modules
| Area | Module | Status |
| --- | --- | --- |
| World atmosphere | `world/atmosphere.js` | Implemented, integration pending |
| Encounter layout | `world/encounters.js` | Implemented, integration pending |
| Titan phases | `titans/behavior.js` | Implemented, integration pending |
| Destruction | `combat/destruction.js` | Implemented, integration pending |
| Spell rules | `combat/abilities.js` | Implemented, integration pending |
| Mobile input | `player/mobile-controls.js` | Implemented, integration pending |
| Skill progression | `progression/skill-tree.js` | Implemented, integration pending |

## Priority sequence
1. Wire world and encounters to a separate `preview.html` on this branch, keeping `index.html` stable.
2. Integrate telegraphed titan attacks and abilities with readable VFX.
3. Introduce pooled destructible building fragments and basic enemy behavior.
4. Add HUD for health, energy, cooldowns, objective and optional performance metrics.
5. Add tutorial flow, death/restart, encounter rewards, inventory and skill tree.
6. Test Android portrait, desktop, performance and module lifecycle.
7. Only merge after explicit approval.

## Architecture constraints
- Original IP; avoid third-party copyrighted designs.
- Preserve mobile portrait, low draw calls and bounded memory.
- Deterministic world placement by seed.
- Avoid networked MMO claims: this is an offline vertical slice.
- Keep source files under `projects/titanfall-apocalypse/`.
