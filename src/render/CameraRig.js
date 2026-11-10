import * as THREE from "three";
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 11, 17);
    this.target = new THREE.Vector3();
  }
  snap(position) {
    this.camera.position.copy(position).add(this.offset);
    this.camera.lookAt(position.x, position.y + 0.7, position.z - 2);
  }
  update(dt, position) {
    this.target.copy(position).add(this.offset);
    this.camera.position.lerp(this.target, 1 - Math.exp(-5 * dt));
    this.camera.lookAt(position.x, position.y + 0.7, position.z - 2);
  }
}
