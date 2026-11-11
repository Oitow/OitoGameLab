import * as THREE from "three";
export class TerrainView {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.size = terrain.size;
    this.segments = 32;
    this.chunkSize = 64;
    this.mesh = null;
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900),
      new THREE.MeshLambertMaterial({
        color: 0x508e9c,
        side: THREE.DoubleSide,

      }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    scene.add(this.water);
    this.mesh = new THREE.Group();
    scene.add(this.mesh);
    for (let z = -this.size / 2; z < this.size / 2; z += this.chunkSize)
      for (let x = -this.size / 2; x < this.size / 2; x += this.chunkSize)
        this.generate(x, z);
  }
  height(x, z) {
    return this.terrain.height(x, z);
  }
  noise(x, z) {
    return this.terrain.noise(x, z);
  }
  generate(originX, originZ) {
    const n = this.segments,
      count = (n + 1) * (n + 1);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const indices = [];
    const color = new THREE.Color(), meadowColor = new THREE.Color(0xa39e70);
    for (let z = 0; z <= n; z++)
      for (let x = 0; x <= n; x++) {
        const wx = originX + x / n * this.chunkSize;
        const wz = originZ + z / n * this.chunkSize;
        const h = this.height(wx, wz);
        const i = (z * (n + 1) + x) * 3;
        positions[i] = wx;
        positions[i + 1] = h;
        positions[i + 2] = wz;
        color.setHex(
          h < 0.35
            ? 0x668d83
            : h < 1.25
              ? 0xd0bc8a
              : h < 6.5
                ? 0x819568
                : 0x6a805d,
        );
        // Broad meadow patches read as landscape instead of per-triangle noise.
        if (h > 1.25) {
          const meadow = this.noise(wx * 0.045 + 31, wz * 0.045 - 17);
          color.lerp(meadowColor, Math.max(0, meadow - 0.48) * 0.65);
        }
        const variation = 0.94 + this.noise(wx * 0.18, wz * 0.18) * 0.12;
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
    const chunk = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
    );
    geometry.computeBoundingSphere();
    this.mesh.add(chunk);
  }
  dispose() {
    this.scene.remove(this.mesh, this.water);
    this.mesh.traverse((chunk) => {
      chunk.geometry?.dispose();
      chunk.material?.dispose();
    });
    this.water.geometry.dispose();
    this.water.material.dispose();
  }
}
