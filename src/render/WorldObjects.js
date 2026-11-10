import * as THREE from "three";
export class WorldObjects {
  constructor(scene, world) {
    this.world = world;
    this.mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.8, 2.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x397e4d }),
      120,
    );
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.rebuild();
  }
  rebuild() {
    const d = new THREE.Object3D();
    let n = 0;
    for (let i = 0; i < 800 && n < 120; i++) {
      const x = (this.world.hash(i * 7 + 1, 11) - 0.5) * 60,
        z = (this.world.hash(i * 13 + 4, 29) - 0.5) * 60;
      const y = this.world.height(x, z);
      if (y < 1.6 || Math.hypot(x, z) < 5) continue;
      const s = 0.7 + this.world.hash(i + 33, 9) * 0.8;
      d.position.set(x, y + 1.25 * s, z);
      d.scale.setScalar(s);
      d.updateMatrix();
      this.mesh.setMatrixAt(n++, d.matrix);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
