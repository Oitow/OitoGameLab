# OitoGameLab — instructions for every coding agent

## Goal

Build multiple small mobile browser games from shared, tested systems. Android portrait and touch are first-class; desktop keyboard remains supported. Deliver a playable increment, not a speculative universal engine.

## Read first

1. `docs/STATUS.md` — shipped facts, limitations, next milestone.
2. `docs/ARCHITECTURE.md` — boundaries and public contracts.
3. `docs/WORKFLOW.md` — execution, checks, handoff.
4. Relevant nearest AGENTS.md and existing implementation/tests.

## Ownership and boundaries

- `src/core`, `src/world`, `src/character`: pure JavaScript simulation. No DOM, Three.js, browser storage or render objects.
- `src/render`: Three.js adapter, view-only animation, cameras, GPU lifecycle.
- `src/input`: browser input translated to actions; release all actions on blur/pause.
- `games/<id>`: game-specific rules through the game contract. Never import a game into shared engine code.
- `play`: composition root, menus, storage adapter and browser lifecycle.
- `engine/` and `prototypes/`: preserved earlier experiments. Do not change unless task explicitly concerns them.
- Remain compatible with static GitHub Pages and subdirectory hosting. Keep Three.js pinned. No framework or build-system migration without a concrete need.

## Working rules

- Inspect current branch, status and remote head before edits; preserve others' work.
- Choose one observable outcome and acceptance criteria. Keep changes focused.
- Read existing modules before adding alternatives; prefer composition over inheritance.
- Systems own their state. Simulation is authoritative; rendering never changes simulation.
- Use metres, Y-up, X/Z ground, seconds; fixed 60 Hz updates.
- Keep procedural results deterministic for a seed. Do not use Math.random in simulation.
- Dispose resources and remove listeners when replacing worlds or tearing down.
- Do not claim actual Android testing from desktop viewport emulation.
- Never fabricate passed checks, live deployment or automatically running agents.
- Do not auto-merge or overwrite other branches. Use a feature branch and a pull request unless the user explicitly directs otherwise.

## Completion gate

Run `npm test` and `npm run check`. For visual/input changes serve with `npm run dev` and check desktop plus 390×844 portrait, console errors, movement, jump, pause, regeneration, game switch, save/load. Capture and inspect screenshots. Report any unavailable checks honestly.
Update `docs/STATUS.md` when behavior or milestone status changes. PR must include problem, result, validation and limitations. Avoid secret tokens, paid services, dependency churn and generated binary assets in commits.

## Agent roles

Role briefs live in `.github/agents/`: engine, gameplay, reviewer. They are instructions for explicitly invoked agents, not background jobs. Parallel work requires explicit delegation and disjoint file ownership. Integrator owns shared contracts, tests and final review.
