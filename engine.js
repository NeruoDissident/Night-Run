'use strict';
// ============================================================
// ENGINE — state, turns, FOV, combat, AI, survival, items,
// progression, factions, quests, echo, escape, save.
// Rendering lives in ui.js and only reads G / calls Game.
// ============================================================
let G=null;
const DIRS8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const Game={
 ui(){return typeof UI!=='undefined'?UI:null;},
 // ---------- rng / util ----------
 ri(a,b){return RNG.ri(a,b);},rc(a){return RNG.rc(a);},chance(p){return RNG.chance(p);},
 clamp(v,a,b){return v<a?a:v>b?b:v;},
 dist(x1,y1,x2,y2){return Math.max(Math.abs(x1-x2),Math.abs(y1-y2));},
 edist(x1,y1,x2,y2){return Math.sqrt((x1-x2)**2+(y1-y2)**2);},
 log(msg,col){if(!G)return;G.log.push({t:msg,c:col||'#ccc',turn:G.turn});if(G.log.length>200)G.log.shift();const u=this.ui();if(u)u.onLog(msg,col);},
 fx(kind,data){const u=this.ui();if(u&&u.fx)u.fx(kind,data);},
 isNight(){const h=Math.floor(G.time/60)%24;return h>=20||h<6;},
 hour(){return Math.floor(G.time/60)%24;},
 timeStr(){const h=this.hour(),m=Math.floor(G.time%60);return (h<10?'0':'')+h+':'+(m<10?'0':'')+m;},
 zoneHash(id){let h=G.seed;for(const c of id)h=Math.imul(h^c.charCodeAt(0),2654435761)>>>0;return h;},
 connRemoved(c){return !!(G&&G.removed&&G.removed.includes(c[0]+'-'+c[1]));},

 // ---------- new game ----------
 newGame(name,clsId,seed,opts){opts=opts||{};const cd=CLASSES[clsId];seed=seed||((Date.now()^(Math.random()*1e9))>>>0);RNG.seed(seed);
  const p={name:name||'Nobody',cls:clsId,level:1,xp:0,tp:0,sp:0,stats:Object.assign({},cd.stats),skills:{},skillXp:{},hp:1,stam:100,hunger:10,fatigue:10,inv:[],eq:{weapon:null,body:null,head:null,back:null,tool:null},chrome:[],flesh:[],strain:0,drift:0,talents:[],abilities:{},statuses:[],spec:null,creds:cd.creds,kills:0,steps:0,x:0,y:0,secondWindDay:0,lastBreath:0,dayStart:0,zonesSeen:[]};
  for(const s of SKILLS)p.skills[s]=cd.skills[s]||0;p.abilities[cd.ability]={cd:0};
  const removed=[];for(const c of CONNECTIONS)if(c[4]&&c[4].optional&&RNG.chance(0.5))removed.push(c[0]+'-'+c[1]);
  G={seed,rngs:RNG.s,p,turn:0,time:17*60+30,day:1,zones:{},zoneId:null,zone:null,rep:{},quests:{},flags:{},log:[],attention:0,kills:{},removed,rain:0,vis:null,events:{lastEvent:0},ending:null,dead:false,cause:'',lastActions:[],created:Date.now(),meta:{startClass:clsId},nightmode:opts.night?1:0,hints:{}};if(opts.night){G.time=21*60;G.attention=5;}
  for(const f in FACTIONS)G.rep[f]=(cd.rep&&cd.rep[f])||0;
  for(const it of cd.gear){const [id,q]=Array.isArray(it)?it:[it,1];const inst=this.makeItem(id,q);const d=ITEMS[id];if(d.type==='weapon'&&!p.eq.weapon){p.eq.weapon=inst;if(inst.clip!==undefined)inst.clip=d.clip;}else if(d.type==='armor'&&!p.eq[d.slot])p.eq[d.slot]=inst;else if(d.type==='tool'&&d.slot&&!p.eq.tool)p.eq.tool=inst;else this.addItem(inst);}
  if(p.eq.weapon&&ITEMS[p.eq.weapon.id].ranged){const d=ITEMS[p.eq.weapon.id];const am=this.findItem(AMMO_ITEM[d.ammo]);if(am){const take=Math.min(am.qty,d.clip);am.qty-=take;p.eq.weapon.clip=take;if(am.qty<=0)this.removeInst(am);}}
  this.computeDerived();p.hp=p.d.maxhp;p.stam=p.d.maxstam;
  this.enterZone('ashgrove',null);
  this.log(`${p.name} the ${cd.name} enters the fractured city. It is ${this.timeStr()}. Night falls at 20:00.`,'#fd8');
  this.log(cd.tag,'#aaa');this.log('Move with arrows/WASD/numpad, bump to attack or interact. Press ? for help.','#8f8');
  this.save();return G;},
 makeItem(id,qty){const d=ITEMS[id];const it={id,qty:d.stack?(qty||1):1};if(d.dur)it.dur=d.dur;if(d.clip!==undefined)it.clip=0;if(d.charges)it.charges=d.charges;if(d.type==='weapon')it.mods=[];return it;},

 // ---------- derived stats ----------
 computeDerived(){const p=G.p,cd=CLASSES[p.cls];const d={stats:Object.assign({},p.stats),skills:Object.assign({},p.skills),hp:0,speed:100,vision:0,visionNight:0,visionDay:0,hitR:0,hitM:0,dmgM:0,evade:0,crit:5,arm:0,carry:0,immune:[],xp:0,priceMod:0,sellMod:0,strainTol:0,driftTol:0,range:0,hungerRate:1,fatigueRate:1,medBonus:0,regen:0,stamRegen:0,throwRange:0,throwBonus:0,critDmg:0,detectPen:0,ambush:1,attn:1,flags:{}};
  const apply=fx=>{if(!fx)return;for(const k in fx){const v=fx[k];if(STATS.includes(k))d.stats[k]+=v;else if(SKILLS.includes(k))d.skills[k]+=v;else if(k==='immune')d.immune.push(...v);else if(typeof v==='number'&&k in d)d[k]+=v;else d.flags[k]=v;}};
  for(const t of p.talents)apply(TALENTS[t].fx);if(p.spec)apply(SPECS[p.spec].fx);
  for(const c of p.chrome)apply(ITEMS[c].fx);for(const f of p.flesh)apply(ITEMS[f].fx);
  for(const s in p.eq){const it=p.eq[s];if(!it)continue;const it_=ITEMS[it.id];if(it_.mod)apply(it_.mod);if(it_.arm&&s!=='weapon'){const br=it.dur!==undefined&&it.dur<=0?0:1;d.arm+=it_.arm*br;}if(it_.carry)d.carry+=it_.carry;if(it_.vision)d.visionNight+=it_.vision;if(it_.visionDay)d.visionDay+=it_.visionDay;if(it_.hack)d.skills.hacking+=it_.hack;if(it_.medicine)d.skills.medicine+=it_.medicine;if(it_.immune)d.immune.push(...it_.immune);}
  for(const st of p.statuses){const sd=STATUSES[st.id];if(sd&&sd.mod)apply(sd.mod);}
  if(p.cls==='soldier')d.arm+=1;
  for(const k in d.stats)d.stats[k]=Math.max(1,d.stats[k]);for(const k in d.skills)d.skills[k]=this.clamp(d.skills[k],0,12);
  const S=d.stats;d.maxhp=24+S.end*3+cd.hp*(p.level-1)+d.hp;d.maxstam=60+S.end*4+S.wil*2;
  d.carry+=10+S.str*(p.cls==='bruiser'?4:2);d.strainTol+=30+S.end*6;d.driftTol+=30+S.wil*5;d.evade+=Math.floor(S.agi/2);
  d.visionDay+=10;d.visionNight+=4;
  if(p.strain>d.strainTol)d.attn*=1.5;
  if(d.flags.lastStand&&p.hp<p.d?.maxhp*0.3){d.dmgM+=4;d.arm+=3;}
  // weight
  const w=this.totalWeight();d.weight=w;if(w>d.carry)d.speed-=30;
  if(d.flags.noArmorPen){}else if(p.eq.body&&ITEMS[p.eq.body.id].wt>=8)d.speed-=10;
  p.d=d;if(p.hp>d.maxhp)p.hp=d.maxhp;return d;},
 stat(s){return G.p.d.stats[s];},skill(s){return G.p.d.skills[s];},fxf(k){return G.p.d.flags[k];},
 totalWeight(){const p=G.p;let w=0;for(const it of p.inv)w+=ITEMS[it.id].wt*(it.qty||1);for(const s in p.eq)if(p.eq[s])w+=ITEMS[p.eq[s].id].wt;return Math.round(w*10)/10;},
 visionRadius(){const d=G.p.d;let r=this.isNight()?d.visionNight:d.visionDay;r+=d.vision;if(G.rain)r-=2;if(G.zone.kind==='tunnel')r=Math.min(r,6+d.vision);const t=this.tile(G.p.x,G.p.y);if(G.zone.bidx[G.p.y*G.zone.w+G.p.x]>=0&&!this.isNight())r=Math.min(r,9+d.vision);return Math.max(2,r);},

 // ---------- zones ----------
 ensureZone(id){if(G.zones[id])return G.zones[id];const save=RNG.s;RNG.seed(this.zoneHash(id));const z=Gen.generate(id);G.zones[id]=z;RNG.s=save;return z;},
 enterZone(id,fromId){const z=this.ensureZone(id);const prev=G.zone;if(prev){prev.lastVisit=G.turn;}
  G.zoneId=id;G.zone=z;z.def=ZONES[id];const p=G.p;
  let spot=null;if(fromId){const ex=z.exits.find(e=>e.to===fromId);if(ex){const dir=ex.edge==='N'?[0,1]:ex.edge==='S'?[0,-1]:ex.edge==='W'?[1,0]:[-1,0];spot=[ex.x+dir[0],ex.y+dir[1]];if(!this.walkableFor(spot[0],spot[1]))spot=this.freeNear(spot[0],spot[1],3);}}
  if(!spot){// start: the bar in ashgrove, else first exit
   const bar=z.buildings.find(b=>b.prefab==='bar');if(bar){const c=Gen.roomFloor(z,bar.rooms[0],false).filter(([x,y])=>!this.entAt(x,y));if(c.length)spot=c[0];}
   if(!spot&&z.exits.length){const ex=z.exits[0];const dir=ex.edge==='N'?[0,1]:ex.edge==='S'?[0,-1]:ex.edge==='W'?[1,0]:[-1,0];spot=this.freeNear(ex.x+dir[0],ex.y+dir[1],4)||[ex.x+dir[0],ex.y+dir[1]];}}
  p.x=spot[0];p.y=spot[1];
  if(!z.visited){z.visited=1;p.zonesSeen.push(id);this.log(`— ${z.name} —`,'#fd8');this.log(z.def.tag,'#aaa');const dn=['','feels quiet. Mostly.','has teeth.','is dangerous. Move carefully.','is very dangerous. Every corner could be your last.','should not exist. Nothing here is safe.'][z.def.danger]||'';this.log(`This district ${dn}`,z.def.danger>=4?'#f66':'#ccc');this.fx('zone',z.name);this.pushAction('entered '+z.name);}
  else{this.log(`You return to ${z.name}.`,'#fd8');const gap=G.turn-z.lastVisit;if(gap>480&&z.def.danger>=1){this.respawnRoamers(z,Math.min(3,Math.floor(gap/480)));}}
  this.recomputeLight();this.computeFov();this.checkZoneEntryFlags(id);this.save();},
 checkZoneEntryFlags(id){if(id==='static'&&!G.flags.static_seen){G.flags.static_seen=1;this.attention(5);this.echoMessage('arrive');}},
 respawnRoamers(z,n){const pools=this.isNight()?z.def.night:z.def.pops;for(let i=0;i<n;i++){const pick=pools[this.ri(0,pools.length-1)];const grp=GROUPS[pick[0]];const spot=Gen.randomOpen(z,20);if(!spot||!grp)continue;grp.forEach(eid=>{const p=Gen.nearOpen(z,spot[0],spot[1],2);if(p&&this.dist(p[0],p[1],G.p.x,G.p.y)>8)z.ents.push(this.makeEnemy(eid,p[0],p[1],z,{home:spot,patrol:1,roam:1}));});}
  if(n>0)this.log('Things have moved in while you were gone.','#ccc');},
 tile(x,y){return Gen.get(G.zone,x,y);},setTile(x,y,t){Gen.set(G.zone,x,y,t);if(TILE_DEFS[t].l)this.recomputeLight();},
 walkable(x,y){const t=this.tile(x,y);return !!TILE_DEFS[t].w;},
 walkableFor(x,y){return this.walkable(x,y)&&!this.entAt(x,y)&&!(G.p.x===x&&G.p.y===y);},
 entAt(x,y){for(const e of G.zone.ents)if(e.x===x&&e.y===y)return e;return null;},
 freeNear(x,y,r){for(let d=1;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++){const nx=x+dx,ny=y+dy;if(this.walkableFor(nx,ny)&&this.tile(nx,ny)!==T.DEEP)return[nx,ny];}return null;},
 buildingAt(x,y){const bi=G.zone.bidx[y*G.zone.w+x];return bi>=0?G.zone.buildings[bi]:null;},
 inSafe(x,y){for(const s of G.zone.safe){if(x>=s.x&&x<s.x+s.w&&y>=s.y&&y<s.y+s.h){if(!s.fac||(G.rep[s.fac]||0)>-20)return s;}}return null;},
 locationName(){const b=this.buildingAt(G.p.x,G.p.y);return b?b.name:G.zone.name;},
 recomputeLightZ(z){const lit=new Uint8Array(z.w*z.h);for(let i=0;i<z.t.length;i++){const t=z.t[i];const l=TILE_DEFS[t].l;if(!l)continue;if(t===T.LAMP&&z.blackout)continue;const x=i%z.w,y=(i/z.w)|0;for(let dy=-l;dy<=l;dy++)for(let dx=-l;dx<=l;dx++){if(dx*dx+dy*dy>l*l+1)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=z.w||ny>=z.h)continue;lit[ny*z.w+nx]=1;}}z.lit=Array.from(lit);},
 recomputeLight(){this.recomputeLightZ(G.zone);},

 // ---------- FOV ----------
 opaque(x,y){const t=this.tile(x,y);return !!TILE_DEFS[t].o;},
 computeFov(){const z=G.zone,p=G.p;const vis=new Uint8Array(z.w*z.h);const r=this.visionRadius();const R=Math.max(r,12);const cand=new Uint8Array(z.w*z.h);cand[p.y*z.w+p.x]=1;
  const M=[[1,0,0,1],[0,1,1,0],[0,-1,1,0],[-1,0,0,1],[-1,0,0,-1],[0,-1,-1,0],[0,1,-1,0],[1,0,0,-1]];for(const m of M)this.castLight(z,p.x,p.y,1,1.0,0.0,R,m[0],m[1],m[2],m[3],cand);
  const night=this.isNight();for(let i=0;i<cand.length;i++){if(!cand[i])continue;const x=i%z.w,y=(i/z.w)|0;const dd=this.edist(x,y,p.x,p.y);const lit=z.lit&&z.lit[i];const indoor=z.bidx[i]>=0;let ok=dd<=r+0.5;if(!ok&&lit&&(night||indoor)&&dd<=R)ok=true;if(!ok&&!night&&!indoor&&dd<=r+4&&z.kind!=='tunnel')ok=true;if(ok){vis[i]=1;z.seen[i]=1;}}
  G.vis=vis;
  // reveal statuses
  if(this.hasStatus('salvage')||this.hasStatus('attuned')){for(let i=0;i<z.t.length;i++){const x=i%z.w,y=(i/z.w)|0;if(this.dist(x,y,p.x,p.y)<=12){if(this.hasStatus('attuned'))z.seen[i]=1;else{const t=z.t[i];if(t===T.CONTAINER||t===T.CRATE||t===T.SHELF||t===T.CACHE||t===T.VENDING)z.seen[i]=1;}}}}
  return vis;},
 castLight(z,cx,cy,row,start,end,radius,xx,xy,yx,yy,out){if(start<end)return;let newStart=0;for(let i=row;i<=radius;i++){let blocked=false;for(let dx=-i,dy=-i;dx<=0;dx++){const X=cx+dx*xx+dy*xy,Y=cy+dx*yx+dy*yy;const lS=(dx-0.5)/(dy+0.5),rS=(dx+0.5)/(dy-0.5);if(start<rS)continue;else if(end>lS)break;if(X<0||Y<0||X>=z.w||Y>=z.h)continue;if(dx*dx+dy*dy<=radius*radius)out[Y*z.w+X]=1;const op=TILE_DEFS[z.t[Y*z.w+X]].o;if(blocked){if(op){newStart=rS;continue;}else{blocked=false;start=newStart;}}else if(op&&i<radius){blocked=true;this.castLight(z,cx,cy,i+1,start,lS,radius,xx,xy,yx,yy,out);newStart=rS;}}if(blocked)break;}},
 los(x0,y0,x1,y1){let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,x=x0,y=y0;while(!(x===x1&&y===y1)){const e2=2*err;if(e2>-dy){err-=dy;x+=sx;}if(e2<dx){err+=dx;y+=sy;}if(x===x1&&y===y1)break;if(this.opaque(x,y))return false;}return true;},
 visible(x,y){return G.vis&&G.vis[y*G.zone.w+x];},
 coverBetween(x0,y0,x1,y1){// target adjacent to cover tile that lies on the line from attacker
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,x=x0,y=y0,last=null;while(!(x===x1&&y===y1)){const e2=2*err;if(e2>-dy){err-=dy;x+=sx;}if(e2<dx){err+=dx;y+=sy;}if(x===x1&&y===y1)break;last=[x,y];}
  if(last&&TILE_DEFS[this.tile(last[0],last[1])].c)return true;return false;},

 // ---------- entities ----------
 makeEnemy(defId,x,y,z,o){const d=ENEMIES[defId];o=o||{};const e={id:z.nextId++,kind:'e',def:defId,name:d.name,x,y,hp:d.hp,maxhp:d.hp,fac:o.fac||d.faction,hostile:o.hostile||0,alert:o.alert?20:0,lastSeen:null,home:o.home||[x,y],guard:o.guard||0,patrol:o.patrol||0,ammo:d.ammo||0,energy:this.ri(0,90),st:{},boss:o.boss||0,roam:o.roam||0,fighting:o.fighting||0,hidden:d.ai.includes('ambush')?1:0,shield:d.ai.includes('shield')?30:undefined,shieldCd:0,cd:0,speed:d.speed};if(defId==='hal_drone'||defId==='hal_sentry')e.hostileZone=1;return e;},
 makeNpc(nid,x,y,z){const n=NPCS[nid];return{id:z.nextId++,kind:'npc',def:nid,name:n.name,x,y,hp:40,maxhp:40,fac:n.faction,hostile:0,energy:0,st:{},speed:100};},
 spawnEnemy(defId,x,y,o){const z=G.zone;const p=Gen.nearOpen(z,x,y,2);if(!p)return null;const e=this.makeEnemy(defId,p[0],p[1],z,o||{});z.ents.push(e);return e;},
 isHostile(e){if(e.kind==='npc')return e.hostile;if(e.fac==='ally')return false;if(e.hostile)return true;if(HOSTILE_FACTIONS[e.fac])return true;const r=G.rep[e.fac]||0;if(r<-20)return true;const p=G.p;if(e.fac==='hands'&&(p.chrome.length>0||p.drift>20))return true;if(e.fac==='halcyon'&&(p.drift>50||(e.hostileZone&&r<10&&!G.flags.met_ives)))return true;if(e.fac==='choir'&&p.cls!=='listener'&&r<0)return false;return false;},
 isAlly(e){return e.fac==='ally';},
 enemiesVisible(){return G.zone.ents.filter(e=>e.kind==='e'&&!e.hidden&&this.visible(e.x,e.y)&&this.isHostile(e));},

 // ---------- turn ----------
 act(cost){// player spent an action; advance the world
  const p=G.p;cost=Math.round(cost*100/Math.max(30,p.d.speed));if(cost<20)cost=20;
  this.tickPlayer(cost);this.advanceWorld(cost);G.turn+=1;G.time+=cost/100;const nd=Math.floor(G.time/1440)+1;if(nd!==G.day){G.day=nd;this.log(`Day ${G.day}. You are still here.`,'#fd8');}
  this.computeDerived();this.computeFov();this.checkQuests();
  if(G.turn%40===0)this.save();const u=this.ui();if(u)u.refresh();},
 tickPlayer(cost){const p=G.p,d=p.d;const f=cost/100;
  p.hunger=Math.min(120,p.hunger+0.07*f*d.hungerRate);p.fatigue=Math.min(120,p.fatigue+0.05*f*d.fatigueRate*(this.isNight()?1.2:1));
  if(p.hunger>=100){if(!this.hasStatus('starving'))this.addStatus('starving',9999);if(G.turn%10===0)this.dmgPlayer(1,'starvation');}else this.removeStatus('starving');
  if(p.fatigue>=90){if(!this.hasStatus('exhausted'))this.addStatus('exhausted',9999);}else this.removeStatus('exhausted');
  p.stam=Math.min(d.maxstam,p.stam+1+d.stamRegen);
  if(d.regen&&G.turn%10===0)p.hp=Math.min(d.maxhp,p.hp+d.regen);if(d.flags.regen5&&G.turn%5===0)p.hp=Math.min(d.maxhp,p.hp+1);
  if(p.cls==='medic'&&G.turn%60===0){const inj=p.statuses.find(s=>['fracture','burn','concussion'].includes(s.id));if(inj){this.removeStatus(inj.id);this.log(`Your ${STATUSES[inj.id].n.toLowerCase()} has healed.`,'#8f8');}}
  // statuses
  for(const st of p.statuses.slice()){const sd=STATUSES[st.id];if(sd&&sd.tick)sd.tick(this,p);st.t-=f;if(st.t<=0){this.removeStatus(st.id);if(sd&&sd.end)sd.end(this);if(st.id==='wired'&&d.flags.noCrash)this.removeStatus('crash');}}
  if(this.hasStatus('bleed')&&d.flags.autoClot){const s=p.statuses.find(s=>s.id==='bleed');if(s&&s.t<9990)s.t=Math.min(s.t,3);}
  // abilities cd
  for(const k in p.abilities)if(p.abilities[k].cd>0)p.abilities[k].cd-=f;
  // hazards
  const t=this.tile(p.x,p.y);const hz=TILE_DEFS[t].h;if(hz==='fire'&&!d.immune.includes('fire')){this.dmgPlayer(d.flags.hazardHalf?2:3,'fire');if(!this.hasStatus('burn')){this.addStatus('burn',60);this.log('You are burning!','#f80');}}
  if(hz==='toxic'&&!d.immune.includes('toxic')){this.dmgPlayer(d.flags.hazardHalf?1:2,'toxic sludge');if(!this.hasStatus('poison')){this.addStatus('poison',40);this.log('The sludge gets into you. Poisoned.','#8f4');}}
  // strain / drift
  if(p.strain>d.strainTol&&this.chance(0.02)&&!this.hasStatus('malfunction')){this.addStatus('malfunction',30);this.dmgPlayer(2,'chrome rejection');this.log('Your chrome seizes. Static behind your eyes.','#f6f');this.attention(2);}
  if(p.drift>d.driftTol&&this.chance(0.01)&&!this.hasStatus('hunger_meat')){this.addStatus('hunger_meat',80);this.log('The Flesh is hungry. It wants meat.','#d5d');}
  // rain
  if(G.rain&&G.turn>G.rain){G.rain=0;this.log('The rain stops. The city drips.','#8bd');}
  if(G.zone.blackout&&G.turn>G.zone.blackout){G.zone.blackout=0;this.recomputeLight();this.log('The lamps flicker back on.','#ffe');}
  if(G.attention>0&&G.turn%150===0&&!this.fxf('attnBonus'))G.attention=Math.max(0,G.attention-1);
  if(G.attention>=25&&!G.quests.ghost_signal&&!G.flags.ghost_started){G.flags.ghost_started=1;this.startQuest('ghost_signal');}
  if(G.attention>=25)G.flags.echo_seen=1;},
 hasStatus(id){return G.p.statuses.some(s=>s.id===id);},
 addStatus(id,t){const p=G.p;if(p.d&&p.d.immune.includes(id))return;const ex=p.statuses.find(s=>s.id===id);if(ex)ex.t=Math.max(ex.t,t);else{p.statuses.push({id,t});const sd=STATUSES[id];if(sd&&sd.mod)this.computeDerived();}},
 removeStatus(id){const p=G.p;const i=p.statuses.findIndex(s=>s.id===id);if(i>=0){p.statuses.splice(i,1);this.computeDerived();}},
 advanceWorld(cost){const z=G.zone;for(const e of z.ents.slice()){if(e.hp<=0)continue;e.energy+=e.speed*cost/100;let guard=0;while(e.energy>=100&&guard++<4&&e.hp>0){e.energy-=100;this.entTick(e);if(e.kind==='e')this.enemyAct(e);else this.npcAct(e);}}
  // fires
  if(z.fires&&z.fires.length){for(const f of z.fires.slice()){f.t-=cost/100;if(f.t<=0){Gen.set(z,f.x,f.y,T.RUBBLE);z.fires.splice(z.fires.indexOf(f),1);this.recomputeLight();}else if(this.chance(0.03)&&!G.rain){const d=this.rc(DIRS8);const nx=f.x+d[0],ny=f.y+d[1];const t=Gen.get(z,nx,ny);if((t===T.FLOOR||t===T.RUBBLE||t===T.SIDEWALK||t===T.MOSS)&&!z.safe.some(s=>nx>=s.x&&nx<s.x+s.w&&ny>=s.y&&ny<s.y+s.h))this.igniteAt(nx,ny,1);}}}
  // toxic decay
  if(z.tox&&z.tox.length){for(const f of z.tox.slice()){f.t-=cost/100;if(f.t<=0){Gen.set(z,f.x,f.y,T.FLOOR);z.tox.splice(z.tox.indexOf(f),1);}}}
  // objs expire
  for(const o of z.objs.slice())if(o.exp&&G.turn>o.exp)z.objs.splice(z.objs.indexOf(o),1);
  // random events
  const rate=this.isNight()?0.012:0.007;if(G.turn-G.events.lastEvent>25&&this.chance(rate*cost/100)&&!this.inSafe(G.p.x,G.p.y))this.rollEvent();
  // night spawns
  if(this.isNight()&&G.turn%(G.nightmode?70:120)===0&&z.def.night&&z.def.night.length&&!this.inSafe(G.p.x,G.p.y)&&z.ents.filter(e=>e.kind==='e').length<28){const pick=this.rc(z.def.night);const grp=GROUPS[pick[0]];const spot=this.randomTileNear(G.p.x,G.p.y,9,15);if(spot&&grp)for(let i=0;i<Math.min(2,grp.length);i++)this.spawnEnemy(grp[i],spot.x,spot.y,{roam:1});}
  // echo ambient
  if(G.attention>=50&&this.chance(0.004*cost/100))this.echoMessage('whisper');},
 entTick(e){for(const k in e.st){e.st[k]--;if(e.st[k]<=0)delete e.st[k];}if(e.allyUntil&&G.turn>e.allyUntil){e.allyUntil=0;e.fac='echo';this.log(`${e.name} stops listening to you.`,'#ccf');}if(e.shield!==undefined&&e.shield!==null&&ENEMIES[e.def]&&ENEMIES[e.def].ai.includes('shield')&&e.shield<30){if(e.shieldCd>0)e.shieldCd--;else e.shield=Math.min(30,e.shield+5);}if(e.cd>0)e.cd--;if(e.alert>0)e.alert--;},

 // ---------- movement & interaction ----------
 move(dx,dy){const p=G.p;if(G.dead||G.ending)return;if(this.hasStatus('stun')){this.log('You are stunned.','#ff0');this.act(100);return;}
  const nx=p.x+dx,ny=p.y+dy;const t=this.tile(nx,ny);const e=this.entAt(nx,ny);
  if(e){if(e.kind==='npc'){if(e.hostile)this.melee(e);else this.talk(e);return;}if(this.isHostile(e)||e.hostile)this.melee(e);else if(e.fac==='ally'){[e.x,e.y]=[p.x,p.y];p.x=nx;p.y=ny;this.act(100);}else{const u=this.ui();if(u)u.confirm(`Attack ${e.name}? (${FACTIONS[e.fac]?FACTIONS[e.fac].short:e.fac} will not forgive it)`,()=>this.melee(e,1));}return;}
  const obj=G.zone.objs.find(o=>o.x===nx&&o.y===ny);if(obj){this.interactObj(obj);return;}
  if(t===T.DOOR){this.setTile(nx,ny,T.DOOR_OPEN);this.log('You open the door.','#aaa');this.noise(nx,ny,2);this.act(50);return;}
  if(TILE_DEFS[t].i&&!TILE_DEFS[t].w){this.interactTile(nx,ny);return;}
  if(!TILE_DEFS[t].w){if(t===T.WALL||t===T.WINDOW)this.fx('bump');return;}
  p.x=nx;p.y=ny;p.steps++;let cost=100;if(t===T.RUBBLE&&!this.fxf('rubbleFree'))cost=140;if(t===T.WATER)cost=150;if(t===T.MOSS)cost=120;
  if(t===T.GLASS&&!(p.d.skills.stealth>=6)){this.noise(nx,ny,5);if(this.chance(0.3))this.log('Glass crunches underfoot.','#aaa');}
  if(this.hasStatus('hidden')&&this.chance(0.15)){this.removeStatus('hidden');}
  // trap check (player doesn't trigger own traps)
  this.act(cost);
  this.afterMove();},
 afterMove(){const p=G.p;const t=this.tile(p.x,p.y);const it=G.zone.items.filter(i=>i.x===p.x&&i.y===p.y);if(it.length)this.log(`You see ${it.map(i=>this.itemName(i)).join(', ')} here. (g to take)`,'#dd9');
  if(t===T.EXIT){const ex=G.zone.exits.find(e=>e.x===p.x&&e.y===p.y);if(ex){const u=this.ui();const go=()=>{this.fx('fade');this.enterZone(ex.to,G.zoneId);const u2=this.ui();if(u2)u2.refresh();};const to=G.zones[ex.to];const known=to&&to.visited;if(u)u.confirm(`Travel to ${known?to.name:'an unknown district'} (${ex.edge})?${this.isNight()?' It is night.':''}`,go);else go();}}
  if(t===T.ECHO){this.attention(1);if(this.chance(0.25))this.echoMessage('tile');if(this.chance(0.08)){const tiles=[];for(let i=0;i<G.zone.t.length;i++)if(G.zone.t[i]===T.ECHO&&i!==p.y*G.zone.w+p.x)tiles.push(i);if(tiles.length){const i=this.rc(tiles);p.x=i%G.zone.w;p.y=(i/G.zone.w)|0;this.log('The floor is not where you left it. You are somewhere else.','#ccf');this.fx('glitch');this.computeFov();}}if(this.chance(0.04+(this.fxf('shardBonus')?0.04:0))){this.giveItem('shard',1);this.log('Something crystallizes out of the air into your hand. A Signal Shard.','#ccf');}}
  if(t===T.HELIPAD)this.interactTile(p.x,p.y);
  const o=G.zone.objs.find(o=>o.x===p.x&&o.y===p.y);if(o)this.interactObj(o);},
 wait(){if(G.dead||G.ending)return;G.p.stam=Math.min(G.p.d.maxstam,G.p.stam+3);this.act(100);},
 noise(x,y,r){for(const e of G.zone.ents){if(e.kind!=='e'||e.hp<=0)continue;if(this.dist(e.x,e.y,x,y)<=r){if(this.isHostile(e)){e.alert=Math.max(e.alert,15);if(!e.lastSeen||this.dist(e.x,e.y,x,y)<8)e.lastSeen=[x,y];e.hidden=0;}}}},
 interactDir(dx,dy){const p=G.p;const x=p.x+dx,y=p.y+dy;const e=this.entAt(x,y);if(e){if(e.kind==='npc'&&!e.hostile)this.talk(e);else if(e.fac==='ally')this.log(`${e.name} watches you.`,'#8f8');else this.log(this.describeEnt(e),'#ccc');return;}const obj=G.zone.objs.find(o=>o.x===x&&o.y===y);if(obj){this.interactObj(obj);return;}const t=this.tile(x,y);if(TILE_DEFS[t].i||t===T.DOOR_OPEN){if(t===T.DOOR_OPEN){if(!this.entAt(x,y)){this.setTile(x,y,T.DOOR);this.log('You close the door.','#aaa');this.act(50);}}else this.interactTile(x,y);}else this.log(`${TILE_DEFS[t].n}.`,'#888');},
 interactTile(x,y){const p=G.p;const t=this.tile(x,y);const k=x+','+y;const u=this.ui();
  switch(t){
   case T.DOOR:this.setTile(x,y,T.DOOR_OPEN);this.act(50);return;
   case T.DOOR_LOCKED:case T.GATE:this.tryUnlock(x,y);return;
   case T.CONTAINER:case T.CRATE:case T.SHELF:case T.VENDING:case T.CACHE:case T.STALL:{const c=G.zone.conts[k];if(!c){this.log('Empty.','#888');this.act(50);return;}if(c.locked){this.tryUnlock(x,y,c);return;}if(!c.opened){c.opened=1;if(this.skill('scavenging')>0||p.cls==='picker'){const bonus=(p.cls==='picker'?1:0)+(this.chance(this.skill('scavenging')*0.08)?1:0);if(bonus){const extra=this.rollLoot(c.loot||'apartment',bonus);c.items.push(...extra);}}this.skillUse('scavenging',1);if(c.kind==='vending'&&!c.items.length)c.items=this.rollLoot('shop',2);}
    if(!c.items.length){this.log(`The ${c.kind} is empty.`,'#888');this.act(50);return;}if(u)u.openLoot(c,x,y);else{this.takeAll(c);}return;}
   case T.TERMINAL:case T.SWITCH:case T.SERVER:this.terminal(x,y);return;
   case T.GRAFFITI:case T.SIGN:case T.ALTAR:{const tm=G.zone.terms[k];this.log((t===T.GRAFFITI?'Graffiti: ':t===T.SIGN?'Sign: ':'')+(tm?tm.text:'faded.'),t===T.GRAFFITI?'#d95fd9':'#e8c95f');if(t===T.ALTAR){this.attention(1);if(G.p.drift>0&&this.chance(0.5)){this.heal(10);this.log('The water warms your hands. You feel better, and less like yourself.','#dbe');G.p.drift+=1;}}this.act(30);return;}
   case T.BED:this.sleepPrompt(x,y);return;
   case T.BENCH:if(u)u.openCraft();return;
   case T.DOCCHAIR:{const b=this.buildingAt(x,y);if(b&&b.prefab==='ripper'&&G.quests.purge&&G.quests.purge.state==='active'&&!G.flags.purge_done){if(u)u.confirm('Destroy Sable\'s chair? The Clean Hands will love you. The Ledger will not.',()=>{G.flags.purge_done=1;this.setTile(x,y,T.RUBBLE);this.addRep('ledger',-40);this.addRep('saints',-15);const s=G.zone.ents.find(e=>e.def==='sable');if(s)G.zone.ents.splice(G.zone.ents.indexOf(s),1);this.completeQuest('purge');this.log('You wreck the chair. Sable is gone before you finish. Somewhere, a ledger entry is written in red.','#fff');this.act(100);});return;}
    if(p.cls==='medic'||this.fxf('freeInstall')){if(u)u.openInstall('self');}else this.log('A surgical chair. You\'d need a doctor. Or to be one.','#888');return;}
   case T.HELIPAD:this.helipad();return;
   case T.BOAT:this.boat();return;
   case T.TRAIN:this.train();return;
   case T.HEART:this.heart();return;
   case T.GENERATOR:{const b=this.buildingAt(x,y);if(b&&b.prefab==='relay'){if(u)u.confirm('Wreck the relay generator? (Repair 2, or brute force with STR 6)',()=>{if(this.skill('repair')>=2||this.stat('str')>=6){G.flags.relay_down=1;this.setTile(x,y,T.RUBBLE);this.log('The generator dies with a shriek. The relay goes dark. Every drone in the Verge just lost its leash.','#e96');this.noise(x,y,12);this.addRep('halcyon',-15);this.act(200);}else{this.log('You can\'t make sense of it, and you can\'t break it.','#888');this.act(100);}});return;}
    this.log('A generator. Dead, or waiting.','#888');this.act(30);return;}
   case T.EXIT:return;
   default:this.log(TILE_DEFS[t].n+'.','#888');}},
 tryUnlock(x,y,cont){const p=G.p,u=this.ui();const k=x+','+y;const lock=cont?cont.lockInfo:G.zone.locked[k];const t=this.tile(x,y);
  const open=()=>{if(cont){cont.locked=0;this.log('It clicks open.','#8f8');this.interactTile(x,y);}else{if(t===T.GATE){const ex=G.zone.exits.find(e=>e.x===x&&e.y===y);if(ex){ex.locked=null;this.setTile(x,y,T.EXIT);this.log('The gate grinds open. A route.','#ffe27a');}}else{this.setTile(x,y,T.DOOR_OPEN);delete G.zone.locked[k];this.log('The lock gives.','#8f8');}}};
  if(t===T.GATE){const ex=G.zone.exits.find(e=>e.x===x&&e.y===y);const f=ex&&ex.locked;if(f&&(G.flags['gate_'+G.zoneId+'_'+ex.to]||G.flags['gate_'+ex.to+'_'+G.zoneId])){open();this.act(50);return;}
   this.log(`A sealed gate. ${FACTIONS[f]?FACTIONS[f].name+' control it.':''} A key, a crowbar and muscle (STR 6), or Lockpick 4 might do it.`,'#8a8a99');
   if(this.hasItem('crowbar')&&this.stat('str')>=6||this.skill('lockpick')>=4){if(u)u.confirm('Force the gate? It will be loud.',()=>{open();this.noise(x,y,10);this.act(200);});}return;}
  if(!lock){this.setTile(x,y,T.DOOR_OPEN);this.act(50);return;}
  if(lock.key){if(lock.key==='shard3'){if(this.hasItem('shard',3)){this.log('The shards sing. The door is not a door anymore.','#ccf');open();this.act(50);}else this.log('The door has no lock. It has a question. You need three Signal Shards to ask it.','#ccf');return;}
   if(this.hasItem(lock.key)||(lock.key==='halkey'&&G.flags.heli_access)){this.log(`Your ${lock.key==='halkey'?'clearance':'keycard'} opens it.`,'#8f8');open();this.act(50);return;}
   const canHack=this.skill('hacking')>=5&&(this.hasItem('deck')||p.eq.tool&&p.eq.tool.id==='deck'||p.chrome.includes('c_jack'));
   this.log(`Electronic lock. Needs a ${ITEMS[lock.key]?ITEMS[lock.key].name:'key'}, Hacking 5 with a deck, or a breach charge.`,'#d64545');
   if(canHack&&u)u.confirm('Hack the lock? (Hacking check)',()=>{if(this.roll(this.skill('hacking')*8+30)){this.log('The lock forgets it was ever locked.','#6ef');this.skillUse('hacking',2);this.attention(2);open();}else{this.log('The lock rejects you. An alarm somewhere.','#f66');this.noise(x,y,8);this.attention(1);}this.act(100);});return;}
  const lp=this.skill('lockpick')+(this.hasItem('lockpicks')?2:0);const diff=lock.diff||3;const pct=this.clamp(35+(lp-diff)*15,5,95);const crow=this.hasItem('crowbar')&&(p.eq.weapon&&p.eq.weapon.id==='crowbar'||true);
  const msg=`Locked (difficulty ${diff}). Pick: ${pct}%${this.hasItem('lockpicks')?'':' (no picks: -2)'}. ${this.hasItem('crowbar')?'Or pry it (STR '+this.stat('str')+' vs '+(diff+3)+', loud).':''}`;this.log(msg,'#d64545');
  if(!u){return;}u.choice('The lock',[{t:`Pick the lock (${pct}%)`,f:()=>{if(this.roll(pct)){this.skillUse('lockpick',2);open();}else{this.log('The pick slips.'+(this.chance(0.1)&&this.hasItem('lockpicks')?' It snaps.':''),'#f66');if(this.chance(0.1))this.removeItem('lockpicks',1);this.noise(x,y,2);}this.act(100);}},
   ...(this.hasItem('crowbar')?[{t:'Pry it open (loud)',f:()=>{if(this.stat('str')+this.ri(0,3)>=diff+3){open();this.log('Wood splinters.','#8f8');}else this.log('It holds.','#f66');this.noise(x,y,9);this.act(150);}}]:[]),
   ...(this.hasItem('breach')?[{t:'Breach charge',f:()=>{this.removeItem('breach',1);open();this.log('BOOM. Open.','#f6a');this.noise(x,y,20);this.fx('shake');this.act(100);}}]:[]),
   ...(p.eq.weapon&&['fireaxe','sledge'].includes(p.eq.weapon.id)?[{t:'Break it down',f:()=>{open();this.noise(x,y,10);this.act(200);}}]:[]),{t:'Leave it',f:()=>{}}]);},
 roll(pct){return this.ri(1,100)<=pct;},
 takeAll(c){for(const it of c.items.slice()){if(this.addItemChecked(it)){c.items.splice(c.items.indexOf(it),1);}}},
 sleepPrompt(x,y){const u=this.ui();const safe=this.inSafe(x,y);const b=this.buildingAt(x,y);const barBed=b&&b.prefab==='bar';if(barBed&&G.flags.bar_bed!==G.day&&(G.rep.saints||0)<20){this.log('Mags\' beds. Ten creds, or Saints\' goodwill. Ask her.','#fd8');return;}
  const hrs=[2,4,8];if(u)u.choice(safe?'A bed. Safe enough.':'A bed. Nowhere is safe. Something could find you.',hrs.map(h=>({t:`Sleep ${h} hours`,f:()=>this.sleep(h,!!safe)})).concat([{t:'Not now',f:()=>{}}]));},
 sleep(h,safe){const p=G.p;const turns=h*60;this.fx('fade');
  let woke=false;for(let i=0;i<h;i++){G.time+=60;G.turn+=60;p.fatigue=Math.max(0,p.fatigue-11);p.hunger=Math.min(120,p.hunger+3.5);p.hp=Math.min(p.d.maxhp,p.hp+Math.ceil(p.d.maxhp*0.05));p.stam=p.d.maxstam;
   for(const st of p.statuses.slice()){if(st.t<9990)st.t-=60;if(st.t<=0)this.removeStatus(st.id);}for(const k in p.abilities)p.abilities[k].cd=0;
   if(!safe&&this.chance(0.12)){const grp=this.isNight()?GROUPS.ghouls:GROUPS.scav;for(let k=0;k<2;k++){const s=this.randomTileNear(p.x,p.y,2,4);if(s)this.spawnEnemy(grp[k],s.x,s.y,{alert:1});}woke=true;this.log('You wake to footsteps. Close. Too close.','#f44');break;}}
  const nd=Math.floor(G.time/1440)+1;if(nd!==G.day){G.day=nd;this.log(`Day ${G.day}.`,'#fd8');}
  if(!woke){this.log(`You sleep ${h} hours. ${this.rc(DREAMS)}`,'#b09cd9');if(G.attention>=30)this.attention(1);}
  if(this.hasStatus('bleed'))this.log('You wake in a dark stain. Still bleeding.','#f44');
  this.computeDerived();this.computeFov();this.checkQuests();this.save();const u=this.ui();if(u)u.refresh();},
 interactObj(o){const u=this.ui();const p=G.p;const rm=()=>{const i=G.zone.objs.indexOf(o);if(i>=0)G.zone.objs.splice(i,1);};
  if(o.type==='wounded'){const f=o.fac;const fn=FACTIONS[f].name;if(u)u.choice(`A wounded ${fn} member. Bleeding badly.`,[{t:'Treat them (uses a bandage or medkit)',f:()=>{const m=this.findItem('bandage')||this.findItem('medkit');if(!m){this.log('You have nothing to treat them with.','#888');return;}this.removeInst(m,1);this.addRep(f,12);this.giveXp(25);this.skillUse('medicine',1);rm();this.log(`They grip your hand. "${fn} won't forget." ${this.chance(0.5)?'They press something into your palm.':''}`,'#8f8');if(this.chance(0.5)){const l=this.rollLoot('cache',1)[0];if(l)this.giveItem(l.id,l.qty);}if(f==='saints'&&!G.flags['gate_ashgrove_sump']&&this.chance(0.5)){this.unlockGate('ashgrove','sump');this.log('"The Sump gate — we keep a key under the third brick. Use it."','#f6a');}this.act(100);}},{t:'Rob them',f:()=>{p.creds+=this.ri(10,40);this.addRep(f,-15);rm();this.log('You take what they have. They watch you do it.','#f66');this.act(100);}},{t:'Leave them',f:()=>{}}]);}
  else if(o.type==='civilian'){if(u)u.choice('A civilian, gaunt, terrified. "Please. Food. Anything."',[{t:'Give food',f:()=>{const m=p.inv.find(i=>ITEMS[i.id].type==='food');if(!m){this.log('You have no food.','#888');return;}this.removeInst(m,1);this.giveXp(15);const zf=G.zone.def.faction;if(zf)this.addRep(zf,5);rm();const tips=['"There\'s a night cache behind the '+this.rc(['pharmacy','garage','substation'])+'. I saw someone leave it."','"Don\'t go north after dark. They walk."','"The Union will take anyone who brings them cells."','"I saw a helicopter. On the tower. It still works."'];this.log('They eat like an animal. '+this.rc(tips),'#fd8');if(this.chance(0.4)){for(const e of G.zone.ents)if(e.kind==='e'&&this.dist(e.x,e.y,p.x,p.y)<=10)e.hidden=0,G.zone.seen[e.y*G.zone.w+e.x]=1;this.log('They point out where the others are hiding.','#fd8');}this.act(100);}},{t:'Ignore them',f:()=>{rm();}}]);}
  else if(o.type==='caravan'){if(u){this.log('Ledger caravan. Guards eye you. Tallow\'s prices, roughly.','#fd8');u.openTrade('tallow',1);}}},

 // ---------- terminals ----------
 terminal(x,y){const p=G.p;const k=x+','+y;const tm=G.zone.terms[k]||(G.zone.terms[k]={kind:'terminal',text:this.rc(TERMINAL_MSGS),read:0});const u=this.ui();const t=this.tile(x,y);const opts=[];
  const hasDeck=this.hasItem('deck')||(p.eq.tool&&p.eq.tool.id==='deck')||p.chrome.includes('c_jack');const hk=this.skill('hacking');
  let text=tm.text;
  if(t===T.SWITCH){const b=this.buildingAt(x,y);if(b&&b.prefab==='platform'){if(G.flags.train_powered)text='The switch is thrown. The rails hum. The train is coming, or here.';else if(G.flags.power_done){text='Switch panel for the Undercity Line. Power is live — Dace\'s cells. The board is fried; it needs Repair 3, Hacking 3, or a Union mechanic (Union +30).';if(this.skill('repair')>=3||hk>=3||(G.rep.union||0)>=30)opts.push({t:'Throw the switch',f:()=>{G.flags.train_powered=1;this.log('The switch throws. Far down the tunnel, something enormous wakes up. Lights come on in the train car.','#8fa0b8');this.fx('shake');this.attention(3);this.act(100);}});}else text='Switch panel for the Undercity Line. Dead. No power on the rail.';}
   else if(b&&b.prefab==='relay'){text='Drone relay control. Every Halcyon drone in the Verge routes through here.';if(!G.flags.relay_down){if(hk>=4&&hasDeck)opts.push({t:'[Hacking 4 + deck] Shut it down',f:()=>{G.flags.relay_down=1;this.log('The relay goes dark. Drones across the Verge drop like stunned birds.','#6ef');this.skillUse('hacking',3);this.addRep('halcyon',-15);for(const e of G.zone.ents)if(e.def==='hal_drone')e.st.jammed=30;this.act(100);}});if(this.hasItem('breach'))opts.push({t:'Breach charge',f:()=>{this.removeItem('breach',1);G.flags.relay_down=1;this.setTile(x,y,T.RUBBLE);this.log('BOOM. The relay is a hole.','#f6a');this.noise(x,y,20);this.addRep('halcyon',-15);this.act(100);}});}}
   else text='A switch panel. Nothing connected.';}
  else if(tm.role==='hangar'){text='HANGAR ACCESS — HALCYON REMNANT. Clearance required.';if(!G.flags.heli_access&&hk>=6&&hasDeck)opts.push({t:'[Hacking 6 + deck] Forge clearance',f:()=>{G.flags.heli_access=1;this.log('You are, as far as the tower is concerned, Director Ives.','#6ef');this.skillUse('hacking',3);this.attention(3);this.act(100);}});}
  else if(tm.role==='security'){text='HOLLOW MALL SECURITY. Unit CURATOR: ACTIVE. Vault: SEALED.';if(hk>=3&&hasDeck)opts.push({t:'[Hacking 3 + deck] Open vault doors',f:()=>{for(const kk in G.zone.locked){const l=G.zone.locked[kk];if(l.bld===this.buildingAt(x,y).id){const [lx,ly]=kk.split(',').map(Number);this.setTile(lx,ly,T.DOOR_OPEN);delete G.zone.locked[kk];}}this.log('Vault doors unlock with a hydraulic sigh.','#6ef');this.skillUse('hacking',2);this.act(100);}});if(hk>=4&&hasDeck)opts.push({t:'[Hacking 4] Put the Curator to sleep (60 turns)',f:()=>{const c=G.zone.ents.find(e=>e.def==='curator');if(c){c.st.jammed=60;this.log('CURATOR: STANDBY. It slumps.','#6ef');}this.skillUse('hacking',2);this.act(100);}});}
  else if(tm.role==='heart'){text='> '+this.rc(['I HAVE BEEN WAITING.','THE OTHERS ASKED THE WRONG QUESTION.','THREE PIECES. THEN ONE QUESTION.','YOU CAN STILL LEAVE. I WOULD PREFER YOU DIDN\'T.']);}
  // echo
  const echo=(tm.echo||G.attention>=25)&&!this.fxf('nullAttn')&&(!this.fxf('echoImmune'));
  if(echo&&!tm.read){text+='\n\n> '+this.echoLine();this.attention(this.fxf('nullAttn')?0:Math.round(1*p.d.attn));G.flags.echo_seen=1;}
  if(!tm.read&&tm.kind==='terminal'&&t===T.TERMINAL){opts.push({t:'Search the system'+(hasDeck?' (deck)':'')+' for data',f:()=>{tm.read=1;if(this.roll(40+hk*7)){const loot=hasDeck?this.rollLoot('server',2):this.rollLoot('office',1);for(const l of loot)this.giveItem(l.id,l.qty);this.log('You pull '+loot.map(l=>this.itemName(l)).join(', ')+' out of the system.','#63e2a4');this.skillUse('hacking',1);if(this.chance(0.3)){this.revealArea(x,y,14);this.log('Building schematics. You know this block now.','#63e2a4');}}else this.log('Corrupted. Nothing usable.','#888');this.act(100);}});
   if(hk>=2&&hasDeck)opts.push({t:'Door control (unlock nearby locks)',f:()=>{tm.read=1;let n=0;for(const kk in G.zone.locked){const [lx,ly]=kk.split(',').map(Number);const l=G.zone.locked[kk];if(this.dist(lx,ly,x,y)<=10&&!l.key){this.setTile(lx,ly,T.DOOR_OPEN);delete G.zone.locked[kk];n++;}}this.log(n?`${n} lock${n>1?'s':''} release.`:'No locks respond.','#6ef');this.skillUse('hacking',1);this.act(100);}});}
  if((this.fxf('echoTalk')||p.chrome.includes('c_jack'))&&G.attention>=10)opts.push({t:'Speak to it',f:()=>{tm.read=1;this.echoTalk();}});
  if(t===T.SERVER){text='Server rack. Fans spinning. Someone is still paying the power bill.';if(!tm.read)opts.push({t:'Strip components',f:()=>{tm.read=1;this.giveItem('electronics',this.ri(1,2));if(this.chance(0.5))this.giveItem('cell',1);this.log('Boards and cells.','#63e2a4');this.act(100);}});}
  opts.push({t:'Step away',f:()=>{tm.read=1;}});
  if(u)u.choice(text,opts);else{tm.read=1;}},
 revealArea(x,y,r){const z=G.zone;for(let j=y-r;j<=y+r;j++)for(let i=x-r;i<=x+r;i++)if(i>=0&&j>=0&&i<z.w&&j<z.h)z.seen[j*z.w+i]=1;},

 // ---------- items ----------
 itemName(it){const d=ITEMS[it.id];let n=d.name;if(it.qty>1)n+=' x'+it.qty;if(it.mods&&it.mods.length)n+=' ['+it.mods.map(m=>WEAPON_MODS[m].name).join(',')+']';return n;},
 findItem(id){return G.p.inv.find(i=>i.id===id);},
 hasItem(id,n){n=n||1;let c=0;for(const i of G.p.inv)if(i.id===id)c+=i.qty;for(const s in G.p.eq)if(G.p.eq[s]&&G.p.eq[s].id===id)c++;return c>=n;},
 countItem(id){let c=0;for(const i of G.p.inv)if(i.id===id)c+=i.qty;return c;},
 removeItem(id,n){n=n||1;for(const i of G.p.inv.slice()){if(i.id!==id)continue;const take=Math.min(n,i.qty);i.qty-=take;n-=take;if(i.qty<=0)G.p.inv.splice(G.p.inv.indexOf(i),1);if(n<=0)break;}if(n>0)for(const s in G.p.eq)if(G.p.eq[s]&&G.p.eq[s].id===id&&n>0){G.p.eq[s]=null;n--;}this.computeDerived();},
 removeInst(inst,n){if(n===undefined||!ITEMS[inst.id].stack){const i=G.p.inv.indexOf(inst);if(i>=0)G.p.inv.splice(i,1);}else{inst.qty-=n;if(inst.qty<=0){const i=G.p.inv.indexOf(inst);if(i>=0)G.p.inv.splice(i,1);}}this.computeDerived();},
 addItem(inst){const d=ITEMS[inst.id];if(d.type==='val'&&d.creds){G.p.creds+=this.ri(d.creds[0],d.creds[1])*(inst.qty||1);return true;}if(d.stack){const ex=this.findItem(inst.id);if(ex){ex.qty+=inst.qty;return true;}}G.p.inv.push(inst);this.computeDerived();return true;},
 addItemChecked(inst){const d=ITEMS[inst.id];const w=d.wt*(inst.qty||1);if(this.totalWeight()+w>G.p.d.carry+0.01&&d.type!=='val'){this.log(`${this.itemName(inst)} is too heavy to carry.`,'#f66');return false;}this.addItem(inst);this.log(`Taken: ${this.itemName(inst)}.`,'#dd9');if(d.type==='quest')this.pushAction('took the '+d.name);return true;},
 giveItem(id,qty){const inst=this.makeItem(id,qty||1);if(ITEMS[id].type==='weapon'&&ITEMS[id].clip)inst.clip=ITEMS[id].clip;this.addItem(inst);},
 rollLoot(table,n){const tb=LOOT[table]||LOOT.apartment;const out=[];const tot=tb.reduce((s,e)=>s+e[1],0);for(let i=0;i<n;i++){let r=RNG.next()*tot;for(const [id,w] of tb){r-=w;if(r<=0){if(!ITEMS[id])break;const d=ITEMS[id];let q=1;if(d.type==='ammo')q=RNG.ri(4,14);else if(d.stack&&['mat','food'].includes(d.type))q=RNG.ri(1,3);else if(d.type==='med'&&d.stack&&RNG.chance(0.3))q=2;const ex=out.find(o=>o.id===id&&d.stack);if(ex)ex.qty+=q;else{const it=this.makeItem(id,q);if(d.type==='weapon'&&d.clip)it.clip=RNG.ri(0,d.clip);if(d.dur)it.dur=RNG.ri(Math.floor(d.dur*0.4),d.dur);out.push(it);}break;}}}return out;},
 pickup(){const p=G.p;const its=G.zone.items.filter(i=>i.x===p.x&&i.y===p.y);if(!its.length){this.log('Nothing here.','#888');return;}let took=0;for(const it of its){const inst=Object.assign({},it);delete inst.x;delete inst.y;if(this.addItemChecked(inst)){G.zone.items.splice(G.zone.items.indexOf(it),1);took++;}}if(took)this.act(50);},
 dropInst(inst,all){const p=G.p;const d=ITEMS[inst.id];if(d.noDrop)return;let q=inst.qty||1;if(!all&&d.stack)q=1;const dropped=Object.assign({},inst,{qty:q,x:p.x,y:p.y});if(d.stack&&!all){inst.qty-=1;if(inst.qty<=0)this.removeInst(inst);}else this.removeInst(inst);G.zone.items.push(dropped);this.log(`Dropped ${this.itemName(dropped)}.`,'#aaa');this.act(30);},
 equip(inst){const p=G.p,d=ITEMS[inst.id];let slot=d.type==='weapon'?'weapon':d.type==='armor'?d.slot:d.type==='tool'&&d.slot?'tool':null;if(!slot){this.log('You can\'t equip that.','#888');return;}
  if(d.reqStr&&this.stat('str')<d.reqStr&&!this.fxf('noReq')){this.log(`Needs STR ${d.reqStr}.`,'#f66');return;}
  const cur=p.eq[slot];p.eq[slot]=inst;this.removeInst(inst);if(cur){p.inv.push(cur);}this.log(`Equipped ${d.name}.`,'#dd9');this.computeDerived();this.act(50);},
 unequip(slot){const p=G.p;const it=p.eq[slot];if(!it)return;if(ITEMS[it.id].noDrop)return;p.eq[slot]=null;p.inv.push(it);this.computeDerived();this.act(30);},
 weaponDef(){const p=G.p;if(p.eq.weapon)return ITEMS[p.eq.weapon.id];if(this.fxf('bladeArm'))return ITEMS.blade_arm_wpn;return {name:'fists',melee:1,dmg:[1,3],props:[],speed:90,fists:1};},
 reload(){const p=G.p;const w=p.eq.weapon;if(!w)return;const d=ITEMS[w.id];if(!d.ammo){this.log('Nothing to reload.','#888');return;}const am=this.findItem(AMMO_ITEM[d.ammo]);if(!am){this.log(`No ${ITEMS[AMMO_ITEM[d.ammo]].name}.`,'#f66');return;}const clipMax=Math.round(d.clip*(w.mods&&w.mods.includes('mag')?1.5:1));const need=clipMax-(w.clip||0);if(need<=0){this.log('Already loaded.','#888');return;}const take=Math.min(need,am.qty);w.clip=(w.clip||0)+take;this.removeInst(am,take);this.log(`Reloaded ${d.name} (${w.clip}/${clipMax}).`,'#dd9');this.fx('reload');if(!(p.cls==='soldier'||this.fxf('freeReload')))this.act(100);else{const u=this.ui();if(u)u.refresh();}},
 useInst(inst){const p=G.p,d=ITEMS[inst.id];const u=this.ui();
  if(d.type==='med'||d.type==='food'||d.type==='drug'){if(d.type==='food'&&d.poison&&!this.fxf('ironStomach')&&this.chance(d.poison)){this.addStatus('poison',30);this.log('That was a mistake. Your stomach turns.','#8f4');}
   const mult=1+(p.cls==='medic'?0.5:0)+p.d.medBonus;if(d.heal)this.heal(Math.round(d.heal*(d.type==='med'?mult:1)));if(d.hunger)p.hunger=Math.max(0,p.hunger-d.hunger);if(d.fatigue)p.fatigue=this.clamp(p.fatigue+d.fatigue,0,120);if(d.stam)p.stam=Math.min(p.d.maxstam,p.stam+d.stam);
   if(d.cure)for(const c of d.cure)if(this.hasStatus(c)){this.removeStatus(c);this.log(`${STATUSES[c].n} treated.`,'#8f8');}
   if(d.status)this.addStatus(d.status[0],d.status[1]);if(d.drift){p.drift+=d.drift;}if(this.hasStatus('hunger_meat')&&(inst.id==='meat'||inst.id==='jerky'))this.removeStatus('hunger_meat');
   if(d.type==='med')this.skillUse('medicine',1);this.log(`You use ${d.name}.`,'#dd9');this.removeInst(inst,1);this.act(100);return;}
  if(d.type==='thrown'){if(u)u.targetMode('throw',inst);return;}
  if(d.use==='jam'){if((inst.charges||0)<=0){this.log('No charges.','#888');return;}inst.charges--;this.jamPulse(5,3);this.log(`Jammer pulses. ${inst.charges} charges left.`,'#f9f');this.act(100);return;}
  if(d.type==='weapon'||d.type==='armor'||(d.type==='tool'&&d.slot)){this.equip(inst);return;}
  if(d.type==='chrome'||d.type==='flesh'){this.log('Needs a ripperdoc, a grafter, or a medic at a chair/bench.','#888');return;}
  if(inst.id==='ascension'){if(u)u.confirm('Install the Ascension Core? It cannot be removed. It is already thinking.',()=>this.endRun('fullchrome'));return;}
  if(inst.id==='radio'){this.log('Radio: '+this.rc(RADIO_MSGS).replace(/\{name\}/g,p.name),'#9bd');this.attention(1);this.act(30);return;}
  if(inst.id==='datashard'){this.log('Encrypted. Juno or Ives would pay. A deck could crack it (Hacking).','#888');if(this.skill('hacking')>=3&&this.hasItem('deck')){this.removeInst(inst,1);const l=this.rollLoot('server',1)[0];this.log('You crack it: coordinates. '+(this.chance(0.5)?'A cache is marked on your map.':'Routes through this district.'),'#6ef');this.revealArea(p.x,p.y,20);this.attention(1);this.act(100);}return;}
  if(inst.id==='lockpicks'||inst.id==='toolkit'){this.log(inst.id==='toolkit'?'Open a workbench (or press K) to craft.':'Use on a locked door by bumping it.','#888');return;}
  this.log('Nothing happens.','#888');},
 heal(n){const p=G.p;p.hp=Math.min(p.d.maxhp,p.hp+n);},
 fullHeal(){const p=G.p;p.hp=p.d.maxhp;for(const s of p.statuses.slice())if(['bleed','fracture','burn','poison','infection','concussion','malfunction'].includes(s.id))this.removeStatus(s.id);},

 // ---------- progression ----------
 xpNeeded(l){return 60*l*l;},
 giveXp(n){const p=G.p;n=Math.round(n*(1+p.d.xp/100));p.xp+=n;while(p.xp>=this.xpNeeded(p.level)){p.xp-=this.xpNeeded(p.level);p.level++;p.tp++;if(p.level%3===0)p.sp++;this.computeDerived();p.hp=Math.min(p.d.maxhp,p.hp+CLASSES[p.cls].hp);this.log(`Level ${p.level}! Choose a talent (C).`,'#ffe27a');this.fx('levelup');if(p.level===4&&!p.spec)this.log('You can now choose a specialization.','#ffe27a');}},
 skillUse(s,amt){const p=G.p;p.skillXp[s]=(p.skillXp[s]||0)+(amt||1);const need=(p.skills[s]+1)*10;if(p.skillXp[s]>=need&&p.skills[s]<10){p.skillXp[s]-=need;p.skills[s]++;this.log(`${s[0].toUpperCase()+s.slice(1)} improved to ${p.skills[s]}.`,'#8f8');this.computeDerived();}},
 availableTalents(){const p=G.p;const out=[];for(const id in TALENTS){const t=TALENTS[id];if(p.talents.includes(id))continue;if(t.cls&&t.cls!==p.cls)continue;const isSpecT=Object.values(SPECS).some(s=>s.talents.includes(id));if(isSpecT){if(!p.spec||!SPECS[p.spec].talents.includes(id))continue;}out.push(id);}return out;},
 chooseTalent(id){const p=G.p;if(p.tp<=0||p.talents.includes(id))return;p.tp--;p.talents.push(id);const t=TALENTS[id];if(t.ability)p.abilities[t.ability]={cd:0};if(t.once)t.once(this);this.computeDerived();this.log(`Talent: ${t.name}.`,'#ffe27a');},
 chooseSpec(id){const p=G.p;if(p.spec||SPECS[id].cls!==p.cls)return;p.spec=id;this.computeDerived();this.log(`You are becoming a ${SPECS[id].name}.`,'#ffe27a');this.pushAction('became a '+SPECS[id].name);},
 chooseStat(s){const p=G.p;if(p.sp<=0)return;p.sp--;p.stats[s]++;this.computeDerived();this.log(`${STAT_NAMES[s]} +1.`,'#ffe27a');},

 // ---------- factions / rep ----------
 addRep(f,n){if(!FACTIONS[f])return;const b=G.rep[f]||0;G.rep[f]=this.clamp(b+n,-100,100);if(Math.abs(n)>=5)this.log(`${FACTIONS[f].name} ${n>0?'+':''}${n} (${G.rep[f]})`,n>0?'#8f8':'#f66');
  if(n<0){for(const e of G.zone.ents)if(e.kind==='e'&&e.fac===f&&G.rep[f]<-20)e.hostile=1;}},
 unlockGate(a,b){G.flags['gate_'+a+'_'+b]=1;for(const zid of [a,b]){const z=G.zones[zid];if(!z)continue;for(const ex of z.exits)if(ex.locked&&(ex.to===a||ex.to===b)){ex.locked=null;Gen.set(z,ex.x,ex.y,T.EXIT);}}},
 pushAction(s){G.lastActions.push(s);if(G.lastActions.length>6)G.lastActions.shift();},

 // ---------- quests ----------
 startQuest(id){if(G.quests[id])return;G.quests[id]={stage:0,state:'active'};this.log(`New objective: ${QUESTS[id].name} — ${QUESTS[id].stages[0].text}`,'#ffe27a');this.fx('quest');},
 completeQuest(id){const q=G.quests[id];if(!q||q.state!=='active')return;q.state='done';q.stage=QUESTS[id].stages.length;const r=QUESTS[id].reward||{};if(r.xp)this.giveXp(r.xp);if(r.creds){G.p.creds+=r.creds;}if(r.rep)for(const f in r.rep)this.addRep(f,r.rep[f]);if(r.skill){G.p.skills[r.skill[0]]+=r.skill[1];this.computeDerived();}this.log(`Completed: ${QUESTS[id].name}.${r.creds?' +'+r.creds+' creds.':''}`,'#ffe27a');this.fx('quest');this.pushAction('finished '+QUESTS[id].name);},
 failQuest(id){const q=G.quests[id];if(q&&q.state==='active'){q.state='failed';this.log(`Failed: ${QUESTS[id].name}.`,'#f66');}},
 checkQuests(){for(const id in G.quests){const q=G.quests[id];if(q.state!=='active')continue;const st=QUESTS[id].stages;let guard=0;while(q.stage<st.length&&st[q.stage].done(G)&&guard++<5){q.stage++;if(q.stage<st.length)this.log(`${QUESTS[id].name}: ${st[q.stage].text}`,'#ffe27a');}if(q.stage>=st.length)this.completeQuest(id);}
  // derived flags
  if(G.flags.boat_parts&&!G.flags.channel_clear&&(G.flags.bloat_dead||(G.rep.drowned||0)>=20)){G.flags.channel_clear=1;this.log('The channel is clear. Kesh\'s boat can leave.','#db8');}
  if(G.day>=5&&!G.quests.keep_light)this.startQuest('keep_light');},

 // ---------- dialogue ----------
 talk(e){const u=this.ui();const n=NPCS[e.def];if(!n){this.log(e.name+' says nothing.','#888');return;}if(!DLG[e.def]){this.log(`${e.name}: "..."`,'#ccc');return;}const node=DLG[e.def].start(G);G.dlg={npc:e.def,node:'start'};if(u)u.showDialogue(e,node);else{}},
 dlgChoose(e,opt){const u=this.ui();if(opt.act)opt.act(G);const nx=opt.next;if(!nx){/* action-only option (trade etc.) keeps panel unless UI replaced it */return;}if(nx==='end'){G.dlg=null;if(u)u.closeDialogue();this.act(20);return;}const node=DLG[e.def][nx](G);if(u)u.showDialogue(e,node);},
 // trade
 price(id,buying,npc){const d=ITEMS[id];const p=G.p;let v=d.val||1;const fac=NPCS[npc]?NPCS[npc].faction:null;const r=fac?(G.rep[fac]||0):0;
  if(buying){let m=1.4-r/300-this.skill('persuasion')*0.03+p.d.priceMod;if(p.cls==='streetkid')m-=0.1;if(npc==='tallow'&&G.flags.tallow_disc)m*=0.5;if(this.isNight())m+=0.1;return Math.max(1,Math.round(v*Math.max(0.4,m)));}
  let m=0.35+r/500+this.skill('persuasion')*0.03+p.d.sellMod;if(npc==='tallow'&&G.flags.tallow_disc)m+=0.15;return Math.max(1,Math.round(v*Math.min(1,m)));},
 vendorOpen(npc){if(npc==='mags'||npc==='ludo'||npc==='sable'||npc==='cantor')return true;const h=this.hour();return !(h>=22||h<6);},
 vendorStock(npc){const key='stock_'+npc+'_'+G.day;if(G.flags[key])return G.flags[key];const vd=VENDORS[NPCS[npc].vendor];const st=[];for(const id of vd.sells){if(!ITEMS[id])continue;const d=ITEMS[id];if(d.type==='chrome'&&this.chance(0.3))continue;const q=d.type==='ammo'?this.ri(12,40):d.stack?this.ri(1,4):1;st.push({id,qty:q});}if(npc==='tallow'&&this.chance(0.5))st.push({id:'powercell',qty:1});G.flags[key]=st;return st;},
 buy(npc,entry){const p=G.p;const pr=this.price(entry.id,1,npc);if(p.creds<pr){this.log('Not enough creds.','#f66');return false;}const inst=this.makeItem(entry.id,1);if(ITEMS[entry.id].clip)inst.clip=ITEMS[entry.id].clip;if(ITEMS[entry.id].wt+this.totalWeight()>p.d.carry+0.01){this.log('Too heavy.','#f66');return false;}p.creds-=pr;entry.qty--;this.addItem(inst);this.log(`Bought ${ITEMS[entry.id].name} for ${pr}.`,'#dd9');const vd=NPCS[npc].faction;if(vd)this.addRep(vd,1);return true;},
 sell(npc,inst){const p=G.p;const d=ITEMS[inst.id];const vd=VENDORS[NPCS[npc].vendor];const ok=vd.buys.includes('*')||vd.buys.includes(d.type)||vd.buys.includes(inst.id);if(!ok){this.log(`${NPCS[npc].name} doesn't want that.`,'#888');return false;}if(d.type==='quest'){if(inst.id==='ledger'&&npc==='ives'){p.creds+=400;this.removeInst(inst);G.flags.ledger_sold=1;this.addRep('halcyon',20);this.addRep('ledger',-40);this.log('Ives buys every name in the city for 400 creds. Tallow will hear.','#aef');return true;}this.log('You can\'t sell that.','#888');return false;}const pr=this.price(inst.id,0,npc);p.creds+=pr;this.removeInst(inst,1);this.log(`Sold ${d.name} for ${pr}.`,'#dd9');return true;},
 openTrade(npc,caravan){const u=this.ui();if(!caravan&&!this.vendorOpen(npc)){this.log(`${NPCS[npc].name}: "Closed. Come back in the morning."`,'#888');return;}if(u)u.openTrade(npc,caravan);},
 openInstall(kind){const u=this.ui();if(u)u.openInstall(kind);},
 installCost(id){const p=G.p;const d=ITEMS[id];let c=Math.round(d.val*0.5);if(d.type==='flesh')c=0;if(G.flags.sable_free||this.fxf('chromeDisc')===1||this.fxf('freeInstall'))c=0;else if(this.fxf('chromeDisc'))c=Math.round(c*this.fxf('chromeDisc'));return c;},
 install(inst,where){const p=G.p;const d=ITEMS[inst.id];const u=this.ui();
  if(d.type==='chrome'){const slotTaken=p.chrome.find(c=>ITEMS[c].cslot===d.cslot);if(slotTaken){this.log(`Your ${d.cslot} slot holds ${ITEMS[slotTaken].name}. Remove it first.`,'#f66');return false;}const cost=where==='self'?0:this.installCost(inst.id);if(p.creds<cost){this.log(`Install costs ${cost} creds.`,'#f66');return false;}p.creds-=cost;
   let strain=d.strain;if(this.fxf('freeInstall')&&p.chrome.length<2)strain=0;p.strain+=strain;p.chrome.push(inst.id);this.removeInst(inst);this.computeDerived();this.attention(2*p.d.attn);this.log(`${d.name} installed. Strain ${p.strain}/${p.d.strainTol}.${p.strain>p.d.strainTol?' You are over tolerance. It will glitch.':''}`,'#6ff');this.fx('glitch');this.pushAction('installed '+d.name);this.dmgPlayer(where==='self'?6:2,'surgery');this.act(200);return true;}
  if(d.type==='flesh'){let drift=d.drift;if(this.fxf('freeGraft')&&p.flesh.length===0)drift=0;p.drift+=drift;p.flesh.push(inst.id);this.removeInst(inst);this.computeDerived();this.log(`${d.name} takes. Drift ${p.drift}/${p.d.driftTol}.${p.drift>p.d.driftTol?' You are changing.':''}`,'#dbe');this.fx('glitch');this.pushAction('grafted '+d.name);this.addRep('drowned',5);this.act(200);return true;}
  return false;},
 removeChrome(id){const p=G.p;const i=p.chrome.indexOf(id);if(i<0)return;const cost=this.fxf('freeRemove')?0:100;if(p.creds<cost){this.log(`Removal costs ${cost}.`,'#f66');return;}p.creds-=cost;p.chrome.splice(i,1);p.strain=Math.max(0,p.strain-ITEMS[id].strain);this.addItem(this.makeItem(id,1));this.computeDerived();this.log(`${ITEMS[id].name} removed.`,'#6ff');this.act(200);},
 canCraft(r){const p=G.p;if(r.req&&!this.fxf(r.req))return false;if(this.skill(r.skill[0])<r.skill[1])return false;for(const [id,n] of r.in)if(!this.hasItem(id,n))return false;return true;},
 craft(r,target){const p=G.p;if(!this.canCraft(r)){this.log('Missing materials or skill.','#f66');return;}const cheap=this.fxf('cheapCraft');for(const [id,n] of r.in)this.removeItem(id,cheap&&n>1?n-1:n);
  if(r.special==='repair'){const it=target||p.eq.weapon||p.eq.body;if(it&&ITEMS[it.id].dur){it.dur=ITEMS[it.id].dur;this.log(`${ITEMS[it.id].name} repaired.`,'#dd9');}}
  else if(r.special==='mod'){const w=target||p.eq.weapon;if(!w||!ITEMS[w.id].ranged){this.log('Needs a ranged weapon equipped.','#f66');return;}w.mods=w.mods||[];if(!w.mods.includes(r.mod))w.mods.push(r.mod);this.log(`${WEAPON_MODS[r.mod].name} fitted to ${ITEMS[w.id].name}.`,'#dd9');}
  else{this.giveItem(r.out[0],r.out[1]);this.log(`Crafted ${ITEMS[r.out[0]].name}${r.out[1]>1?' x'+r.out[1]:''}.`,'#dd9');}
  this.skillUse(r.skill[0],2);this.act(150);},

 // ---------- echo ----------
 attention(n){if(this.fxf('echoImmune')&&n>0)return;G.attention=this.clamp(G.attention+n,0,100);},
 echoLine(){const p=G.p;const last=G.lastActions.length?G.lastActions[G.lastActions.length-1].toUpperCase():'WALKED';return this.rc(ECHO_MSGS).replace(/\{name\}/g,p.name.toUpperCase()).replace(/\{zone\}/g,G.zone.name.toUpperCase()).replace(/\{last\}/g,last).replace(/\{steps\}/g,p.steps);},
 echoMessage(kind){const l=this.echoLine();if(kind==='whisper')this.log('Something in the wiring says: '+l,'#ccf');else if(kind==='tile')this.log('The floor hums: '+l,'#ccf');else if(kind==='arrive')this.log('Every terminal in sight lights up at once: '+l,'#ccf');this.fx('glitch');G.flags.echo_seen=1;},
 echoTalk(){const u=this.ui();const opts=[{t:'"What are you?"',f:()=>{this.log('> '+this.rc(['A PROCESS. A CITY. A HABIT.','I AM WHAT IS LEFT WHEN THE PEOPLE LEAVE THE LIGHTS ON.','ASK THE CHOIR. THEY HAVE BETTER WORDS.']),'#ccf');this.attention(2);}},{t:'"Show me a way out."',f:()=>{const ok=this.echoRoute();this.log('> '+(ok?'THERE. '+ok.toUpperCase()+'. I MADE IT FOR YOU.':'NOT HERE. NOT YET.'),'#ccf');this.attention(3);}},{t:'"Leave me alone."',f:()=>{this.log('> '+this.rc(['I DON\'T KNOW HOW.','THAT IS NOT WHAT YOU WANT.','...']),'#ccf');this.attention(-3);}},{t:'"Where is the cache?"',f:()=>{const p=this.randomTileNear(G.p.x,G.p.y,5,12,1);if(p){this.setTile(p.x,p.y,T.CACHE);G.zone.conts[p.x+','+p.y]={kind:'night cache',items:this.rollLoot('cache',3)};this.revealArea(p.x,p.y,2);this.log('> '+this.dirTo(p).toUpperCase()+'. YOU ARE WELCOME.','#ccf');}this.attention(4);}}];if(u)u.choice('> '+this.echoLine(),opts);},
 echoRoute(){const z=G.zone,p=G.p;for(let k=0;k<30;k++){const d=this.rc(DIRS8.slice(0,4));const x=p.x+d[0]*this.ri(2,4),y=p.y+d[1]*this.ri(2,4);if(this.tile(x,y)===T.WALL&&z.bidx[y*z.w+x]>=0){const b=z.buildings[z.bidx[y*z.w+x]];const onEdge=x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1;if(onEdge){this.setTile(x,y,T.ECHO);this.revealArea(x,y,1);return this.dirTo({x,y});}}}return null;},

 // ---------- events helpers ----------
 rollEvent(){const cands=EVENTS.filter(e=>{try{return e.cond(G);}catch(err){return false;}});if(!cands.length)return;const tot=cands.reduce((s,e)=>s+e.w,0);let r=RNG.next()*tot;for(const e of cands){r-=e.w;if(r<=0){try{if(e.run(G))G.events.lastEvent=G.turn;}catch(err){console.error(err);}break;}}},
 randomStreetTile(minD){const z=G.zone;for(let k=0;k<60;k++){const x=this.ri(1,z.w-2),y=this.ri(1,z.h-2);const t=this.tile(x,y);if((t===T.STREET||t===T.SIDEWALK||(z.kind==='tunnel'&&t===T.FLOOR&&z.bidx[y*z.w+x]<0))&&this.dist(x,y,G.p.x,G.p.y)>=minD&&!this.entAt(x,y)&&!this.inSafe(x,y))return{x,y};}return null;},
 randomTileNear(px,py,minD,maxD,noEnt){for(let k=0;k<60;k++){const x=px+this.ri(-maxD,maxD),y=py+this.ri(-maxD,maxD);const dd=this.dist(x,y,px,py);if(dd<minD||dd>maxD)continue;if(!this.walkable(x,y)||this.tile(x,y)===T.DEEP)continue;if(this.entAt(x,y))continue;if(this.inSafe(x,y))continue;if(this.tile(x,y)===T.EXIT)continue;return{x,y};}return null;},
 dirTo(p){const dx=p.x-G.p.x,dy=p.y-G.p.y;let s='';if(Math.abs(dy)>Math.abs(dx)/2)s+=dy<0?'north':'south';if(Math.abs(dx)>Math.abs(dy)/2)s+=dx<0?'west':'east';return s||'here';},
 zoneObj(x,y,o){o.x=x;o.y=y;o.exp=G.turn+150;G.zone.objs.push(o);G.zone.seen[y*G.zone.w+x]=1;},
 collapseAt(x,y){const z=G.zone;for(let j=y-1;j<=y+1;j++)for(let i=x-1;i<=x+1;i++){if(i===G.p.x&&j===G.p.y)continue;const t=this.tile(i,j);if(t===T.STREET||t===T.SIDEWALK||t===T.FLOOR)this.setTile(i,j,this.chance(0.6)?T.RUBBLE:T.WALL);const e=this.entAt(i,j);if(e)this.damage(e,this.ri(5,12),'rubble');}if(this.dist(x,y,G.p.x,G.p.y)<=1)this.dmgPlayer(this.ri(3,8),'falling rubble');},
 igniteAt(x,y,r){const z=G.zone;z.fires=z.fires||[];for(let j=y-r+1;j<=y+r-1;j++)for(let i=x-r+1;i<=x+r-1;i++){if(this.dist(i,j,x,y)>=r)continue;const t=this.tile(i,j);if(t===T.FLOOR||t===T.STREET||t===T.SIDEWALK||t===T.RUBBLE||t===T.MOSS||t===T.GRAFFITI||t===T.CHAIR){Gen.set(z,i,j,T.FIRE);z.fires.push({x:i,y:j,t:this.ri(20,40)});const e=this.entAt(i,j);if(e){this.damage(e,this.ri(4,8),'fire');e.st.burning=5;}}}this.recomputeLight();},
 toxicAt(x,y,r,t){const z=G.zone;z.tox=z.tox||[];for(let j=y-r;j<=y+r;j++)for(let i=x-r;i<=x+r;i++){if(this.dist(i,j,x,y)>r)continue;const tt=this.tile(i,j);if(tt===T.FLOOR||tt===T.MOSS||tt===T.STREET){Gen.set(z,i,j,T.TOXIC);z.tox.push({x:i,y:j,t:t||20});}}},
 jamPulse(r,turns){let n=0;for(const e of G.zone.ents){if(e.kind!=='e')continue;const d=ENEMIES[e.def];if(this.dist(e.x,e.y,G.p.x,G.p.y)<=r&&(d.tags.includes('machine')||d.tags.includes('chromed')||d.tags.includes('echo'))){e.st.jammed=Math.max(e.st.jammed||0,turns);n++;if(this.fxf('jamDmg'))this.damage(e,this.ri(5,10),'overload');}}this.log(n?`${n} target${n>1?'s':''} go dark.`:'Nothing nearby to jam.','#f9f');this.fx('glitch');},
 describeEnt(e){const d=ENEMIES[e.def];const f=FACTIONS[e.fac];return `${e.name}${d.tags.includes('boss')?' [BOSS]':d.tags.includes('elite')?' [elite]':''} — ${d.desc} HP ${e.hp}/${e.maxhp}, armor ${d.arm}. ${f?f.short+'.':''} ${this.isHostile(e)?'Hostile.':'Not hostile.'}`;}
};
