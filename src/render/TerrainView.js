import * as THREE from "three";
import { terrainChunk, terrainDetail } from "./TerrainGeometry.js";

/** Three distance levels per chunk; shared material, fixed seeded heightfield. */
export class TerrainView {
  constructor(scene, terrain, quality = "balanced") {
    this.scene = scene;
    this.terrain = terrain;
    this.chunkSize = 64;
    this.mesh = new THREE.Group();
    this.chunks = [];
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x508e9c, side: THREE.DoubleSide }));
    this.water.rotation.x = -Math.PI / 2;
    scene.add(this.water, this.mesh);
    for (let z = -terrain.size / 2; z < terrain.size / 2; z += this.chunkSize)
      for (let x = -terrain.size / 2; x < terrain.size / 2; x += this.chunkSize) {
        const lod = new THREE.LOD();
        lod.position.set(x + this.chunkSize / 2, 0, z + this.chunkSize / 2);
        for (const [i, segments] of [32, 16, 8].entries())
          lod.addLevel(this.generate(x, z, segments), terrainDetail.balanced[i], 0.12);
        this.mesh.add(lod);
        this.chunks.push(lod);
      }
    this.setQuality(quality);
  }
  setQuality(quality) {
    const distances = terrainDetail[quality] ?? terrainDetail.balanced;
    for (const chunk of this.chunks)
      chunk.levels.forEach((level, i) => { level.distance = distances[i]; });
  }
  generate(originX, originZ, segments) {
    const { positions, indices } = terrainChunk(this.terrain, originX, originZ, this.chunkSize, segments);
    const colors = new Float32Array(positions.length);
    const color = new THREE.Color(), meadowColor = new THREE.Color(0xa39e70);
    for (let i = 0; i < positions.length; i += 3) {
      const wx = originX + this.chunkSize / 2 + positions[i];
      const wz = originZ + this.chunkSize / 2 + positions[i + 2];
      // Skirts reuse the surface colour, avoiding bright seam outlines.
      const height = this.terrain.height(wx, wz);
      color.setHex(height < 0.35 ? 0x668d83 : height < 1.25 ? 0xd0bc8a : height < 6.5 ? 0x819568 : 0x6a805d);
      if (height > 1.25) {
        const meadow = this.terrain.noise(wx * 0.045 + 31, wz * 0.045 - 17);
        color.lerp(meadowColor, Math.max(0, meadow - 0.48) * 0.65);
      }
      const variation = 0.94 + this.terrain.noise(wx * 0.18, wz * 0.18) * 0.12;
      colors[i] = color.r * variation;
      colors[i + 1] = color.g * variation;
      colors[i + 2] = color.b * variation;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, this.material);
  }
  dispose() {
    this.scene.remove(this.mesh, this.water);
    this.mesh.traverse((object) => object.geometry?.dispose());
    this.material.dispose();
    this.water.geometry.dispose();
    this.water.material.dispose();
  }
}
