import * as THREE from "three";
// Procedural humanoid with joint pivots and no external assets.
export class CharacterView {
  constructor(scene) {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const skin = mat(0xf3c69d),
      shirt = mat(0xe49a47),
      pants = mat(0x344a60),
      boots = mat(0x292e37);
    const part = (parent, geo, material, x, y, z) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    part(this.body, new THREE.BoxGeometry(0.76, 0.85, 0.38), shirt, 0, 1.35, 0);
    part(this.body, new THREE.BoxGeometry(0.24, 0.23, 0.24), skin, 0, 1.9, 0);
    this.head = part(
      this.body,
      new THREE.SphereGeometry(0.32, 12, 8),
      skin,
      0,
      2.17,
      0,
    );
    part(
      this.body,
      new THREE.BoxGeometry(0.19, 0.1, 0.1),
      mat(0x684b37),
      0,
      2.14,
      0.3,
    );
    this.arms = [];
    this.elbows = [];
    this.legs = [];
    this.knees = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.5, 1.72, 0);
      this.body.add(arm);
      part(arm, new THREE.BoxGeometry(0.24, 0.38, 0.27), shirt, 0, -0.18, 0);
      const elbow = new THREE.Group();
      elbow.position.y = -0.35;
      arm.add(elbow);
      part(elbow, new THREE.BoxGeometry(0.18, 0.28, 0.2), skin, 0, -0.13, 0);
      part(elbow, new THREE.BoxGeometry(0.21, 0.17, 0.23), skin, 0, -0.32, 0);
      this.elbows.push(elbow);
      this.arms.push(arm);
      const leg = new THREE.Group();
      leg.position.set(side * 0.22, 0.95, 0);
      this.body.add(leg);
      part(leg, new THREE.BoxGeometry(0.28, 0.46, 0.31), pants, 0, -0.21, 0);
      const knee = new THREE.Group();
      knee.position.y = -0.43;
      leg.add(knee);
      part(knee, new THREE.BoxGeometry(0.23, 0.36, 0.25), pants, 0, -0.17, 0);
      part(knee, new THREE.BoxGeometry(0.3, 0.2, 0.43), boots, 0, -0.42, 0.09);
      this.knees.push(knee);
      this.legs.push(leg);
    }
    scene.add(this.group);
  }
  update(dt, state) {
    this.group.position.set(state.x, state.y, state.z);
    this.group.rotation.y = state.facing;
    const horizontalSpeed = Math.hypot(state.vx, state.vz),
      speed = 5.3;
    this.phase = state.phase;
    this.grounded = state.grounded;
    this.verticalVelocity = state.vy;
    this.landing = state.landing;
    this.facing = state.facing;
    const velocity = { x: state.vx, z: state.vz };
    const gait = Math.min(horizontalSpeed / speed, 1);
    const blend = 1 - Math.exp(-18 * dt);
    const rising = this.verticalVelocity > 0;
    for (let i = 0; i < 2; i++) {
      const stride = Math.sin(this.phase + i * Math.PI);
      const recovery = Math.max(0, -Math.cos(this.phase + i * Math.PI));
      const hip = this.grounded
        ? stride * 0.65 * gait - this.landing * 0.28
        : rising
          ? -0.55
          : -0.2;
      const knee = this.grounded
        ? recovery * 0.8 * gait + this.landing * 0.52
        : rising
          ? 0.9
          : 0.35;
      const shoulder = this.grounded
        ? -stride * 0.5 * gait
        : rising
          ? -0.65
          : -0.25;
      const elbow = this.grounded ? -0.24 * gait : -0.75;
      this.legs[i].rotation.x = THREE.MathUtils.lerp(
        this.legs[i].rotation.x,
        hip,
        blend,
      );
      this.knees[i].rotation.x = THREE.MathUtils.lerp(
        this.knees[i].rotation.x,
        knee,
        blend,
      );
      this.arms[i].rotation.x = THREE.MathUtils.lerp(
        this.arms[i].rotation.x,
        shoulder,
        blend,
      );
      this.elbows[i].rotation.x = THREE.MathUtils.lerp(
        this.elbows[i].rotation.x,
        elbow,
        blend,
      );
    }
    const bob = this.grounded
      ? Math.abs(Math.sin(this.phase)) * 0.045 * gait - this.landing * 0.12
      : 0;
    this.body.position.y = THREE.MathUtils.lerp(
      this.body.position.y,
      bob,
      blend,
    );
    // Express lean in the character's local axes after turning.
    const localSide =
      velocity.x * Math.cos(this.facing) - velocity.z * Math.sin(this.facing);
    const localForward =
      velocity.x * Math.sin(this.facing) + velocity.z * Math.cos(this.facing);
    this.body.rotation.z = THREE.MathUtils.lerp(
      this.body.rotation.z,
      -localSide * 0.022,
      blend,
    );
    const pitch = this.grounded
      ? localForward * 0.021 + this.landing * 0.17
      : -0.08;
    this.body.rotation.x = THREE.MathUtils.lerp(
      this.body.rotation.x,
      pitch,
      blend,
    );
  }
}
