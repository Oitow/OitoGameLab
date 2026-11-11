/** CPU-only render geometry. Samples simulation without changing its heightfield. */
export function terrainChunk(terrain, originX, originZ, size, segments, skirtDepth = 8) {
  if (!Number.isInteger(segments) || segments < 1 || segments > 128 || !(size > 0) || !(skirtDepth > 0))
    throw new RangeError("Invalid terrain mesh dimensions");
  const positions = [], indices = [];
  for (let z = 0; z <= segments; z++)
    for (let x = 0; x <= segments; x++) {
      const px = x / segments * size, pz = z / segments * size;
      positions.push(px - size / 2, terrain.height(originX + px, originZ + pz), pz - size / 2);
    }
  for (let z = 0; z < segments; z++)
    for (let x = 0; x < segments; x++) {
      const a = z * (segments + 1) + x, b = a + 1, c = a + segments + 1;
      indices.push(a, c, b, b, c, c + 1);
    }
  // Downward perimeter walls cover gaps between adjacent resolution levels.
  // Coarse boundary vertices are a subset of fine boundary samples.
  const edge = [];
  for (let x = 0; x < segments; x++) edge.push(x);
  for (let z = 0; z < segments; z++) edge.push(z * (segments + 1) + segments);
  for (let x = segments; x > 0; x--) edge.push(segments * (segments + 1) + x);
  for (let z = segments; z > 0; z--) edge.push(z * (segments + 1));
  const skirtStart = positions.length / 3;
  for (const vertex of edge) {
    const i = vertex * 3;
    positions.push(positions[i], positions[i + 1] - skirtDepth, positions[i + 2]);
  }
  for (let i = 0; i < edge.length; i++) {
    const next = (i + 1) % edge.length;
    indices.push(edge[i], skirtStart + i, edge[next], edge[next], skirtStart + i, skirtStart + next);
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices), surfaceVertices: (segments + 1) ** 2 };
}

/** Quality affects view distance only; it never enters procedural simulation. */
export const terrainDetail = Object.freeze({
  economy: Object.freeze([0, 64, 128]),
  balanced: Object.freeze([0, 96, 176]),
  crisp: Object.freeze([0, 128, 208]),
});
