import * as THREE from 'three';
export class WorldObjects {
 constructor(scene,world) {
  this.world=world;
  this.world.treeColliders=[];
  this.mesh=new THREE.InstancedMesh(new THREE.ConeGeometry(0.8,2.5,6),new THREE.MeshLambertMaterial({color:0x397e4d}),120);
  this.mesh.frustumCulled=false;
  scene.add(this.mesh);
  this.rebuild();
 }
 rebuild() {
  const d=new THREE.Object3D(); let n=0;
  const colliders=this.world.treeColliders;
  colliders.length=0;
  const spawn=this.world.findSpawn();
  for(let i=0;i<800&&n<120;i++){
   const x=(this.world.hash(i*7+1,11)-0.5)*60,z=(this.world.hash(i*13+4,29)-0.5)*60;
   const y=this.world.height(x,z);
   if(y<1.6||Math.hypot(x,z)<5||Math.hypot(x-spawn.x,z-spawn.z)<2)continue;
   const s=0.7+this.world.hash(i+33,9)*0.8;
   colliders.push({x,z,radius:.6*s});
   d.position.set(x,y+1.25*s,z);d.scale.setScalar(s);d.updateMatrix();
   this.mesh.setMatrixAt(n++,d.matrix);
  }
  this.mesh.count=n;this.mesh.instanceMatrix.needsUpdate=true;
 }
}