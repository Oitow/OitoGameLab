# Working with OitoGameLab

## Start locally

Node 22 or newer. No npm install required.

```sh
npm run dev
npm test
npm run check
```

Open http://localhost:4173/play/. Keep the server running for browser tests.

## One task, one playable outcome

1. Read STATUS and architecture, inspect current git state.
2. Write a small issue with goal, acceptance criteria and affected systems.
3. Create `feat/<topic>` or `fix/<topic>` from current main.
4. Implement the smallest complete increment. Shared changes must keep both games working.
5. Run tests and syntax/import/boundary checks; playtest visible changes.
6. Update STATUS; open PR with evidence and limitations.
7. Review changes. Merge when explicitly authorized; CI also checks main.

## Useful requests

- “Add a third game under games/ that reuses the current engine; first define one playable mechanic.”
- “Use the engine role to add <system> with tests and keep both demos working.”
- “Review this PR for mobile input, saves and resource leaks.”

Role files are instructions, not continuously running AI workers. Their availability in a client depends on that client's custom-agent support. AGENTS.md is the portable source of truth. Do not enable autonomous scheduled agents or paid tools without a separate request.

## Acceptance playtest

390×844 portrait and desktop: boot without console errors; joystick + jump together; WASD + space; blur releases input; pause freezes movement; settings opens paused; Continue resumes; switch modes and regenerate repeatedly; same seed reproduces world; save, move, load restores position/progress; invalid storage shows feedback; resize; WebGL loss pauses and restores. Real Android testing is a separate manual gate.

## GitHub Pages

All paths are relative and no build output is needed. Preserve the repository's existing Pages source (main / root). When a PR is merged, branch-based Pages can serve the new `/play/` route and root launcher. This change does not alter repository admin settings. If Pages is configured for Actions instead, select a deployment workflow separately; CI here only validates and does not deploy. Do not assert that a URL is live until checked.
