import * as THREE from "three";
import { TerrainView } from "./TerrainView.js";
import { CharacterView } from "./CharacterView.js";
import { WorldObjects } from "./WorldObjects.js";
import { CameraRig } from "./CameraRig.js";
export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 180);
    this.rig = new CameraRig(this.camera);
    this.markers = new Map();
    this.resize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    };
    window.addEventListener("resize", this.resize);
    this.resize();
  }
  clear() {
    if (!this.scene) return;
    const geometries = new Set(),
      materials = new Set();
    this.scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) for (const m of [].concat(o.material)) materials.add(m);
      if (o.isInstancedMesh) o.dispose();
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.markers.clear();
  }
  mount(session) {
    this.clear();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9acfe0);
    this.scene.fog = new THREE.Fog(0x9acfe0, 60, 120);
    this.scene.add(new THREE.HemisphereLight(0xe7f6ff, 0x65764e, 2.3));
    const sun = new THREE.DirectionalLight(0xffe6ba, 2);
    sun.position.set(-14, 26, 18);
    this.scene.add(sun);
    this.terrain = new TerrainView(this.scene, session.terrain);
    this.scenery = new WorldObjects(this.scene, session.terrain);
    this.character = new CharacterView(this.scene);
    const geometry = new THREE.OctahedronGeometry(0.48),
      material = new THREE.MeshStandardMaterial({
        color: 0x9cf6ff,
        emissive: 0x197b9c,
        roughness: 0.25,
        metalness: 0.4,
      });
    for (const m of session.game.markers) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(m.x, m.y, m.z);
      this.scene.add(mesh);
      this.markers.set(m.id, mesh);
    }
    if (!this.markers.size) {
      geometry.dispose();
      material.dispose();
    }
    this.character.update(0, session.character.state);
    this.rig.snap(this.character.group.position);
  }
  draw(dt, session) {
    this.character.update(dt, session.character.state);
    this.rig.update(dt, this.character.group.position);
    for (const [id, m] of this.markers) {
      m.visible = !session.game.collected.includes(id);
      m.rotation.y += dt;
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.clear();
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}
