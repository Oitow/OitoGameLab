// Low-allocation destruction controller. Integrate explicitly after review.
export function createDestructionSystem(THREE, scene, { maxDebris = 96 } = {}) {
  const pool = [], active = [], structures = new Set();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0x73747a, flatShading: true });
  for (let i = 0; i < maxDebris; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({ mesh, velocity: new THREE.Vector3(), ttl: 0 });
  }
  function register(mesh, health = 100) {
    const structure = { mesh, health, maxHealth: health, destroyed: false };
    structures.add(structure);
    return structure;
  }
  function impact(position, radius, damage) {
    let destroyed = 0;
    for (const s of structures) {
      if (s.destroyed || s.mesh.position.distanceTo(position) > radius) continue;
      s.health -= damage;
      if (s.health > 0) continue;
      s.destroyed = true;
      s.mesh.visible = false;
      destroyed++;
      const size = new THREE.Vector3();
      new THREE.Box3().setFromObject(s.mesh).getSize(size);
      for (let i = 0; i < 7 && pool.length; i++) {
        const item = pool.pop();
        item.mesh.visible = true;
        item.mesh.position.copy(s.mesh.position).add(new THREE.Vector3(
          (Math.random() - 0.5) * size.x, (Math.random() - 0.5) * size.y, (Math.random() - 0.5) * size.z));
        item.mesh.scale.set(2 + Math.random() * 5, 2 + Math.random() * 8, 2 + Math.random() * 5);
        item.velocity.set((Math.random() - 0.5) * 28, 12 + Math.random() * 22, (Math.random() - 0.5) * 28);
        item.ttl = 2 + Math.random() * 2;
        active.push(item);
      }
    }
    return destroyed;
  }
  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const item = active[i];
      item.ttl -= dt;
      item.velocity.y -= 30 * dt;
      item.mesh.position.addScaledVector(item.velocity, dt);
      if (item.mesh.position.y < 1) { item.mesh.position.y = 1; item.velocity.multiplyScalar(0.35); }
      item.mesh.rotation.x += dt * 1.7;
      if (item.ttl <= 0) {
        item.mesh.visible = false;
        active.splice(i, 1);
        pool.push(item);
      }
    }
  }
  function dispose() {
    for (const item of [...pool, ...active]) scene.remove(item.mesh);
    geometry.dispose(); material.dispose(); structures.clear();
  }
  return { register, impact, update, dispose, get activeDebris() { return active.length; } };
}
