import * as THREE from "three";

/** Game markers use shared procedural assets; presentation never changes game state. */
export class MarkerView {
  constructor(scene, markers) {
    this.markers = new Map();
    this.elapsed = 0;
    const geometries = new Map(), materials = new Map();
    const geometry = (key, create) => {
      if (!geometries.has(key)) geometries.set(key, create());
      return geometries.get(key);
    };
    const material = (key, create) => {
      if (!materials.has(key)) materials.set(key, create());
      return materials.get(key);
    };
    const lambert = (key, color) => material(key,
      () => new THREE.MeshLambertMaterial({ color, flatShading: true }));
    const rockGeometry = () => geometry("rock", () => new THREE.DodecahedronGeometry(1));
    const log = (parent, x, y, z, length, radius, angle) => {
      const mesh = new THREE.Mesh(
        geometry("log", () => new THREE.CylinderGeometry(1, 1, 1, 6)),
        [lambert("bark", 0x73503a), lambert("cut", 0xd0ab73), lambert("cut", 0xd0ab73)],
      );
      mesh.position.set(x, y, z);
      mesh.scale.set(radius, length, radius);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
      parent.add(mesh);
    };
    const stone = (parent, x, y, z, sx, sy, sz, angle = 0) => {
      const mesh = new THREE.Mesh(rockGeometry(), lambert("stone", 0xa5aaa0));
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.rotation.y = angle;
      parent.add(mesh);
    };
    for (const marker of markers) {
      const group = new THREE.Group();
      const kind = marker.kind || "crystal";
      const ground = marker.groundY ?? marker.y - 0.8;
      group.userData = { kind, baseY: marker.y };
      group.position.set(marker.x, kind === "crystal" ? marker.y : ground, marker.z);
      if (kind === "crystal") {
        const gem = new THREE.Mesh(
          geometry("gem", () => new THREE.OctahedronGeometry(0.38)),
          material("gem", () => new THREE.MeshStandardMaterial({
            color: 0x8be1e6, emissive: 0x185467, roughness: 0.42,
            metalness: 0.15, flatShading: true,
          })),
        );
        gem.scale.set(0.7, 1.55, 0.7);
        group.add(gem);
      } else if (kind === "wood") {
        log(group, -0.06, 0.18, -0.14, 1.05, 0.17, 0.24);
        log(group, 0.10, 0.32, 0.16, 0.88, 0.15, -0.3);
      } else if (kind === "stone") {
        stone(group, -0.22, 0.19, 0, 0.29, 0.27, 0.3);
        stone(group, 0.22, 0.15, -0.12, 0.25, 0.21, 0.23, 1.2);
        stone(group, 0.08, 0.32, 0.15, 0.25, 0.24, 0.24, 2.4);
      } else if (kind === "camp") {
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          stone(group, Math.cos(angle) * 0.73, 0.12, Math.sin(angle) * 0.73,
            0.20, 0.17, 0.23, angle);
        }
        log(group, 0, 0.14, 0, 1.05, 0.13, 0.65);
        log(group, 0, 0.25, 0, 1.05, 0.13, -0.65);
        const flame = new THREE.Group();
        const outer = new THREE.Mesh(
          geometry("flame", () => new THREE.ConeGeometry(1, 1, 5)),
          material("fire", () => new THREE.MeshBasicMaterial({ color: 0xf19b45 })),
        );
        outer.position.y = 0.65;
        outer.scale.set(0.36, 0.95, 0.36);
        flame.add(outer);
        const inner = new THREE.Mesh(outer.geometry,
          material("fire-core", () => new THREE.MeshBasicMaterial({ color: 0xffd780 })));
        inner.position.set(0, 0.49, 0.15);
        inner.scale.set(0.18, 0.57, 0.18);
        flame.add(inner);
        flame.visible = false;
        group.add(flame);
        group.userData.flame = flame;
      }
      this.markers.set(marker.id, group);
      scene.add(group);
    }
  }
  update(dt, game) {
    this.elapsed += Math.max(0, dt);
    const collected = new Set(game.collected);
    for (const [id, group] of this.markers) {
      group.visible = !collected.has(id);
      if (group.userData.kind === "crystal") {
        group.rotation.y = this.elapsed * 0.7;
        group.position.y = group.userData.baseY + Math.sin(this.elapsed * 2 + id) * 0.06;
      }
      const flame = group.userData.flame;
      if (flame) {
        flame.visible = Boolean(game.built);
        flame.scale.y = 1 + Math.sin(this.elapsed * 8) * 0.06;
        flame.rotation.y = this.elapsed * 0.35;
      }
    }
  }
}
