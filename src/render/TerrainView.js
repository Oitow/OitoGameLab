import * as THREE from "three";
export class TerrainView {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.size = 70;
    this.segments = 72;
    this.mesh = null;
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshLambertMaterial({
        color: 0x419fc2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    scene.add(this.water);
    this.generate();
  }
  height(x, z) {
    return this.terrain.height(x, z);
  }
  noise(x, z) {
    return this.terrain.noise(x, z);
  }
  generate() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    const n = this.segments,
      count = (n + 1) * (n + 1);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const indices = [];
    const color = new THREE.Color();
    for (let z = 0; z <= n; z++)
      for (let x = 0; x <= n; x++) {
        const wx = (x / n - 0.5) * this.size;
        const wz = (z / n - 0.5) * this.size;
        const h = this.height(wx, wz);
        const i = (z * (n + 1) + x) * 3;
        positions[i] = wx;
        positions[i + 1] = h;
        positions[i + 2] = wz;
        color.setHex(
          h < 0.35
            ? 0x648e83
            : h < 1.25
              ? 0xe4ca91
              : h < 4.4
                ? 0x77ab5e
                : 0x547d49,
        );
        const variation = 0.94 + this.noise(wx * 0.31, wz * 0.31) * 0.12;
        colors[i] = color.r * variation;
        colors[i + 1] = color.g * variation;
        colors[i + 2] = color.b * variation;
      }
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) {
        const a = z * (n + 1) + x,
          b = a + 1,
          c = a + n + 1,
          d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    );
    this.scene.add(this.mesh);
  }
  dispose() {
    this.scene.remove(this.mesh, this.water);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.water.geometry.dispose();
    this.water.material.dispose();
  }
}
