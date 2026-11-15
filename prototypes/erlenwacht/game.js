'use strict';
const ground=ErlenWorld.ground;
const walkable=ErlenWorld.walkable;
const seedParameter=new URLSearchParams(location.search).get('seed');
const worldSeed=seedParameter!==null && /^\d{1,10}$/.test(seedParameter)?Number(seedParameter)>>>0:4831;
const {groundEnd}=ErlenWorld.generate(worldSeed);
prepareScene(groundEnd);
const spawn=ErlenWorld.spawn, goal=ErlenWorld.goal;
let x=spawn.x,z=spawn.z,yaw=spawn.yaw,pitch=.1,facing=yaw;
let vx=0,vz=0,phase=0,step=0,time=0,dark=0,cy=ground(x,z)+3.4;
let done=false,sprint=false,cast=0,notice=0;
const keys=new Set(),pad=$('.pad'),knob=$('.knob'),run=$('#run');
let stickId=null,stickX=0,stickY=0,look=null;
function resetStick(){
  stickId=null;stickX=stickY=0;knob.style.transform='';
}
function readStick(e){
  const r=pad.getBoundingClientRect(),radius=r.width*.37;
  let a=(e.clientX-r.left-r.width/2)/radius,b=(e.clientY-r.top-r.height/2)/radius;
  const length=hypot(a,b);
  if(length<.09){stickX=stickY=0}else{stickX=a/max(1,length);stickY=-b/max(1,length)}
  knob.style.transform='translate('+stickX*29+'px,'+(-stickY*29)+'px)';
}
pad.onpointerdown=e=>{
  if(stickId!==null)return;
  stickId=e.pointerId;pad.setPointerCapture(stickId);readStick(e);
};
pad.onpointermove=e=>{if(e.pointerId===stickId)readStick(e)};
pad.onlostpointercapture=resetStick;
canvas.onpointerdown=e=>{
  if(look)return;
  canvas.setPointerCapture(e.pointerId);look={id:e.pointerId,x:e.clientX,y:e.clientY};
};
canvas.onpointermove=e=>{
  if(!look||look.id!==e.pointerId)return;
  yaw-=(e.clientX-look.x)*.007;pitch=clamp(pitch+(e.clientY-look.y)*.004,-.08,.7);
  look.x=e.clientX;look.y=e.clientY;
};
canvas.onlostpointercapture=()=>{look=null};
run.onclick=()=>{
  sprint=!sprint;run.classList.toggle('active',sprint);run.setAttribute('aria-pressed',sprint);
};
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  keys.add(e.code);
});
addEventListener('keyup',e=>keys.delete(e.code));
function releaseInput(){keys.clear();resetStick();look=null}
addEventListener('blur',releaseInput);
ErlenCombat.start({ground,walkable,spawn,encounters:ErlenWorld.encounters});
function advance(dt){
  time+=dt;
  let a=stickX+Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  let b=stickY+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const length=max(1,hypot(a,b));a/=length;b/=length;
  yaw+=dt*1.8*(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')));
  const running=sprint||keys.has('ShiftLeft'), speed=running?8.4:4.6;
  const response=1-Math.exp(-dt*(a||b?10:16));
  vx=mix(vx,(cos(yaw)*a+sin(yaw)*b)*speed,response);
  vz=mix(vz,(cos(yaw)*b-sin(yaw)*a)*speed,response);
  const oldX=x,oldZ=z;
  if(walkable(x+vx*dt,z))x+=vx*dt;else vx=0;
  if(walkable(x,z+vz*dt))z+=vz*dt;else vz=0;
  const moved=hypot(x-oldX,z-oldZ);
  step=min(1,moved/(dt*4.6));phase+=moved*(running?1.68:2.05);
  if(step>.05 && $('#hint').style.opacity!=='0')$('#hint').style.opacity='0';
  const action=ErlenCombat.update(dt,{x,z,yaw});
  cast=action.cast;
  if(action.respawn){
    x=action.respawn.x;z=action.respawn.z;vx=vz=0;cy=ground(x,z)+3.4;
  }
  const target=action.aimYaw??(step>.05?Math.atan2(vx,vz):facing);
  facing+=Math.atan2(sin(target-facing),cos(target-facing))*(1-Math.exp(-dt*14));
  const region=ErlenWorld.region(x,z);
  if($('#zone').textContent!==region)$('#zone').textContent=region;
  if(!done&&hypot(x-goal.x,z-goal.z)<11){
    done=true;$('#goal').textContent='Sonnenweide entdeckt';$('#note').textContent='Die alte Weide';notice=time+4.2;
  }
  $('#note').style.opacity=time<notice?1:0;
  dark=mix(dark,ErlenWorld.forest(z),1-Math.exp(-dt*2));
}
function actors(){
  verts.length=0;
  const y=ground(x,z)+.035,c=cos(facing),s=sin(facing);
  transform=([a,b,d])=>[x+a*c+d*s,y+b,z-a*s+d*c];
  ErlenCharacter.render({time,phase,step,sprint:sprint||keys.has('ShiftLeft'),cast});
  transform=null;
  ErlenCombat.draw();
}
function render(dt){
  const ratio=gl?min(devicePixelRatio||1,1.5):min(1,620/max(canvas.clientWidth,canvas.clientHeight));
  const w=max(1,Math.round(canvas.clientWidth*ratio)),h=max(1,Math.round(canvas.clientHeight*ratio));
  if(canvas.width!==w||canvas.height!==h){
    canvas.width=w;canvas.height=h;if(gl)gl.viewport(0,0,w,h);
  }
  const boom=mix(6.6,5.1,dark),ex=x-sin(yaw)*boom,ez=z-cos(yaw)*boom;
  cy=mix(cy,max(ground(ex,ez)+.9,ground(x,z)+2.05+boom*sin(pitch)),1-Math.exp(-dt*12));
  const p=Math.atan2(cy-ground(x,z)-1.24,boom);
  const haze=[mix(.70,.29,dark),mix(.84,.44,dark),mix(.87,.43,dark)];
  actors();
  if(!gl){paintLandscape(ex,ez,p,haze);return}
  gl.clearColor(...haze,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniform3f(loc.eye,ex,cy,ez);
  gl.uniform3f(loc.front,sin(yaw)*cos(p),-sin(p),cos(yaw)*cos(p));
  gl.uniform3f(loc.right,cos(yaw),0,-sin(yaw));
  gl.uniform3f(loc.up,sin(yaw)*sin(p),cos(p),cos(yaw)*sin(p));
  gl.uniform2f(loc.lens,1.43*h/w,1.43);gl.uniform1f(loc.shade,dark);gl.uniform3fv(loc.haze,haze);
  bindGeometry(worldBuffer);
  for(const tile of tiles){
    const count=visibleCount(tile,ex,ez,w/h);
    if(count)gl.drawArrays(gl.TRIANGLES,tile.start,count);
  }
  bindGeometry(actor);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES,0,verts.length/6);
}
let previous,accumulator=0;
function frame(now){
  const dt=previous===undefined?1/60:min(.1,(now-previous)/1000);
  previous=now;accumulator+=dt;
  while(accumulator>=1/60){advance(1/60);accumulator-=1/60}
  render(dt);
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{previous=undefined;accumulator=0;if(document.hidden)releaseInput()});
canvas.addEventListener('webglcontextlost',e=>e.preventDefault());
canvas.addEventListener('webglcontextrestored',()=>location.reload());
requestAnimationFrame(frame);
