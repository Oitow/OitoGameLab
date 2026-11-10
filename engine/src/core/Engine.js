import * as THREE from 'three';
export class Engine {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9acfe0);
    this.scene.fog = new THREE.Fog(0x9acfe0, 60, 120);
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 160);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.prepend(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xe7f6ff, 0x65764e, 2.3));
    const sun = new THREE.DirectionalLight(0xffe6ba, 2);
    sun.position.set(-14, 26, 18);
    this.scene.add(sun);
    this.clock = new THREE.Clock();
    this.running = false;
    this.frames = 0;
    this.elapsed = 0;
    this.fps = 0;
    this.resize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    };
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => { this.clock.getDelta(); });
  }
  start(update) {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      update(dt);
      this.renderer.render(this.scene, this.camera);
      this.frames++;
      this.elapsed += dt;
      if (this.elapsed >= 0.5) {
        this.fps = Math.round(this.frames / this.elapsed);
        this.frames = 0;
        this.elapsed = 0;
      }
    };
    loop();
  }
  dispose() {
    this.running = false;
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}