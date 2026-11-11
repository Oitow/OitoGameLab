import * as THREE from "three";

const up = new THREE.Vector3(0, 1, 0);
const fraction = (v) => v - Math.floor(v);
const variationOf = (o) => o.variation ?? fraction(Math.sin(o.x * 17.3 + o.z * 41.7) * 951.135);

/** A handful of shared polygon batches, independent of the number of trees.
 * Layout descriptors remain authoritative: trunk and rock bases match colliders.
 */
export class WorldObjects {
  constructor(scene, layout, terrain = null) {
    const trunks = [], branches = [], pineCrowns = [], oakCrowns = [], rocks = [];
    const plants = [], flowers = [];
    const transform = (x, y, z, sx, sy, sz, yaw = 0, tint = 1) => ({
      x, y, z, sx, sy, sz, yaw, tint,
    });
    for (const o of layout.objects) {
      const v = variationOf(o), yaw = o.yaw ?? v * Math.PI * 2;
      if (o.kind === "rock") {
        rocks.push(transform(o.x, o.y + o.height * 0.42, o.z,
          o.radius, o.height * 0.58, o.radius, yaw, 0.78 + v * 0.32));
        continue;
      }
      if (o.kind !== "tree") continue;
      const pine = (o.species ?? (v > 0.48 ? "pine" : "oak")) === "pine";
      const h = o.height, crown = o.canopyRadius ?? h * (pine ? 0.19 : 0.25);
      // Tapered base remains inside the shared circular collision footprint.
      trunks.push(transform(o.x, o.y + h * 0.33, o.z,
        o.radius, h * 0.66, o.radius, yaw, 0.8 + v * 0.3));
      if (pine) {
        for (let tier = 0; tier < 3; tier++) {
          const length = h * (0.36 - tier * 0.045);
          const tip = o.y + h * (0.72 + tier * 0.14);
          const width = crown * (1 - tier * 0.23);
          pineCrowns.push(transform(o.x, tip - length / 2, o.z,
            width, length, width, yaw + tier * 0.8, 0.84 + tier * 0.09 + v * 0.1));
        }
      } else {
        // Three short limbs support an irregular crown instead of one sphere.
        for (let limb = 0; limb < 3; limb++) {
          const angle = yaw + limb * Math.PI * 2 / 3;
          const reach = crown * 0.64;
          const dx = Math.cos(angle) * reach, dz = Math.sin(angle) * reach;
          const dy = h * (0.18 + limb * 0.025);
          const baseY = o.y + h * 0.43;
          const branch = transform(o.x + dx / 2, baseY + dy / 2, o.z + dz / 2,
            o.radius * 0.48, Math.hypot(dx, dy, dz), o.radius * 0.48,
            0, 0.82 + v * 0.2);
          branch.direction = new THREE.Vector3(dx, dy, dz).normalize();
          branches.push(branch);
          oakCrowns.push(transform(o.x + dx, o.y + h * (0.7 + limb * 0.018), o.z + dz,
            crown * 0.75, h * (0.205 + v * 0.025), crown * 0.75,
            angle, 0.8 + limb * 0.075 + v * 0.15));
        }
        oakCrowns.push(transform(o.x, o.y + h * 0.82, o.z,
          crown * 0.82, h * 0.18, crown * 0.78, yaw, 1.04 + v * 0.1));
      }
    }
    for (const o of layout.decorations ?? []) {
      const v = variationOf(o), s = o.scale ?? 1;
      plants.push(transform(o.x, o.y + 0.15 * s, o.z,
        0.33 * s, 0.3 * s, 0.33 * s, o.yaw ?? v * 6.28, 0.75 + v * 0.4));
      // Sparse amber flower heads add readable colour without textures or lights.
      if (o.variant === 1 && v > 0.65) flowers.push(transform(o.x, o.y + 0.33 * s, o.z,
        0.065 * s, 0.075 * s, 0.065 * s, v * 6.28, 0.9 + v * 0.1));
    }
    // One merged contact-shadow batch follows the actual terrain at every vertex.
    // Alpha fades at the polygon rim; this costs no shadow map or extra lights.
    if (terrain) {
      const positions = [], colors = [];
      const point = (o, radius, angle, alpha) => {
        const x = o.x + Math.cos(angle) * radius;
        const z = o.z + Math.sin(angle) * radius;
        positions.push(x, terrain.height(x, z) + 0.035, z);
        colors.push(0.16, 0.20, 0.16, alpha);
      };
      for (const o of layout.objects) {
        const radius = o.kind === "tree" ? Math.min(1.9, o.height * 0.13) : o.radius * 1.3;
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4, b = (i + 1) * Math.PI / 4;
          point(o, 0, 0, 0.23);
          point(o, radius * 0.5, b, 0.14);
          point(o, radius * 0.5, a, 0.14);
          point(o, radius * 0.5, a, 0.14);
          point(o, radius * 0.5, b, 0.14);
          point(o, radius, a, 0);
          point(o, radius, a, 0);
          point(o, radius * 0.5, b, 0.14);
          point(o, radius, b, 0);
        }
      }
      if (positions.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
        const shadows = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
          vertexColors: true, transparent: true, depthWrite: false,
          side: THREE.DoubleSide,
        }));
        shadows.renderOrder = 1;
        scene.add(shadows);
      }
    }
    this.batches = [];
    const add = (entries, geometry, hex) => {
      if (!entries.length) { geometry.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geometry,
        new THREE.MeshLambertMaterial({ color: hex, flatShading: true }), entries.length);
      const dummy = new THREE.Object3D(), color = new THREE.Color();
      entries.forEach((o, i) => {
        dummy.position.set(o.x, o.y, o.z);
        dummy.scale.set(o.sx, o.sy, o.sz);
        if (o.direction) dummy.quaternion.setFromUnitVectors(up, o.direction);
        else dummy.rotation.set(0, o.yaw, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        color.setRGB(o.tint, o.tint, o.tint);
        mesh.setColorAt(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      this.batches.push(mesh);
    };
    add(trunks, new THREE.CylinderGeometry(0.38, 1, 1, 6), 0x79583e);
    add(branches, new THREE.CylinderGeometry(0.3, 1, 1, 5), 0x79583e);
    add(pineCrowns, new THREE.ConeGeometry(1, 1, 7), 0x3c6550);
    add(oakCrowns, new THREE.IcosahedronGeometry(1, 1), 0x71844b);
    add(rocks, new THREE.DodecahedronGeometry(1, 0), 0x92958b);
    add(plants, new THREE.ConeGeometry(1, 1, 5), 0x889157);
    add(flowers, new THREE.IcosahedronGeometry(1, 0), 0xe8ba70);
  }
}
