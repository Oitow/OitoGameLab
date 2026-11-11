import * as THREE from "three";

/** Fixed world-facing follow camera; input axes stay predictable on touch. */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 6.8, 11.5);
    this.target = new THREE.Vector3();
    this.focus = new THREE.Vector3();
  }
  aim(position) {
    this.focus.set(position.x, position.y + 1.15, position.z - 1.6);
  }
  clearance(cameraPosition, terrain) {
    if (!terrain) return;
    // Lift the camera over the heightfield, including hills between it and the
    // character. This is a view probe only; it never changes simulation state.
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const x = THREE.MathUtils.lerp(this.focus.x, cameraPosition.x, t);
      const z = THREE.MathUtils.lerp(this.focus.z, cameraPosition.z, t);
      const floor = terrain.height(x, z) + 0.65;
      const y = THREE.MathUtils.lerp(this.focus.y, cameraPosition.y, t);
      if (floor > y) cameraPosition.y += (floor - y) / t;
    }
  }
  snap(position, terrain = null) {
    this.aim(position);
    this.camera.position.copy(position).add(this.offset);
    this.clearance(this.camera.position, terrain);
    this.camera.lookAt(this.focus);
  }
  update(dt, position, terrain = null) {
    this.aim(position);
    this.target.copy(position).add(this.offset);
    this.clearance(this.target, terrain);
    this.camera.position.lerp(this.target, 1 - Math.exp(-5 * dt));
    this.clearance(this.camera.position, terrain);
    this.camera.lookAt(this.focus);
  }
}
