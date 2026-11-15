
'use strict';
const $=s=>document.querySelector(s);
let canvas=$('canvas'), gl=canvas.getContext('webgl',{alpha:false,antialias:true}), ctx;
const vs=`attribute vec3 pos,col;uniform vec3 eye,right,up,front;uniform vec2 lens;uniform mediump float shade;varying mediump vec3 tint;varying mediump float mist;void main(){vec3 d=pos-eye;float z=dot(d,front);gl_Position=vec4(dot(d,right)*lens.x,dot(d,up)*lens.y,z*1.00015-.16,z);tint=col;mist=1.-exp(-max(0.,z)*(.0026+shade*.012));}`;
const fs=`precision mediump float;varying mediump vec3 tint;varying mediump float mist;uniform vec3 haze;uniform mediump float shade;void main(){gl_FragColor=vec4(mix(tint*(1.-shade*.18),haze,mist),1.);}`;
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
let program;
if(gl)try{program=gl.createProgram();for(let [t,s] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]])gl.attachShader(program,shader(t,s));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
}catch(error){console.warn(error);const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;gl=null}
if(!gl)ctx=canvas.getContext('2d',{alpha:false});

const {sin,cos,abs,hypot,min,max,PI}=Math, tau=2*PI, clamp=(x,a,b)=>max(a,min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
let verts=[], transform=null;
function tri(a,b,c,color,k=1){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
  const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const scale=k*(.77+.23*(nx*.55+abs(ny)*.8+nz*.2)/(hypot(nx,ny,nz)||1))/255;
  const r=(color>>16&255)*scale,g=(color>>8&255)*scale,blue=(color&255)*scale;
  if(transform){a=transform(a);b=transform(b);c=transform(c)}
  verts.push(a[0],a[1],a[2],r,g,blue,b[0],b[1],b[2],r,g,blue,c[0],c[1],c[2],r,g,blue);
}
// Faceted rings form trunks, foliage, clothing and rock.
function solid(x,y,z,h,r0,r1,n,color,sz=1,angle=0,dx=0,dz=0){let ring=(i,r,top)=>[x+(top?dx:0)+r*cos(angle+i*tau/n),y+(top?h:0),z+(top?dz:0)+r*sin(angle+i*tau/n)*sz];for(let i=0;i<n;i++){let a=ring(i,r0,0),b=ring(i+1,r0,0),c=ring(i+1,r1,1),d=ring(i,r1,1);tri(a,d,b,color);if(r1){tri(b,d,c,color);tri(d,[x+dx,y+h,z+dz],c,color)}}}

// Fixed-size spatial batches share one vertex buffer. Large silhouettes and land
// precede detail geometry in each batch, so the distant draw uses a shorter range.
let world,worldBuffer,actor,pos,col,loc;
const tiles=[];
function prepareScene(groundEnd){
  const buckets=new Map(), edge=32;
  for(let i=0;i<verts.length;i+=18){
    const cx=(Math.floor(verts[i]/edge)+.5)*edge,cz=(Math.floor(verts[i+2]/edge)+.5)*edge;
    const id=cx+','+cz;
    if(!buckets.has(id))buckets.set(id,{cx,cz,radius:0,large:[],detail:[]});
    const tile=buckets.get(id);
    let span=0;
    for(let j=i;j<i+18;j+=6){
      tile.radius=max(tile.radius,hypot(verts[j]-cx,verts[j+2]-cz));
      for(let k=0;k<3;k++)span=max(span,abs(verts[j+k]-verts[i+k]));
    }
    (i<groundEnd||span>3.4?tile.large:tile.detail).push(i);
  }
  world=new Float32Array(verts.length);
  let offset=0;
  for(const tile of buckets.values()){
    const start=offset/6;
    for(const list of [tile.large,tile.detail]){
      for(const i of list)for(let j=i;j<i+18;j++)world[offset++]=verts[j];
    }
    tiles.push({cx:tile.cx,cz:tile.cz,radius:tile.radius,start,far:tile.large.length*3,full:offset/6-start});
  }
  verts=[];
  if(!gl)return;
  worldBuffer=gl.createBuffer();actor=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,worldBuffer);gl.bufferData(gl.ARRAY_BUFFER,world,gl.STATIC_DRAW);
  world=null;
  pos=gl.getAttribLocation(program,'pos');col=gl.getAttribLocation(program,'col');
  gl.enableVertexAttribArray(pos);gl.enableVertexAttribArray(col);
  loc=Object.fromEntries(['eye','front','up','right','lens','shade','haze'].map(n=>[n,gl.getUniformLocation(program,n)]));
}
function visibleCount(tile,ex,ez,aspect){
  const dx=tile.cx-ex,dz=tile.cz-ez;
  const forward=dx*sin(yaw)+dz*cos(yaw),side=abs(dx*cos(yaw)-dz*sin(yaw));
  if(forward+tile.radius< -22||forward-tile.radius>950||side>tile.radius+(max(0,forward)+tile.radius+60)*aspect*.72+8)return 0;
  return forward-tile.radius>(gl?150:72)?tile.far:tile.full;
}
function bindGeometry(buffer){
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);
  gl.vertexAttribPointer(col,3,gl.FLOAT,false,24,12);
}
function paintLandscape(ex,ez,p,haze){
  const w=canvas.width,h=canvas.height,f=h*.715,syaw=sin(yaw),cyaw=cos(yaw),sp=sin(p),cp=cos(p);
  const faces=[],near=.12,sky=haze.map(v=>Math.round(255*v));
  ctx.fillStyle='rgb('+sky.join(',')+')';ctx.fillRect(0,0,w,h);
  function face(data,i){
    let points=[];
    for(let j=i;j<i+18;j+=6){
      const dx=data[j]-ex,dy=data[j+1]-cy,dz=data[j+2]-ez,forward=dx*syaw+dz*cyaw;
      points.push([dx*cyaw-dz*syaw,dy*cp+forward*sp,forward*cp-dy*sp]);
    }
    if(points.every(q=>q[2]<near))return;
    if(points.some(q=>q[2]<near)){
      const clipped=[];
      for(let k=0;k<3;k++){
        const a=points[k],b=points[(k+1)%3];
        if(a[2]>=near)clipped.push(a);
        if((a[2]>=near)!==(b[2]>=near)){
          const t=(near-a[2])/(b[2]-a[2]);clipped.push([mix(a[0],b[0],t),mix(a[1],b[1],t),near]);
        }
      }
      points=clipped;
    }
    const depth=points.reduce((n,q)=>n+q[2],0)/points.length;
    for(const q of points){q[0]=w*.5+q[0]*f/q[2];q[1]=h*.5-q[1]*f/q[2]}
    if(points.every(q=>q[0]<0)||points.every(q=>q[0]>w)||points.every(q=>q[1]<0)||points.every(q=>q[1]>h))return;
    const [a,b,c]=points;
    if(abs((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]))<.48)return;
    const fog=1-Math.exp(-depth*(.0026+dark*.012));
    const color=sky.map((v,k)=>Math.round(mix(data[i+3+k]*(1-dark*.18)*255,v,fog)));
    faces.push({depth,points,color:'rgb('+color.join(',')+')'});
  }
  for(const tile of tiles){
    const count=visibleCount(tile,ex,ez,w/h);
    for(let i=tile.start*6,end=i+count*6;i<end;i+=18)face(world,i);
  }
  for(let i=0;i<verts.length;i+=18)face(verts,i);
  faces.sort((a,b)=>b.depth-a.depth);
  for(const {points,color} of faces){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let j=1;j<points.length;j++)ctx.lineTo(points[j][0],points[j][1]);
    ctx.closePath();ctx.fill();
  }
}
