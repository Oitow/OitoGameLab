import * as THREE from 'three';
// Procedural humanoid with joint pivots and no external assets.
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
  this.arms=[];this.elbows=[];this.legs=[];this.knees=[];
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.5,1.72,0);this.body.add(arm);
   part(arm,new THREE.BoxGeometry(.24,.38,.27),shirt,0,-.18,0);
   const elbow=new THREE.Group();elbow.position.y=-.35;arm.add(elbow);
   part(elbow,new THREE.BoxGeometry(.18,.28,.2),skin,0,-.13,0);
   part(elbow,new THREE.BoxGeometry(.21,.17,.23),skin,0,-.32,0);
   this.elbows.push(elbow);
   this.arms.push(arm);
   const leg=new THREE.Group();leg.position.set(side*.22,.95,0);this.body.add(leg);
   part(leg,new THREE.BoxGeometry(.28,.46,.31),pants,0,-.21,0);
   const knee=new THREE.Group();knee.position.y=-.43;leg.add(knee);
   part(knee,new THREE.BoxGeometry(.23,.36,.25),pants,0,-.17,0);
   part(knee,new THREE.BoxGeometry(.3,.2,.43),boots,0,-.42,.09);
   this.knees.push(knee);
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
  this.body.rotation.set(0,0,0);
  this.landing=0;
  for(const joint of [...this.arms,...this.elbows,...this.legs,...this.knees])joint.rotation.x=0;
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
  this.landing=Math.max(0,this.landing-dt*5);
  if(!this.grounded){
   this.verticalVelocity-=19*dt;
   this.jumpOffset+=this.verticalVelocity*dt;
   if(this.jumpOffset<=0){
    this.jumpOffset=0;
    this.verticalVelocity=0;
    this.grounded=true;
    this.landing=1;
   }
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
  const gait=Math.min(horizontalSpeed/speed,1);
  this.phase=(this.phase+horizontalSpeed*dt*2.6)%(2*Math.PI);
  const blend=1-Math.exp(-18*dt);
  const rising=this.verticalVelocity>0;
  for(let i=0;i<2;i++){
   const stride=Math.sin(this.phase+i*Math.PI);
   const recovery=Math.max(0,-Math.cos(this.phase+i*Math.PI));
   const hip=this.grounded?stride*.65*gait-this.landing*.28:(rising?-.55:-.2);
   const knee=this.grounded?recovery*.8*gait+this.landing*.52:(rising?.9:.35);
   const shoulder=this.grounded?-stride*.5*gait:(rising?-.65:-.25);
   const elbow=this.grounded?-.24*gait:-.75;
   this.legs[i].rotation.x=THREE.MathUtils.lerp(this.legs[i].rotation.x,hip,blend);
   this.knees[i].rotation.x=THREE.MathUtils.lerp(this.knees[i].rotation.x,knee,blend);
   this.arms[i].rotation.x=THREE.MathUtils.lerp(this.arms[i].rotation.x,shoulder,blend);
   this.elbows[i].rotation.x=THREE.MathUtils.lerp(this.elbows[i].rotation.x,elbow,blend);
  }
  const bob=this.grounded?Math.abs(Math.sin(this.phase))*0.045*gait-this.landing*.12:0;
  this.body.position.y=THREE.MathUtils.lerp(this.body.position.y,bob,blend);
  // Express lean in the character's local axes after turning.
  const localSide=this.velocity.x*Math.cos(this.facing)-this.velocity.z*Math.sin(this.facing);
  const localForward=this.velocity.x*Math.sin(this.facing)+this.velocity.z*Math.cos(this.facing);
  this.body.rotation.z=THREE.MathUtils.lerp(this.body.rotation.z,-localSide*.022,blend);
  const pitch=this.grounded?localForward*.021+this.landing*.17:-.08;
  this.body.rotation.x=THREE.MathUtils.lerp(this.body.rotation.x,pitch,blend);
 }
}
