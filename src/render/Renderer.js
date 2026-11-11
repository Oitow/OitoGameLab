import * as THREE from "three";
import { TerrainView } from "./TerrainView.js";
import { CharacterView } from "./CharacterView.js";
import { WorldObjects } from "./WorldObjects.js";
import { MarkerView } from "./MarkerView.js";
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
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 240);
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
    // Spatial batches let Three.js reject whole groves outside the camera frustum.
    const regions = new Map();
    const region = (o) => {
      const key = `${Math.floor(o.x / 128)},${Math.floor(o.z / 128)}`;
      if (!regions.has(key)) regions.set(key, { objects: [], decorations: [] });
      return regions.get(key);
    };
    for (const o of session.layout.objects) region(o).objects.push(o);
    for (const o of session.layout.decorations) region(o).decorations.push(o);
    this.scenery = [...regions.values()].map((layout) => new WorldObjects(this.scene, layout, session.terrain));
    this.character = new CharacterView(this.scene, session.profile);
    this.contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 12),
      new THREE.MeshBasicMaterial({ color: 0x233c36, transparent: true, opacity: 0.23, depthWrite: false }),
    );
    this.contact.rotation.x = -Math.PI / 2;
    this.scene.add(this.contact);
    this.markerView = new MarkerView(this.scene, session.game.markers);
    this.markers = this.markerView.markers;
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
    this.rig.update(dt, this.character.group.position, session.terrain, pose);
    this.markerView.update(dt, session.game);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.clear();
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}
