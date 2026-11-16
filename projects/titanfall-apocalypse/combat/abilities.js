/**
 * Ability definitions and pure cooldown/energy runtime.
 * Rendering, hit detection and network synchronization are external.
 */
export const ABILITIES = Object.freeze({
  lance: { id:'lance', label:'Rift Lance', cooldown:1.4, energy:8, damage:36, radius:16, range:420, kind:'projectile' },
  rupture: { id:'rupture', label:'Seismic Rupture', cooldown:7, energy:30, damage:95, radius:115, range:0, kind:'aoe' },
  orbital: { id:'orbital', label:'Heavenfall', cooldown:26, energy:90, damage:420, radius:210, range:650, kind:'ultimate' },
  dash: { id:'dash', label:'Phase Dash', cooldown:3.5, energy:15, damage:0, radius:0, range:28, kind:'mobility' }
});
export function createAbilityController({ maxEnergy = 100, regen = 9 } = {}) {
  const cooldowns = Object.fromEntries(Object.keys(ABILITIES).map(k => [k, 0]));
  let energy = maxEnergy;
  function update(dt) {
    dt = Math.max(0, Math.min(dt, .1));
    energy = Math.min(maxEnergy, energy + regen * dt);
    for (const key of Object.keys(cooldowns)) cooldowns[key] = Math.max(0, cooldowns[key] - dt);
  }
  function cast(id, context = {}) {
    const ability = ABILITIES[id];
    if (!ability) return { ok:false, reason:'unknown-ability' };
    if (cooldowns[id] > 0) return { ok:false, reason:'cooldown', remaining:cooldowns[id] };
    if (energy < ability.energy) return { ok:false, reason:'energy', missing:ability.energy - energy };
    energy -= ability.energy;
    cooldowns[id] = ability.cooldown;
    return { ok:true, event:{ type:'ability-cast', id, ability, origin:context.origin ?? null, target:context.target ?? null } };
  }
  return { update, cast, cooldowns, get energy(){return energy}, get maxEnergy(){return maxEnergy} };
}
