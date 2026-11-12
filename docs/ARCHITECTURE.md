# OitoEngine architecture

## Decision

Plain JavaScript ES modules + pinned Three.js 0.180.0 via import map. No build required, no runtime dependency installation, static Pages compatibility. This retains the lightweight existing project while moving simulation out of meshes. TypeScript/Vite and Rapier are future decisions when complexity warrants them; meaningful solid-object physics must use a dedicated physics adapter rather than accumulating handmade collision patches.

## Dependency direction

`play` composes `games` + `src/core` + `src/input` + `src/render`.
`Session` owns `Terrain`, `CharacterController`, and an injected game definition.
Renderers read simulation; simulation never imports rendering or a specific game.

## Public contracts

- `Terrain(seed)`: `height(x,z)`, `walkable(x,z)`, `findSpawn()`, deterministic `hash(x,z)` and `noise(x,z)`. uint32 seed, 640 m square, ocean at y=0.
- `CharacterController(terrain)`: `state`, `step(seconds,{x,z,jump})`, `reset()`. Normalized movement, terrain contact, world-space jump/gravity, shoreline slide.
- `FixedStep`: `advance(realSeconds, update)` at 60 Hz, maximum 5 catch-up steps, `reset()` on pause/resume. Return value is the interpolation fraction used by the renderer.
- Game definition: `{id,name,create(terrain)}`. The resulting game has `markers: {id,x,y,z}[]`, `collected: number[]`, `step(dt,player)`, `status()`. This deliberately small contract suits the supplied examples; extend with tests when another genre needs it.
- `Session`: owns all simulation state, calls character then game. `snapshot()` / `restore(data)` use a validated versioned JSON DTO.
- `Renderer`: `mount(session)`, `draw(dt,session)`, `dispose()`. Geometry/materials shared where practical and disposed once per resource when replacing a scene.
- `Input`: samples touch/keyboard to normalized axes and consumes queued jump once per simulation tick. UI focus does not trigger gameplay keyboard actions.

## Conventions and limits

Metres, seconds, Y-up, X/Z ground. Camera faces negative Z, so forward input is negative Z. Character origin is at feet. Save data contains game id, seed, grounded position and collected IDs; jumping momentum is intentionally not persisted. Local storage is browser-local, version 2, one slot. Load validation occurs before replacing the active session.

Terrain collision uses the analytical height function; rendered mesh approximates it. Trees and rocks have static solid footprints. There is no navmesh, chunk streaming, multiplayer or combat. Fixed ticks use render interpolation.

## Assets and performance

Current assets are procedural meshes, no external artwork. Future shipped models use GLB/glTF, named manifest keys and separate collision proxies. Do not commit DCC source as runtime assets. Pixel ratio caps are 1 / 1.5 / 2 for economy / balanced / crisp, with balanced the default. Instanced scenery, no postprocessing or shadow maps. Use real-device measurements before setting FPS guarantees. Diagnostics expose FPS and draw calls in the collapsed menu.

## 0.5 traversal, game modules and storage

`WorldLayout` owns seeded tree/rock descriptors used by both rendering and `StaticCollisions`. The collision adapter sweeps a character circle along X/Z and slides against static footprints; obstacles stay solid while jumping. This is limited 2.5D obstruction, with no rigid-body dynamics or landing on rocks. The controller also limits uphill slopes, supports ledge falls, 100 ms coyote time and 120 ms jump buffering.

`Session` injects the collision adapter and exposes interpolated render poses without modifying simulation. Game definitions live in `games/registry.js`. `Inventory` and `InteractionSystem` are reusable pure systems demonstrated by the camp game: gather wood/stone and spend them at camp. E or the touch action button interacts.

Save DTO version 2 stores game-specific validated data in `state`. `SaveStore` injects browser storage and validates into a new session before replacing the active one. Legacy explorer/scavenger version 1 saves are accepted; an old position newly blocked by scenery returns to safe spawn. New obstructed saves are rejected. Only one slot is stored.

