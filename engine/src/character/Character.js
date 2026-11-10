import * as THREE from 'three';
// Lightweight procedural humanoid: no rigs, textures, or animation assets.
export class Character {
 constructor(scene,world){
  this.world=world;
  this.group=new THREE.Group();
  this.body=new THREE.Group();this.group.add(this.body);
  const mat=c=>new THREE.MeshLambertMaterial({color:c});
  const skin=mat(0xf3c69d),shirt=mat(0xe49a47),pants=mat(0x344a60),boots=mat(0x292e37);
  const part=(parent,geo,material,x,y,z)=>{const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh};
  part(this.body,new THREE.BoxGeometry(.76,.85,.38),shirt,0,1.35,0);
  part(this.body,new THREE.BoxGeometry(.24,.23,.24),skin,0,1.9,0);
  this.head=part(this.body,new THREE.SphereGeometry(.32,12,8),skin,0,2.17,0);
  part(this.body,new THREE.BoxGeometry(.19,.1,.1),mat(0x684b37),0,2.14,.3);
  this.arms=[];this.legs=[];
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.5,1.72,0);this.body.add(arm);
   part(arm,new THREE.BoxGeometry(.23,.64,.27),shirt,0,-.32,0);
   part(arm,new THREE.BoxGeometry(.22,.18,.24),skin,0,-.72,0);
   this.arms.push(arm);
   const leg=new THREE.Group();leg.position.set(side*.22,.95,0);this.body.add(leg);
   part(leg,new THREE.BoxGeometry(.27,.75,.3),pants,0,-.38,0);
   part(leg,new THREE.BoxGeometry(.3,.2,.43),boots,0,-.82,.09);
   this.legs.push(leg);
  }
  scene.add(this.group);
  this.velocity=new THREE.Vector3();
  this.verticalVelocity=0;
  this.jumpOffset=0;
  this.grounded=true;
  this.phase=0;
  this.facing=0;
  this.reset();
 }
 reset(){
  const {x,z}=this.world.findSpawn();
  this.group.position.set(x,this.world.height(x,z),z);
  this.velocity.set(0,0,0);
  this.verticalVelocity=0;this.jumpOffset=0;this.grounded=true;
  this.phase=0;this.facing=0;this.group.rotation.y=0;
  this.body.position.y=0;
 }
 jump(){
  if(!this.grounded)return;
  this.verticalVelocity=7.4;
  this.grounded=false;
 }
 update(dt,input){
  const move=input.direction;
  const speed=5.3;
  const response=1-Math.exp(-(move.lengthSq()>.001?11:8)*dt);
  this.velocity.x=THREE.MathUtils.lerp(this.velocity.x,move.x*speed,response);
  this.velocity.z=THREE.MathUtils.lerp(this.velocity.z,move.y*speed,response);
  const p=this.group.position;
  const nx=p.x+this.velocity.x*dt,nz=p.z+this.velocity.z*dt;
  if(this.world.walkable(nx,nz)){
   p.x=nx;p.z=nz;
  }else{
   this.velocity.x=0;this.velocity.z=0;
  }
  if(input.consumeJump())this.jump();
  if(!this.grounded){
   this.verticalVelocity-=19*dt;
   this.jumpOffset+=this.verticalVelocity*dt;
   if(this.jumpOffset<=0){this.jumpOffset=0;this.verticalVelocity=0;this.grounded=true;}
  }
  const floor=this.world.height(p.x,p.z);
  const desiredY=floor+this.jumpOffset;
  p.y=THREE.MathUtils.lerp(p.y,desiredY,1-Math.exp(-20*dt));
  const horizontalSpeed=Math.hypot(this.velocity.x,this.velocity.z);
  if(horizontalSpeed>.12){
   const target=Math.atan2(this.velocity.x,this.velocity.z);
   const diff=Math.atan2(Math.sin(target-this.facing),Math.cos(target-this.facing));
   this.facing+=diff*(1-Math.exp(-13*dt));
   this.group.rotation.y=this.facing;
  }
  const gait=Math.min(horizontalSpeed/speed,1)*(this.grounded?1:0.12);
  this.phase+=horizontalSpeed*dt*2.6;
  const swing=Math.sin(this.phase)*.68*gait;
  this.legs[0].rotation.x=swing;this.legs[1].rotation.x=-swing;
  this.arms[0].rotation.x=-swing*.75;this.arms[1].rotation.x=swing*.75;
  const bob=this.grounded?Math.abs(Math.sin(this.phase))*0.055*gait:0;
  this.body.position.y=THREE.MathUtils.lerp(this.body.position.y,bob,1-Math.exp(-12*dt));
  this.body.rotation.z=THREE.MathUtils.lerp(this.body.rotation.z,-this.velocity.x*.018,1-Math.exp(-8*dt));
  this.body.rotation.x=THREE.MathUtils.lerp(this.body.rotation.x,this.grounded?this.velocity.z*.018:-.1,1-Math.exp(-8*dt));
 }
}