// Metres, Y up. The height queries interpolate the same triangles that we render.
// Rows follow the trail, concentrating terrain detail where the player can see it.
globalThis.ErlenWorld = (() => {
  const water = -4.4;
  const startZ = -194;
  const endZ = 245;
  const rowStart = -280;
  const rowStep = 5;
  const rowCount = 130;
  const offsets = [-330,-240,-190,-160,-140,-115,-96,-78,-60,-46,-34,-24,-16,-10,-6,-3,0,3,6,10,16,24,34,46,60,78,96,115,140,160,190,240,330];
  const rows = [];
  const obstacles = [];
  const bins = new Map();
  const encounters = [];
  const spawn = {x:0,z:startZ,yaw:0};
  const goal = {x:0,z:endZ};
  let phase = 0;
  const smooth = t => {
    const u = Math.min(1,Math.max(0,t));
    return u*u*(3-2*u);
  };

  // Layout, plants and rocks each have their own deterministic random stream.
  function stream(seed,salt) {
    let n = (seed ^ salt) >>> 0;
    return () => {
      n = (Math.imul(n,1664525)+1013904223)>>>0;
      return n / 4294967296;
    };
  }
  function radial(x,z) {
    return Math.hypot(x/226,(z-42)/291);
  }
  function path(z) {
    return 15*Math.sin(z*.022+phase)+7*Math.sin(z*.045-phase)+4*Math.cos(z*.068);
  }
  function forest(z) {
    return smooth((z+112)/54)*smooth((187-z)/55);
  }
  function region(x,z) {
    if(ground(x,z)>61 && Math.abs(x-path(z))>70) return 'Hochgrat';
    if(z < -148) return 'Windkap';
    if(z < -76) return 'Hirschgrund';
    return z<157?'Dämmerforst':'Sonnenweide';
  }
  function terrainHeight(x,z) {
    const coast = smooth((radial(x,z)-.84)/.18);
    const roll = 3.4*Math.sin(z*.035+phase)+2.1*Math.cos(x*.058-z*.016);
    const cape = 31*smooth((-z-52)/120);
    const bay = smooth((x-path(z)-16)/67)*smooth((-z+28)/70);
    const mountain = 96*Math.exp(-((x+133)**2/2900+(z-124)**2/6600))
      + 55*Math.exp(-((x-126)**2/3200+(z-186)**2/8200));
    const inland = 9+roll+cape*(1-bay)-19*bay+mountain;
    return inland*(1-coast) + (water-4)*coast;
  }
  function makeRows() {
    rows.length=0;
    for(let i=0;i<=rowCount;i++) {
      const z=rowStart+i*rowStep;
      const center=path(z);
      rows.push({center,y:offsets.map(dx=>terrainHeight(center+dx,z))});
    }
  }
  function ground(x,z) {
    const rowPos=(z-rowStart)/rowStep;
    const i=Math.floor(rowPos);
    if(i<0 || i>=rowCount || !rows.length) return terrainHeight(x,z);
    const t=rowPos-i;
    const a=rows[i], b=rows[i+1];
    const u=x-((1-t)*a.center+t*b.center);
    if(u<offsets[0] || u>offsets[offsets.length-1]) return terrainHeight(x,z);
    let lo=0,hi=offsets.length-1;
    while(hi-lo>1) {
      const mid=(lo+hi)>>1;
      if(offsets[mid]>u) hi=mid; else lo=mid;
    }
    const s=(u-offsets[lo])/(offsets[hi]-offsets[lo]);
    if(s+t<=1) return a.y[lo]*(1-s-t)+a.y[hi]*s+b.y[lo]*t;
    return b.y[hi]*(s+t-1)+a.y[hi]*(1-t)+b.y[lo]*(1-s);
  }
  function key(x,z) {
    return Math.floor(x/16)+','+Math.floor(z/16);
  }
  function obstacle(x,z,r) {
    const item=[x,z,r+.24];
    obstacles.push(item);
    const reach=item[2];
    for(let ix=Math.floor((x-reach)/16);ix<=Math.floor((x+reach)/16);ix++) {
      for(let iz=Math.floor((z-reach)/16);iz<=Math.floor((z+reach)/16);iz++) {
        const k=ix+','+iz;
        if(!bins.has(k)) bins.set(k,[]);
        bins.get(k).push(item);
      }
    }
  }
  function walkable(x,z) {
    if(radial(x,z)>.998 || ground(x,z)<water+.4) return false;
    const nearby=bins.get(key(x,z));
    return !nearby || nearby.every(([tx,tz,r])=>(tx-x)**2+(tz-z)**2>=r*r);
  }
  function reserved(x,z) {
    return Math.abs(x-path(z))<5.5 || Math.hypot(x-goal.x,z-goal.z)<15 ||
      encounters.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+3);
  }
  function terrain(seed) {
    const rng=stream(seed,821);
    let triangles=0;
    for(let i=0;i<rowCount;i++) {
      const z=rowStart+i*rowStep;
      const a=rows[i],b=rows[i+1];
      for(let j=0;j<offsets.length-1;j++) {
        const left=offsets[j], right=offsets[j+1], mid=(left+right)/2;
        const x=(a.center+b.center)/2+mid;
        const p=[a.center+left,a.y[j],z], q=[a.center+right,a.y[j+1],z];
        const r=[b.center+left,b.y[j],z+rowStep], s=[b.center+right,b.y[j+1],z+rowStep];
        if(Math.max(p[1],q[1],r[1],s[1])<water-1) continue;
        const y=(p[1]+q[1]+r[1]+s[1])/4;
        const onPath=Math.abs(mid)<3 && z>=startZ-12 && z<endZ;
        let color=onPath ? 0xc9ac79 : forest(z)>.48 && Math.abs(mid)<90 ? 0x657650 :
          z>152 ? 0xa9bc6a : 0x91ad70;
        if(y<water+4) color=0xc8b18b;
        if(y>46 && Math.abs(mid)>65) color=y>78?0x939993:0x899080;
        const patch=.976+.036*rng();
        tri(p,r,q,color,patch);tri(q,r,s,color,patch+.01);
        triangles+=2;
      }
    }
    // Only submit water tiles where at least part of the tile can be seen.
    for(let z=-720;z<744;z+=32) for(let x=-720;x<744;x+=32) {
      if(Math.min(ground(x,z),ground(x+32,z),ground(x,z+32),ground(x+32,z+32),ground(x+16,z+16))>water+3) continue;
      const p=[x,water,z],q=[x+32,water,z],r=[x,water,z+32],s=[x+32,water,z+32];
      tri(p,r,q,0x409a9c);tri(q,r,s,0x409a9c);triangles+=2;
    }
    return triangles*18;
  }
  function plantTrees(seed) {
    const rng=stream(seed,91385);
    // Jittered cells bound tree count regardless of seed, and keep groves readable.
    for(let z0=-214;z0<298;z0+=13) for(let x0=-178;x0<180;x0+=13) {
      const x=x0+rng()*11,z=z0+rng()*11;
      const distance=Math.abs(x-path(z)), f=forest(z);
      if(rng()>(.055+.69*f)*(distance>105?.42:1) || radial(x,z)>.91 ||
         ground(x,z)<2 || ground(x,z)>75 || reserved(x,z)) continue;
      const species=f>.5 && rng()<.19?'ancient':rng()<.19?'birch':'fir';
      const height=species==='ancient'?34+rng()*25:species==='birch'?8+rng()*8:12+rng()*16;
      const radius=ErlenArt.drawTree(x,z,height,species,(rng()*4294967296)>>>0);
      obstacle(x,z,radius);
    }
    for(const z of [-137,-103,-72,-43,-15,28,67,112,147]) {
      const side=z%2===0?-1:1, x=path(z)+side*(15+rng()*7);
      if(reserved(x,z) || !walkable(x,z)) continue;
      const h=38+rng()*23;
      obstacle(x,z,ErlenArt.drawTree(x,z,h,'ancient',(rng()*4294967296)>>>0));
    }
  }
  function meadows(seed) {
    const rng=stream(seed,9391);
    for(let i=0;i<180;i++) {
      const z=i%3===0?-200+rng()*84:157+rng()*103;
      const side=rng()<.5?-1:1;
      const x=path(z)+side*(6+rng()*52);
      if(ground(x,z)>water+4) ErlenArt.drawMeadow(x,z,(rng()*4294967296)>>>0);
    }
  }
  function lantern(x,z) {
    const y=ground(x,z);
    solid(x,y-.13,z,2.24,.12,.095,5,0x655641);
    solid(x,y+1.76,z,.12,.37,.33,4,0x514d45);
    solid(x,y+1.88,z,.45,.24,.21,4,0xffdb76);
    solid(x,y+2.33,z,.24,.37,.05,4,0x665646);
  }
  function willow(x,z,seed) {
    const rng=stream(seed,32134), y=ground(x,z);
    solid(x,y-.25,z,6.7,1.1,.58,8,0x746149,1,.2,.7);
    for(let i=0;i<10;i++) {
      const a=i*2.4,r=3+rng()*3,dx=Math.cos(a)*r,dz=Math.sin(a)*r;
      solid(x+.7,y+4.4,z,3.6,.34,.15,6,0x796847,1,0,dx-.7,dz);
      solid(x+dx,y+7.1,z+dz,3.6,3.3,1.1,7,0x98b754);
      solid(x+dx,y+3.6,z+dz,3.5,.35,3.2,7,0x739345);
    }
    obstacle(x,z,1.15);
  }
  function sheep(x,z) {
    const y=ground(x,z);
    for(const dx of [-.38,.38]) for(const dz of [-.22,.22])
      solid(x+dx,y,z+dz,.55,.08,.07,4,0x565347);
    solid(x,y+.43,z,.67,.65,.47,6,0xe9e4c6,.72);
    solid(x+.56,y+.65,z,.4,.26,.2,5,0x605847);
  }
  function landmarks(seed) {
    const rng=stream(seed,4103);
    // Across the inlet, the broken Windkap watchtower measures the near horizon.
    const x=53,z=-137;
    const rock=ground(x,z)-.6;
    solid(x,rock,z,17,8,5,8,0x8d8777,.76,.3,-1);
    solid(x-1,rock+16.6,z,.9,5.3,4.8,8,0x879556,.76,.3);
    solid(x-1,rock+17.4,z,10,2.4,2.05,8,0xb9aa8e);
    solid(x-1,rock+27.1,z,.9,2.48,2.42,8,0x8b8070);
    for(let i=0;i<7;i++) {
      const a=i*Math.PI/4;
      solid(x-1+Math.cos(a)*2,rock+28,z+Math.sin(a)*2,1,.48,.45,4,0xb3a387);
    }
    obstacle(x,z,7);
    for(const [z,offset,kind] of [[-120,-22,'stones'],[72,22,'ruin'],[189,-25,'stones']]){
      const lx=path(z)+offset;
      ErlenArt.drawLandmark(lx,z,kind,(rng()*4294967296)>>>0);
    }
    for(let z=startZ+6;z<endZ-5;z+=19) lantern(path(z)+4.1,z);
    willow(goal.x,goal.z,seed);
    for(let i=0;i<9;i++) sheep(goal.x-12-rng()*18,goal.z-14+rng()*23);
    for(const [x,z,w,h,a] of [[-84,372,460,138,-.09],[206,274,230,115,-.2],
          [-260,110,320,103,1.3],[286,-73,300,90,1.2],[8,-345,360,75,.1]]) {
      ErlenArt.drawRidge(x,z,w,h,a,(rng()*4294967296)>>>0);
    }
  }
  function generate(seed=4831) {
    obstacles.length=encounters.length=0;
    bins.clear();
    phase=stream(seed,781)()*Math.PI*2;
    makeRows();
    spawn.x=path(startZ);
    spawn.yaw=Math.atan2(path(startZ+18)-spawn.x,18)+.12;
    goal.x=path(endZ)+2;
    for(const [z,radius] of [[-179,9],[-111,13],[-32,15],[64,16],[136,14],[210,16]]) {
      encounters.push({x:path(z),z,radius});
    }
    const groundEnd=terrain(seed);
    plantTrees(seed);
    meadows(seed);
    landmarks(seed);
    return {groundEnd};
  }
  return {generate,ground,path,forest,radial,region,walkable,water,spawn,goal,encounters,obstacles};
})();
