'use strict';
// ============================================================
// PROCEDURAL GENERATION — zones, buildings, tunnels, the mall,
// prefabs, exits, populations. Deterministic from G.seed.
// ============================================================
const RNG={s:1,seed(n){this.s=(n>>>0)||1;},next(){let t=this.s+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;},
 ri(a,b){return a+Math.floor(this.next()*(b-a+1));},rc(a){return a[Math.floor(this.next()*a.length)];},chance(p){return this.next()<p;},shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}};

const Gen={
 W:63,H:45,
 newZone(id){const d=ZONES[id];const w=this.W,h=this.H;return{id,w,h,kind:d.kind,t:new Array(w*h).fill(T.VOID),seen:new Array(w*h).fill(0),bidx:new Array(w*h).fill(-1),buildings:[],conts:{},ents:[],items:[],exits:[],objs:[],terms:{},locked:{},lit:null,blackout:0,lastVisit:-1,visited:0,traps:[],nextId:1,spawned:0};},
 idx(z,x,y){return y*z.w+x;},
 get(z,x,y){if(x<0||y<0||x>=z.w||y>=z.h)return T.VOID;return z.t[y*z.w+x];},
 set(z,x,y,t){if(x<0||y<0||x>=z.w||y>=z.h)return;z.t[y*z.w+x]=t;},
 fill(z,t){z.t.fill(t);},
 rect(z,x,y,w,h,t){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)this.set(z,i,j,t);},
 walk(z,x,y){const t=this.get(z,x,y);return TILE_DEFS[t]&&TILE_DEFS[t].w;},

 // ---------- master ----------
 generate(id){const z=this.newZone(id);const d=ZONES[id];z.name=d.name;
  if(d.kind==='street'||d.kind==='static'||d.kind==='docks')this.genStreet(z,d);
  else if(d.kind==='tunnel')this.genTunnel(z,d);
  else if(d.kind==='mall')this.genMall(z,d);
  if(d.kind==='static')this.glitch(z);
  this.placeExits(z,d);
  this.decorate(z,d);
  this.populate(z,d);
  return z;},

 // ---------- street grid ----------
 genStreet(z,d){const cols=[0,15,30,45,60],rows=d.kind==='docks'?[0,14,28]:[0,14,28,42];this.fill(z,T.STREET);
  const blocks=[];for(let ci=0;ci<4;ci++)for(let ri=0;ri<rows.length-1;ri++){const bx=cols[ci]+3,by=rows[ri]+3,bw=12,bh=11;blocks.push({ci,ri,x:bx,y:by,w:bw,h:bh,used:0});}
  if(d.kind==='docks'){for(let y=31;y<z.h;y++)for(let x=0;x<z.w;x++)this.set(z,x,y,y>=34?T.DEEP:T.WATER);for(let x=0;x<z.w;x++)this.set(z,x,31,T.SIDEWALK);
   for(const px of [8,24,40,54]){for(let y=31;y<41;y++)this.set(z,px,y,T.PIER);for(let y=31;y<41;y++)if(y%3===0)this.set(z,px+1,y,T.PIER);}}
  // prefabs first, big ones need two horizontal blocks
  const prefabs=RNG.shuffle(d.prefabs.slice());const plist=[];
  for(const pid of prefabs){const pf=PREFABS[pid];let placed=false;const order=RNG.shuffle(blocks.filter(b=>!b.used));
   for(const b of order){if(pf.big){const nb=blocks.find(o=>o.ri===b.ri&&o.ci===b.ci+1&&!o.used);if(!nb)continue;b.used=nb.used=1;this.rect(z,b.x+bw_(b),b.y,3,b.h,T.SIDEWALK);const bld=this.genBuilding(z,b.x+1,b.y+1,26,9,pf.btype,pf.name,pid);placed=true;plist.push(bld);break;}
    else{b.used=1;const bld=this.genBuilding(z,b.x+1,b.y+1,10,9,pf.btype,pf.name,pid);placed=true;plist.push(bld);break;}}
   if(!placed){/* fallback: overwrite any block */const b=RNG.rc(blocks);b.used=1;plist.push(this.genBuilding(z,b.x+1,b.y+1,10,9,pf.btype,pf.name,pid));}}
  function bw_(b){return b.w;}
  // remaining blocks
  const types=Object.entries(d.btypes);const tot=types.reduce((s,t)=>s+t[1],0);
  for(const b of blocks){if(b.used)continue;let r=RNG.next()*tot,ty='lot';for(const [k,v] of types){r-=v;if(r<=0){ty=k;break;}}
   if(ty==='lot'){this.genLot(z,b);}else if(ty==='static'){const bld=this.genBuilding(z,b.x+1,b.y+1,10,9,'static','Repeating Building');}
   else{const w=RNG.ri(7,10),h=RNG.ri(6,9);const ox=RNG.ri(0,10-w),oy=RNG.ri(0,9-h);this.genBuilding(z,b.x+1+ox,b.y+1+oy,w,h,ty,this.bname(ty));}}
  // sidewalk rings
  for(const b of blocks){for(let i=b.x;i<b.x+b.w;i++){if(this.get(z,i,b.y)===T.STREET)this.set(z,i,b.y,T.SIDEWALK);if(this.get(z,i,b.y+b.h-1)===T.STREET)this.set(z,i,b.y+b.h-1,T.SIDEWALK);}
   for(let j=b.y;j<b.y+b.h;j++){if(this.get(z,b.x,j)===T.STREET)this.set(z,b.x,j,T.SIDEWALK);if(this.get(z,b.x+b.w-1,j)===T.STREET)this.set(z,b.x+b.w-1,j,T.SIDEWALK);}
   // lamps at corners
   if(RNG.chance(0.5))this.set(z,b.x,b.y,T.LAMP);if(RNG.chance(0.3))this.set(z,b.x+b.w-1,b.y+b.h-1,T.LAMP);}
  // street clutter
  const n=RNG.ri(10,18);for(let i=0;i<n;i++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);if(this.get(z,x,y)===T.STREET){const r=RNG.next();this.set(z,x,y,r<0.5?T.CAR:r<0.8?T.RUBBLE:T.BARRICADE);}}
  const g=RNG.ri(6,10);for(let i=0;i<g;i++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);if(this.get(z,x,y)===T.SIDEWALK)this.set(z,x,y,RNG.chance(0.6)?T.GRAFFITI:T.SIGN);}
  if(d.kind!=='docks'){const trees=RNG.ri(2,5);for(let i=0;i<trees;i++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);if(this.get(z,x,y)===T.SIDEWALK)this.set(z,x,y,T.TREE);}}
  // keep the central street lanes clear so exits connect: ensure lanes are walkable
  for(const c of cols){for(let y=0;y<z.h;y++){const t=this.get(z,c+1,y);if(t===T.CAR||t===T.BARRICADE)this.set(z,c+1,y,T.STREET);}}
  for(const r of rows){for(let x=0;x<z.w;x++){const t=this.get(z,x,r+1);if(t===T.CAR||t===T.BARRICADE)this.set(z,x,r+1,T.STREET);}}
 },
 bname(ty){const names={apartment:['Delacroix Apartments','Rowhouse','Tenement','Walk-up','Housing Block','Apartments','Boarding House'],shop:['Corner Store','Bodega','Pawn Shop','Laundromat','Pharmacy','Noodle Bar','Liquor Store'],clinic:['Free Clinic','Dental Office'],police:['Precinct Substation','Security Office','Checkpoint'],maint:['Utility Station','Substation','Pump House','Maintenance Depot'],office:['Office Block','Insurance Office','Law Office','Call Center'],server:['Data Center','Exchange','Server Farm'],warehouse:['Warehouse','Storage','Depot','Freight Terminal'],factory:['Assembly Plant','Foundry','Machine Shop','Press Works'],garage:['Auto Garage','Bus Depot','Body Shop'],corp:['Halcyon Annex','Corporate Suite','Executive Offices'],chapel:['Chapel','Shrine'],gang:['Clubhouse'],static:['Repeating Building'],dock:['Boathouse']};return RNG.rc(names[ty]||['Building']);},
 genLot(z,b){for(let j=b.y+1;j<b.y+b.h-1;j++)for(let i=b.x+1;i<b.x+b.w-1;i++){const r=RNG.next();this.set(z,i,j,r<0.35?T.RUBBLE:r<0.45?T.WALL:r<0.5?T.CAR:r<0.53?T.TREE:T.FLOOR);}
  if(RNG.chance(0.4)){const x=b.x+RNG.ri(2,b.w-3),y=b.y+RNG.ri(2,b.h-3);this.set(z,x,y,T.FIRE);}},

 // ---------- buildings ----------
 genBuilding(z,x,y,w,h,type,name,prefab){const bld={x,y,w,h,type,name,prefab:prefab||null,rooms:[],id:z.buildings.length,doors:[]};z.buildings.push(bld);
  this.rect(z,x,y,w,h,T.WALL);this.rect(z,x+1,y+1,w-2,h-2,T.FLOOR);
  for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)z.bidx[j*z.w+i]=bld.id;
  const pf=prefab?PREFABS[prefab]:null;
  if(pf&&(pf.btype==='chapel'&&prefab==='flooded'||prefab==='foodcourt'||prefab==='hangar')){bld.rooms.push({x:x+1,y:y+1,w:w-2,h:h-2});}
  else this.bsp(z,bld,x+1,y+1,w-2,h-2,0);
  // exterior doors: 1-2 on walls whose outside is walkable
  const cand=[];for(let i=x+1;i<x+w-1;i++){if(this.walk(z,i,y-1))cand.push([i,y]);if(this.walk(z,i,y+h))cand.push([i,y+h-1]);}
  for(let j=y+1;j<y+h-1;j++){if(this.walk(z,x-1,j))cand.push([x,j]);if(this.walk(z,x+w,j))cand.push([x+w-1,j]);}
  RNG.shuffle(cand);const nd=Math.min(cand.length,pf&&pf.locked?1:RNG.ri(1,2));
  const lockedExt=pf&&pf.locked;
  for(let k=0;k<nd;k++){const [dx,dy]=cand[k];const inside=this.insideOf(z,bld,dx,dy);if(!inside)continue;const it=this.get(z,inside[0],inside[1]);if(it!==T.FLOOR){if(it===T.WALL&&!(inside[0]<=x||inside[0]>=x+w-1||inside[1]<=y||inside[1]>=y+h-1))this.set(z,inside[0],inside[1],T.FLOOR);else continue;}this.set(z,dx,dy,lockedExt?T.DOOR_LOCKED:T.DOOR);bld.doors.push([dx,dy]);if(lockedExt)z.locked[dx+','+dy]={key:lockedExt===1?null:lockedExt,diff:6,bld:bld.id};}
  if(!bld.doors.length&&cand.length){for(const [dx,dy] of cand){const inside=this.insideOf(z,bld,dx,dy);if(!inside)continue;if(this.get(z,inside[0],inside[1])!==T.FLOOR)this.set(z,inside[0],inside[1],T.FLOOR);this.set(z,dx,dy,T.DOOR);bld.doors.push([dx,dy]);break;}}
  // windows
  for(let i=x+1;i<x+w-1;i++){for(const yy of [y,y+h-1])if(this.get(z,i,yy)===T.WALL&&RNG.chance(0.22))this.set(z,i,yy,T.WINDOW);}
  for(let j=y+1;j<y+h-1;j++){for(const xx of [x,x+w-1])if(this.get(z,xx,j)===T.WALL&&RNG.chance(0.22))this.set(z,xx,j,T.WINDOW);}
  this.furnish(z,bld,pf);
  return bld;},
 insideOf(z,b,dx,dy){if(dy===b.y)return[dx,dy+1];if(dy===b.y+b.h-1)return[dx,dy-1];if(dx===b.x)return[dx+1,dy];if(dx===b.x+b.w-1)return[dx-1,dy];return null;},
 bsp(z,bld,x,y,w,h,depth){const canH=w>=9,canV=h>=7;
  if((!canH&&!canV)||depth>3||(depth>0&&RNG.chance(0.2))){bld.rooms.push({x,y,w,h});return;}
  if(canH&&(!canV||w>h*1.4||RNG.chance(0.5))){const sx=RNG.ri(x+3,x+w-4);for(let j=y;j<y+h;j++)this.set(z,sx,j,T.WALL);this.bsp(z,bld,x,y,sx-x,h,depth+1);this.bsp(z,bld,sx+1,y,x+w-sx-1,h,depth+1);
   const ys=RNG.shuffle(Array.from({length:h},(_,i)=>y+i));for(const j of ys){if(this.get(z,sx-1,j)===T.FLOOR&&this.get(z,sx+1,j)===T.FLOOR){this.set(z,sx,j,T.DOOR);break;}}}
  else{const sy=RNG.ri(y+2,y+h-3);for(let i=x;i<x+w;i++)this.set(z,i,sy,T.WALL);this.bsp(z,bld,x,y,w,sy-y,depth+1);this.bsp(z,bld,x,sy+1,w,y+h-sy-1,depth+1);
   const xs=RNG.shuffle(Array.from({length:w},(_,i)=>x+i));for(const i of xs){if(this.get(z,i,sy-1)===T.FLOOR&&this.get(z,i,sy+1)===T.FLOOR){this.set(z,i,sy,T.DOOR);break;}}}},
 // floor tiles in a room not adjacent to a door
 roomFloor(z,r,wallAdj){const out=[];for(let j=r.y;j<r.y+r.h;j++)for(let i=r.x;i<r.x+r.w;i++){if(this.get(z,i,j)!==T.FLOOR)continue;let nearDoor=false,nearWall=false;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const t=this.get(z,i+dx,j+dy);if(t===T.DOOR||t===T.DOOR_OPEN||t===T.DOOR_LOCKED)nearDoor=true;if(t===T.WALL||t===T.WINDOW)nearWall=true;}if(nearDoor)continue;if(wallAdj&&!nearWall)continue;out.push([i,j]);}return out;},
 // largest connected component of walkable tiles inside a room bbox, plus the total walkable count
 roomLargestComponent(z,r){const w=r.w,h=r.h;const grid=new Uint8Array(w*h);let total=0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){if(this.walk(z,r.x+i,r.y+j)){grid[j*w+i]=1;total++;}}
  const seen=new Uint8Array(w*h);let best=0;
  for(let s=0;s<w*h;s++){if(!grid[s]||seen[s])continue;let cnt=0;const st=[s];seen[s]=1;
   while(st.length){const c=st.pop();cnt++;const cx=c%w,cy=(c/w)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;if(grid[ni]&&!seen[ni]){seen[ni]=1;st.push(ni);}}}
   if(cnt>best)best=cnt;}
  return {total,best};},
 putTiles(z,bld,tile,n,wallAdj,kind){let placed=0;const rooms=RNG.shuffle(bld.rooms.slice());for(let k=0;k<n*4&&placed<n;k++){const r=rooms[k%rooms.length];const c=this.roomFloor(z,r,wallAdj);if(!c.length)continue;const [i,j]=RNG.rc(c);
   // never seal off part of the room: placing a non-walkable furniture tile must not fragment the room's floor
   if(!TILE_DEFS[tile].w){const before=this.roomLargestComponent(z,r);this.set(z,i,j,tile);const after=this.roomLargestComponent(z,r);
    if(after.best<before.total-1){this.set(z,i,j,T.FLOOR);continue;}
    if(kind)z.conts[i+','+j]={kind,items:[],bld:bld.id};placed++;continue;}
   this.set(z,i,j,tile);if(kind)z.conts[i+','+j]={kind,items:[],bld:bld.id};placed++;}return placed;},
 furnish(z,bld,pf){const type=pf?(pf.lootType||pf.btype):bld.type;const lootType=pf&&pf.lootType?pf.lootType:type;
  // containers
  const nC=pf?RNG.ri(2,4):Math.max(1,Math.round(bld.rooms.length*RNG.ri(6,12)/10));
  const kinds=CONTAINER_KINDS[lootType]||['box'];
  const ctile=lootType==='warehouse'||lootType==='factory'||lootType==='dock'?T.CRATE:lootType==='shop'?T.SHELF:T.CONTAINER;
  this.putTiles(z,bld,ctile,nC,true,null);
  for(const k in z.conts){}
  for(let j=bld.y;j<bld.y+bld.h;j++)for(let i=bld.x;i<bld.x+bld.w;i++){const t=this.get(z,i,j);if((t===T.CONTAINER||t===T.CRATE||t===T.SHELF)&&!z.conts[i+','+j])z.conts[i+','+j]={kind:RNG.rc(kinds),items:[],loot:lootType,bld:bld.id};}
  // flavor
  if(!pf){if(type==='apartment'){this.putTiles(z,bld,T.BED,RNG.ri(1,2),true);this.putTiles(z,bld,T.CHAIR,RNG.ri(1,3),false);if(RNG.chance(0.3))this.putTiles(z,bld,T.GRAFFITI,1,false);}
   if(type==='office'||type==='corp'){this.putTiles(z,bld,T.TERMINAL,RNG.ri(1,2),true);this.putTiles(z,bld,T.CHAIR,RNG.ri(2,4),false);this.putTiles(z,bld,T.TABLE,1,false);}
   if(type==='server'){this.putTiles(z,bld,T.SERVER,RNG.ri(2,4),true);this.putTiles(z,bld,T.TERMINAL,1,true);}
   if(type==='shop'){this.putTiles(z,bld,T.COUNTER,1,false);if(RNG.chance(0.5))this.putTiles(z,bld,T.VENDING,1,true,'vending');}
   if(type==='maint'||type==='factory'||type==='garage'){this.putTiles(z,bld,T.PIPE,RNG.ri(1,3),true);if(RNG.chance(0.5))this.putTiles(z,bld,T.BENCH,1,true);if(type==='factory')this.putTiles(z,bld,T.GENERATOR,1,true);}
   if(type==='clinic'||type==='hospital'){this.putTiles(z,bld,T.BED,RNG.ri(2,3),true);}
   if(type==='police'){this.putTiles(z,bld,T.TERMINAL,1,true);if(RNG.chance(0.4)){const d=bld.doors[0];}}
   if(type==='static'){this.putTiles(z,bld,T.ECHO,RNG.ri(1,3),false);this.putTiles(z,bld,T.TERMINAL,RNG.ri(1,2),true);}
   if(type==='warehouse'){this.putTiles(z,bld,T.CRATE,2,false);for(let j=bld.y;j<bld.y+bld.h;j++)for(let i=bld.x;i<bld.x+bld.w;i++)if(this.get(z,i,j)===T.CRATE&&!z.conts[i+','+j])z.conts[i+','+j]={kind:'crate',items:[],loot:'warehouse',bld:bld.id};}
   if(RNG.chance(0.15))this.putTiles(z,bld,T.TERMINAL,1,true);
   // occasional locked interior door hiding better loot
   if(RNG.chance(0.25)){for(let j=bld.y+1;j<bld.y+bld.h-1;j++)for(let i=bld.x+1;i<bld.x+bld.w-1;i++)if(this.get(z,i,j)===T.DOOR&&RNG.chance(0.5)){this.set(z,i,j,T.DOOR_LOCKED);z.locked[i+','+j]={diff:RNG.ri(2,5),bld:bld.id};j=999;break;}}
  } else {
   const tl=pf.tiles||{};const map={bed:T.BED,counter:T.COUNTER,chair:T.CHAIR,lamp:T.LAMP,graffiti:T.GRAFFITI,stall:T.STALL,bench:T.BENCH,docchair:T.DOCCHAIR,terminal:T.TERMINAL,table:T.TABLE,crate:T.CRATE,altar:T.ALTAR,moss:T.MOSS,train:T.TRAIN,switch:T.SWITCH,rail:T.RAIL,generator:T.GENERATOR,server:T.SERVER,helipad:T.HELIPAD,boat:T.BOAT,water:T.WATER,echo:T.ECHO,heart:T.HEART};
   for(const k in tl){const tile=map[k];if(tile===undefined)continue;const wallAdj=[T.COUNTER,T.STALL,T.BENCH,T.TERMINAL,T.SERVER,T.GENERATOR,T.SWITCH,T.DOCCHAIR,T.ALTAR,T.TRAIN,T.LAMP,T.BOAT].includes(tile);
    if(tile===T.CRATE){this.putTiles(z,bld,tile,tl[k],true);for(let j=bld.y;j<bld.y+bld.h;j++)for(let i=bld.x;i<bld.x+bld.w;i++)if(this.get(z,i,j)===T.CRATE&&!z.conts[i+','+j])z.conts[i+','+j]={kind:'crate',items:[],loot:lootType,bld:bld.id};}
    else if(tile===T.HELIPAD||tile===T.HEART){const r=bld.rooms.reduce((a,b)=>a.w*a.h>b.w*b.h?a:b);const cx=Math.floor(r.x+r.w/2),cy=Math.floor(r.y+r.h/2);this.set(z,cx,cy,tile);}
    else this.putTiles(z,bld,tile,tl[k],wallAdj);}
   bld.safe=pf.safe||0;
   if(pf.lockedRoom){// lock the room that has a container, put guaranteed loot there
    const rooms=bld.rooms.filter(r=>r.w*r.h>=6);const r=RNG.rc(rooms);let doorFound=false;for(let j=r.y-1;j<=r.y+r.h&&!doorFound;j++)for(let i=r.x-1;i<=r.x+r.w&&!doorFound;i++){if(this.get(z,i,j)===T.DOOR){this.set(z,i,j,T.DOOR_LOCKED);z.locked[i+','+j]={diff:5,bld:bld.id};doorFound=true;}}
    bld.lockedRoom=r;}
   if(pf.locked&&pf.locked!==1){// keycard doors: also make windows solid walls
    for(let j=bld.y;j<bld.y+bld.h;j++)for(let i=bld.x;i<bld.x+bld.w;i++)if(this.get(z,i,j)===T.WINDOW)this.set(z,i,j,T.WALL);}
   bld.lootGuar=pf.lootGuar||null;
  }
  // graffiti/signs inside sometimes
  if(RNG.chance(0.2))this.putTiles(z,bld,T.GRAFFITI,1,false);},

 // ---------- tunnels ----------
 genTunnel(z,d){this.fill(z,T.WALL);const rooms=[];let tries=0;
  while(rooms.length<10&&tries++<300){const w=RNG.ri(6,12),h=RNG.ri(4,8),x=RNG.ri(2,z.w-w-3),y=RNG.ri(2,z.h-h-3);
   if(rooms.some(r=>x<r.x+r.w+3&&x+w+3>r.x&&y<r.y+r.h+3&&y+h+3>r.y))continue;rooms.push({x,y,w,h});}
  rooms.sort((a,b)=>a.x-b.x);
  const prefabs=RNG.shuffle(d.prefabs.slice());
  rooms.forEach((r,i)=>{const pid=prefabs[i];const pf=pid?PREFABS[pid]:null;const type=pf?pf.btype:RNG.rc(['maint','maint','warehouse','scav','chapel']);const name=pf?pf.name:RNG.rc(['Pump Chamber','Storm Drain Junction','Sluice','Cistern','Old Platform','Cable Vault','Drowned Den','Bindle Camp']);
   const bld=this.genBuilding(z,r.x,r.y,r.w,r.h,type,name,pid);r.bld=bld;});
  const link=(a,b)=>{const ax=Math.floor(a.x+a.w/2),ay=Math.floor(a.y+a.h/2),bx=Math.floor(b.x+b.w/2),by=Math.floor(b.y+b.h/2);const wide=RNG.chance(0.4);
   const carve=(x,y)=>{if(z.bidx[y*z.w+x]>=0){const t=this.get(z,x,y);if(t===T.WALL){/* punch a door into building wall */const bl=z.buildings[z.bidx[y*z.w+x]];const onEdge=(x===bl.x||x===bl.x+bl.w-1||y===bl.y||y===bl.y+bl.h-1);if(onEdge)this.set(z,x,y,T.DOOR);else this.set(z,x,y,T.FLOOR);}return;}this.set(z,x,y,T.FLOOR);if(wide&&z.bidx[(y+1)*z.w+x]<0&&y+1<z.h-1)this.set(z,x,y+1,T.FLOOR);};
   if(RNG.chance(0.5)){for(let x=Math.min(ax,bx);x<=Math.max(ax,bx);x++)carve(x,ay);for(let y=Math.min(ay,by);y<=Math.max(ay,by);y++)carve(bx,y);}
   else{for(let y=Math.min(ay,by);y<=Math.max(ay,by);y++)carve(ax,y);for(let x=Math.min(ax,bx);x<=Math.max(ax,bx);x++)carve(x,by);}};
  for(let i=0;i<rooms.length-1;i++)link(rooms[i],rooms[i+1]);for(let k=0;k<3;k++)link(RNG.rc(rooms),RNG.rc(rooms));
  // fix: doors on corner/wall that aren't reachable -> any door whose both sides aren't walkable becomes wall... fine, and make sure each building has an entrance
  for(const b of z.buildings){let ok=false;for(let j=b.y;j<b.y+b.h;j++)for(let i=b.x;i<b.x+b.w;i++){const t=this.get(z,i,j);if((t===T.DOOR||t===T.DOOR_LOCKED)&&(i===b.x||i===b.x+b.w-1||j===b.y||j===b.y+b.h-1)){const o=this.outsideOf(b,i,j);if(this.walk(z,o[0],o[1]))ok=true;}}
   if(!ok){// carve a corridor from a random wall tile outward to nearest floor
    const side=RNG.ri(0,3);let dx=side===0?b.x+Math.floor(b.w/2):side===1?b.x+Math.floor(b.w/2):side===2?b.x:b.x+b.w-1,dy=side===0?b.y:side===1?b.y+b.h-1:b.y+Math.floor(b.h/2);const dir=side===0?[0,-1]:side===1?[0,1]:side===2?[-1,0]:[1,0];this.set(z,dx,dy,T.DOOR);let x=dx+dir[0],y=dy+dir[1];let n=0;while(n++<40&&x>0&&y>0&&x<z.w-1&&y<z.h-1&&!this.walk(z,x,y)){this.set(z,x,y,T.FLOOR);x+=dir[0];y+=dir[1];}}}
  // water, grates, pipes, toxic
  for(let k=0;k<12;k++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);if(this.get(z,x,y)===T.FLOOR&&z.bidx[y*z.w+x]<0){const r=RNG.next();const tt=r<0.5?T.WATER:r<0.8?T.GRATE:T.TOXIC;this.set(z,x,y,tt);if(tt===T.WATER)for(const [ox,oy] of [[1,0],[0,1],[-1,0]])if(this.get(z,x+ox,y+oy)===T.FLOOR&&RNG.chance(0.6))this.set(z,x+ox,y+oy,T.WATER);}}
  for(let k=0;k<20;k++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);if(this.get(z,x,y)===T.WALL&&z.bidx[y*z.w+x]<0&&(this.walk(z,x+1,y)||this.walk(z,x-1,y)||this.walk(z,x,y+1)||this.walk(z,x,y-1)))this.set(z,x,y,T.PIPE);}
  for(let k=0;k<6;k++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);if(this.get(z,x,y)===T.FLOOR&&z.bidx[y*z.w+x]<0)this.set(z,x,y,T.GRAFFITI);}
  // moss around chapel / nest
  for(const b of z.buildings)if(b.prefab==='chapel'||b.prefab==='nest')for(let j=b.y-2;j<b.y+b.h+2;j++)for(let i=b.x-2;i<b.x+b.w+2;i++)if(this.get(z,i,j)===T.FLOOR&&z.bidx[j*z.w+i]<0&&RNG.chance(0.5))this.set(z,i,j,T.MOSS);
  // platform: rails
  const plat=z.buildings.find(b=>b.prefab==='platform');if(plat){for(let i=plat.x+1;i<plat.x+plat.w-1;i++)if(this.get(z,i,plat.y+plat.h-2)===T.FLOOR)this.set(z,i,plat.y+plat.h-2,T.RAIL);}
 },
 outsideOf(b,dx,dy){if(dy===b.y)return[dx,dy-1];if(dy===b.y+b.h-1)return[dx,dy+1];if(dx===b.x)return[dx-1,dy];return[dx+1,dy];},

 // ---------- mall ----------
 genMall(z,d){this.fill(z,T.STREET);
  for(let x=0;x<z.w;x++){this.set(z,x,3,T.SIDEWALK);this.set(z,x,41,T.SIDEWALK);}for(let y=3;y<=41;y++){this.set(z,3,y,T.SIDEWALK);this.set(z,59,y,T.SIDEWALK);}
  this.rect(z,4,4,55,37,T.WALL);this.rect(z,5,5,53,35,T.FLOOR);// interior floor = corridors
  const quads=[{x:7,y:7,w:22,h:13,pf:'security'},{x:34,y:7,w:22,h:13,pf:null,type:'shop'},{x:7,y:25,w:22,h:13,pf:'foodcourt'},{x:34,y:25,w:22,h:13,pf:'loading'}];
  const parkingDone=false;
  for(const q of quads){const pf=q.pf?PREFABS[q.pf]:null;if(pf){this.genBuilding(z,q.x,q.y,q.w,q.h,pf.btype,pf.name,q.pf);}
   else{// split into 3 storefronts
    const names=['Vesper Optics','Drift Apparel','Chrome & Bone Ripper (closed)','Halcyon Wellness Kiosk','Big Bite Burgers','ArcadeZone','Pharmacy','Book Nook'];const ws=[7,7,8];let cx=q.x;const types=['shop','clinic','shop'];for(let i=0;i<3;i++){this.genBuilding(z,cx,q.y,ws[i],q.h,types[i],RNG.rc(names));cx+=ws[i];}}}
  // mall entrances at corridor ends
  for(const [x,y] of [[31,4],[31,40],[4,22],[58,22]]){this.set(z,x,y,T.DOOR_OPEN);}
  // corridor furniture / kiosks
  for(let k=0;k<14;k++){const x=RNG.ri(6,56),y=RNG.ri(6,38);if(this.get(z,x,y)===T.FLOOR&&z.bidx[y*z.w+x]<0){const r=RNG.next();this.set(z,x,y,r<0.3?T.STALL:r<0.5?T.RUBBLE:r<0.65?T.VENDING:r<0.8?T.GLASS:T.CHAIR);if(this.get(z,x,y)===T.VENDING||this.get(z,x,y)===T.STALL)z.conts[x+','+y]={kind:this.get(z,x,y)===T.VENDING?'vending':'kiosk',items:[],loot:'shop'};}}
  for(let k=0;k<6;k++){const x=RNG.ri(6,56),y=RNG.ri(6,38);if(this.get(z,x,y)===T.FLOOR&&z.bidx[y*z.w+x]<0)this.set(z,x,y,RNG.chance(0.5)?T.GRAFFITI:T.SIGN);}
  // lamps in corridors (emergency lighting)
  for(const [x,y] of [[30,6],[32,38],[6,21],[56,23],[30,21],[32,23]])if(this.get(z,x,y)===T.FLOOR)this.set(z,x,y,T.LAMP);
  // parking structure on outer ring west: cars
  for(let k=0;k<8;k++){const x=RNG.ri(0,2),y=RNG.ri(4,40);if(this.get(z,x,y)===T.STREET&&x!==1)this.set(z,x,y,T.CAR);}
  // the big drain to the Sump: a grate in the loading dock
  const ld=z.buildings.find(b=>b.prefab==='loading');if(ld){const c=this.roomFloor(z,ld.rooms[0],true);if(c.length){const [i,j]=RNG.rc(c);this.set(z,i,j,T.GRATE);}}
 },

 // ---------- the static: glitch pass ----------
 glitch(z){for(let k=0;k<3;k++){const w=RNG.ri(5,9),h=RNG.ri(4,7),sx=RNG.ri(1,z.w-w-2),sy=RNG.ri(1,z.h-h-2),dx=RNG.ri(1,z.w-w-2),dy=RNG.ri(1,z.h-h-2);
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){const t=this.get(z,sx+i,sy+j);if(t===T.EXIT||t===T.GATE||t===T.HEART)continue;const dt=this.get(z,dx+i,dy+j);if(dt===T.EXIT||dt===T.GATE||dt===T.HEART||dt===T.ALTAR)continue;if(z.conts[(dx+i)+','+(dy+j)])continue;this.set(z,dx+i,dy+j,t);if(z.conts[(sx+i)+','+(sy+j)])z.conts[(dx+i)+','+(dy+j)]={kind:'thing',items:[],loot:'static'};}}
  for(let k=0;k<22;k++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);const t=this.get(z,x,y);if(t===T.STREET||t===T.SIDEWALK||t===T.FLOOR)this.set(z,x,y,T.ECHO);}
  for(let k=0;k<12;k++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);if(this.get(z,x,y)===T.WALL&&RNG.chance(0.5))this.set(z,x,y,T.GLASS);}
  // ensure the central lanes are still walkable
  for(const c of [1,16,31,46,61])for(let y=0;y<z.h;y++)if(!this.walk(z,c,y)&&z.bidx[y*z.w+c]<0)this.set(z,c,y,T.STREET);
  for(const r of [1,15,29,43])for(let x=0;x<z.w;x++)if(!this.walk(z,x,r)&&z.bidx[r*z.w+x]<0)this.set(z,x,r,T.STREET);
  // heart: its door needs the shards
  const heart=z.buildings.find(b=>b.prefab==='heart');if(heart){for(const [dx,dy] of heart.doors){this.set(z,dx,dy,T.DOOR_LOCKED);z.locked[dx+','+dy]={key:'shard3',diff:99,bld:heart.id};}
   for(let j=heart.y;j<heart.y+heart.h;j++)for(let i=heart.x;i<heart.x+heart.w;i++){if(this.get(z,i,j)===T.WINDOW)this.set(z,i,j,T.WALL);const t=this.get(z,i,j);if(t===T.DOOR&&!(heart.doors.some(d=>d[0]===i&&d[1]===j)))this.set(z,i,j,T.FLOOR);}}
 },

 // ---------- exits ----------
 placeExits(z,d){const conns=CONNECTIONS.filter(c=>(c[0]===z.id||c[1]===z.id)&&!Game.connRemoved(c));const byEdge={N:[],S:[],W:[],E:[]};
  for(const c of conns){const me=c[0]===z.id?0:1;const edge=me===0?c[2]:c[3];const to=me===0?c[1]:c[0];byEdge[edge].push({to,locked:c[4]&&c[4].locked});}
  const colC=[1,16,31,46,61],rowC=[1,15,29,43];
  for(const edge in byEdge){const list=byEdge[edge];if(!list.length)continue;let cands;
   if(z.kind==='tunnel'){cands=edge==='N'||edge==='S'?[8,20,31,42,54]:[6,15,22,30,38];}
   else if(z.kind==='mall'){cands=edge==='N'||edge==='S'?[1,31,61]:[1,22,43];}
   else cands=edge==='N'||edge==='S'?colC.slice():(z.kind==='docks'?[1,15,29]:rowC.slice());
   RNG.shuffle(cands);
   list.forEach((c,i)=>{const p=cands[i%cands.length];let x,y;if(edge==='N'){x=p;y=0;}else if(edge==='S'){x=p;y=z.h-1;}else if(edge==='W'){x=0;y=p;}else{x=z.w-1;y=p;}
    this.set(z,x,y,c.locked?T.GATE:T.EXIT);z.exits.push({x,y,to:c.to,edge,locked:c.locked||null});
    // carve inward until walkable
    const dir=edge==='N'?[0,1]:edge==='S'?[0,-1]:edge==='W'?[1,0]:[-1,0];let cx=x+dir[0],cy=y+dir[1],n=0;
    while(n++<30&&cx>=0&&cy>=0&&cx<z.w&&cy<z.h&&!this.walk(z,cx,cy)){const bi=z.bidx[cy*z.w+cx];if(bi>=0){const b=z.buildings[bi];const onEdge=cx===b.x||cx===b.x+b.w-1||cy===b.y||cy===b.y+b.h-1;this.set(z,cx,cy,onEdge?T.DOOR:T.FLOOR);}else this.set(z,cx,cy,z.kind==='tunnel'?T.FLOOR:T.STREET);cx+=dir[0];cy+=dir[1];}
    // and the tile just inside must be walkable & not water/deep
    const ix=x+dir[0],iy=y+dir[1];if(!this.walk(z,ix,iy)||this.get(z,ix,iy)===T.DEEP)this.set(z,ix,iy,T.STREET);});}
  // connectivity repair: flood from first exit; any exit unreachable gets a corridor bored to reachable area
  this.ensureConnected(z);},
 ensureConnected(z){const seeds=z.exits.map(e=>e);if(!seeds.length)return;const reach=this.flood(z,seeds[0].x,seeds[0].y);
  for(const e of seeds){if(reach[e.y*z.w+e.x])continue;// bore straight toward the NEAREST reachable tile until connected
   let best=null,bd=1e9;for(let y=0;y<z.h;y++)for(let x=0;x<z.w;x++)if(reach[y*z.w+x]){const dd=(x-e.x)*(x-e.x)+(y-e.y)*(y-e.y);if(dd<bd){bd=dd;best=[x,y];}}
   if(best){let x=e.x,y=e.y;const tx=best[0],ty=best[1];let n=0;while(n++<250&&!reach[y*z.w+x]){if(Math.abs(tx-x)>Math.abs(ty-y))x+=Math.sign(tx-x);else if(y!==ty)y+=Math.sign(ty-y);else x+=Math.sign(tx-x);const t=this.get(z,x,y);if(!this.walk(z,x,y)||t===T.DEEP){const bi=z.bidx[y*z.w+x];if(bi>=0){const b=z.buildings[bi];const onEdge=x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1;this.set(z,x,y,onEdge?T.DOOR:T.FLOOR);}else this.set(z,x,y,z.kind==='tunnel'?T.FLOOR:T.RUBBLE);}}}
   const r2=this.flood(z,seeds[0].x,seeds[0].y);for(let i=0;i<r2.length;i++)reach[i]=r2[i];}
  // buildings: every building must be reachable from exit 0 (doors count as passable)
  for(const b of z.buildings){let ok=false;for(let j=b.y;j<b.y+b.h&&!ok;j++)for(let i=b.x;i<b.x+b.w&&!ok;i++)if(reach[j*z.w+i]&&this.get(z,i,j)!==T.WALL)ok=true;
   if(!ok){// find nearest reachable tile to building center and bore
    let bx=Math.floor(b.x+b.w/2),by=Math.floor(b.y+b.h/2);let best=null,bd=1e9;for(let y=0;y<z.h;y++)for(let x=0;x<z.w;x++)if(reach[y*z.w+x]){const dd=(x-bx)*(x-bx)+(y-by)*(y-by);if(dd<bd){bd=dd;best=[x,y];}}
    if(best){let x=best[0],y=best[1],n=0;while(n++<250&&z.bidx[y*z.w+x]!==b.id){if(Math.abs(bx-x)>Math.abs(by-y))x+=Math.sign(bx-x);else y+=Math.sign(by-y);const t=this.get(z,x,y);if(!this.walk(z,x,y)&&t!==T.DOOR&&t!==T.DOOR_LOCKED){const bi=z.bidx[y*z.w+x];if(bi>=0){const ob=z.buildings[bi];const onEdge=x===ob.x||x===ob.x+ob.w-1||y===ob.y||y===ob.y+ob.h-1;if(bi===b.id&&onEdge&&z.locked[x+','+y]===undefined&&(PREFABS[b.prefab]||{}).locked){this.set(z,x,y,T.DOOR_LOCKED);z.locked[x+','+y]={key:PREFABS[b.prefab].locked===1?null:PREFABS[b.prefab].locked,diff:6,bld:b.id};}else this.set(z,x,y,onEdge?T.DOOR:T.FLOOR);}else this.set(z,x,y,z.kind==='tunnel'?T.FLOOR:T.RUBBLE);}}
     const r3=this.flood(z,seeds[0].x,seeds[0].y);for(let i=0;i<r3.length;i++)reach[i]=r3[i];}}}},
 flood(z,sx,sy){const r=new Uint8Array(z.w*z.h);const st=[[sx,sy]];r[sy*z.w+sx]=1;while(st.length){const [x,y]=st.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=z.w||ny>=z.h)continue;const i=ny*z.w+nx;if(r[i])continue;const t=z.t[i];if(TILE_DEFS[t].w||t===T.DOOR||t===T.DOOR_LOCKED||t===T.GATE){r[i]=1;st.push([nx,ny]);}}}return r;},

 // ---------- decorations: lore text on graffiti/signs/terminals ----------
 decorate(z,d){for(let i=0;i<z.t.length;i++){const t=z.t[i];const x=i%z.w,y=(i/z.w)|0;const k=x+','+y;
   if(t===T.GRAFFITI)z.terms[k]={kind:'graffiti',text:RNG.rc(GRAFFITI)};
   else if(t===T.SIGN)z.terms[k]={kind:'sign',text:RNG.rc(SIGNS)};
   else if(t===T.TERMINAL){const bi=z.bidx[i];const b=bi>=0?z.buildings[bi]:null;const pf=b&&b.prefab;z.terms[k]={kind:'terminal',text:RNG.rc(TERMINAL_MSGS),read:0,echo:(d.kind==='static'||RNG.chance(0.25))?1:0,role:pf==='relay'?'relay':pf==='hangar'?'hangar':pf==='security'?'security':pf==='heart'?'heart':null};}
   else if(t===T.ALTAR)z.terms[k]={kind:'altar',text:'The altar is a bathtub full of pale, moving water. Names are scratched into the porcelain. The newest one is still wet.'};}
  // fill containers with loot
  for(const k in z.conts){const c=z.conts[k];if(c.items.length)continue;const bi=c.bld;const b=bi!==undefined?z.buildings[bi]:null;const lt=c.loot||(b?(PREFABS[b.prefab]&&PREFABS[b.prefab].lootType)||(b.prefab&&PREFABS[b.prefab].btype)||b.type:'apartment');c.loot=LOOT[lt]?lt:'apartment';c.items=Game.rollLoot(c.loot,RNG.ri(1,3)+(c.kind==='night cache'?1:0));}
  // guaranteed prefab loot & floor items
  for(const b of z.buildings){const pf=b.prefab&&PREFABS[b.prefab];if(!pf)continue;
   if(pf.lootGuar){const keys=Object.keys(z.conts).filter(k=>z.conts[k].bld===b.id);let target=keys.length?z.conts[RNG.rc(keys)]:null;
    if(b.lockedRoom){const inRoom=keys.filter(k=>{const [x,y]=k.split(',').map(Number);return x>=b.lockedRoom.x&&x<b.lockedRoom.x+b.lockedRoom.w&&y>=b.lockedRoom.y&&y<b.lockedRoom.y+b.lockedRoom.h;});if(inRoom.length)target=z.conts[inRoom[0]];else{const c=this.roomFloor(z,b.lockedRoom,true);if(c.length){const [i,j]=RNG.rc(c);this.set(z,i,j,T.CONTAINER);target=z.conts[i+','+j]={kind:'safe',items:[],loot:'office',bld:b.id};}}}
    if(!target){const r=b.rooms[0];const c=this.roomFloor(z,r,true);if(c.length){const [i,j]=RNG.rc(c);this.set(z,i,j,T.CONTAINER);target=z.conts[i+','+j]={kind:'cache',items:[],loot:'apartment',bld:b.id};}}
    if(target)for(const [id,n] of pf.lootGuar)target.items.push({id,qty:n});}
   if(pf.loot&&!pf.lootType){for(const k of Object.keys(z.conts).filter(k=>z.conts[k].bld===b.id))if(RNG.chance(0.5)){const id=RNG.rc(pf.loot);if(ITEMS[id])z.conts[k].items.push({id,qty:1});}}
   if(pf.quest==='wren_package'){const keys=Object.keys(z.conts).filter(k=>z.conts[k].bld===b.id);if(keys.length)z.conts[RNG.rc(keys)].items.push({id:'wren_package',qty:1});else{const c=this.roomFloor(z,b.rooms[0],false);if(c.length){const [i,j]=RNG.rc(c);z.items.push({x:i,y:j,id:'wren_package',qty:1});}}}}
  // random floor items in lots/streets
  const n=RNG.ri(3,7);for(let i=0;i<n;i++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);const t=this.get(z,x,y);if(t===T.RUBBLE||t===T.FLOOR&&z.bidx[y*z.w+x]<0){const it=Game.rollLoot('scav',1)[0];if(it)z.items.push({x,y,id:it.id,qty:it.qty});}}
  // safe rects
  z.safe=z.buildings.filter(b=>b.safe).map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,fac:b.safe===1?null:b.safe,name:b.name}));
  Game.recomputeLightZ(z);},

 // ---------- populations ----------
 populate(z,d){
  // NPCs into prefabs
  for(const nid in NPCS){const n=NPCS[nid];if(n.zone!==z.id)continue;const b=z.buildings.find(b=>b.prefab===n.prefab);if(!b)continue;const r=b.rooms.reduce((a,c)=>a.w*a.h>=c.w*c.h?a:c);const c=this.roomFloor(z,r,false).filter(([x,y])=>!z.ents.some(e=>e.x===x&&e.y===y));if(!c.length)continue;const [x,y]=RNG.rc(c);z.ents.push(Game.makeNpc(nid,x,y,z));}
  // guards & bosses
  for(const b of z.buildings){const pf=b.prefab&&PREFABS[b.prefab];if(!pf)continue;
   if(pf.guards){const grp=GROUPS[pf.guards[0]];for(let k=0;k<pf.guards[1];k++)for(const eid of grp){const c=this.bldFloor(z,b);if(!c.length)break;const [x,y]=RNG.rc(c);const e=Game.makeEnemy(eid,x,y,z,{home:[x,y],guard:1});if(b.safe&&!(pf.guards[0]==='ghouls'||pf.guards[0]==='scav'))e.fac=b.safe===1?null:b.safe;z.ents.push(e);}}
   if(pf.boss){const r=b.rooms.reduce((a,c)=>a.w*a.h>=c.w*c.h?a:c);const c=this.roomFloor(z,r,false);if(c.length){const [x,y]=RNG.rc(c);const e=Game.makeEnemy(pf.boss,x,y,z,{home:[x,y],guard:1,boss:1});z.ents.push(e);}}}
  // population groups
  for(const [gname,count0] of d.pops){const count=(typeof G!=='undefined'&&G&&G.nightmode)?Math.ceil(count0*1.5):count0;const grp=GROUPS[gname];if(!grp)continue;for(let k=0;k<count;k++){const inBld=RNG.chance(0.45);let spot=null;
    if(inBld){const bl=z.buildings.filter(b=>!b.prefab);if(bl.length){const b=RNG.rc(bl);const c=this.bldFloor(z,b);if(c.length)spot=RNG.rc(c);}}
    if(!spot){spot=this.randomOpen(z,20);}if(!spot)continue;
    grp.forEach((eid,i)=>{const p=this.nearOpen(z,spot[0],spot[1],2);if(p)z.ents.push(Game.makeEnemy(eid,p[0],p[1],z,{home:[spot[0],spot[1]],patrol:!inBld}));});}}
 },
 bldFloor(z,b){const out=[];for(let j=b.y;j<b.y+b.h;j++)for(let i=b.x;i<b.x+b.w;i++)if(this.get(z,i,j)===T.FLOOR&&!z.ents.some(e=>e.x===i&&e.y===j))out.push([i,j]);return out;},
 randomOpen(z,tries){for(let k=0;k<tries;k++){const x=RNG.ri(1,z.w-2),y=RNG.ri(1,z.h-2);const t=this.get(z,x,y);if((t===T.STREET||t===T.FLOOR||t===T.SIDEWALK)&&z.bidx[y*z.w+x]<0&&!z.safe.some(s=>x>=s.x&&x<s.x+s.w&&y>=s.y&&y<s.y+s.h)&&!z.ents.some(e=>e.x===x&&e.y===y))return[x,y];}return null;},
 nearOpen(z,x,y,r){for(let k=0;k<20;k++){const nx=x+RNG.ri(-r,r),ny=y+RNG.ri(-r,r);if(this.walk(z,nx,ny)&&!z.ents.some(e=>e.x===nx&&e.y===ny)&&this.get(z,nx,ny)!==T.DEEP)return[nx,ny];}return this.walk(z,x,y)&&!z.ents.some(e=>e.x===x&&e.y===y)?[x,y]:null;}
};
