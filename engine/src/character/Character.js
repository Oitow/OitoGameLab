import * as THREE from 'three';
export class Character {
  constructor(scene, world) {
    this.world = world;
    this.group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.85, 4, 8), new THREE.MeshLambertMaterial({ color: 0xe8a04d }));
    torso.position.y = 1.02;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf8d6aa }));
    head.position.y = 1.88;
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.13), new THREE.MeshLambertMaterial({ color: 0x754c2d }));
    face.position.set(0, 1.88, 0.32);
    this.group.add(torso, head, face);
    scene.add(this.group);
    this.velocity = new THREE.Vector3();
    this.reset();
  }
  reset() {
    this.group.position.set(0, this.world.height(0, 0), 0);
    this.velocity.set(0, 0, 0);
  }
  update(dt, input) {
    const move = input.direction;
    const targetX = move.x * 5, targetZ = move.y * 5;
    const blend = 1 - Math.exp(-12 * dt);
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetX, blend);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetZ, blend);
    const p = this.group.position;
    const nx = p.x + this.velocity.x * dt, nz = p.z + this.velocity.z * dt;
    if (this.world.walkable(nx, nz)) {
      p.x = nx; p.z = nz;
      p.y = THREE.MathUtils.lerp(p.y, this.world.height(nx, nz), 1 - Math.exp(-16 * dt));
    } else {
      this.velocity.multiplyScalar(0.2);
    }
    if (this.velocity.lengthSq() > 0.1) {
      this.group.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }
  }
}