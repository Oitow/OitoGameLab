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
    this.setQuality("balanced");
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 450);
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
  setQuality(quality) {
    const caps = { economy: 1, balanced: 1.5, crisp: 2 };
    this.quality = Object.hasOwn(caps, quality) ? quality : "balanced";
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, caps[this.quality]));
    this.resize?.();
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
    this.scene.background = new THREE.Color(0xb4c7bf);
    this.scene.fog = new THREE.Fog(0xb4c7bf, 65, 210);
    this.scene.add(new THREE.HemisphereLight(0xd9e6e0, 0x59634b, 2.0));
    const sun = new THREE.DirectionalLight(0xffdfac, 2.2);
    sun.position.set(-14, 26, 18);
    this.scene.add(sun);
    this.terrain = new TerrainView(this.scene, session.terrain);
    this.scenery = new WorldObjects(this.scene, session.layout, session.terrain);
    this.character = new CharacterView(this.scene);
    this.contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 12),
      new THREE.MeshBasicMaterial({ color: 0x233c36, transparent: true, opacity: 0.23, depthWrite: false }),
    );
    this.contact.rotation.x = -Math.PI / 2;
    this.scene.add(this.contact);
    const geometry = new THREE.OctahedronGeometry(0.48),
      material = new THREE.MeshStandardMaterial({
        color: 0x9cf6ff,
        emissive: 0x197b9c,
        roughness: 0.25,
        metalness: 0.4,
      });
    for (const m of session.game.markers) {
      const kind = m.kind || "crystal";
      const colors = {
        wood: 0xb98a52,
        stone: 0xc9d1cf,
        camp: 0xffbb5c,
        crystal: 0x9cf6ff,
      };
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.material.color.setHex(colors[kind] || colors.crystal);
      mesh.userData.kind = kind;
      mesh.position.set(m.x, m.y, m.z);
      this.scene.add(mesh);
      this.markers.set(m.id, mesh);
    }
    material.dispose();
    if (!this.markers.size) {
      geometry.dispose();
    }
    this.character.update(0, session.character.state);
    this.rig.snap(this.character.group.position, session.terrain);
  }
  draw(dt, session, alpha = 1) {
    const pose = session.renderState(alpha);
    this.character.update(dt, pose);
    const ground = session.terrain.height(pose.x, pose.z);
    const lift = Math.max(0, pose.y - ground);
    this.contact.position.set(pose.x, ground + 0.025, pose.z);
    this.contact.scale.setScalar(1 + lift * 0.15);
    this.contact.material.opacity = 0.23 / (1 + lift);
    this.rig.update(dt, this.character.group.position, session.terrain);
    for (const [id, m] of this.markers) {
      m.visible = !session.game.collected.includes(id);
      m.rotation.y += dt;
      if (m.userData.kind === "camp")
        m.material.emissive.setHex(session.game.built ? 0xff5511 : 0x403020);
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.clear();
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}
