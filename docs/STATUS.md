# Status — 2026-11-10

## Implemented in the 0.4 restart

- Shared pure simulation, fixed 60 Hz clock, seeded island, character controller.
- Three.js rendering adapter with separate procedural character animation and camera.
- Explorer and crystal hunt using the same engine; seeded collectibles and win feedback.
- Touch + keyboard, jump, pause, world seed controls, mode switch, local save/load.
- Resource cleanup on scene replacement, WebGL context-loss pause and rebuild.
- Root launcher; original engine and island-explorer preserved.
- Automated behavioral tests, syntax/import/boundary checks, CI, issue and PR templates, agent role instructions.

## Validation

Local validation: 10 behavioral tests passed, plus syntax/import/boundary checks. Local Chromium could not launch because the runtime denied socket creation; the remote browser could not reach the local server. Automated browser checks are included in CI; their result is reported in the implementation PR. Viewport emulation does not count as real Android testing. Current runtime still needs network access to the pinned Three.js CDN.

## Next milestones (not implemented)

1. Real Android playtest: joystick reach, camera framing, sustained performance.
2. Character traversal: slope limits, collision adapter, obstacles; introduce Rapier when solid 3D collision is needed.
3. World generation v2: biome parameters, chunk streaming only after profiling.
4. Third game: one mechanic (fishing or mining); extract inventory/interaction only when actual gameplay requires it.
5. Asset manifest, GLB loading and quality presets with measured budgets.

## Known limits

Decorative trees have no collision. No combat, inventory, NPC behavior, terrain editing, network play, editor or offline asset cache. One browser-local save slot; no old-version migrations. The game contract is intentionally small and not a universal plugin architecture. Repository agent files do not run themselves.
