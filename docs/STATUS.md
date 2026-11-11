# Status — 2026-11-11

## Implemented for 0.5

- Shared pure simulation with render interpolation and seeded world layout.
- Static tree/rock footprints shared by collision and rendering; sliding and swept collision.
- Slope limits, ledge falling, coyote time and buffered jumps.
- Explorer, crystal hunt and camp-building game registered in one module registry.
- Reusable inventory and contextual interactions, keyboard E and touch action.
- Version 2 game-specific saves, validation before state replacement and version 1 import.
- Dependency-free new-game generator, safety checks and contribution guide.
- Expanded tests for traversal, interaction, inventory, input, saves and scaffolding.
- Browser coverage for pause/blur, context loss/restoration, settings, modes and storage.

## Validation

See the implementation PR and GitHub Actions run for final automated results and screenshots. Real Android testing remains a manual gate. Runtime requires the pinned Three.js CDN.

## Boundaries

Collisions are static X/Z footprints, not rigid-body physics. No landing on obstacles, terrain editing, NPCs, combat, chunk streaming, multiplayer or offline asset cache. Agent roles and the generator help explicit development tasks; they are not permanent background workers.

## Next

Real Android playtest; camera and movement tuning from device feedback; asset manifest and GLB loading; a larger mechanics-focused game using the shared systems.
