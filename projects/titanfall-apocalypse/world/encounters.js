// Seeded encounter placements and progression zones for the first vertical slice.
export function generateEncounterMap(seed = 311, radius = 1400) {
  let s = seed >>> 0;
  const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const zones = [
    { id:'ash-landing', name:'Ash Landing', center:{x:0,z:300}, radius:145, danger:0, purpose:'tutorial' },
    { id:'fallen-quarter', name:'Fallen Quarter', center:{x:-190,z:40}, radius:230, danger:1, purpose:'ruined-city' },
    { id:'red-corridor', name:'Red Corridor', center:{x:130,z:-170}, radius:230, danger:2, purpose:'combat' },
    { id:'colossus-crater', name:'Colossus Crater', center:{x:0,z:-500}, radius:300, danger:3, purpose:'boss' }
  ];
  const enemies = [];
  for (const zone of zones.slice(1, 3)) {
    const count = zone.danger === 1 ? 9 : 14;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = 45 + rand() * (zone.radius - 55);
      enemies.push({
        id:zone.id + '-enemy-' + i,
        archetype:zone.danger === 1 ? (rand() < .7 ? 'crawler':'sentinel') : (rand() < .5 ? 'artillery':'hunter'),
        x:zone.center.x + Math.cos(angle) * distance,
        z:zone.center.z + Math.sin(angle) * distance,
        level:zone.danger * 3 + 1 + Math.floor(rand() * 3),
        alive:true
      });
    }
  }
  return { seed, radius, zones, enemies, boss:{ id:'ashen-colossus', x:0, z:-500, level:12 } };
}
export function zoneAt(map, x, z) {
  let nearest = null;
  for (const zone of map.zones) {
    const distance = Math.hypot(x-zone.center.x,z-zone.center.z);
    if (distance <= zone.radius && (!nearest || zone.danger > nearest.danger)) nearest = zone;
  }
  return nearest;
}
