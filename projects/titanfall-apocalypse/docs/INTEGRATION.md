# v0.3 integration plan (not merged)

This branch intentionally keeps `index.html` unchanged until the current GitHub Pages demo is reviewed.

## New systems
- `world/atmosphere.js`: seeded skyline spires, ruined pylons and animated arena beacon.
- `combat/destruction.js`: bounded debris pool, building hit points and destruction simulation.
- `titans/behavior.js`: three telegraphed attacks, weak-point multiplier and three health phases.
- `player/mobile-controls.js`: isolated pointer joystick and camera gesture handling.

## Wiring order
1. Import `createAtmosphereWorld`, construct with the existing Three.js namespace, call `update(now / 1000)` per frame.
2. Register the existing city meshes with `createDestructionSystem`; replace the current instant-hide logic with `impact`, then call `update(dt)`.
3. Create a titan brain; forward spell damage to `damage`, translate telegraph/strike events to VFX and player hit detection.
4. Replace inline joystick/drag event handlers with `createMobileControls`; avoid double-binding listeners.
5. Keep quality low on midrange Android: cap debris at 48, limit render pixel ratio to 1.25, avoid shadows on hundreds of meshes.

## QA checklist (not executed)
- Open the Pages subdirectory on Android portrait and desktop.
- Verify no JS exceptions, joystick dead zone, pointer cancellation and button presses.
- Confirm distant landmarks remain visible under exponential fog.
- Check titan telegraphs before damage and phase transitions at 70% / 35%.
- Check building damage and debris pool recovery after repeated attacks.
- Record FPS and memory on midrange Android before merging.

No multiplayer/network synchronization is implemented.
