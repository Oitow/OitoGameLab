# TITANFALL: APOCALYPSE (working title)

Independent experimental kaiju-scale action MMO prototype. Original designs only; inspirations: giant biomechanical beings, catastrophic battles, PS2-era low-poly aesthetics.

## Vision
- Human-scale player versus 100–500 m titans; colossal readable landmarks and horizon.
- Atmospheric gritty PS2/early-PS3 low-poly visuals, dramatic lighting, fog and silhouettes.
- Destructible modular city blocks, ruins, terrain scars and persistent-looking impact zones.
- Three spectacular skills: projectile, shockwave and orbital beam; cooldowns and telegraphs.
- Mobile-first portrait controls, scalable render resolution, low draw calls and pooling.
- Initially **single-player vertical slice** with simulated MMO ambience; multiplayer networking is a later milestone.

## Technical constraints
- Keep this project isolated inside `projects/titanfall-apocalypse/`; do not alter Erlenwacht or Island Explorer.
- Static GitHub Pages-friendly HTML/JS; Three.js CDN is acceptable.
- Modular systems, deterministic seeds, fixed timestep where appropriate; performance budgets and fallback quality.
- No copyrighted franchise characters, logos or designs.

## Parallel workstreams
1. World/scale/level architecture — terrain, huge sightlines, destroyed city, points of interest.
2. Titans/AI — original kaiju silhouettes, telegraphed behavior, weak points, boss phases.
3. Combat/destruction/VFX — projectile, area shockwave, beam, debris pooling, destruction states.
4. Character/mobile UX — controller, camera, responsive portrait UI, accessibility.
5. Integration/performance — GitHub Pages demo, smoke tests, quality presets and instrumentation.

## Integration contract
Agents should work in separate feature branches and pull requests, scoped to their subsystem. Avoid editing the same root `index.html` simultaneously; integrate via explicit JS modules. Keep the prototype playable after each merge. Each PR must describe test steps and performance impact.

## Next milestone
Playable 3–5 minute vertical slice: approach a colossal titan through ruins, survive its attacks, destroy cover and defeat one phase with a super ability.
