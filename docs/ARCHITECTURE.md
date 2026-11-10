# OitoEngine 0.4 architecture

## Decision

Plain JavaScript ES modules + pinned Three.js 0.180.0 via import map. No build required, no runtime dependency installation, static Pages compatibility. This retains the lightweight existing project while moving simulation out of meshes. TypeScript/Vite and Rapier are future decisions when complexity warrants them; meaningful solid-object physics must use a dedicated physics adapter rather than accumulating handmade collision patches.

## Dependency direction

`play` composes `games` + `src/core` + `src/input` + `src/render`.
`Session` owns `Terrain`, `CharacterController`, and an injected game definition.
Renderers read simulation; simulation never imports rendering or a specific game.

## Public contracts

- `Terrain(seed)`: `height(x,z)`, `walkable(x,z)`, `findSpawn()`, deterministic `hash(x,z)` and `noise(x,z)`. uint32 seed, 70 m square, ocean at y=0.
- `CharacterController(terrain)`: `state`, `step(seconds,{x,z,jump})`, `reset()`. Normalized movement, terrain contact, world-space jump/gravity, shoreline slide.
- `FixedStep`: `advance(realSeconds, update)` at 60 Hz, maximum 5 catch-up steps, `reset()` on pause/resume. Return value is interpolation fraction, currently unused by the simple renderer.
- Game definition: `{id,name,create(terrain)}`. The resulting game has `markers: {id,x,y,z}[]`, `collected: number[]`, `step(dt,player)`, `status()`. This deliberately small v1 contract suits the two supplied examples; extend with tests when another genre needs it.
- `Session`: owns all simulation state, calls character then game. `snapshot()` / `restore(data)` use a validated versioned JSON DTO.
- `Renderer`: `mount(session)`, `draw(dt,session)`, `dispose()`. Geometry/materials shared where practical and disposed once per resource when replacing a scene.
- `Input`: samples touch/keyboard to normalized axes and consumes queued jump once per simulation tick. UI focus does not trigger gameplay keyboard actions.

## Conventions and limits

Metres, seconds, Y-up, X/Z ground. Camera faces negative Z, so forward input is negative Z. Character origin is at feet. Save data contains game id, seed, grounded position and collected IDs; jumping momentum is intentionally not persisted. Local storage is browser-local, version 1 only, one slot. Load validation occurs before replacing the active session.

Terrain collision uses the analytical height function; rendered mesh approximates it. Trees are decorative. There are no solid obstacle colliders, navmesh, chunk streaming, multiplayer or combat yet. Fixed ticks currently render without position interpolation. Do not advertise these as completed engine features.

## Assets and performance

Current assets are procedural meshes, no external artwork. Future shipped models use GLB/glTF, named manifest keys and separate collision proxies. Do not commit DCC source as runtime assets. Pixel ratio capped at 1.5, instanced trees, no postprocessing or shadow maps. Use real-device measurements before setting FPS guarantees. Diagnostics expose FPS and draw calls in the collapsed menu.
