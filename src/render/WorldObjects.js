import * as THREE from "three";
/** View of the same immutable scenery descriptors used by collision. */
export class WorldObjects {
  constructor(scene, layout) {
    const trees = layout.objects.filter((o) => o.kind === "tree"),
      rocks = layout.objects.filter((o) => o.kind === "rock");
    const add = (objects, geometry, color, transform) => {
      if (!objects.length) {
        geometry.dispose();
        return;
      }
      const mesh = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshLambertMaterial({ color }),
        objects.length,
      );
      const dummy = new THREE.Object3D();
      objects.forEach((o, i) => {
        transform(dummy, o);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    };
    add(trees, new THREE.CylinderGeometry(1, 1, 1, 7), 0x74513a, (d, o) => {
      d.position.set(o.x, o.y + o.height * 0.5, o.z);
      d.scale.set(o.radius, o.height, o.radius);
    });
    add(trees, new THREE.ConeGeometry(1, 1, 7), 0x397e4d, (d, o) => {
      d.position.set(o.x, o.y + o.height * 0.85, o.z);
      d.scale.set(o.scale * 0.9, o.height * 0.9, o.scale * 0.9);
    });
    add(rocks, new THREE.DodecahedronGeometry(1, 0), 0x8c9792, (d, o) => {
      d.position.set(o.x, o.y + o.height * 0.45, o.z);
      d.scale.set(o.radius, o.height * 0.55, o.radius);
    });
  }
}
