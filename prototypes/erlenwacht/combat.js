/* Lantern wardens fight drifting rift spirits by marking the pack and breaking its seals. */
globalThis.ErlenCombat = (() => {
  const TAU = Math.PI * 2;
  const abilities = [
    {id:'cut', key:'1', icon:'⟋', name:'Sichel', detail:'Runensichel · Gegner markieren', cooldown:.62},
    {id:'rift', key:'2', icon:'✦', name:'Bruch', detail:'Siegelbruch · Marken sprengen', cooldown:3.6},
    {id:'dash', key:'3', icon:'➜', name:'Schritt', detail:'Runenschritt · Ausweichen', cooldown:2.4}
  ];
  const maxEnemies = 32;
  let state, controls;
  const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
  const place = (x,z) => ({x,z});
  const health = () => state.hp;
  function start({ground,walkable,spawn,encounters}){
    dispose();
    const facing = spawn.yaw || 0;
    const anchors = encounters?.length ? encounters : [place(spawn.x+Math.sin(facing)*14,spawn.z+Math.cos(facing)*14)];
    state = {
      ground, walkable, spawn, enemies:[], camps:anchors.map((p,index)=>({...p,firstWave:5+index*3,remaining:0,round:0,waiting:false})),
      age:0, hp:100, kills:0, charge:2, id:0, cutReady:0, riftReady:0, dashReady:0,
      castUntil:0, aimYaw:null, nextHurt:0, lastHurt:-10, shield:1.5, effects:[], pending:new Set(),
      player:spawn, uiAt:0, notice:'Sichel markiert · Bruch sprengt', noticeUntil:7, fallen:0
    };
    const root = document.createElement('section');
    root.className = 'rift-hud';
    root.setAttribute('aria-label','Kampf');
    root.innerHTML = '<div class="rift-vitals"><i aria-hidden="true">♥</i><progress aria-label="Lebenskraft" max="100" value="100"></progress><span class="rift-runes" aria-label="Runenladungen"></span><span class="rift-kills" title="Besiegte Geister">0</span></div><div class="rift-notice" role="status"></div><div class="rift-actions"></div>';
    document.body.appendChild(root);
    const signal = new AbortController();
    const actions = root.querySelector('.rift-actions');
    const buttons = abilities.map(ability=>{
      const button=document.createElement('button');
      button.type='button'; button.className='rift-action rift-'+ability.id;
      button.setAttribute('aria-label',ability.detail+' ('+ability.key+')');
      button.title=ability.detail+' ['+ability.key+']';
      button.innerHTML='<strong aria-hidden="true">'+ability.icon+'</strong><span>'+ability.name+'</span><small>'+ability.key+'</small>';
      button.addEventListener('click',()=>state?.pending.add(ability.id),{signal:signal.signal});
      actions.appendChild(button);
      return button;
    });
    window.addEventListener('keydown',event=>{
      const ability=event.code==='Space'?abilities[2]:abilities.find(a=>event.code==='Digit'+a.key||event.code==='Numpad'+a.key);
      if(ability&&!event.repeat){event.preventDefault();state.pending.add(ability.id)}
    },{signal:signal.signal});
    window.addEventListener('blur',()=>state?.pending.clear(),{signal:signal.signal});
    controls={root,signal,buttons,health:root.querySelector('progress'),runes:root.querySelector('.rift-runes'),
      kills:root.querySelector('.rift-kills'),notice:root.querySelector('.rift-notice')};
    refreshHud();
  }
  function dispose(){
    if(controls){controls.signal.abort();controls.root.remove()}
    controls=null;state=null;
  }
  function say(message,seconds){
    state.notice=message;state.noticeUntil=state.age+seconds;state.uiAt=0;
  }
  function effect(type,x,z,life,extras={}){
    if(state.effects.length>=32)state.effects.shift();
    state.effects.push({type,x,z,start:state.age,life,...extras});
  }
  function spawnPack(camp){
    const size=Math.min(camp.firstWave+camp.round*3,maxEnemies-state.enemies.length);
    if(size<=0)return;
    for(let i=0;i<size;i++){
      let angle=i*2.39996+camp.round*.53, radius=1.1+Math.sqrt(i)*1.1;
      let x=camp.x+Math.cos(angle)*radius,z=camp.z+Math.sin(angle)*radius;
      if(!state.walkable(x,z)){x=camp.x;z=camp.z;if(!state.walkable(x,z))continue}
      const id=++state.id;
      state.enemies.push({id,camp,x,z,hp:3,mark:0,hit:0,awake:false,
        next:state.age+1.2+(id%5)*.16,winding:0,aim:null});
    }
    camp.waiting=state.enemies.some(e=>e.camp===camp);
    if(camp.waiting)camp.round++;
  }
  function selectTarget(player,maxRange){
    let target=null,best=Infinity;
    for(const e of state.enemies){
      if(e.hp<=0)continue;
      const dx=e.x-player.x,dz=e.z-player.z,d=Math.hypot(dx,dz);
      if(d>maxRange)continue;
      const dot=(dx*Math.sin(player.yaw)+dz*Math.cos(player.yaw))/Math.max(.001,d);
      const score=d+(1-dot)*3;
      if(score<best){best=score;target=e}
    }
    return target;
  }
  function injure(e,damage){
    if(e.hp<=0)return;
    e.awake=true;e.hp-=damage;e.hit=state.age+.18;
    if(e.hp>0)return;
    state.kills++;
    effect('shatter',e.x,e.z,.42,{seed:e.id});
  }
  function attack(kind,player){
    if(state.fallen||state.age<(kind==='cut'?state.cutReady:state.riftReady))return;
    if(kind==='rift'&&state.charge<1){say('Mit der Sichel Runen laden',1.6);return}
    const target=selectTarget(player,kind==='cut'?14:18);
    const angle=target?Math.atan2(target.x-player.x,target.z-player.z):player.yaw;
    state.aimYaw=angle;state.castUntil=state.age+(kind==='cut'?.34:.58);
    if(kind==='cut'){
      state.cutReady=state.age+abilities[0].cooldown;
      effect('cut',player.x,player.z,.36,{angle});
      let hits=0;
      for(const enemy of state.enemies){
        const dx=enemy.x-player.x,dz=enemy.z-player.z,forward=dx*Math.sin(angle)+dz*Math.cos(angle);
        if(forward<-.3||forward>14||Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle))>1.4+Math.max(0,forward)*.18)continue;
        enemy.mark=state.age+5;injure(enemy,1);hits++;
      }
      if(hits)state.charge=Math.min(3,state.charge+.5);
    }else{
      state.charge--;state.riftReady=state.age+abilities[1].cooldown;
      const center=target||place(player.x+Math.sin(angle)*7,player.z+Math.cos(angle)*7);
      effect('rift',center.x,center.z,.82,{radius:6.4});
      const marked=[];
      for(const enemy of state.enemies){
        if(dist(enemy,center)>6.4)continue;
        const sealed=enemy.mark>state.age;
        if(sealed)marked.push(place(enemy.x,enemy.z));
        injure(enemy,sealed?4:2);enemy.mark=0;
      }
      for(const seal of marked){
        effect('echo',seal.x,seal.z,.48,{radius:3.4});
        for(const enemy of state.enemies)if(enemy.hp>0&&dist(enemy,seal)<=3.4)injure(enemy,1);
      }
      if(marked.length)say(marked.length===1?'Siegel gesprengt':marked.length+' Siegel gesprengt',1.2);
    }
    state.uiAt=0;
  }
  function dodge(player){
    if(state.age<state.dashReady)return false;
    state.dashReady=state.age+abilities[2].cooldown;
    state.shield=Math.max(state.shield,state.age+.14);
    state.uiAt=0;
    const threatened=state.enemies.some(e=>e.winding>=state.age && e.winding-state.age<=.22 &&
      e.aim && dist(player,e.aim)<1.9);
    if(threatened){
      state.charge=Math.min(3,state.charge+1);
      state.riftReady=state.age;
      say('Perfekt ausgewichen · Bruch bereit',1.6);
    }
    return true;
  }
  function moveSpirit(e,dx,dz){
    if(state.walkable(e.x+dx,e.z+dz)){e.x+=dx;e.z+=dz;return}
    if(state.walkable(e.x+dx,e.z))e.x+=dx;
    else if(state.walkable(e.x,e.z+dz))e.z+=dz;
  }
  function stepEnemy(e,dt,player){
    const d=dist(e,player);
    if(!e.awake&&d<10)e.awake=true;
    if(!e.awake)return;
    if(e.winding){
      if(state.age<e.winding)return;
      effect('strike',e.aim.x,e.aim.z,.25,{radius:1.9});
      if(dist(player,e.aim)<1.9&&state.age>=state.nextHurt&&state.age>=state.shield){
        state.hp=Math.max(0,state.hp-16);state.nextHurt=state.age+.48;state.lastHurt=state.age;
        if(!state.hp){state.fallen=state.age+.95;say('Gefallen · Rückkehr zum Windkap',2.8)}
      }
      e.winding=0;e.next=state.age+1.25+(e.id%5)*.11;return;
    }
    if(d<=2.7&&state.age>=e.next){
      e.aim=place(player.x,player.z);e.winding=state.age+.82;return;
    }
    if(d>1.45&&d<34){
      const speed=(1.65+(e.id%4)*.21)*dt;
      // Slightly fan out near the caster so one pack does not collapse into one point.
      const side=Math.sin(e.id*2.4)*Math.min(1,.7/Math.max(1,d-2));
      moveSpirit(e,speed*((player.x-e.x)/d+side*(player.z-e.z)/d),
        speed*((player.z-e.z)/d-side*(player.x-e.x)/d));
    }
  }
  function update(dt,player){
    if(!state)return {cast:0,aimYaw:null,respawn:null};
    state.age+=dt;state.player=player;let respawn=null,dashed=false;
    if(state.fallen&&state.age>=state.fallen){
      respawn=place(state.spawn.x,state.spawn.z);state.hp=100;state.charge=2;state.shield=state.age+3;
      state.fallen=0;state.enemies=[];state.effects=[];
      for(const camp of state.camps){camp.waiting=false;camp.remaining=state.age+3}
    }
    if(!state.fallen&&!respawn){
      for(const camp of state.camps){
        const distance=dist(player,camp);
        if(!camp.waiting&&distance<30&&state.age>=camp.remaining)spawnPack(camp);
        if(camp.waiting&&distance>58){
          state.enemies=state.enemies.filter(e=>e.camp!==camp);
          camp.waiting=false;camp.remaining=state.age+3;camp.round=Math.max(0,camp.round-1);
        }
      }
      if(state.pending.has('dash'))dashed=dodge(player);
      for(const kind of state.pending)if(kind!=='dash')attack(kind,player);
      state.enemies=state.enemies.filter(e=>e.hp>0);
      for(const e of state.enemies){stepEnemy(e,dt,player);if(state.fallen)break}
      for(const camp of state.camps)if(camp.waiting&&!state.enemies.some(e=>e.camp===camp)){
        camp.waiting=false;camp.remaining=state.age+12;state.hp=Math.min(100,state.hp+20);state.charge=Math.min(3,state.charge+1);
        say('Rotte gebannt · +1 Rune',2);
      }
      if(state.age-state.lastHurt>7)state.hp=Math.min(100,state.hp+dt*3);
    }
    state.pending.clear();
    state.effects=state.effects.filter(f=>state.age-f.start<f.life);
    if(state.age>=state.uiAt){refreshHud();state.uiAt=state.age+.12}
    const cast=Math.max(0,Math.min(1,(state.castUntil-state.age)*4.2));
    return {cast,aimYaw:cast?state.aimYaw:null,respawn,dashed};
  }
  function refreshHud(){
    controls.health.value=health();
    controls.health.classList.toggle('low',health()<40);
    const runes=Math.floor(state.charge);
    controls.runes.textContent='◆'.repeat(runes)+'◇'.repeat(3-runes);
    controls.runes.setAttribute('aria-label',runes+' Runenladungen');
    controls.kills.textContent='✧ '+state.kills;
    const notice=state.age<state.noticeUntil?state.notice:'';
    if(controls.notice.textContent!==notice)controls.notice.textContent=notice;
    controls.root.classList.toggle('hurt',state.age-state.lastHurt<.32);
    for(let i=0;i<abilities.length;i++){
      const ready=state[abilities[i].id+'Ready'],remaining=Math.max(0,ready-state.age);
      const blocked=!!state.fallen||remaining>0||(i===1&&state.charge<1);
      const b=controls.buttons[i];b.setAttribute('aria-disabled',String(blocked));b.classList.toggle('cooling',blocked);
      b.querySelector('small').textContent=remaining>0?remaining.toFixed(1):abilities[i].key;
    }
  }
  function circle(x,z,r,width,color,yOff=.09){
    const sides=16;
    let previous=null;
    for(let i=0;i<=sides;i++){
      const a=i*TAU/sides,c=Math.cos(a),s=Math.sin(a);
      const pair=[r,Math.max(.01,r-width)].map(radius=>{
        const px=x+c*radius,pz=z+s*radius;return [px,state.ground(px,pz)+yOff,pz];
      });
      if(previous){tri(previous[0],pair[0],pair[1],color);tri(previous[0],pair[1],previous[1],color)}
      previous=pair;
    }
  }
  function draw(){
    if(!state)return;
    for(const e of state.enemies){
      const bob=Math.sin(state.age*3.7+e.id)*.14;
      const y=state.ground(e.x,e.z)+.42+bob,x=e.x,z=e.z,phase=e.id*1.7;
      const lit=e.hit>state.age?0xffecb0:e.winding?0xdd6554:0x5e5476;
      solid(x,y,z,.8,.08,.58,5,lit,.82,phase);
      solid(x,y+.76,z,.48,.59,.21,5,lit,.82,phase);
      solid(x,y+1.13,z,.35,.29,.05,5,0xd3acac,.9,phase);
      solid(x-.42,y+.78,z,.77,.17,0,4,0xbf826a,1,phase,-.25);
      solid(x+.42,y+.78,z,.77,.17,0,4,0xbf826a,1,phase,.25);
      if(e.mark>state.age){
        solid(x,y+1.82,z,.2,.02,.18,4,0xffdd7e);
        solid(x,y+2,z,.2,.18,0,4,0xffeead);
      }
      if(e.winding){
        circle(e.aim.x,e.aim.z,1.9,.13,0xff805c);
        circle(e.aim.x,e.aim.z,Math.max(.1,1.9*(1-(e.winding-state.age)/.82)),.16,0xea694a,.11);
      }
    }
    for(const f of state.effects){
      const p=(state.age-f.start)/f.life;
      if(f.type==='cut'){
        const axisX=Math.sin(f.angle),axisZ=Math.cos(f.angle);
        const x=f.x+axisX*(1+p*13),z=f.z+axisZ*(1+p*13),y=state.ground(x,z)+1;
        const point=(s,d,h)=>[x+axisZ*s+axisX*d,y+h,z-axisX*s+axisZ*d];
        const left=point(-2.6,-.85,-.23),right=point(2.6,-.85,.5),tip=point(0,.85,.22),inner=point(0,.33,.1);
        tri(left,tip,inner,0xfbf2a8);tri(inner,tip,right,0x9ffff0);
      }else if(f.type==='rift'||f.type==='echo'||f.type==='strike'){
        const burst=f.type==='rift',radius=f.radius*Math.max(.06,Math.sin(p*Math.PI*.5));
        circle(f.x,f.z,radius,Math.max(.09,(1-p)*(burst?.85:.4)),burst?0xfde7b2:f.type==='echo'?0x91fff2:0xf77858,.16);
        if(burst)for(let i=0;i<8;i++){
          const a=i*TAU/8,x=f.x+Math.cos(a)*radius*.73,z=f.z+Math.sin(a)*radius*.73;
          solid(x,state.ground(x,z)+.12,z,.1+3.2*Math.sin(p*Math.PI),.12+.42*(1-p),0,4,
            i%2?0x83e0df:0xffcb78,1,a,Math.cos(a)*.65,Math.sin(a)*.65);
        }
      }else{
        for(let i=0;i<3;i++){
          const a=f.seed+i*TAU/3,x=f.x+Math.cos(a)*p*1.3,z=f.z+Math.sin(a)*p*1.3;
          solid(x,state.ground(x,z)+.6+Math.sin(Math.PI*p),z,.22,.12,0,3,0xffca8a);
        }
      }
    }
  }
  return {start,update,draw,dispose};
})();
