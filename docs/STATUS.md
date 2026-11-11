# Status — 2026-11-11

## Implemented for 0.6

- 200 m seeded world with broad rolling interior and an island roughly 180 m across.
- Two-metre polygon adventurer: tapered limbs, face, hair, tunic, pack and procedural joint animation (762 triangles, 19 meshes).
- 8–16 m pine/oak trees, branching crowns, larger faceted rocks, 500 visual-only ground plants and flowers.
- Instanced scenery in seven batches plus one merged terrain-following contact-shadow batch; no shadow maps or postprocessing.
- Faceted vertex-coloured terrain, muted sea/sky, warm sunlight and distance fog.
- Closer human-scale camera with heightfield sightline clearance.
- Economy/balanced/crisp rendering resolution controls; triangle count alongside FPS and draw calls.
- Island Explorer and earlier engine experiments preserved.

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

Local validation: 42 tests and syntax/import/boundary checks pass. Local Chromium startup is blocked by the execution environment; the PR browser workflow supplies screenshot and interaction verification. See the PR for final CI evidence. Real Android testing remains a manual gate. Runtime requires the pinned Three.js CDN.

## World generation compatibility

0.6 changes the shape and scenery associated with a seed. Save DTOs remain version 2 and same-version round trips work; an older position that now overlaps a tree/rock can be rejected by existing validation. Existing generated worlds are not frozen or migrated.

## Boundaries

Collisions are static X/Z footprints, not rigid-body physics. No landing on obstacles, terrain editing, NPCs, combat, chunk streaming, multiplayer or offline asset cache. Agent roles and the generator help explicit development tasks; they are not permanent background workers.

## Next

Real Android playtest; camera and movement tuning from device feedback; asset manifest and GLB loading; a larger mechanics-focused game using the shared systems.
