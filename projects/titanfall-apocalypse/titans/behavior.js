// Deterministic telegraphed titan encounter logic, renderer-independent.
export function createTitanBrain({ maxHealth = 1000, seed = 19 } = {}) {
  let health = maxHealth, clock = 0, phase = 1, state = 'idle', timer = 2, attackIndex = seed % 3;
  const events = [];
  const attacks = [
    { name: 'ground-slam', windup: 2.3, recovery: 2.1, radius: 110 },
    { name: 'sweep-beam', windup: 3.2, recovery: 2.8, radius: 160 },
    { name: 'shockwave', windup: 1.7, recovery: 3.4, radius: 220 }
  ];
  function damage(amount, weakPoint = false) {
    if (state === 'dead') return 0;
    const applied = Math.max(0, amount) * (weakPoint ? 2.5 : 1);
    health = Math.max(0, health - applied);
    const nextPhase = health <= maxHealth * .35 ? 3 : health <= maxHealth * .7 ? 2 : 1;
    if (nextPhase !== phase) { phase = nextPhase; events.push({ type: 'phase', phase }); }
    if (!health) { state = 'dead'; events.push({ type: 'death' }); }
    return applied;
  }
  function update(dt) {
    if (state === 'dead') return drain();
    dt = Math.max(0, Math.min(dt, .1)); clock += dt; timer -= dt;
    if (timer > 0) return drain();
    if (state === 'idle' || state === 'recover') {
      attackIndex = (attackIndex + 1) % attacks.length;
      state = 'telegraph';
      timer = attacks[attackIndex].windup / (1 + (phase - 1) * .12);
      events.push({ type: 'telegraph', attack: attacks[attackIndex], duration: timer });
    } else if (state === 'telegraph') {
      state = 'strike'; timer = .25;
      events.push({ type: 'strike', attack: attacks[attackIndex] });
    } else {
      state = 'recover'; timer = attacks[attackIndex].recovery;
      events.push({ type: 'recover', duration: timer });
    }
    return drain();
  }
  function drain() { return events.splice(0); }
  return { update, damage, get health() { return health; }, get phase() { return phase; }, get state() { return state; }, get elapsed() { return clock; } };
}
