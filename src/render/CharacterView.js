import * as THREE from "three";

/** Two-metre, feet-origin adventurer. All shapes are generated locally; no textures. */
export class CharacterView {
  constructor(scene) {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.head = new THREE.Group();
    this.head.position.y = 1.765;
    this.group.add(this.body);
    this.body.add(this.head);
    const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
    const skin = mat(0xd9a078), tunic = mat(0x387c79),
      trousers = mat(0x394953), leather = mat(0x654936),
      dark = mat(0x263338), hair = mat(0x493a30), scarf = mat(0xcf8c49);
    const cylinder = (top, bottom, height, sides = 6) =>
      new THREE.CylinderGeometry(top, bottom, height, sides, 1);
    const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      parent.add(mesh);
      return mesh;
    };
    // Batch static details by material so adding silhouette detail does not add
    // one draw call per buckle, eye or strap. Preserve each polygon's normals.
    const batch = (parent, build) => {
      const temporary = new THREE.Group();
      build(temporary);
      const groups = new Map();
      for (const mesh of temporary.children) {
        mesh.updateMatrix();
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrix);
        const entries = groups.get(mesh.material) || [];
        entries.push(geometry);
        groups.set(mesh.material, entries);
        mesh.geometry.dispose();
      }
      for (const [material, entries] of groups) {
        const geometry = new THREE.BufferGeometry();
        for (const name of ["position", "normal"]) {
          const length = entries.reduce((sum, entry) => sum + entry.getAttribute(name).array.length, 0);
          const values = new Float32Array(length);
          let offset = 0;
          for (const entry of entries) {
            const source = entry.getAttribute(name).array;
            values.set(source, offset);
            offset += source.length;
          }
          geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
        }
        entries.forEach((entry) => entry.dispose());
        parent.add(new THREE.Mesh(geometry, material));
      }
    };
    batch(this.body, (g) => {
      part(g, cylinder(0.34, 0.27, 0.55, 8), tunic, 0, 1.245, 0, 1, 1, 0.62);
      part(g, cylinder(0.27, 0.32, 0.18, 8), tunic, 0, 0.98, 0, 1, 1, 0.67);
      part(g, cylinder(0.283, 0.283, 0.07, 8), leather, 0, 1.065, 0, 1, 1, 0.68);
      part(g, new THREE.BoxGeometry(0.09, 0.065, 0.025), scarf, 0, 1.065, 0.195);
      part(g, cylinder(0.095, 0.11, 0.15), skin, 0, 1.575, 0);
      part(g, cylinder(0.16, 0.14, 0.11, 8), scarf, 0, 1.54, 0, 1, 1, 0.85);
      part(g, new THREE.ConeGeometry(0.12, 0.26, 3), scarf, 0.09, 1.38, 0.2, 0.7, 1, 0.25);
      // Leather pack and rolled blanket sit against the back, facing -Z.
      part(g, cylinder(0.23, 0.21, 0.43, 8), leather, 0, 1.29, -0.25, 1, 1, 0.6);
      const roll = part(g, cylinder(0.09, 0.09, 0.51, 8), scarf, 0, 1.55, -0.27);
      roll.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const strap = part(g, new THREE.BoxGeometry(0.045, 0.45, 0.035), leather, side * 0.205, 1.31, 0.18);
        strap.rotation.z = side * -0.13;
      }
    });
    batch(this.head, (g) => {
      part(g, new THREE.SphereGeometry(0.225, 8, 6), skin, 0, 0, 0, 0.83, 1, 0.85);
      part(g, new THREE.SphereGeometry(0.235, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.57), hair, 0, 0, -0.012, 0.88, 1, 0.87);
      for (const side of [-1, 1]) {
        part(g, new THREE.OctahedronGeometry(0.042), skin, side * 0.186, -0.025, 0, 0.5, 1, 0.8);
        part(g, new THREE.BoxGeometry(0.032, 0.026, 0.016), dark, side * 0.066, 0.012, 0.174);
        const brow = part(g, new THREE.BoxGeometry(0.05, 0.017, 0.018), hair, side * 0.066, 0.055, 0.169);
        brow.rotation.z = side * -0.08;
      }
      part(g, new THREE.ConeGeometry(0.037, 0.07, 4), skin, 0, -0.02, 0.188).rotation.x = Math.PI / 2;
    });
    this.arms = [];
    this.elbows = [];
    this.legs = [];
    this.knees = [];
    const sleeve = cylinder(0.115, 0.09, 0.28), forearm = cylinder(0.085, 0.061, 0.25),
      hand = new THREE.IcosahedronGeometry(0.078, 0), thigh = cylinder(0.13, 0.10, 0.41),
      shin = cylinder(0.10, 0.073, 0.35), boot = cylinder(0.105, 0.115, 0.21, 8);
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.355, 1.48, 0);
      arm.rotation.z = side * 0.07;
      this.body.add(arm);
      part(arm, sleeve, tunic, 0, -0.14, 0, 1, 1, 0.92);
      const elbow = new THREE.Group();
      elbow.position.y = -0.28;
      arm.add(elbow);
      part(elbow, forearm, skin, 0, -0.125, 0, 1, 1, 0.9);
      part(elbow, hand, leather, 0, -0.285, 0, 0.85, 1.15, 0.8);
      this.elbows.push(elbow);
      this.arms.push(arm);
      const leg = new THREE.Group();
      leg.position.set(side * 0.145, 0.96, 0);
      this.body.add(leg);
      part(leg, thigh, trousers, 0, -0.205, 0, 1, 1, 1.05);
      const knee = new THREE.Group();
      knee.position.y = -0.43;
      leg.add(knee);
      part(knee, shin, trousers, 0, -0.175, 0);
      part(knee, boot, dark, 0, -0.425, 0.045, 1, 1, 1.55);
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
