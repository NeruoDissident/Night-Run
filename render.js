'use strict';
// ============================================================
// RENDERER — draws G through a TILESET. Knows nothing about rules.
// Sprite atlas + per-zone palettes, autotiled walls, smooth light map,
// fog of war, entity tweening, projectiles, particles, floating numbers,
// rain, night tint, Echo glitch, screen shake, zone title cards.
// ============================================================
const Renderer=(function(){
 const R={};
 let atlasImg=null,atlasIdx=null,tileset=null,ready=false;
 let ctx=null,canvas=null;
 R.cell=32;R.zoom=1;R.anim=1; // settings
 R.hover=null;R.offY=0;R.targets=null;R.targetIdx=0;R.cursor=null;R.rangeTiles=null;
 const fxList=[];const floaters=[];const particles=[];
 let shakeT=0,glitchT=0,flashT=0,flashCol='#000',titleCard=null;
 const tween=new Map(); // id -> {x,y,fx,fy,t0}
 let camX=0,camY=0,camInit=false;
 let lightCanvas=null,lightCtx=null,lightKey='';
 let glowCanvas=null,glowCtx=null;
 let rainDrops=[];
 let lastT=0;

 R.init=function(cv,assets){
  canvas=cv;ctx=cv.getContext('2d');
  tileset=TILESETS.city;
  atlasIdx=assets.index;
  atlasImg=new Image();atlasImg.onload=()=>{ready=true;};atlasImg.src=assets.atlas;
  lightCanvas=document.createElement('canvas');lightCtx=lightCanvas.getContext('2d');
  glowCanvas=document.createElement('canvas');glowCtx=glowCanvas.getContext('2d');
  for(let i=0;i<140;i++)rainDrops.push({x:Math.random(),y:Math.random(),s:0.6+Math.random()*0.8,l:0.5+Math.random()});
 };
 R.isReady=()=>ready;
 R.sprite=function(key){return atlasIdx[key]||null;};
 // draw sprite key at pixel pos with size
 function spr(key,x,y,size,alpha){const s=atlasIdx[key];if(!s)return false;if(alpha!==undefined)ctx.globalAlpha=alpha;ctx.drawImage(atlasImg,s[0],s[1],32,32,Math.round(x),Math.round(y),size,size);if(alpha!==undefined)ctx.globalAlpha=1;return true;}
 R.drawSpriteTo=function(c2,key,x,y,size){const s=atlasIdx[key];if(!s||!ready)return false;c2.imageSmoothingEnabled=false;c2.drawImage(atlasImg,s[0],s[1],32,32,x,y,size,size);return true;};
 R.spriteURL=function(key,size){// small data URL for DOM icons (cached)
  size=size||32;const ck=key+'@'+size;if(R._urlCache&&R._urlCache[ck])return R._urlCache[ck];R._urlCache=R._urlCache||{};
  if(!ready||!atlasIdx[key])return '';const c=document.createElement('canvas');c.width=c.height=size;R.drawSpriteTo(c.getContext('2d'),key,0,0,size);const u=c.toDataURL();R._urlCache[ck]=u;return u;};

 // ---------- keys ----------
 function hash(x,y){let h=(x*374761393+y*668265263)^0x5bd1e995;h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;}
 function zkey(base,zid,x,y){const v=tileset.variants[base];let k=base+'_'+zid;if(v)k+='_'+(hash(x,y)%v);return k;}
 function groundKey(z,rule,x,y,t){
  let g=rule.ground;if(!g)return null;
  const frame=Math.floor(performance.now()/500);
  if(Array.isArray(g))return g[frame%g.length];
  if(g==='auto'){const indoor=z.bidx[y*z.w+x]>=0||z.kind==='tunnel'||z.kind==='mall';g=indoor?'floor':'street';
   if(!indoor){const n=[[0,1],[1,0],[0,-1],[-1,0]].some(([dx,dy])=>Gen.get(z,x+dx,y+dy)===T.SIDEWALK);if(n)g='walk';}}
  if(g==='street'&&(z.kind==='tunnel'))g='floor';
  if(tileset.zoned.includes(g))return zkey(g,z.id,x,y);
  return g;}
 function wallKey(z,rule,x,y){
  const below=Gen.get(z,x,y+1);const belowWall=below===T.WALL||below===T.WINDOW||below===T.VOID;
  if(z.kind==='tunnel'&&z.bidx[y*z.w+x]<0)return belowWall?'rock_'+(hash(x,y)%2):'rockface';
  if(belowWall){const above=Gen.get(z,x,y-1);return (above===T.WALL||above===T.WINDOW)?'walltop_'+z.id:'walltopedge_'+z.id;}
  return (rule.window?'window_':'wallface_')+z.id;}
 function objKey(rule,x,y){const o=rule.obj;if(!o)return null;if(Array.isArray(o)){if(rule.vary)return o[hash(x,y)%o.length];return o[Math.floor(performance.now()/260)%o.length];}return o;}
 function entKey(e){if(e.kind==='npc')return 'npc_'+e.def;return 'en_'+e.def;}

 // ---------- effects API ----------
 R.fx=function(kind,d){
  const now=performance.now();d=d||{};
  switch(kind){
   case 'shot':fxList.push({k:'proj',x0:d.fx,y0:d.fy,x1:d.x,y1:d.y,t0:now,dur:140,thrown:d.thrown,miss:d.miss});break;
   case 'hit':{fxList.push({k:'slash',x:d.x,y:d.y,t0:now,dur:180});
    if(d.dmg!==undefined)floaters.push({x:d.x,y:d.y,text:(d.crit?d.dmg+'!':''+d.dmg),col:d.p?'#ff5a5a':(d.crit?'#ffe27a':'#ffffff'),t0:now,dur:900,big:d.crit});
    const e=G&&G.zone&&Game.entAt(d.x,d.y);const mech=e&&e.kind==='e'&&ENEMIES[e.def]&&ENEMIES[e.def].tags.includes('machine');
    burst(d.x,d.y,mech?'#ffd070':'#b01818',d.crit?14:7);if(d.crit)shakeT=Math.max(shakeT,8);break;}
   case 'whiff':floaters.push({x:d.x,y:d.y,text:'miss',col:'#8a8a99',t0:now,dur:700});break;
   case 'miss':break;
   case 'phit':flashT=8;flashCol='#ff0000';shakeT=Math.max(shakeT,5);break;
   case 'death':burst(d.x,d.y,'#8a1010',22);fxList.push({k:'blood',x:d.x,y:d.y,t0:now,dur:12000});break;
   case 'death_p':flashT=40;flashCol='#600000';shakeT=14;break;
   case 'shake':shakeT=14;break;
   case 'glitch':glitchT=14;break;
   case 'levelup':if(G){burst(G.p.x,G.p.y,'#ffe27a',30);floaters.push({x:G.p.x,y:G.p.y,text:'LEVEL UP',col:'#ffe27a',t0:now,dur:1600,big:1});}break;
   case 'quest':flashT=6;flashCol='#ffe27a';break;
   case 'fade':flashT=18;flashCol='#000000';break;
   case 'zone':titleCard={text:d,t0:now,dur:2600};break;
   case 'bump':shakeT=Math.max(shakeT,2);break;
   case 'reload':if(G)floaters.push({x:G.p.x,y:G.p.y,text:'reload',col:'#9ad',t0:now,dur:700});break;
   case 'heal':if(G)floaters.push({x:G.p.x,y:G.p.y,text:'+'+d,col:'#6f6',t0:now,dur:900});break;
   case 'text':floaters.push({x:d.x,y:d.y,text:d.text,col:d.col||'#fff',t0:now,dur:d.dur||1000});break;
  }
 };
 function burst(x,y,col,n){if(!R.anim)n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=0.02+Math.random()*0.07;particles.push({x:x+0.5,y:y+0.4,vx:Math.cos(a)*s,vy:Math.sin(a)*s-0.04,g:0.004,life:400+Math.random()*400,t0:performance.now(),col,sz:1+Math.random()*2});}}
 R.clearFx=function(){fxList.length=0;floaters.length=0;particles.length=0;tween.clear();camInit=false;titleCard=null;};

 // ---------- tweening ----------
 function tpos(id,x,y,now){
  let t=tween.get(id);
  if(!t){t={x,y,fx:x,fy:y,t0:0};tween.set(id,t);}
  if(t.x!==x||t.y!==y){const cur=tcur(t,now);const jump=Math.abs(x-t.x)>2||Math.abs(y-t.y)>2;t.fx=jump?x:cur[0];t.fy=jump?y:cur[1];t.x=x;t.y=y;t.t0=now;}
  return tcur(t,now);}
 function tcur(t,now){const d=R.anim?110:1;const k=Math.min(1,(now-t.t0)/d);const e=k*(2-k);return [t.fx+(t.x-t.fx)*e,t.fy+(t.y-t.fy)*e];}

 // ---------- light map ----------
 function lightLevel(z,i,x,y,night,indoor){
  if(!z.seen[i])return 0;
  const vis=G.vis&&G.vis[i];
  if(!vis)return 0.26;
  const lit=z.lit&&z.lit[i];const dd=Game.edist(x,y,G.p.x,G.p.y);
  if(z.kind==='tunnel'){return lit?0.95:Math.max(0.42,1-dd*0.07);}
  if(night){let b=lit?0.95:Math.max(0.36,0.9-dd*0.06);if(G.p.eq.tool&&G.p.eq.tool.id==='flashlight'&&dd<6)b=Math.max(b,0.85);return b;}
  if(indoor)return lit?1:Math.max(0.62,0.95-dd*0.025);
  return G.rain?0.84:1;}
 function buildLight(z){
  const night=Game.isNight();const key=G.turn+'|'+z.id+'|'+G.p.x+','+G.p.y+'|'+night+'|'+G.rain+'|'+z.blackout;
  if(key===lightKey)return;lightKey=key;
  lightCanvas.width=z.w;lightCanvas.height=z.h;glowCanvas.width=z.w;glowCanvas.height=z.h;
  const img=lightCtx.createImageData(z.w,z.h);const gimg=glowCtx.createImageData(z.w,z.h);
  for(let y=0;y<z.h;y++)for(let x=0;x<z.w;x++){const i=y*z.w+x;const indoor=z.bidx[i]>=0;const L=lightLevel(z,i,x,y,night,indoor);
   const o=i*4;const tint=night?[4,6,22]:(z.kind==='tunnel'?[2,10,8]:[0,0,0]);
   img.data[o]=tint[0];img.data[o+1]=tint[1];img.data[o+2]=tint[2];img.data[o+3]=Math.round((1-L)*255);}
  lightCtx.putImageData(img,0,0);
  // coloured glow from light sources in view
  for(let i=0;i<z.t.length;i++){const t=z.t[i];const lc=tileset.lightCol[t];if(!lc)continue;if(t===T.LAMP&&z.blackout)continue;if(!(G.vis&&G.vis[i]))continue;
   const x=i%z.w,y=(i/z.w)|0;const r=TILE_DEFS[t].l||2;const [cr,cg,cb]=hex(lc);
   for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=z.w||ny>=z.h)continue;const d=Math.sqrt(dx*dx+dy*dy);if(d>r)continue;const o=(ny*z.w+nx)*4;const a=(1-d/r)*(night?150:70);
    gimg.data[o]=Math.max(gimg.data[o],cr);gimg.data[o+1]=Math.max(gimg.data[o+1],cg);gimg.data[o+2]=Math.max(gimg.data[o+2],cb);gimg.data[o+3]=Math.min(255,Math.max(gimg.data[o+3],a));}}
  glowCtx.putImageData(gimg,0,0);}
 function hex(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}

 // ---------- main draw ----------
 R.computeCell=function(w,h){let b=Math.min(w/26,h/16);b=b>=30?32:Math.max(22,Math.round(b));R.cell=Math.round(b*R.zoom);return R.cell;};
 R.screenToTile=function(sx,sy){const c=R.cell;return{x:Math.floor((sx+camX*c-canvas.clientWidth/2)/c),y:Math.floor((sy+camY*c-canvas.clientHeight/2+R.offY)/c)};};
 R.draw=function(){
  if(!ready||!G||!G.zone)return;
  const now=performance.now();const dt=Math.min(50,now-(lastT||now));lastT=now;
  const z=G.zone,p=G.p;const w=canvas.clientWidth,h=canvas.clientHeight;const c=R.cell;
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
  // camera: follow tweened player
  const pp=tpos('P',p.x,p.y,now);
  const tx=pp[0]+0.5,ty=pp[1]+0.5;
  if(!camInit){camX=tx;camY=ty;camInit=true;}
  const k=R.anim?Math.min(1,dt/90):1;camX+=(tx-camX)*k;camY+=(ty-camY)*k;
  let sx=0,sy=0;if(shakeT>0&&R.anim){sx=(Math.random()-0.5)*shakeT*0.8;sy=(Math.random()-0.5)*shakeT*0.8;shakeT-=dt/16;}
  const ox=Math.round(w/2-camX*c+sx),oy=Math.round(h/2-R.offY-camY*c+sy);
  const x0=Math.max(0,Math.floor(-ox/c)-1),x1=Math.min(z.w-1,Math.ceil((w-ox)/c)+1);
  const y0=Math.max(0,Math.floor(-oy/c)-1),y1=Math.min(z.h-1,Math.ceil((h-oy)/c)+1);
  // pass 1: ground + walls
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*z.w+x;if(!z.seen[i])continue;const t=z.t[i];const rule=tileset.tiles[t];if(!rule||rule.none)continue;
   const px=ox+x*c,py=oy+y*c;
   if(rule.wall){spr(wallKey(z,rule,x,y),px,py,c);continue;}
   const g=groundKey(z,rule,x,y,t);if(g)spr(g,px,py,c);}
  // blood decals
  for(const f of fxList)if(f.k==='blood'&&now-f.t0<f.dur&&z.seen[f.y*z.w+f.x])spr('fx_blood',ox+f.x*c,oy+f.y*c,c,Math.max(0,1-(now-f.t0)/f.dur)*0.85);
  // pass 2: objects, items, entities by row (so taller things overlap correctly)
  const ents=z.ents.filter(e=>Game.visible(e.x,e.y)&&!e.hidden);
  const itemsAt=new Map();for(const it of z.items){if(!z.seen[it.y*z.w+it.x])continue;itemsAt.set(it.x+','+it.y,(itemsAt.get(it.x+','+it.y)||[]).concat([it]));}
  for(let y=y0;y<=y1;y++){
   for(let x=x0;x<=x1;x++){const i=y*z.w+x;if(!z.seen[i])continue;const t=z.t[i];const rule=tileset.tiles[t];if(!rule||rule.wall)continue;
    const ok=objKey(rule,x,y);if(ok){let a;if(rule.pulse)a=0.75+0.25*Math.sin(now/300+x);spr(ok,ox+x*c,oy+y*c,c,a);}
    const its=itemsAt.get(x+','+y);if(its){const it=its[its.length-1];const s=c*0.62;spr('it_'+it.id,ox+x*c+(c-s)/2,oy+y*c+(c-s)/2+c*0.08,s,G.vis[i]?1:0.5);if(its.length>1){ctx.fillStyle='#ffe27a';ctx.fillRect(ox+x*c+c-6,oy+y*c+3,3,3);}}}
   for(const o of z.objs)if(o.y===y&&z.seen[o.y*z.w+o.x])spr('obj_'+o.type,ox+o.x*c,oy+o.y*c,c);
   for(const tr of z.traps)if(tr.y===y&&Game.visible(tr.x,tr.y))spr('trap',ox+tr.x*c,oy+tr.y*c,c,0.8);
   // entities on this row
   for(const e of ents){if(e.y!==y)continue;const pos=tpos(e.id,e.x,e.y,now);const bob=R.anim?Math.sin(now/420+e.id)*0.6:0;
    const ex=ox+pos[0]*c,ey=oy+pos[1]*c-c*0.12+bob;
    const hostile=Game.isHostile(e)||e.hostile;
    if(hostile){ctx.fillStyle='rgba(255,40,40,0.28)';ctx.beginPath();ctx.ellipse(ex+c/2,ey+c*0.95,c*0.34,c*0.1,0,0,Math.PI*2);ctx.fill();}
    else if(e.fac==='ally'){ctx.fillStyle='rgba(80,255,120,0.28)';ctx.beginPath();ctx.ellipse(ex+c/2,ey+c*0.95,c*0.34,c*0.1,0,0,Math.PI*2);ctx.fill();}
    const d=e.kind==='e'?ENEMIES[e.def]:null;const bosss=d&&d.tags.includes('boss');const sc=bosss?1.25:1;
    if(e.st&&e.st.jammed)ctx.globalAlpha=0.55;
    spr(entKey(e),ex-(sc-1)*c/2,ey-(sc-1)*c,c*sc);ctx.globalAlpha=1;
    if(e.hp<e.maxhp&&e.kind==='e'){const bw=c*0.7;ctx.fillStyle='#000';ctx.fillRect(ex+(c-bw)/2,ey-2,bw,4);ctx.fillStyle=bosss?'#ff40ff':'#e33';ctx.fillRect(ex+(c-bw)/2,ey-2,bw*Math.max(0,e.hp/e.maxhp),4);}
    if(e.shield>0){ctx.strokeStyle='rgba(150,230,255,'+(0.3+0.4*e.shield/30)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ex+c/2,ey+c/2,c*0.55,0,Math.PI*2);ctx.stroke();}
    if(hostile&&e.alert>0&&e.kind==='e'){ctx.fillStyle='#ff4040';ctx.font='bold '+Math.round(c*0.45)+'px monospace';ctx.fillText('!',ex+c*0.78,ey+c*0.28);}
    if(e.st&&e.st.stun){ctx.fillStyle='#ffff60';ctx.font=Math.round(c*0.35)+'px monospace';ctx.fillText('✦',ex+c*0.05,ey+c*0.25);}
    if(e.kind==='npc'&&!hostile){ctx.fillStyle='#ffe27a';ctx.font='bold '+Math.round(c*0.4)+'px monospace';ctx.fillText('…',ex+c*0.62,ey+c*0.18);}}
   // player on this row
   if(p.y===y){const bob=R.anim?Math.sin(now/500)*0.5:0;const px=ox+pp[0]*c,py=oy+pp[1]*c-c*0.12+bob;
    ctx.fillStyle='rgba(255,230,120,0.22)';ctx.beginPath();ctx.ellipse(px+c/2,py+c*0.95,c*0.36,c*0.11,0,0,Math.PI*2);ctx.fill();
    if(Game.hasStatus('hidden'))ctx.globalAlpha=0.5;spr('pc_'+p.cls,px,py,c);ctx.globalAlpha=1;
    if(p.chrome.length){ctx.fillStyle='rgba(120,230,255,'+(0.25+0.2*Math.sin(now/200))+')';ctx.fillRect(px+c*0.38,py+c*0.24,c*0.25,2);}}
  }
  // lighting
  buildLight(z);
  ctx.imageSmoothingEnabled=true;
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.55;ctx.drawImage(glowCanvas,ox,oy,z.w*c,z.h*c);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.drawImage(lightCanvas,ox,oy,z.w*c,z.h*c);
  ctx.imageSmoothingEnabled=false;
  // hard fog for never-seen tiles (the smoothing must not leak shapes)
  ctx.fillStyle='#000';
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!z.seen[y*z.w+x])ctx.fillRect(ox+x*c,oy+y*c,c+1,c+1);}
  // range overlay / targeting
  if(R.rangeTiles){ctx.fillStyle='rgba(255,226,122,0.10)';for(const [x,y] of R.rangeTiles)ctx.fillRect(ox+x*c,oy+y*c,c,c);}
  if(R.targets){R.targets.forEach((t,i)=>{if(i===R.targetIdx)return;ctx.globalAlpha=0.5;spr('fx_select',ox+t.x*c,oy+t.y*c,c);ctx.globalAlpha=1;});
   const t=R.targets[R.targetIdx];if(t){const pulse=1+0.08*Math.sin(now/90);const s=c*pulse;spr('fx_select',ox+t.x*c-(s-c)/2,oy+t.y*c-(s-c)/2,s);
    ctx.strokeStyle='rgba(255,226,122,0.5)';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(ox+(pp[0]+0.5)*c,oy+(pp[1]+0.5)*c);ctx.lineTo(ox+(t.x+0.5)*c,oy+(t.y+0.5)*c);ctx.stroke();ctx.setLineDash([]);}}
  if(R.hover&&!R.targets){const hx=R.hover.x,hy=R.hover.y;if(hx>=0&&hy>=0&&hx<z.w&&hy<z.h&&z.seen[hy*z.w+hx]){ctx.globalAlpha=0.55;spr('fx_select',ox+hx*c,oy+hy*c,c);ctx.globalAlpha=1;}}
  // projectiles & slashes
  for(let i=fxList.length-1;i>=0;i--){const f=fxList[i];const k=(now-f.t0)/f.dur;if(k>=1){if(f.k!=='blood')fxList.splice(i,1);continue;}
   if(f.k==='proj'){const x=f.x0+(f.x1-f.x0)*k,y=f.y0+(f.y1-f.y0)*k;
    ctx.strokeStyle=f.thrown?'rgba(255,200,120,0.5)':'rgba(255,240,180,0.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ox+(f.x0+0.5)*c,oy+(f.y0+0.5)*c);ctx.lineTo(ox+(x+0.5)*c,oy+(y+0.5)*c);ctx.stroke();
    spr('fx_bullet',ox+x*c,oy+y*c,c);if(k<0.25){ctx.fillStyle='rgba(255,220,120,'+(0.8-k*3)+')';ctx.beginPath();ctx.arc(ox+(f.x0+0.5)*c,oy+(f.y0+0.5)*c,c*0.3,0,Math.PI*2);ctx.fill();}}
   else if(f.k==='slash')spr('fx_slash',ox+f.x*c,oy+f.y*c,c,1-k);}
  // particles
  for(let i=particles.length-1;i>=0;i--){const q=particles[i];const age=now-q.t0;if(age>q.life){particles.splice(i,1);continue;}q.vy+=q.g*dt/16;q.x+=q.vx*dt/16;q.y+=q.vy*dt/16;
   ctx.globalAlpha=1-age/q.life;ctx.fillStyle=q.col;ctx.fillRect(ox+q.x*c,oy+q.y*c,q.sz*c/16,q.sz*c/16);}ctx.globalAlpha=1;
  // floating numbers
  for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];const k=(now-f.t0)/f.dur;if(k>=1){floaters.splice(i,1);continue;}
   const fx=ox+(f.x+0.5)*c,fy=oy+(f.y)*c-k*c*0.9;ctx.font='bold '+Math.round(c*(f.big?0.55:0.42))+'px "Courier New",monospace';ctx.textAlign='center';
   ctx.globalAlpha=k<0.7?1:1-(k-0.7)/0.3;ctx.lineWidth=3;ctx.strokeStyle='#000';ctx.strokeText(f.text,fx,fy);ctx.fillStyle=f.col;ctx.fillText(f.text,fx,fy);ctx.globalAlpha=1;ctx.textAlign='left';}
  // weather / atmosphere (screen space)
  const outdoor=z.kind!=='tunnel'&&z.bidx[p.y*z.w+p.x]<0;
  if(G.rain&&z.kind!=='tunnel'&&R.anim){ctx.strokeStyle=outdoor?'rgba(170,190,230,0.35)':'rgba(170,190,230,0.12)';ctx.lineWidth=1;ctx.beginPath();
   for(const d of rainDrops){d.y+=d.s*dt/600;d.x-=d.s*dt/4000;if(d.y>1){d.y=0;d.x=Math.random();}if(d.x<0)d.x+=1;const x=d.x*w,y=d.y*h;ctx.moveTo(x,y);ctx.lineTo(x-3,y+14*d.l);}ctx.stroke();}
  if(z.id==='static'||G.attention>=50){const a=z.id==='static'?0.05:0.03;ctx.fillStyle='rgba(180,170,255,'+a*(0.5+0.5*Math.sin(now/700))+')';ctx.fillRect(0,0,w,h);}
  // vignette
  const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.35,w/2,h/2,Math.max(w,h)*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,Game.isNight()?'rgba(0,0,10,0.6)':'rgba(0,0,0,0.35)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
  // glitch slices
  if(glitchT>0&&R.anim){glitchT-=dt/16;for(let i=0;i<4;i++){const y=Math.random()*h,hh=4+Math.random()*18,dx=(Math.random()-0.5)*30;try{ctx.drawImage(canvas,0,y*(canvas.width/w),canvas.width,hh*(canvas.width/w),dx,y,w,hh);}catch(e){}}
   ctx.fillStyle='rgba(120,100,255,0.08)';ctx.fillRect(0,0,w,h);}
  if(flashT>0){ctx.globalAlpha=Math.min(0.6,flashT/20);ctx.fillStyle=flashCol;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;flashT-=dt/16;}
  // zone title card
  if(titleCard){const k=(now-titleCard.t0)/titleCard.dur;if(k>=1)titleCard=null;else{const a=k<0.15?k/0.15:k>0.7?1-(k-0.7)/0.3:1;ctx.globalAlpha=a;
   ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(0,h*0.36,w,h*0.16);ctx.textAlign='center';ctx.fillStyle='#ffe27a';ctx.font='bold '+Math.round(Math.min(40,w/16))+'px "Courier New",monospace';
   ctx.fillText(titleCard.text.toUpperCase(),w/2,h*0.44);ctx.font=Math.round(Math.min(16,w/34))+'px "Courier New",monospace';ctx.fillStyle='#aaa';ctx.fillText(G.zone.def.tag,w/2,h*0.49);ctx.textAlign='left';ctx.globalAlpha=1;}}
 };
 R.tileToScreen=function(x,y){const c=R.cell;return{x:Math.round(canvas.clientWidth/2-camX*c)+x*c,y:Math.round(canvas.clientHeight/2-R.offY-camY*c)+y*c};};
 return R;
})();