Use `npm run new:game -- my-game "My Game"` to generate a game module; see `NEW_GAME.md`. Register it once and the menu updates automatically.

## 0.6 low-poly presentation

Terrain and layout remain pure seeded simulation. `WorldLayout` emits tree species, height, trunk radius, canopy radius and yaw; visual-only decorations never enter collision. The view uses seven instanced scenery batches and one merged terrain-following contact-shadow batch. A 160×160 terrain grid supplies 51,200 faceted triangles for the 200 m square; simulation continues to query the analytical heightfield. Trees are 8–16 m, the feet-origin character is 2 m at rest. Character static details are batched by material; articulated joints remain separate (762 triangles / 19 meshes total).

`MarkerView` presents crystals, resource pickups and a built/unbuilt campfire with shared geometry/materials; animation freezes at dt=0 and reads collected/built state.

The camera samples the terrain along its sightline, without changing simulation. It does not resolve occlusion against tree canopies. Cheap contact shadows are separate geometry; there are no shadow maps, textures or postprocessing. Graphics settings change render resolution only, preserving world determinism and collision. Save format remains compatible structurally, but seeds regenerate a new world shape; old obstructed positions may fail existing validation.


## 0.7 procedural contracts and scaling

`Generator(seed, namespace)` provides `next`, `range`, `pick` and `fork`. Forks derive from immutable stream identity, never current consumption, so generation order cannot reshuffle unrelated systems. `createCharacterProfile(seed)` supplies immutable appearance/proportion and locomotion parameters. `Session.profile` is reconstructed from the world seed. `CharacterController.stats` owns computed speed/jump and optional bounded resources; rendering reads profile and state only. Modifier/resource mutations are transient and reset on load; add an explicit validated save DTO before using them for persistent progression.

`locomotionPose(state, limbIndex, speed)` produces hip/knee/shoulder/elbow targets without depending on Three.js. Mesh articulation and smoothing stay in CharacterView. New character renderers can reuse the same targets.

Terrain covers 640 m with roughly a 550 m coastline. Its rendering uses 100 chunks of 64 m, each a 32×32 grid (204,800 triangles total); independent bounding spheres enable view-frustum rejection. Scenery is partitioned into 128 m regions with instancing within each region. Fog ends at 210 m, camera far clip is 240 m. This is finite-world batching, not streaming or dynamic LOD; all GPU data is created at mount. Resolution controls remain independent of simulation.

Static collision descriptors are indexed into 16 m bins. Queries cover the swept AABB expanded by the player radius and largest obstacle; exact circle sweeps remain the narrow phase. The bins affect lookup cost, not collision geometry. Layout must remain immutable after index creation.

Camera distance uses a clamped 0.65–1.8 multiplier; look-ahead follows world velocity while camera orientation stays world-aligned for predictable joystick axes. Terrain clearance is retained; trees can still occlude the character. Joystick includes a 5 px dead zone.


## 0.8 distance-based terrain detail

`TerrainGeometry.terrainChunk(terrain, originX, originZ, size, segments, skirtDepth)` builds CPU-only mesh buffers in chunk-local coordinates. It reads the analytical heightfield. Surface grids use 32, 16 and 8 segments per 64 m chunk; boundary samples nest exactly across levels. A downward perimeter skirt covers the gap between coarse interpolation and neighbouring fine edges. This is a rendering technique, not solid geometry for collision.

`TerrainView` owns 100 Three.js LOD groups and one shared terrain material. Groups sit at their chunk centres; Three.js selects levels from camera distance, with 12% hysteresis. Economy thresholds are 64/128 m, balanced 96/176 m, crisp 128/208 m. All levels are prebuilt at mount, so memory/mount costs increase; streaming remains future work. Existing scene disposal traverses all level geometries and deduplicates materials.

Graphics changes update level thresholds and pixel ratio without rebuilding simulation or scenery. Nearby ground keeps the previous 2 m spacing. Submitted triangle counts can be compared in the existing diagnostics. These counts demonstrate GPU workload reduction, not a guaranteed FPS improvement on any particular device.
