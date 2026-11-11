# Status — 2026-11-11

## Implemented for 0.8

- Terrain chunks now select 2 m / 4 m / 8 m mesh spacing by camera distance. Near terrain retains the 0.7 detail.
- Eight-metre downward edge skirts cover resolution-boundary cracks; 12% switching hysteresis limits boundary flicker.
- Graphics presets now control distant terrain detail as well as pixel ratio. Economy simplifies sooner; crisp retains detail farther.
- All terrain levels share one material. Existing renderer teardown disposes every level and shared material once.
- Seeded generation, character movement/collision, world dimensions and save format are unchanged.
- This is distance LOD, not streaming. Additional prebuilt mesh levels increase mount work and GPU memory in exchange for fewer submitted triangles during play.

## 0.8 validation

One local unit-suite invocation passed 48 tests, including terrain topology, winding, nested boundary samples, skirt depth and reduced distant triangle budgets. Syntax/import/boundary checks passed. PR CI covers desktop/portrait browser play, graphics triangle-budget comparison and close/far camera screenshots. Local Chromium is known to be blocked by process socket restrictions and was not retried. Real Android frame-time/memory measurement remains outstanding.

## Implemented for 0.7

- 640 m square seeded world (10.24× the previous area), roughly 550 m island, broad rolling hills.
- 800 trees, 160 rocks and 2,400 ground decorations; 128 m spatial instance batches support frustum culling.
- Terrain split into 100 independently culled 64 m chunks, 2 m mesh spacing. Entire bounded world is generated at mount, not streamed.
- Static collision uses 16 m spatial bins with exact swept-circle narrow phase, including long moves.
- Named deterministic random streams; immutable character profiles vary height, build, skin, clothing, hair and stride from the world seed.
- Reusable stats with named modifiers and bounded resources; controller speed/jump consume computed stats. Health/stamina are extension points, not survival mechanics or saved progression.
- Pure locomotion pose module drives articulated mesh animation.
- Joystick dead zone removes small accidental drift. Camera has smoothed focus, velocity look-ahead, terrain clearance and a distance slider.
- World seeds change landscape/scenery again. Version 2 saves remain structurally compatible, but obstructed positions may be rejected; no world migration.

## 0.7 validation

Two unit-suite invocations: first caught terrain-range and outdated budget assertions; second passed all 46 tests. One syntax/import/boundary check passed. One local browser attempt failed before opening a page because Chromium cannot create its process socket in this environment. PR #7 CI subsequently passed both code and browser checks; portrait, desktop and settings screenshots were downloaded and inspected. Real Android performance remains unverified; no FPS guarantee.

## Implemented for 0.6

- 200 m seeded world with broad rolling interior and an island roughly 180 m across.
- Two-metre polygon adventurer: tapered limbs, face, hair, tunic, pack and procedural joint animation (762 triangles, 19 meshes).
- 8–16 m pine/oak trees, branching crowns, larger faceted rocks, 500 visual-only ground plants and flowers.
- Instanced scenery in seven batches plus one merged terrain-following contact-shadow batch; no shadow maps or postprocessing.
- Faceted vertex-coloured terrain, muted sea/sky, warm sunlight and distance fog.
- Closer human-scale camera with heightfield sightline clearance.
- Economy/balanced/crisp rendering resolution controls; triangle count alongside FPS and draw calls.
- Recognizable log/stone pickups, faceted crystals and a stone-ring campfire that lights when built.
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

Validation: 42 tests and syntax/import/boundary checks pass. The GitHub Actions browser suite passed portrait/desktop interaction, saves, regeneration, resolution settings and actual WebGL loss/recovery; screenshots were downloaded and inspected. Local Chromium startup is blocked by the execution environment; see the PR for CI evidence. Real Android testing remains a manual gate. Runtime requires the pinned Three.js CDN.

## World generation compatibility

0.6 changes the shape and scenery associated with a seed. Save DTOs remain version 2 and same-version round trips work; an older position that now overlaps a tree/rock can be rejected by existing validation. Existing generated worlds are not frozen or migrated.

## Boundaries

Collisions are static X/Z footprints, not rigid-body physics. No landing on obstacles, terrain editing, NPCs, combat, chunk streaming, multiplayer or offline asset cache. Agent roles and the generator help explicit development tasks; they are not permanent background workers.

## Next

Real Android playtest; camera and movement tuning from device feedback; asset manifest and GLB loading; a larger mechanics-focused game using the shared systems.
