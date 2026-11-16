/**
 * Titan Apocalypse - modular world atmosphere / landmark generator.
 * This module is intentionally not wired into index.html yet:
 * review and integrate in a follow-up commit after mobile smoke testing.
 * Requires the THREE namespace passed by the host (no second Three.js import).
 */
export function createAtmosphereWorld(THREE, scene, options = {}) {
  const { seed = 2026, worldRadius = 1800, quality = 'medium' } = options;
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const group = new THREE.Group();
  group.name = 'AtmosphereWorld';
  scene.add(group);
  const stone = new THREE.MeshLambertMaterial({ color: 0x353b47, flatShading: true });
  const darkStone = new THREE.MeshLambertMaterial({ color: 0x222936, flatShading: true });
  const emissive = new THREE.MeshBasicMaterial({ color: 0xe76758 });
  const density = quality === 'low' ? 0.45 : quality === 'high' ? 1.5 : 1;
  const meshes = [];
  const make = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  // Massive silhouettes around the perimeter provide visual scale at low cost.
  const spires = Math.round(24 * density);
  const cone = new THREE.ConeGeometry(1, 1, 5);
  for (let i = 0; i < spires; i++) {
    const angle = (i + random() * 0.4) / spires * Math.PI * 2;
    const radius = worldRadius * (0.55 + random() * 0.4);
    const height = 140 + random() * 440;
    make(cone, i % 3 ? stone : darkStone,
      Math.cos(angle) * radius, height * 0.42, Math.sin(angle) * radius,
      30 + random() * 80, height, 30 + random() * 80);
  }
  // Broken pylons: navigational silhouettes, not copied franchise designs.
  const pylonGeometry = new THREE.CylinderGeometry(5, 10, 1, 5);
  for (let i = 0; i < Math.round(12 * density); i++) {
    const angle = random() * Math.PI * 2;
    const radius = 250 + random() * worldRadius * 0.5;
    const height = 40 + random() * 160;
    const pylon = make(pylonGeometry, darkStone,
      Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius,
      1, height, 1);
    pylon.rotation.z = (random() - 0.5) * 0.28;
  }
  // A distant crimson beacon guides players toward a boss arena.
  const beaconGeometry = new THREE.OctahedronGeometry(1, 0);
  const beacon = make(beaconGeometry, emissive, 0, 280, -520, 12, 40, 12);
  const ring = make(new THREE.TorusGeometry(32, 2.5, 4, 20), emissive, 0, 280, -520);
  const update = (elapsedSeconds) => {
    beacon.rotation.y = elapsedSeconds * 0.2;
    ring.rotation.z = elapsedSeconds * 0.12;
  };
  const dispose = () => {
    scene.remove(group);
    for (const mesh of meshes) {
      // Shared geometries and materials are disposed once below.
      if (mesh.geometry !== cone && mesh.geometry !== pylonGeometry &&
          mesh.geometry !== beaconGeometry && mesh !== ring) mesh.geometry.dispose();
    }
    cone.dispose();
    pylonGeometry.dispose();
    beaconGeometry.dispose();
    ring.geometry.dispose();
    stone.dispose();
    darkStone.dispose();
    emissive.dispose();
  };
  return { group, update, dispose, seed, quality };
}
