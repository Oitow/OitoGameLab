import * as THREE from 'three';
export class World {
  constructor(scene, seed = 12345) {
    this.scene = scene;
    this.seed = seed;
    this.size = 70;
    this.segments = 72;
    this.mesh = null;
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshLambertMaterial({ color: 0x419fc2, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    scene.add(this.water);
    this.generate(seed);
  }
  hash(x, z) {
    const v = Math.sin(x * 127.1 + z * 311.7 + this.seed * 0.173) * 43758.5453;
    return v - Math.floor(v);
  }
  noise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(this.hash(ix, iz), this.hash(ix + 1, iz), u),
      THREE.MathUtils.lerp(this.hash(ix, iz + 1), this.hash(ix + 1, iz + 1), u), v);
  }
  height(x, z) {
    const angle = Math.atan2(z, x);
    const radius = Math.hypot(x, z) / 30;
    const coastline = 1 + 0.09 * Math.sin(angle * 5 + this.seed) + 0.06 * Math.cos(angle * 9 - this.seed);
    const mask = THREE.MathUtils.clamp((coastline - radius) * 3.5, 0, 1);
    const hills = (this.noise(x * 0.08, z * 0.08) - 0.5) * 4.2
      + (this.noise(x * 0.21 + 8, z * 0.21 - 13) - 0.5) * 1.4;
    return -1.5 + mask * (3.6 + hills);
  }
  generate(seed) {
    this.seed = seed;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    const n = this.segments, count = (n + 1) * (n + 1);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const indices = [];
    const color = new THREE.Color();
    for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) {
      const wx = (x / n - 0.5) * this.size;
      const wz = (z / n - 0.5) * this.size;
      const h = this.height(wx, wz);
      const i = (z * (n + 1) + x) * 3;
      positions[i] = wx; positions[i + 1] = h; positions[i + 2] = wz;
      color.setHex(h < 0.35 ? 0x648e83 : h < 1.25 ? 0xe4ca91 : h < 4.4 ? 0x77ab5e : 0x547d49);
      const variation = 0.94 + this.noise(wx * 0.31, wz * 0.31) * 0.12;
      colors[i] = color.r * variation;
      colors[i + 1] = color.g * variation;
      colors[i + 2] = color.b * variation;
    }
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
      const a = z * (n + 1) + x, b = a + 1, c = a + n + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    this.scene.add(this.mesh);
  }
  findSpawn() {
    for(let radius=0;radius<=20;radius++)for(let i=0;i<24;i++){
      const angle=i*Math.PI/12,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
      if(this.walkable(x,z)&&this.height(x,z)>1.1)return {x,z};
    }
    return {x:0,z:0};
  }
  canMoveTo(x, z, radius) {
    if (!this.walkable(x, z)) return false;
    for (const tree of this.treeColliders ?? []) {
      const clearance = tree.radius + radius;
      if ((tree.x - x) ** 2 + (tree.z - z) ** 2 < clearance ** 2) return false;
    }
    return true;
  }
  walkable(x, z) {
    return Math.abs(x) <= this.size / 2 && Math.abs(z) <= this.size / 2 && this.height(x, z) > 0.45;
  }
  dispose() {
    this.scene.remove(this.mesh, this.water);
    this.mesh.geometry.dispose(); this.mesh.material.dispose();
    this.water.geometry.dispose(); this.water.material.dispose();
  }
}