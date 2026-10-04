'use strict';
// ============================================================
// UI — screens, panels, modals, input (keyboard / mouse / touch),
// hints, toasts, settings. Implements the contract engine.js calls:
// onLog refresh fx confirm choice openLoot openTrade openInstall
// showDialogue closeDialogue targetMode openCraft showEnd
// ============================================================
(function(){
const $=(s,r)=>(r||document).querySelector(s);
function el(tag,cls,parent,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;if(parent)parent.appendChild(e);return e;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function clear(n){while(n&&n.firstChild)n.removeChild(n.firstChild);}
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;

let meta=null,settings=null;
const ZOOM_LEVELS=[0.5,0.65,0.8,1,1.25,1.5,1.75,2];
const DEFAULT_SETTINGS={master:0.7,music:0,sfx:0.65,amb:0.3,muted:false,anim:true,zoom:1,touch:'auto',hints:true,bigText:false,audioVersion:2};
let screens={},canvas=null,sideTab='gear',modalStack=[],target=null,walking=null,lastZone=null,lastEnemyCount=0,refreshQueued=false;

// ============================================================
// SKELETON
// ============================================================
function build(){
 const root=$('#root');root.innerHTML='';
 const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
 screens.title=el('div','screen s-title',root);
 screens.create=el('div','screen s-create hidden',root);
 screens.game=el('div','screen s-game hidden',root);
 screens.end=el('div','screen s-end hidden',root);
 const g=screens.game;
 el('div','hud',g).id='hud';
 const main=el('div','main',g);
 const cw=el('div','canvaswrap',main);cw.id='cw';
 canvas=el('canvas','map',cw);
 const zoom=el('div','map-zoom',cw);zoom.setAttribute('aria-label','Map zoom');
 const zout=btn(zoom,'−',()=>changeZoom(-1));zout.id='zoom-out';zout.setAttribute('aria-label','Zoom out');zout.title='Zoom out (− or mouse wheel)';
 const reset=btn(zoom,'100%',()=>setZoom(1));reset.id='zoom-reset';reset.setAttribute('aria-label','Reset map zoom');reset.title='Reset zoom (0)';
 const zin=btn(zoom,'+',()=>changeZoom(1));zin.id='zoom-in';zin.setAttribute('aria-label','Zoom in');zin.title='Zoom in (+ or mouse wheel)';
 el('div','threats',cw).id='threats';
 el('div','ctx-btn hidden',cw).id='ctxbtn';
 el('div','tooltip hidden',cw).id='tooltip';
 el('div','touch',cw).id='touch';
 const side=el('div','side',main);side.id='side';
 el('div','log',g).id='log';
 el('div','toasts',root).id='toasts';
 el('div','modal hidden',root).id='modal';
 Renderer.init(canvas,window.ASSETS);
 window.addEventListener('resize',resize);
 buildTouch();
}

// ============================================================
// SETTINGS / META
// ============================================================
function loadSettings(){meta=Game.loadMeta();settings=Object.assign({},DEFAULT_SETTINGS,meta.settings||{});
 if(meta.settings&&meta.settings.audioVersion!==2){if(settings.music===0.45)settings.music=0;if(settings.amb===0.6)settings.amb=0.3;if(settings.sfx===0.8)settings.sfx=0.65;settings.audioVersion=2;meta.settings=settings;Game.saveMeta(meta);}
 settings.zoom=Number.isFinite(+settings.zoom)?Math.max(0.5,Math.min(2,+settings.zoom)):1;applySettings();}
function setZoom(value){settings.zoom=Math.max(0.5,Math.min(2,value));Renderer.hover=null;saveSettings();}
function changeZoom(dir){const z=settings.zoom;const next=dir>0?ZOOM_LEVELS.find(v=>v>z+0.01):ZOOM_LEVELS.slice().reverse().find(v=>v<z-0.01);if(next!==undefined)setZoom(next);}
function saveSettings(){meta=Game.loadMeta();meta.settings=settings;Game.saveMeta(meta);applySettings();}
function applySettings(){Object.assign(Sound.vol,{master:settings.master,music:settings.music,sfx:settings.sfx,amb:settings.amb});Sound.muted=settings.muted;Sound.applyVol();
 Renderer.anim=settings.anim?1:0;Renderer.zoom=settings.zoom;document.body.classList.toggle('bigtext',!!settings.bigText);
 const showTouch=settings.touch==='on'||(settings.touch==='auto'&&isTouch);document.body.classList.toggle('show-touch',showTouch);
 if($('#zoom-reset')){$('#zoom-reset').textContent=Math.round(settings.zoom*100)+'%';$('#zoom-out').disabled=settings.zoom<=0.5;$('#zoom-in').disabled=settings.zoom>=2;}resize();}

// ============================================================
// TITLE
// ============================================================
function show(name){for(const k in screens)screens[k].classList.toggle('hidden',k!==name);Sound.setActive(name==='game');if(name==='game'){resize();}}
function showTitle(){
 loadSettings();if($('#toasts'))clearToasts();show('title');const t=screens.title;clear(t);
 t.style.backgroundImage=`url(${window.ASSETS.title})`;
 el('div','rain-fx',t);
 const box=el('div','title-box',t);
 el('div','title-sub',box,'THE FRACTURED CITY');
 el('h1',null,box,'NIGHT RUN');
 el('div','title-tag',box,'One person. One city. It already knows your name.');
 const btns=el('div','title-btns',box);
 if(Game.hasSave()){const b=btn(btns,'Continue',()=>{Sound.start();if(Game.load()){enterGame();}else toast('Save could not be read.','#f66');},'primary');b.title='Resume your active run';}
 btn(btns,'New Run',()=>{Sound.start();if(Game.hasSave())confirmBox('Starting a new run abandons your current one. The city will not remember you.',()=>{Game.clearSave();showCreate();});else showCreate();},Game.hasSave()?'':'primary');
 btn(btns,'Codex',()=>{Sound.start();showCodex();});
 btn(btns,'Past Runs',()=>{Sound.start();showRuns();});
 btn(btns,'Settings',()=>{Sound.start();showSettings();});
 const m=Game.loadMeta();const n=(m.runs||[]).length;
 el('div','title-foot',box,n?`${n} run${n>1?'s':''} recorded · ${(m.runs||[]).filter(r=>r.escaped).length} escaped`:'Permadeath. Saves when you leave. Press ? in game for controls.');
}
function btn(parent,label,fn,cls){const b=el('button','btn '+(cls||''),parent,label);b.onclick=(e)=>{Sound.play('ui');fn(e);};return b;}

// ============================================================
// CHARACTER CREATION
// ============================================================
const NAMES=['Rook','Vesper','Nine','Cass','Jojo','Ash','Kit','Mara','Dex','Lu','Tamsin','Oz','Remy','Sol','Wick','Juniper','Hex','Pax','Ines','Bram'];
let sel=null;
function showCreate(){
 show('create');const c=screens.create;clear(c);meta=Game.loadMeta();
 el('h2',null,c,'Who walks into the city tonight?');
 const top=el('div','create-top',c);
 const nameIn=el('input','name-in',top);nameIn.value=NAMES[(Math.random()*NAMES.length)|0];nameIn.maxLength=16;nameIn.setAttribute('aria-label','Name');
 btn(top,'↻',()=>{nameIn.value=NAMES[(Math.random()*NAMES.length)|0];}).title='Random name';
 let night=false;
 if(meta.unlocks.hardmode){const l=el('label','nightmode',top);const cb=el('input',null,l);cb.type='checkbox';el('span',null,l,' Night Mode (start at 21:00, more of everything)');cb.onchange=()=>night=cb.checked;}
 const wrap=el('div','create-wrap',c);
 const grid=el('div','class-grid',wrap);const detail=el('div','class-detail',wrap);
 sel=null;
 for(const id in CLASSES){const cd=CLASSES[id];const locked=cd.unlock&&!meta.unlocks[cd.unlock];
  const card=el('div','class-card'+(locked?' locked':''),grid);
  const im=el('img','class-img',card);im.src=Renderer.spriteURL('pc_'+id,64);
  el('div','class-name',card,esc(cd.name)).style.color=cd.col;
  el('div','class-tag',card,locked?'Locked — hear the Echo in a run to unlock.':esc(cd.tag));
  if(!locked)card.onclick=()=>{Sound.play('ui');for(const x of grid.children)x.classList.remove('sel');card.classList.add('sel');sel=id;renderDetail(id);go.disabled=false;};}
 function renderDetail(id){const cd=CLASSES[id];clear(detail);
  const h=el('div','cd-head',detail);const im=el('img','cd-img',h);im.src=Renderer.spriteURL('pc_'+id,96);
  const hh=el('div',null,h);el('h3',null,hh,esc(cd.name)).style.color=cd.col;el('div','muted',hh,esc(cd.tag));
  el('p',null,detail,esc(cd.desc));
  const stats=el('div','cd-stats',detail);for(const s of STATS){const r=el('div','cd-stat',stats);el('span',null,r,s.toUpperCase());const b=el('span','cd-bar',r);el('i',null,b).style.width=(cd.stats[s]*10)+'%';el('span',null,r,cd.stats[s]);}
  const sk=Object.entries(cd.skills).map(([k,v])=>`${k} ${v}`).join(' · ');el('div','cd-line',detail,'<b>Skills</b> '+esc(sk));
  const ab=ABILITIES[cd.ability];el('div','cd-line',detail,`<b>Ability — ${esc(ab.name)}</b>: ${esc(ab.desc)}`);
  el('div','cd-line',detail,'<b>Passive</b>: '+esc(cd.passive));
  el('div','cd-line',detail,'<b>Becomes</b>: '+cd.specs.map(s=>`<span title="${esc(SPECS[s].desc)}">${esc(SPECS[s].name)}</span>`).join(' or ')+' <span class="muted">(at level 4)</span>');
  const gear=cd.gear.map(g=>Array.isArray(g)?ITEMS[g[0]].name+' ×'+g[1]:ITEMS[g].name);el('div','cd-line muted',detail,'<b>Carries</b>: '+esc(gear.join(', '))+` · ${cd.creds} creds`);}
 const bar=el('div','create-bar',c);
 btn(bar,'Back',showTitle);
 const go=btn(bar,'Enter the City',()=>{if(!sel)return;Game.newGame(nameIn.value.trim()||'Nobody',sel,null,{night});enterGame(true);},'primary');go.disabled=true;
 const first=grid.querySelector('.class-card:not(.locked)');if(first)first.click();
}

// ============================================================
// GAME SCREEN
// ============================================================
function enterGame(fresh){
 show('game');Renderer.clearFx();lastZone=null;sideTab='gear';closeAllModals();
 Sound.start();Sound.setZone();refresh();
 if(fresh)hint('start','Welcome to the city. Move with arrows/WASD (or the pad). Bump into things to use them, bump enemies to fight. Talk to Mags behind the bar — then press ? any time for help.');
 if(!rafOn){rafOn=true;requestAnimationFrame(loop);}
}
let rafOn=false;
function loop(){if(!screens.game.classList.contains('hidden'))Renderer.draw();requestAnimationFrame(loop);}
function resize(){if(!canvas)return;const cw=$('#cw');if(!cw||!cw.clientWidth)return;const dpr=window.devicePixelRatio||1;const w=cw.clientWidth,h=cw.clientHeight;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);const touch=document.body.classList.contains('show-touch');Renderer.offY=touch?Math.min(110,h*0.16):0;Renderer.computeCell(w,touch?h-Renderer.offY*2:h);}

function refresh(){if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(()=>{refreshQueued=false;doRefresh();});}
function doRefresh(){
 if(!G||screens.game.classList.contains('hidden'))return;
 if(G.zoneId!==lastZone){lastZone=G.zoneId;Renderer.clearFx();Sound.setZone();}
 renderHud();renderSide();renderLog();renderThreats();renderCtx();checkHints();
}

// ---------- HUD ----------
function standing(r){return r>=50?['Trusted','#8f8']:r>=20?['Friendly','#bf8']:r>-20?['Neutral','#aaa']:r>-50?['Hostile','#f96']:['Kill on sight','#f44'];}
function bar(v,max,col,label){const p=Math.max(0,Math.min(100,Math.round(v/max*100)));return `<span class="hbar" title="${label}"><i style="width:${p}%;background:${col}"></i></span>`;}
function renderHud(){
 const p=G.p,d=p.d,h=$('#hud');const night=Game.isNight();
 const statuses=p.statuses.filter(s=>STATUSES[s.id]).map(s=>{const sd=STATUSES[s.id];return `<span class="chip" style="border-color:${sd.col};color:${sd.col}" data-tip="${esc(sd.n+': '+sd.desc+(s.t<9000?' ('+Math.ceil(s.t)+')':''))}">${esc(sd.n)}</span>`;});
 if(p.hunger>=70)statuses.push(`<span class="chip warn" data-tip="Hungry: eat something soon. At 100 you start starving.">Hungry</span>`);
 if(p.fatigue>=70)statuses.push(`<span class="chip warn" data-tip="Tired: sleep in a bed. At 90 you are exhausted.">Tired</span>`);
 if(d.weight>d.carry)statuses.push(`<span class="chip bad" data-tip="Overloaded: you move slowly. Drop something.">Overloaded</span>`);
 if(p.strain>d.strainTol)statuses.push(`<span class="chip chrome" data-tip="Chrome strain over tolerance (${p.strain}/${d.strainTol}). Malfunctions, and the Echo hears you better.">Strain</span>`);
 if(p.drift>d.driftTol)statuses.push(`<span class="chip flesh" data-tip="Drift over tolerance (${p.drift}/${d.driftTol}). The Flesh wants things.">Drift</span>`);
 if(Game.inSafe(p.x,p.y))statuses.push(`<span class="chip safe" data-tip="Safe ground. Hostiles won't follow you in here.">Safe</span>`);
 const hpc=p.hp<d.maxhp*0.3?'#ff4040':'#e0484a';
 const att=G.attention;const attLabel=att>=75?'IT SEES YOU':att>=50?'Watched':att>=25?'Noticed':att>=10?'Faint signal':'Quiet';
 h.innerHTML=`
 <div class="hud-row">
  <span class="hud-name"><img src="${Renderer.spriteURL('pc_'+p.cls,32)}"> <b>${esc(p.name)}</b> <span class="muted">Lv${p.level} ${esc(CLASSES[p.cls].name)}${p.spec?' · '+esc(SPECS[p.spec].name):''}</span>${p.tp||p.sp?' <span class="chip lvl" data-tip="Unspent points — open Character (C)">▲</span>':''}</span>
  <span class="hud-v" data-tip="Health. Injuries and statuses below.">HP <b style="color:${hpc}">${Math.max(0,Math.round(p.hp))}</b>/${d.maxhp}${bar(p.hp,d.maxhp,hpc,'HP')}</span>
  <span class="hud-v" data-tip="Stamina: spent by abilities, regenerates each turn.">ST ${Math.round(p.stam)}${bar(p.stam,d.maxstam,'#4fb07a','Stamina')}</span>
  <span class="hud-v" data-tip="Food. Full bar = fed.">FOOD${bar(120-p.hunger,120,'#d8a040','Food')}</span>
  <span class="hud-v" data-tip="Rest. Full bar = rested. Sleep in beds.">REST${bar(120-p.fatigue,120,'#8888d0','Rest')}</span>
  <span class="hud-v" data-tip="Creds: the city's money.">¢ <b>${p.creds}</b></span>
  <span class="hud-v" data-tip="${night?'Night (20:00–06:00): vision drops, the city changes, vendors close.':'Day. Night falls at 20:00.'}">${night?'☾':'☀'} Day ${G.day} ${Game.timeStr()}</span>
  <span class="hud-v loc" data-tip="${esc(G.zone.def.desc)}">${esc(Game.locationName())}</span>
  <span class="hud-v echo" data-tip="Attention: how closely the city is watching you. Terminals, chrome, Echo tiles and night kills raise it.">◉ ${attLabel}${bar(att,100,'#b07aff','Attention')}</span>
  <button class="hud-menu" id="menuBtn" title="Menu (Esc)">☰</button>
  <button class="hud-menu side-toggle" id="sideBtn" title="Gear">▤</button>
 </div>
 <div class="hud-row chips">${statuses.join('')||'<span class="muted">No conditions.</span>'}</div>`;
 const tb=h.getBoundingClientRect().bottom;$('#toasts').style.top=(tb+(document.body.classList.contains('show-touch')?52:10))+'px';
 $('#menuBtn').onclick=()=>pauseMenu();$('#sideBtn').onclick=()=>$('#side').classList.toggle('open');
 bindTips(h);
}

// ---------- SIDE PANEL ----------
const TABS=[['gear','Gear','I'],['char','Self','C'],['abil','Skills','H'],['quest','Leads','Q'],['fac','Rep','P'],['map','City','M']];
function renderSide(){
 const s=$('#side');clear(s);
 const close=el('div','side-close',s,'✕ close');close.onclick=()=>s.classList.remove('open');
 const tabs=el('div','tabs',s);
 for(const [id,lab,key] of TABS){const t=el('div','tab'+(sideTab===id?' on':''),tabs,lab+(id==='char'&&(G.p.tp||G.p.sp)?' <b class="dot">●</b>':''));t.title=lab+' ('+key+')';t.onclick=()=>{sideTab=id;Sound.play('ui');renderSide();};}
 const pane=el('div','pane',s);
 ({gear:paneGear,char:paneChar,abil:paneAbil,quest:paneQuest,fac:paneFac,map:paneMap})[sideTab](pane);
 bindTips(s);
}
function icon(id,size){return `<img class="ic" src="${Renderer.spriteURL('it_'+id,32)}" width="${size||24}" height="${size||24}">`;}
function paneGear(pane){
 const p=G.p,d=p.d;
 el('div','sec',pane,'Equipped');
 const eq=el('div','eq-grid',pane);
 for(const [slot,lab] of [['weapon','Weapon'],['body','Body'],['head','Head'],['back','Back'],['tool','Tool']]){
  const it=p.eq[slot];const b=el('div','eq-slot'+(it?'':' empty'),eq);
  b.innerHTML=it?`${icon(it.id,28)}<div><div class="eq-lab">${lab}</div><div>${esc(Game.itemName(it))}</div>${itemSub(it)}</div>`:`<div class="eq-lab">${lab}</div><div class="muted">—</div>`;
  if(it)b.onclick=()=>itemMenu(it,slot);}
 const w=Game.totalWeight();
 el('div','sec',pane,`Pack <span class="muted">${w} / ${d.carry} kg</span>`);
 el('div','wbar',pane).innerHTML=`<i style="width:${Math.min(100,w/d.carry*100)}%;background:${w>d.carry?'#e44':'#7a8a6a'}"></i>`;
 const inv=el('div','inv-grid',pane);
 if(!p.inv.length)el('div','muted',pane,'Your pack is empty.');
 const sorted=p.inv.slice().sort((a,b)=>TYPE_ORDER.indexOf(ITEMS[a.id].type)-TYPE_ORDER.indexOf(ITEMS[b.id].type));
 for(const it of sorted){const dd=ITEMS[it.id];const c=el('div','inv-cell',inv);c.innerHTML=`${icon(it.id,32)}${it.qty>1?`<span class="qty">${it.qty}</span>`:''}`;c.dataset.tip=Game.itemName(it)+' — '+dd.desc;c.onclick=()=>itemMenu(it);}
 if(p.chrome.length||p.flesh.length){el('div','sec',pane,'Body');
  for(const c of p.chrome)el('div','bod chrome',pane,`${icon(c,20)} ${esc(ITEMS[c].name)}`).dataset.tip=ITEMS[c].desc;
  for(const f of p.flesh)el('div','bod flesh',pane,`${icon(f,20)} ${esc(ITEMS[f].name)}`).dataset.tip=ITEMS[f].desc;
  el('div','muted small',pane,`Strain ${p.strain}/${d.strainTol} · Drift ${p.drift}/${d.driftTol}`);}
}
const TYPE_ORDER=['weapon','thrown','ammo','armor','tool','med','drug','food','chrome','flesh','mat','val','quest'];
function itemSub(it){const d=ITEMS[it.id];const b=[];
 if(d.type==='weapon'){b.push(`${d.dmg[0]}-${d.dmg[1]} dmg`);if(d.ranged)b.push(`rng ${d.range}`,`${it.clip||0}/${d.clip} ${d.ammo}`);else if(d.ammo)b.push(`${it.clip||0}/${d.clip} cell`);}
 if(d.arm)b.push(`armor ${d.arm}`);if(it.dur!==undefined&&d.dur)b.push(`dur ${it.dur}/${d.dur}`);
 return b.length?`<div class="muted small">${b.join(' · ')}</div>`:'';}
function itemDetail(it){const d=ITEMS[it.id];const lines=[];
 lines.push(`<div class="it-head">${icon(it.id,48)}<div><b style="color:${d.col}">${esc(Game.itemName(it))}</b><div class="muted">${d.type}${d.slot?' · '+d.slot:''} · ${d.wt} kg · worth ~${d.val}¢</div></div></div>`);
 lines.push(`<p>${esc(d.desc)}</p>`);
 const st=[];
 if(d.dmg)st.push(`Damage ${d.dmg[0]}–${d.dmg[1]}`);if(d.ranged)st.push(`Range ${d.range}`,`Clip ${d.clip} (${d.ammo})`,`Noise ${d.noise||10}`);if(d.burst)st.push(`Burst ×${d.burst}`);
 if(d.speed&&d.speed!==100)st.push(d.speed<100?'Fast':'Slow');if(d.props&&d.props.length)st.push('Causes: '+[...new Set(d.props)].join(', '));if(d.hands===2)st.push('Two-handed');if(d.reqStr)st.push(`Needs STR ${d.reqStr}`);
 if(d.armorPierce)st.push(d.armorPierce>50?'Ignores armor':`Pierce ${d.armorPierce}`);if(d.closeBonus)st.push('Brutal up close');if(d.scoped)st.push('Scoped');if(d.splash)st.push('Splash');
 if(d.arm!==undefined&&d.type==='armor')st.push(`Armor ${d.arm}`);if(d.carry)st.push(`Carry +${d.carry}`);if(d.vision)st.push(`Night vision +${d.vision}`);if(d.immune)st.push('Immune: '+d.immune.join(', '));
 if(d.heal)st.push(`Heals ${d.heal}`);if(d.hunger)st.push(`Food ${d.hunger}`);if(d.cure)st.push('Treats: '+d.cure.map(c=>STATUSES[c]?STATUSES[c].n:c).join(', '));if(d.status&&STATUSES[d.status[0]])st.push('Effect: '+STATUSES[d.status[0]].n);if(d.poison)st.push(`${Math.round(d.poison*100)}% food poisoning`);
 if(d.strain!==undefined)st.push(`Strain +${d.strain}`,`Slot: ${d.cslot}`);if(d.drift!==undefined)st.push(`Drift +${d.drift}`);if(d.fx)st.push('Grants: '+Object.entries(d.fx).map(([k,v])=>typeof v==='number'?`${k} ${v>0?'+':''}${v}`:k).join(', '));
 if(d.throwRange)st.push(`Throw range ${d.throwRange}`);if(it.dur!==undefined&&d.dur)st.push(`Durability ${it.dur}/${d.dur}`);if(it.mods&&it.mods.length)st.push('Mods: '+it.mods.map(m=>WEAPON_MODS[m].name).join(', '));
 if(st.length)lines.push(`<div class="it-stats">${st.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`);
 // comparison
 const slot=d.type==='weapon'?'weapon':d.type==='armor'?d.slot:null;const cur=slot&&G.p.eq[slot];
 if(cur&&cur!==it){const cd=ITEMS[cur.id];if(d.dmg&&cd.dmg)lines.push(`<div class="muted small">Equipped: ${esc(cd.name)} ${cd.dmg[0]}–${cd.dmg[1]}</div>`);else if(d.arm!==undefined)lines.push(`<div class="muted small">Equipped: ${esc(cd.name)} armor ${cd.arm||0}</div>`);}
 return lines.join('');}
function itemMenu(it,slot){
 const d=ITEMS[it.id];const opts=[];
 if(slot){opts.push({t:'Unequip',f:()=>Game.unequip(slot)});if(d.ranged||d.ammo)opts.push({t:'Reload (R)',f:()=>Game.reload()});}
 else{
  if(['weapon','armor'].includes(d.type)||(d.type==='tool'&&d.slot))opts.push({t:'Equip',f:()=>Game.useInst(it)});
  else if(['med','food','drug'].includes(d.type))opts.push({t:d.type==='food'?'Eat / drink':'Use',f:()=>{const hp=G.p.hp;Game.useInst(it);if(G.p.hp>hp)Renderer.fx('heal',Math.round(G.p.hp-hp));}});
  else if(d.type==='thrown')opts.push({t:'Throw…',f:()=>Game.useInst(it)});
  else if(d.type==='chrome'||d.type==='flesh')opts.push({t:G.p.cls==='medic'||Game.fxf('freeInstall')?'Install yourself…':'Needs a ripperdoc / grafter',f:()=>{if(G.p.cls==='medic'||Game.fxf('freeInstall'))Game.openInstall('self');else Game.log('Find Sable in Marrow (chrome) or Brother Ludo in the Sump (Flesh). A Medic can do it at any workbench.','#888');}});
  else if(d.use||['radio','datashard','ascension','lockpicks','toolkit'].includes(it.id))opts.push({t:'Use',f:()=>Game.useInst(it)});
  if(!d.noDrop){opts.push({t:'Drop',f:()=>Game.dropInst(it,false)});if(d.stack&&it.qty>1)opts.push({t:'Drop all',f:()=>Game.dropInst(it,true)});}
 }
 opts.push({t:'Close',f:()=>{}});
 modal(box=>{box.innerHTML=itemDetail(it);const o=el('div','opts',box);for(const op of opts){const b=el('button','opt',o,esc(op.t));b.onclick=()=>{closeModal();op.f();refresh();};}});
}
function paneChar(pane){
 const p=G.p,d=p.d;
 el('div','sec',pane,`Level ${p.level} <span class="muted">XP ${p.xp}/${Game.xpNeeded(p.level)}</span>`);
 el('div','wbar',pane).innerHTML=`<i style="width:${p.xp/Game.xpNeeded(p.level)*100}%;background:#ffe27a"></i>`;
 if(p.sp>0)el('div','notice',pane,`${p.sp} attribute point${p.sp>1?'s':''} to spend.`);
 const st=el('div','stat-grid',pane);
 const SDESC={str:'Melee damage, carry weight, heavy weapons.',agi:'Evasion, melee accuracy.',end:'HP, stamina, chrome strain tolerance.',per:'Ranged accuracy & damage, spotting.',int:'Hacking, crafting, tech dialogue.',wil:'Stamina, drift tolerance, resisting the Echo.',soc:'Prices, dialogue, faction standing.'};
 for(const s of STATS){const r=el('div','stat',st);r.dataset.tip=SDESC[s];r.innerHTML=`<span>${STAT_NAMES[s]}</span><b>${d.stats[s]}</b>`;if(p.sp>0){const b=el('button','plus',r,'+');b.onclick=(e)=>{e.stopPropagation();Game.chooseStat(s);refresh();};}}
 el('div','sec',pane,'Skills <span class="muted">(improve by using them)</span>');
 const sk=el('div','stat-grid',pane);for(const s of SKILLS){const r=el('div','stat',sk);r.dataset.tip=SKILL_DESC[s];r.innerHTML=`<span>${s}</span><b>${d.skills[s]}</b>`;}
 el('div','small muted',pane,`Armor ${d.arm} · Evade ${d.evade} · Crit ${d.crit}% · Speed ${d.speed} · Vision ${Game.visionRadius()}`);
 if(p.level>=4&&!p.spec){el('div','sec',pane,'Choose your specialization');el('div','small muted',pane,'Permanent. Unlocks a talent branch.');
  for(const id of CLASSES[p.cls].specs){const s=SPECS[id];const r=el('div','card-row spec',pane,`<b>${esc(s.name)}</b><div class="muted small">${esc(s.desc)}</div><div class="small">Talents: ${s.talents.map(t=>esc(TALENTS[t].name)).join(', ')}</div>`);r.onclick=()=>confirmBox(`Become a ${s.name}? This cannot be undone.`,()=>{Game.chooseSpec(id);refresh();});}}
 else if(p.level<4&&!p.spec)el('div','small muted',pane,`Specialization unlocks at level 4: ${CLASSES[p.cls].specs.map(s=>SPECS[s].name).join(' or ')}.`);
 if(p.tp>0){el('div','sec',pane,`Talents <span class="notice-in">${p.tp} point${p.tp>1?'s':''}</span>`);
  const av=Game.availableTalents();const specT=p.spec?SPECS[p.spec].talents:[];
  const groups=[['Specialization',av.filter(t=>specT.includes(t))],['Class',av.filter(t=>TALENTS[t].cls&&!specT.includes(t))],['General',av.filter(t=>!TALENTS[t].cls)]];
  for(const [gname,list] of groups){if(!list.length)continue;el('div','sub',pane,gname);
   for(const id of list){const t=TALENTS[id];const r=el('div','card-row talent'+(t.ability?' ab':''),pane,`<b>${esc(t.name)}</b>${t.ability?' <span class="tagx">ability</span>':''}<div class="muted small">${esc(t.desc)}</div>`);r.onclick=()=>{Game.chooseTalent(id);Sound.play('level');refresh();};}}}
 if(p.talents.length){el('div','sec',pane,'Your talents');for(const t of p.talents)el('div','small',pane,`• <b>${esc(TALENTS[t].name)}</b> <span class="muted">${esc(TALENTS[t].desc)}</span>`);}
}
function paneAbil(pane){
 const p=G.p;el('div','small muted',pane,'Press the key, or tap. Abilities cost stamina and cool down in turns.');
 for(const id in p.abilities){const ab=ABILITIES[id],st=p.abilities[id];const ready=st.cd<=0&&p.stam>=ab.cost;
  const r=el('div','card-row abil'+(ready?'':' dim'),pane,`<b>[${ab.key}] ${esc(ab.name)}</b> <span class="muted small">${ab.cost} st · cd ${ab.cd}</span>${st.cd>0?` <span class="cd">${Math.ceil(st.cd)}</span>`:''}<div class="muted small">${esc(ab.desc)}</div>`);r.onclick=()=>{$('#side').classList.remove('open');useAbility(id);};}
 el('div','sec',pane,'Actions');
 for(const [k,lab,fn] of [['R','Reload',()=>Game.reload()],['F','Fire at target',startFire],['T','Throw…',throwMenu],['Z','Rest (wait 10 turns)',rest],['X','Examine',()=>startLook()],['E','Interact / context',contextAction]]){const r=el('div','card-row',pane,`<b>[${k}]</b> ${lab}`);r.onclick=()=>{$('#side').classList.remove('open');fn();refresh();};}
}
function paneQuest(pane){
 const ids=Object.keys(G.quests);
 const act=ids.filter(i=>G.quests[i].state==='active'),done=ids.filter(i=>G.quests[i].state!=='active');
 if(!ids.length)el('div','muted',pane,'No leads yet. People talk. Listen.');
 if(act.length)el('div','sec',pane,'Active');
 for(const id of act){const q=G.quests[id],qd=QUESTS[id];const f=qd.fac&&FACTIONS[qd.fac];
  el('div','card-row quest',pane,`<b>${esc(qd.name)}</b>${f?` <span class="small" style="color:${f.col}">${esc(f.short)}</span>`:''}<div class="small">▸ ${esc(qd.stages[Math.min(q.stage,qd.stages.length-1)].text)}</div><div class="muted small">${esc(qd.desc)}</div>`);}
 if(done.length){el('div','sec',pane,'Finished');for(const id of done)el('div','small muted',pane,`${G.quests[id].state==='done'?'✓':'✗'} ${esc(QUESTS[id].name)}`);}
 el('div','sec',pane,'Ways out');
 const esc_=[['skyhook','Helicopter — Halcyon Tower roof'],['boat','Kesh\'s boat — Rust Docks'],['power','The Undercity Line — Sump platform'],['chorus','The Heart — The Static']];
 let any=false;for(const [q,lab] of esc_){if(G.quests[q]){any=true;const s=G.quests[q];el('div','small',pane,`${s.state==='done'?'✓':'◌'} ${lab} <span class="muted">(${esc(QUESTS[q].stages[Math.min(s.stage,QUESTS[q].stages.length-1)].text)})</span>`);}}
 if(!any)el('div','small muted',pane,'You haven\'t found a way out. Someone must know one.');
}
function paneFac(pane){
 el('div','small muted',pane,'Standing affects prices, who shoots first, where you can rest, and how this ends.');
 for(const f in FACTIONS){const fd=FACTIONS[f];const r=G.rep[f]||0;const [lab,col]=standing(r);
  const row=el('div','fac',pane);row.dataset.tip=fd.desc+(fd.hates.length?' Hates: '+fd.hates.map(h=>FACTIONS[h]?FACTIONS[h].short:h).join(', ')+'.':'');
  row.innerHTML=`<div class="fac-top"><b style="color:${fd.col}">${esc(fd.name)}</b><span style="color:${col}">${lab} (${r>0?'+':''}${r})</span></div><div class="repbar"><span class="mid"></span><i style="left:${r<0?50+r/2:50}%;width:${Math.abs(r)/2}%;background:${r<0?'#c44':fd.col}"></i></div><div class="muted small">Home: ${esc(ZONES[fd.home].name)}</div>`;}
}
function paneMap(pane){
 el('div','small muted',pane,'Districts you know. Dashed routes are gated by a faction.');
 const wrap=el('div','citymap',pane);const W=240,H=220,sx=W/4,sy=H/4;
 const known=new Set(G.p.zonesSeen);const rumored=new Set();
 const conns=CONNECTIONS.filter(c=>!Game.connRemoved(c));
 for(const c of conns){if(known.has(c[0]))rumored.add(c[1]);if(known.has(c[1]))rumored.add(c[0]);}
 const pos=id=>{const p=ZONES[id].pos;return[p[0]*sx+sx/2,p[1]*sy+sy/2-10];};
 let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%">`;
 for(const c of conns){if(!(known.has(c[0])||known.has(c[1])))continue;const [x1,y1]=pos(c[0]),[x2,y2]=pos(c[1]);const locked=c[4]&&c[4].locked&&!(G.flags['gate_'+c[0]+'_'+c[1]]||G.flags['gate_'+c[1]+'_'+c[0]]);
  svg+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${locked?FACTIONS[c[4].locked].col:'#6a6a7a'}" stroke-width="2" ${locked?'stroke-dasharray="4 3"':''}/>`;}
 for(const id in ZONES){const k=known.has(id),r=rumored.has(id);if(!k&&!r)continue;const [x,y]=pos(id);const cur=id===G.zoneId;const z=ZONES[id];
  svg+=`<g><circle cx="${x}" cy="${y}" r="${cur?13:10}" fill="${k?z.pal.w:'#1a1a22'}" stroke="${cur?'#ffe27a':k?'#222':'#555'}" stroke-width="${cur?3:1.5}" ${k?'':'stroke-dasharray="2 2"'}/>`;
  svg+=`<text x="${x}" y="${y+24}" text-anchor="middle" font-size="9" fill="${k?'#ddd':'#777'}">${esc(k?z.name.replace(/ (Blocks|Street Market|Industrial|Heights)$/,''):'???')}</text>`;
  if(k)svg+=`<text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="9" fill="#000" font-weight="bold">${'!'.repeat(Math.min(3,Math.ceil(z.danger/2)))}</text>`;svg+='</g>';}
 svg+='</svg>';wrap.innerHTML=svg;
 el('div','sec',pane,esc(G.zone.name));
 el('div','small muted',pane,esc(G.zone.def.desc));
 const z=G.zone;const places=z.buildings.filter(b=>b.prefab&&seenBuilding(z,b));
 if(places.length){el('div','sub',pane,'Known places');for(const b of places){const pf=PREFABS[b.prefab];const safe=b.safe?`<span class="safe-t">${b.safe===1?'safe':'safe · '+FACTIONS[b.safe].short}</span>`:'';const boss=pf.boss?' <span class="bad-t">danger</span>':'';el('div','small',pane,`• ${esc(b.name)} ${safe}${boss}`);}}
 const exits=z.exits.filter(e=>z.seen[e.y*z.w+e.x]);if(exits.length){el('div','sub',pane,'Known routes out');for(const e of exits)el('div','small',pane,`• ${e.edge} → ${G.zones[e.to]&&G.zones[e.to].visited?esc(ZONES[e.to].name):'unknown'}${e.locked?` <span class="bad-t">gated (${FACTIONS[e.locked].short})</span>`:''}`);}
}
function seenBuilding(z,b){for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(z.seen[y*z.w+x])return true;return false;}

// ---------- LOG / THREATS / CONTEXT ----------
function renderLog(){const l=$('#log');const n=Math.min(G.log.length,40);let h='';for(let i=G.log.length-n;i<G.log.length;i++){const e=G.log[i];h+=`<div style="color:${e.c}">${esc(e.t)}</div>`;}l.innerHTML=h;l.scrollTop=l.scrollHeight;}
function renderThreats(){const t=$('#threats');const list=Game.enemiesVisible().sort((a,b)=>Game.dist(a.x,a.y,G.p.x,G.p.y)-Game.dist(b.x,b.y,G.p.x,G.p.y)).slice(0,5);
 if(list.length>lastEnemyCount&&walking){clearTimeout(walking);walking=null;}
 if(list.length>lastEnemyCount)Sound.play('alert');lastEnemyCount=list.length;
 t.innerHTML=list.map(e=>{const d=ENEMIES[e.def];const tag=d.tags.includes('boss')?'<b class="bad-t">BOSS</b> ':d.tags.includes('elite')?'<b class="warn-t">elite</b> ':'';return `<div class="threat" data-x="${e.x}" data-y="${e.y}"><img src="${Renderer.spriteURL('en_'+e.def,32)}"><div><div>${tag}${esc(e.name)}</div><div class="tbar"><i style="width:${e.hp/e.maxhp*100}%"></i></div></div><span class="muted small">${Game.dist(e.x,e.y,G.p.x,G.p.y)}</span></div>`;}).join('');
 for(const d of t.querySelectorAll('.threat')){d.onmouseenter=()=>{Renderer.hover={x:+d.dataset.x,y:+d.dataset.y};};d.onclick=()=>{const e=Game.entAt(+d.dataset.x,+d.dataset.y);if(e)showTip(Game.describeEnt(e),null,true);};}}
function contextFor(){
 if(!G||G.dead||G.ending)return null;const p=G.p,z=G.zone;
 if(z.items.some(i=>i.x===p.x&&i.y===p.y))return{label:'Take',key:'G',f:()=>Game.pickup()};
 const here=Game.tile(p.x,p.y);
 if(here===T.EXIT){const ex=z.exits.find(e=>e.x===p.x&&e.y===p.y);if(ex)return{label:'Travel',key:'E',f:()=>travel(ex)};}
 const under=z.objs.find(o=>o.x===p.x&&o.y===p.y);if(under)return{label:objLabel(under),key:'E',f:()=>Game.interactObj(under)};
 if(TILE_DEFS[here].i&&here!==T.EXIT)return{label:tileVerb(here),key:'E',f:()=>Game.interactTile(p.x,p.y)};
 for(const [dx,dy] of DIRS8){const x=p.x+dx,y=p.y+dy;const e=Game.entAt(x,y);if(e&&e.kind==='npc'&&!e.hostile)return{label:'Talk to '+e.name,key:'E',f:()=>Game.talk(e)};}
 for(const [dx,dy] of DIRS8){const x=p.x+dx,y=p.y+dy;const o=z.objs.find(o=>o.x===x&&o.y===y);if(o)return{label:objLabel(o),key:'E',f:()=>Game.interactObj(o)};}
 for(const [dx,dy] of DIRS8){const x=p.x+dx,y=p.y+dy;const t=Game.tile(x,y);if(TILE_DEFS[t].i&&t!==T.EXIT&&!Game.entAt(x,y))return{label:tileVerb(t),key:'E',f:()=>Game.interactTile(x,y)};}
 return null;}
function objLabel(o){return o.type==='wounded'?'Help the wounded':o.type==='civilian'?'Speak to civilian':o.type==='caravan'?'Trade with caravan':'Inspect';}
function tileVerb(t){return({[T.CONTAINER]:'Search cabinet',[T.CRATE]:'Search crate',[T.SHELF]:'Search shelves',[T.VENDING]:'Search vending machine',[T.CACHE]:'Open night cache',[T.STALL]:'Search stall',[T.TERMINAL]:'Use terminal',[T.SWITCH]:'Use switch panel',[T.SERVER]:'Inspect server',[T.BED]:'Sleep',[T.BENCH]:'Use workbench',[T.DOCCHAIR]:'Surgical chair',[T.DOOR]:'Open door',[T.DOOR_LOCKED]:'Locked door',[T.GATE]:'Sealed gate',[T.GRAFFITI]:'Read graffiti',[T.SIGN]:'Read sign',[T.ALTAR]:'Touch the altar',[T.HELIPAD]:'Helicopter',[T.BOAT]:'Kesh\'s boat',[T.TRAIN]:'Train car',[T.HEART]:'The Heart',[T.GENERATOR]:'Generator',[T.ECHO]:'Wrong floor'})[t]||TILE_DEFS[t].n;}
function travel(ex){const to=G.zones[ex.to];const known=to&&to.visited;confirmBox(`Travel ${ex.edge} to ${known?to.name:'an unknown district'}?${Game.isNight()?' It is night.':''}`,()=>{Game.fx('fade');Game.enterZone(ex.to,G.zoneId);refresh();});}
function renderCtx(){const b=$('#ctxbtn');const c=contextFor();if(!c){b.classList.add('hidden');return;}b.classList.remove('hidden');b.innerHTML=`${esc(c.label)} <span class="k">${c.key}</span>`;b.onclick=()=>{Sound.play('ui');c.f();refresh();};}
function contextAction(){const c=contextFor();if(c){c.f();refresh();}else{Game.wait();refresh();}}

// ============================================================
// TOOLTIPS / EXAMINE
// ============================================================
function describeTile(x,y){
 const z=G.zone;if(x<0||y<0||x>=z.w||y>=z.h)return null;const i=y*z.w+x;if(!z.seen[i])return 'Unexplored.';
 const out=[];const vis=G.vis&&G.vis[i];
 if(x===G.p.x&&y===G.p.y)out.push(`<b>You.</b> ${esc(G.p.name)}, ${esc(CLASSES[G.p.cls].name)}.`);
 const e=vis&&Game.entAt(x,y);if(e&&!e.hidden){if(e.kind==='npc'){const n=NPCS[e.def];out.push(`<b style="color:${n.col}">${esc(n.name)}</b> — ${esc(n.role)}. ${esc(n.desc)}`);}else out.push(esc(Game.describeEnt(e)));}
 const its=z.items.filter(it=>it.x===x&&it.y===y);if(its.length)out.push('On the ground: '+its.map(it=>esc(Game.itemName(it))).join(', '));
 const t=z.t[i];let tn=TILE_DEFS[t].n;const k=x+','+y;
 if(z.conts[k])tn=z.conts[k].kind+(z.conts[k].opened&&!z.conts[k].items.length?' (empty)':'');
 if(t===T.DOOR_LOCKED)tn+=z.locked[k]&&z.locked[k].key?' — needs a key':' — can be picked';
 if(t===T.EXIT){const ex=z.exits.find(e=>e.x===x&&e.y===y);if(ex)tn=`route ${ex.edge} → ${G.zones[ex.to]&&G.zones[ex.to].visited?ZONES[ex.to].name:'unknown district'}`;}
 if(t===T.GATE){const ex=z.exits.find(e=>e.x===x&&e.y===y);if(ex&&ex.locked)tn=`sealed gate (${FACTIONS[ex.locked].name})`;}
 out.push(`<span class="muted">${esc(tn[0].toUpperCase()+tn.slice(1))}${TILE_DEFS[t].c?' · cover':''}${TILE_DEFS[t].h?' · hazard':''}</span>`);
 const b=Game.buildingAt(x,y);if(b)out.push(`<span class="muted small">${esc(b.name)}${b.safe?' · safe':''}</span>`);
 if(!vis)out.push('<span class="muted small">(remembered)</span>');
 return out.join('<br>');}
let tipTimer=null;
function showTip(html,pos,sticky){const t=$('#tooltip');if(!html){t.classList.add('hidden');return;}t.innerHTML=html;t.classList.remove('hidden');
 const cw=$('#cw').getBoundingClientRect();if(pos){let x=pos.x-cw.left+14,y=pos.y-cw.top+14;if(x+260>cw.width)x=cw.width-270;if(y+120>cw.height)y=pos.y-cw.top-110;t.style.left=Math.max(4,x)+'px';t.style.top=Math.max(4,y)+'px';}else{t.style.left='10px';t.style.top='60px';}
 clearTimeout(tipTimer);if(sticky)tipTimer=setTimeout(()=>t.classList.add('hidden'),4500);}
function bindTips(root){for(const n of root.querySelectorAll('[data-tip]')){n.onmouseenter=ev=>floatTip(n.dataset.tip,ev);n.onmouseleave=()=>floatTip(null);n.addEventListener('touchstart',()=>{floatTip(n.dataset.tip,n.getBoundingClientRect());setTimeout(()=>floatTip(null),2500);},{passive:true});}}
let ftip=null;function floatTip(text,ev){if(!ftip){ftip=el('div','ftip hidden',document.body);}if(!text){ftip.classList.add('hidden');return;}ftip.textContent=text;ftip.classList.remove('hidden');const x=ev.clientX!==undefined?ev.clientX:ev.left,y=ev.clientY!==undefined?ev.clientY:ev.bottom;ftip.style.left=Math.min(window.innerWidth-250,x+10)+'px';ftip.style.top=Math.min(window.innerHeight-60,y+12)+'px';}

// ============================================================
// TARGETING (fire / throw / abilities / look)
// ============================================================
function startFire(){const c=Game.canFire();if(!c.ok){Game.log(c.msg,'#f66');Sound.play('deny');refresh();return;}
 const range=c.w.range+G.p.d.range;const list=Game.enemiesVisible().filter(e=>Game.dist(e.x,e.y,G.p.x,G.p.y)<=range&&Game.los(G.p.x,G.p.y,e.x,e.y)).sort((a,b)=>Game.dist(a.x,a.y,G.p.x,G.p.y)-Game.dist(b.x,b.y,G.p.x,G.p.y));
 if(!list.length){Game.log('No target in range and sight.','#f66');Sound.play('deny');refresh();return;}
 beginTarget({kind:'fire',mode:'enemy',list,range});}
function throwMenu(){const th=G.p.inv.filter(i=>ITEMS[i.id].type==='thrown');if(!th.length){Game.log('Nothing to throw.','#888');refresh();return;}
 if(th.length===1){Game.useInst(th[0]);return;}modal(box=>{el('h3',null,box,'Throw what?');const o=el('div','opts',box);for(const it of th){const b=el('button','opt',o,`${icon(it.id,22)} ${esc(Game.itemName(it))}`);b.onclick=()=>{closeModal();Game.useInst(it);};}const c=el('button','opt',o,'Cancel');c.onclick=closeModal;});}
function useAbility(id){const r=Game.useAbility(id,null);if(r===false)Sound.play('deny');refresh();}
function startLook(){beginTarget({kind:'look',mode:'tile',range:99,cursor:{x:G.p.x,y:G.p.y}});}
function tilesInRange(r,filter){const out=[];for(let y=G.p.y-r;y<=G.p.y+r;y++)for(let x=G.p.x-r;x<=G.p.x+r;x++){if(x<0||y<0||x>=G.zone.w||y>=G.zone.h)continue;if(Game.dist(x,y,G.p.x,G.p.y)>r)continue;if(!G.vis[y*G.zone.w+x])continue;if(filter&&!filter(x,y))continue;out.push([x,y]);}return out;}
function beginTarget(t){closeAllModals();target=t;
 if(t.mode==='enemy'){t.idx=0;Renderer.targets=t.list.map(e=>({x:e.x,y:e.y}));Renderer.targetIdx=0;Renderer.rangeTiles=null;}
 else{t.valid=tilesInRange(Math.min(t.range,14),t.filter);Renderer.rangeTiles=t.kind==='look'?null:t.valid;if(!t.cursor)t.cursor={x:G.p.x,y:G.p.y};Renderer.targets=[t.cursor];Renderer.targetIdx=0;}
 const lab={fire:'Fire',throw:'Throw',ability:'Target',look:'Examine'}[t.kind];
 targetBar(`${lab}: ${t.mode==='enemy'?'Tab/arrows to cycle':'arrows or tap a tile'} · Enter/F to confirm · Esc to cancel`);
 if(t.kind==='look')showTip(describeTile(t.cursor.x,t.cursor.y));}
function targetBar(text){let b=$('#tbar');if(!b){b=el('div','tbar-top',$('#cw'));b.id='tbar';}if(!text){b.remove();return;}b.innerHTML=`${esc(text)} <button class="btn sm" id="tcOk">✓</button> <button class="btn sm" id="tcNo">✕</button>`;$('#tcOk').onclick=confirmTarget;$('#tcNo').onclick=cancelTarget;}
function moveCursor(dx,dy){const t=target;if(t.mode==='enemy'){t.idx=(t.idx+(dx+dy>=0?1:-1)+t.list.length)%t.list.length;Renderer.targetIdx=t.idx;return;}
 const nx=t.cursor.x+dx,ny=t.cursor.y+dy;if(Game.dist(nx,ny,G.p.x,G.p.y)>t.range)return;t.cursor.x=nx;t.cursor.y=ny;Renderer.targets=[t.cursor];if(t.kind==='look')showTip(describeTile(nx,ny));}
function confirmTarget(){const t=target;if(!t)return;endTarget();
 if(t.kind==='fire'){const e=t.list[t.idx];if(e&&e.hp>0){Game.fireAt(e);}}
 else if(t.kind==='look'){showTip(describeTile(t.cursor.x,t.cursor.y),null,true);return;}
 else{const x=t.cursor?t.cursor.x:t.list[t.idx].x,y=t.cursor?t.cursor.y:t.list[t.idx].y;
  if(t.mode==='tile'&&t.valid&&!t.valid.some(([a,b])=>a===x&&b===y)){Game.log('Can\'t target there.','#f66');Sound.play('deny');refresh();return;}
  if(t.kind==='throw')Game.throwAt(t.data,x,y);
  else if(t.kind==='ability'){const tgt=t.mode==='enemy'?t.list[t.idx]:{x,y};Game.useAbility(t.data,tgt);}}
 refresh();}
function cancelTarget(){endTarget();Game.log('Cancelled.','#888');refresh();}
function endTarget(){target=null;Renderer.targets=null;Renderer.rangeTiles=null;targetBar(null);showTip(null);}

// ============================================================
// MODALS
// ============================================================
function modal(build,opts){const m=$('#modal');clear(m);m.classList.remove('hidden');const box=el('div','mbox'+(opts&&opts.wide?' wide':''),m);build(box);modalStack=[box];bindTips(box);
 if(!(opts&&opts.noClose)){const x=el('button','mclose',box,'✕');x.onclick=()=>{closeModal();refresh();};}}
function closeModal(){const m=$('#modal');m.classList.add('hidden');clear(m);modalStack=[];showTip(null);}
function closeAllModals(){closeModal();}
function modalOpen(){return !$('#modal').classList.contains('hidden');}
function confirmBox(text,yes,no){modal(box=>{el('div','mtext',box,esc(text));const o=el('div','opts row',box);const y=el('button','opt primary',o,'Yes');y.onclick=()=>{closeModal();yes&&yes();refresh();};const n=el('button','opt',o,'No');n.onclick=()=>{closeModal();no&&no();refresh();};y.focus();},{noClose:true});}

const UI={
 onLog(msg,col){
  if(/spots you/.test(msg))Sound.play('alert');else if(/^You open the door|^You close the door/.test(msg))Sound.play('door');else if(/^Taken:|^Bought|^Crafted/.test(msg))Sound.play('pickup');
  else if(/BOOM/.test(msg))Sound.play('boom');else if(/Glass crunches/.test(msg))Sound.play('glass');else if(/^Radio:/.test(msg))Sound.play('radio');
  if(col==='#ffe27a'&&/^(New objective|Completed|Level|Talent|Failed)|: /.test(msg))toast(msg,col);
  else if(col==='#ccf'&&/says:|hums:|lights up|Something crystallizes/.test(msg))toast(msg,col);
  else if(/(\+|-)\d+ \(-?\d+\)$/.test(msg))toast(msg,col);
  refresh();},
 refresh(){refresh();},
 fx(kind,d){Renderer.fx(kind,d);
  switch(kind){case 'shot':{const w=d&&G&&d.fx===G.p.x&&d.fy===G.p.y&&G.p.eq.weapon?ITEMS[G.p.eq.weapon.id]:null;Sound.play(d&&d.thrown?'miss':(w&&(w.id==='laser'||w.id==='railpistol')?'laser':'shot'));break;}
   case 'hit':Sound.play(d&&d.p?'phit':(d&&d.crit?'crit':'hit'));break;case 'whiff':Sound.play('miss');break;case 'death':Sound.play('kill');break;case 'death_p':Sound.play('death');break;
   case 'glitch':Sound.play('echo');break;case 'levelup':Sound.play('level');toast('Level up! Spend your points in Character (C).','#ffe27a');break;case 'quest':Sound.play('quest');break;
   case 'zone':Sound.play('zone');break;case 'reload':Sound.play('reload');break;case 'shake':Sound.play('boom');break;}},
 confirm(text,yes){confirmBox(text,yes);},
 choice(text,opts){modal(box=>{el('div','mtext',box,esc(text));const o=el('div','opts',box);for(const op of opts){if(op.cond&&!op.cond())continue;const b=el('button','opt',o,esc(op.t));b.onclick=()=>{closeModal();op.f&&op.f();refresh();};}},{noClose:true});},
 openLoot(c,x,y){const draw=()=>{if(!c.items.length){closeModal();refresh();return;}modal(box=>{el('h3',null,box,esc(c.kind[0].toUpperCase()+c.kind.slice(1)));el('div','muted small',box,`Pack ${Game.totalWeight()} / ${G.p.d.carry} kg`);
   const o=el('div','loot',box);for(const it of c.items.slice()){const d=ITEMS[it.id];const r=el('div','loot-row',o,`${icon(it.id,28)}<div class="grow"><b style="color:${d.col}">${esc(Game.itemName(it))}</b><div class="muted small">${esc(d.desc)}</div></div><span class="muted small">${(d.wt*(it.qty||1)).toFixed(1)}kg</span>`);r.onclick=()=>{if(Game.addItemChecked(it)){c.items.splice(c.items.indexOf(it),1);}draw();};}
   const b=el('div','opts row',box);const a=el('button','opt primary',b,'Take all (G)');a.onclick=()=>{Game.takeAll(c);draw();};const cl=el('button','opt',b,'Leave');cl.onclick=()=>{closeModal();refresh();};});};draw();},
 openTrade(npc,caravan){const n=NPCS[npc];const draw=()=>{modal(box=>{
   const f=n.faction&&FACTIONS[n.faction];el('div','dlg-head',box,`<img src="${Renderer.spriteURL('npc_'+npc,64)}"><div><h3>${esc(n.name)}${caravan?' (caravan)':''}</h3><div class="muted">${esc(n.role)}${f?` · <span style="color:${f.col}">${f.short} ${standing(G.rep[n.faction]||0)[0]}</span>`:''}</div></div><div class="creds">¢ ${G.p.creds}</div>`);
   const cols=el('div','trade',box);const bc=el('div','tcol',cols);el('div','sec',bc,'Buy');
   for(const e of Game.vendorStock(npc)){if(e.qty<=0)continue;const d=ITEMS[e.id];const pr=Game.price(e.id,1,npc);const r=el('div','loot-row'+(pr>G.p.creds?' dim':''),bc,`${icon(e.id,26)}<div class="grow">${esc(d.name)} <span class="muted">×${e.qty}</span><div class="muted small">${esc(d.desc)}</div></div><b>${pr}¢</b>`);r.dataset.tip=d.desc;r.onclick=()=>{if(Game.buy(npc,e))Sound.play('pickup');else Sound.play('deny');draw();};}
   const sc=el('div','tcol',cols);el('div','sec',sc,'Sell');const vd=VENDORS[n.vendor];
   for(const it of G.p.inv.slice()){const d=ITEMS[it.id];const ok=vd.buys.includes('*')||vd.buys.includes(d.type)||vd.buys.includes(it.id);if(!ok||d.type==='quest'&&!(it.id==='ledger'&&npc==='ives'))continue;const pr=Game.price(it.id,0,npc);const r=el('div','loot-row',sc,`${icon(it.id,26)}<div class="grow">${esc(Game.itemName(it))}</div><b>${pr}¢</b>`);r.onclick=()=>{Game.sell(npc,it);Sound.play('pickup');draw();};}
   if(!sc.querySelector('.loot-row'))el('div','muted small',sc,`${n.name} doesn't want anything you carry.`);
   el('div','muted small',box,'Prices shift with standing, Persuasion, and the hour.');},{wide:true});};draw();},
 openInstall(kind){const draw=()=>{modal(box=>{el('h3',null,box,kind==='self'?'Self-surgery':'Installation');el('div','muted small',box,'Chrome adds strain; Flesh adds drift. Past tolerance, things go wrong. Some factions will notice.');
   const p=G.p;const cand=p.inv.filter(i=>['chrome','flesh'].includes(ITEMS[i.id].type));if(!cand.length)el('div','mtext',box,'You carry nothing to install.');
   for(const it of cand){const d=ITEMS[it.id];const cost=kind==='self'?0:Game.installCost(it.id);const r=el('div','loot-row',box,`${icon(it.id,30)}<div class="grow"><b class="${d.type}">${esc(d.name)}</b><div class="muted small">${esc(d.desc)}</div><div class="small">${d.type==='chrome'?`Strain +${d.strain} (${p.strain}/${p.d.strainTol}) · slot ${d.cslot}`:`Drift +${d.drift} (${p.drift}/${p.d.driftTol})`}</div></div><b>${cost?cost+'¢':'free'}</b>`);
    r.onclick=()=>confirmBox(`Install ${d.name}? ${d.type==='chrome'?'Removal costs 100¢.':'Flesh does not come out.'}`,()=>{if(Game.install(it,kind))Sound.play('echo');draw();});}
   if(p.chrome.length){el('div','sec',box,'Installed chrome');for(const c of p.chrome){const r=el('div','loot-row',box,`${icon(c,24)}<div class="grow">${esc(ITEMS[c].name)}</div><span class="muted small">remove</span>`);r.onclick=()=>confirmBox(`Remove ${ITEMS[c].name}?`,()=>{Game.removeChrome(c);draw();});}}});};draw();},
 showDialogue(e,node){modal(box=>{const n=NPCS[e.def]||{};const f=n.faction&&FACTIONS[n.faction];
   el('div','dlg-head',box,`<img src="${Renderer.spriteURL('npc_'+e.def,64)}"><div><h3>${esc(e.name)}</h3><div class="muted">${esc(n.role||'')}${f?` · <span style="color:${f.col}">${esc(f.name)}</span> <span class="small">${standing(G.rep[n.faction]||0)[0]}</span>`:''}</div></div>`);
   el('div','mtext dlg',box,esc(node.text));const o=el('div','opts',box);
   for(const op of node.opts){if(op.cond&&!op.cond(G))continue;const b=el('button','opt',o,esc(op.t).replace(/^\[([^\]]+)\]/,'<span class="req">[$1]</span>'));b.onclick=()=>{Sound.play('click');Game.dlgChoose(e,op);if(!op.next&&!modalOpen()){}else if(!op.next)refresh();refresh();};}
  },{noClose:true});},
 closeDialogue(){closeModal();refresh();},
 targetMode(kind,data){closeModal();
  if(kind==='throw'){const d=ITEMS[data.id];const r=d.throwRange+G.p.d.throwRange;const en=Game.enemiesVisible().filter(e=>Game.dist(e.x,e.y,G.p.x,G.p.y)<=r).sort((a,b)=>Game.dist(a.x,a.y,G.p.x,G.p.y)-Game.dist(b.x,b.y,G.p.x,G.p.y))[0];
   beginTarget({kind:'throw',mode:'tile',data,range:r,cursor:en?{x:en.x,y:en.y}:{x:G.p.x,y:G.p.y},filter:(x,y)=>Game.dist(x,y,G.p.x,G.p.y)<=1||Game.los(G.p.x,G.p.y,x,y)});return;}
  if(kind==='ability'){const ab=ABILITIES[data];
   if(ab.target==='enemy'){const r=ab.range||6;const list=Game.enemiesVisible().filter(e=>Game.dist(e.x,e.y,G.p.x,G.p.y)<=r);if(!list.length){Game.log('No target for '+ab.name+'.','#f66');Sound.play('deny');refresh();return;}beginTarget({kind:'ability',mode:'enemy',data,list,range:r});return;}
   const r=(ab.range||1)+(data==='slip'?(G.p.d.flags.slipRange||0):0);
   const filter=data==='reroute'?(x,y)=>Game.tile(x,y)===T.WALL&&Game.dist(x,y,G.p.x,G.p.y)===1:(x,y)=>Game.walkableFor(x,y)&&Game.los(G.p.x,G.p.y,x,y);
   const valid=tilesInRange(r,filter);if(!valid.length){Game.log('Nowhere to use '+ab.name+'.','#f66');refresh();return;}
   beginTarget({kind:'ability',mode:'tile',data,range:r,filter,cursor:{x:valid[valid.length-1][0],y:valid[valid.length-1][1]}});}},
 openCraft(){const draw=()=>{modal(box=>{el('h3',null,box,'Workbench');el('div','muted small',box,'Crafting uses Repair or Medicine. Pickers can craft anywhere (K).');
   const groups={};for(const r of RECIPES){if(r.req&&!Game.fxf(r.req))continue;(groups[r.skill[0]]=groups[r.skill[0]]||[]).push(r);}
   for(const g in groups){el('div','sec',box,g);for(const r of groups[g]){const ok=Game.canCraft(r);const skOk=Game.skill(r.skill[0])>=r.skill[1];
     const outId=r.out[0];const ic=ITEMS[outId]?icon(outId,28):'<span class="ic-ph">⚒</span>';
     const ins=r.in.map(([id,n])=>{const have=Game.countItem(id)+(Object.values(G.p.eq).some(e=>e&&e.id===id)?1:0);return `<span class="${have>=n?'ok-t':'bad-t'}">${esc(ITEMS[id].name)} ${have}/${n}</span>`;}).join(', ');
     const row=el('div','loot-row'+(ok?'':' dim'),box,`${ic}<div class="grow"><b>${esc(r.name)}</b><div class="small">${ins}</div></div><span class="small ${skOk?'ok-t':'bad-t'}">${r.skill[0]} ${r.skill[1]}</span>`);
     if(ok)row.onclick=()=>{Game.craft(r);Sound.play('pickup');draw();};}}},{wide:true});};draw();},
 showEnd(s,end){closeModal();endTarget();clearToasts();show('end');const e=screens.end;clear(e);e.style.backgroundImage=`url(${window.ASSETS.title})`;
  const box=el('div','end-box',e);const dead=s.ending==='death';
  el('div','end-kicker',box,dead?'THE RUN IS OVER':(s.escaped?'YOU GOT OUT':'THE CITY KEEPS YOU'));
  el('h1',null,box,esc(s.endingName));
  if(end.text)el('p','end-text',box,esc(end.text));
  if(dead)el('p','end-text',box,`${esc(s.name)} died on day ${s.days}${s.cause?', killed by '+esc(s.cause):''}. ${epitaph(s)}`);
  const st=el('div','end-stats',box);
  for(const [k,v] of [['Class',s.cls+(s.spec?' · '+s.spec:'')],['Level',s.level],['Days',s.days],['Turns',s.turns],['Kills',s.kills],['Districts',s.zones],['Quests',s.quests],['Attention',s.attention]])el('div',null,st,`<span class="muted">${k}</span><b>${esc(v)}</b>`);
  if(s.chrome.length||s.flesh.length)el('p','small',box,`Body: ${esc(s.chrome.concat(s.flesh).join(', '))}`);
  const reps=Object.entries(s.rep).filter(([f,r])=>Math.abs(r)>=20).map(([f,r])=>`<span style="color:${FACTIONS[f].col}">${FACTIONS[f].short} ${r>0?'+':''}${r}</span>`);if(reps.length)el('p','small',box,'Remembered by: '+reps.join(' · '));
  if(s.unlocks&&s.unlocks.length)el('div','end-unlocks',box,s.unlocks.map(u=>'★ '+esc(u)).join('<br>'));
  const b=el('div','title-btns',box);btn(b,'New Run',showCreate,'primary');btn(b,'Title',showTitle);}
};
window.UI=UI;
function epitaph(s){if(s.days<=1)return 'The city barely noticed.';if(s.attention>=60)return 'Something in the wiring will remember the name.';if(s.kills>=20)return 'They will talk about the body count in Marrow for a week.';if(s.quests>=3)return 'People owed them. Now nobody collects.';return 'Another missing poster, eventually.';}

// ============================================================
// PAUSE / SETTINGS / HELP / CODEX / RUNS
// ============================================================
function pauseMenu(){modal(box=>{el('h3',null,box,'Paused');el('div','muted small',box,`${esc(G.p.name)} · Day ${G.day} ${Game.timeStr()} · ${esc(G.zone.name)}`);const o=el('div','opts',box);
 const items=[['Resume',()=>{}],['Save',()=>{Game.save();toast('Saved.','#8f8');}],['Settings',showSettings],['Help & controls',showHelp],['Codex',showCodex],['Save & quit to title',()=>{Game.save();showTitle();}]];
 for(const [l,f] of items){const b=el('button','opt',o,l);b.onclick=()=>{closeModal();f();};}});}
function showSettings(){modal(box=>{el('h3',null,box,'Settings');
 const sl=(lab,key)=>{const r=el('div','set-row',box);el('span',null,r,lab);const i=el('input',null,r);i.type='range';i.min=0;i.max=1;i.step=0.05;i.value=settings[key];i.oninput=()=>{settings[key]=+i.value;saveSettings();};};
 sl('Master volume','master');sl('Music','music');sl('Effects','sfx');sl('Ambience','amb');
 const tg=(lab,key)=>{const r=el('div','set-row',box);el('span',null,r,lab);const i=el('input',null,r);i.type='checkbox';i.checked=!!settings[key];i.onchange=()=>{settings[key]=i.checked;saveSettings();};};
 tg('Mute all','muted');tg('Animations & screen effects','anim');tg('Tutorial hints','hints');tg('Larger text','bigText');
 const sel=(lab,key,opts)=>{const r=el('div','set-row',box);el('span',null,r,lab);const s=el('select',null,r);for(const [v,t] of opts){const o=el('option',null,s,t);o.value=v;if(String(settings[key])===String(v))o.selected=true;}s.onchange=()=>{settings[key]=isNaN(+s.value)?s.value:+s.value;saveSettings();};};
 sel('Map zoom','zoom',ZOOM_LEVELS.map(v=>[v,Math.round(v*100)+'%']));sel('Touch controls','touch',[['auto','Auto'],['on','Always'],['off','Never']]);
 el('div','small muted',box,'Music is optional and off by default. Ambience uses quiet environmental textures.');
 const r=el('div','opts',box);const b=el('button','opt',r,'Reset hints');b.onclick=()=>{meta=Game.loadMeta();meta.hints={};Game.saveMeta(meta);toast('Hints will show again.','#8f8');};
 if(G&&!screens.game.classList.contains('hidden')){}else{const bk=el('button','opt',r,'Back');bk.onclick=()=>{closeModal();};}});}
function showHelp(){modal(box=>{el('h3',null,box,'How to survive');box.insertAdjacentHTML('beforeend',`
<div class="help">
<div><b>Move</b> arrows · WASD · numpad · YUBN diagonals · tap/click a tile to walk there</div>
<div><b>Attack</b> bump an enemy (melee) · <b>F</b> fire your gun · <b>T</b> throw · <b>R</b> reload</div>
<div><b>Use</b> bump doors, containers, terminals, beds · <b>E</b> context action · <b>G</b> pick up</div>
<div><b>1 2 3</b> abilities · <b>. / 5 / Space</b> wait · <b>Z</b> rest 10 turns · <b>X</b> examine</div>
<div><b>I C H Q P M</b> gear, character, abilities, quests, factions (P), city map · <b>K</b> craft (Pickers) · <b>Esc</b> menu</div>
<div><b>Touch</b> pad to move, the gold button does the obvious thing, long-press to examine.</div>
<div><b>Zoom</b> map −/+ buttons · mouse wheel over the map · +/− keys · 0 resets. Your zoom is saved.</div>
<hr>
<p><b>Time</b> passes with every action. Night (20:00–06:00) cuts your sight, brings out ghouls and worse, and closes vendors — but night caches appear and patrols thin out.</p>
<p><b>Injuries</b> outlast the fight. Bleeding needs bandages, fractures a splint, infection antibiotics. Hunger and fatigue are slow but real: eat, and sleep in beds — safe beds are in faction buildings.</p>
<p><b>Stealth</b>: enemies must see you to fight. Darkness, distance and the Stealth skill help. Hitting an unaware enemy is an ambush. Rocks make noise elsewhere.</p>
<p><b>Cover</b>: rubble, cars, counters and crates between you and a shooter cost them accuracy.</p>
<p><b>Chrome</b> (Sable, Marrow) and <b>Flesh</b> (Ludo, the Sump) make you stronger and stranger. Watch strain and drift.</p>
<p><b>Factions</b> remember. Killing their people, helping their enemies, finishing their work — it all moves standing, and standing opens doors.</p>
<p><b>Escape</b> is possible. Nobody will just hand you the way out. Death is permanent.</p>
</div>`);});}
function showCodex(){const m=Game.loadMeta();modal(box=>{el('h3',null,box,'Codex');el('div','muted small',box,'What you have learned across every run.');
 for(const k in CODEX){const c=CODEX[k];const got=m.codex[k];el('div','codex'+(got?'':' locked'),box,got?`<b>${esc(c.name)}</b><p>${esc(c.text)}</p>`:`<b>???</b><p class="muted">Not yet discovered.</p>`);}
 el('div','sec',box,'Endings seen');const ends=Object.keys(ENDINGS).filter(e=>e!=='death');el('div','small',box,ends.map(e=>m.endings&&m.endings[e]?`<span class="ok-t">${esc(ENDINGS[e].name)}</span>`:'<span class="muted">???</span>').join(' · '));
 el('div','sec',box,'Unlocks');el('div','small',box,`Listener class: ${m.unlocks.listener?'<span class="ok-t">unlocked</span>':'<span class="muted">locked</span>'} · Night Mode: ${m.unlocks.hardmode?'<span class="ok-t">unlocked</span>':'<span class="muted">locked</span>'}`);},{wide:true});}
function showRuns(){const m=Game.loadMeta();modal(box=>{el('h3',null,box,'Past runs');if(!(m.runs||[]).length)el('div','muted',box,'No runs yet. Everyone starts somewhere.');
 for(const r of (m.runs||[])){el('div','run-row',box,`<b>${esc(r.name)}</b> <span class="muted">${esc(r.cls)}${r.spec?' · '+esc(r.spec):''} · Lv${r.level}</span><div class="small">${r.escaped?'<span class="ok-t">'+esc(r.endingName)+'</span>':r.ending==='death'?'<span class="bad-t">Died</span>'+(r.cause?' — '+esc(r.cause):''):esc(r.endingName)} · day ${r.days} · ${r.kills} kills · ${r.zones} districts</div>`);}},{wide:true});}

// ============================================================
// HINTS / TOASTS
// ============================================================
function toast(msg,col){const t=$('#toasts');const d=el('div','toast',t,esc(msg));d.style.borderColor=col||'#666';d.style.color=col||'#ddd';setTimeout(()=>d.classList.add('out'),3600);setTimeout(()=>d.remove(),4200);const n=[...t.children].filter(c=>!c.classList.contains('hint'));while(n.length>3)n.shift().remove();}
const hintQ=[];let hintShowing=null;
function hint(id,text){if(!settings.hints)return;meta=Game.loadMeta();meta.hints=meta.hints||{};if(meta.hints[id]||hintQ.some(h=>h.id===id))return;meta.hints[id]=1;Game.saveMeta(meta);hintQ.push({id,text});pumpHints();}
function pumpHints(){if(hintShowing||!hintQ.length)return;const h=hintQ.shift();const t=$('#toasts');const d=el('div','toast hint',t,`<b>TIP</b> ${esc(h.text)} <span class="x">✕</span>`);hintShowing=d;
 const done=()=>{if(hintShowing!==d)return;hintShowing=null;d.classList.add('out');setTimeout(()=>d.remove(),500);setTimeout(pumpHints,700);};d.onclick=done;setTimeout(done,9000);}
function clearToasts(){hintQ.length=0;hintShowing=null;clear($('#toasts'));}
function checkHints(){const p=G.p,z=G.zone;
 if(Game.enemiesVisible().length)hint('enemy','Hostiles show a red ring; "!" means they\'ve seen you. Bump to melee, F to shoot. You don\'t have to fight — break line of sight and they lose you.');
 if(Game.isNight())hint('night','Night. Your sight shrinks and the city changes. Lamps (!) light the street. Night caches appear; so do things that hunt.');
 if(p.hp<p.d.maxhp*0.4)hint('lowhp','You are badly hurt. Use a bandage or medkit from your pack, or rest in a safe building. Dying ends the run.');
 if(p.hunger>=70)hint('hunger','You are hungry. Eat from your pack (Gear) before you start starving.');
 if(p.fatigue>=70)hint('tired','You are tired. Sleep in a bed — safe beds are in bars, clinics and faction halls.');
 if(p.tp>0)hint('talent','You have a talent point. Open Character (C) to choose.');
 if(p.statuses.some(s=>s.id==='bleed'))hint('bleed','Bleeding: you lose HP every turn until a bandage stops it.');
 if(z.id!=='ashgrove')hint('newzone','A new district. Each has its own crews, loot and dangers. The City tab (M) shows what you know.');
 if(G.attention>=10)hint('echo','Something is paying attention to you. Terminals, chrome and wrong floors make it worse. Or better.');
 const pp=p.x,py=p.y;for(const [dx,dy] of DIRS8){const t=Game.tile(pp+dx,py+dy);if(t===T.CONTAINER||t===T.CRATE||t===T.SHELF){hint('loot','Containers hold what the building would: clinics have medicine, garages tools, apartments food. Bump to search.');break;}if(t===T.EXIT){hint('exit','That arrow is a route to another district. Step on it to travel.');break;}}
}

// ============================================================
// INPUT
// ============================================================
const MOVE={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],y:[-1,-1],u:[1,-1],b:[-1,1],n:[1,1],
 Numpad8:[0,-1],Numpad2:[0,1],Numpad4:[-1,0],Numpad6:[1,0],Numpad7:[-1,-1],Numpad9:[1,-1],Numpad1:[-1,1],Numpad3:[1,1],Home:[-1,-1],PageUp:[1,-1],End:[-1,1],PageDown:[1,1]};
function doMove(dx,dy){if(walking){clearTimeout(walking);walking=null;}const px=G.p.x,py=G.p.y,z=G.zoneId;Game.move(dx,dy);
 if(G.zoneId===z&&(G.p.x!==px||G.p.y!==py))Sound.play('step',{wet:[T.WATER,T.TOXIC].includes(Game.tile(G.p.x,G.p.y))});refresh();}
function rest(){if(Game.enemiesVisible().length){Game.log('Not with enemies in sight.','#f66');return;}let n=0;const hp=G.p.hp;while(n++<10&&!G.dead&&!Game.enemiesVisible().length&&!modalOpen())Game.wait();Game.log('You rest a while.','#aaa');refresh();}
function onKey(ev){
 if(screens.game.classList.contains('hidden')){if(ev.key==='Escape'&&modalOpen())closeModal();return;}
 if(ev.target&&['INPUT','SELECT','TEXTAREA'].includes(ev.target.tagName))return;
 Sound.resume();
 const k=ev.key.length===1?ev.key.toLowerCase():ev.key;const code=ev.code;
 if(modalOpen()){if(k==='Escape'){const box=$('#modal .mbox');if(box&&box.querySelector('.mclose')){closeModal();refresh();}ev.preventDefault();return;}
  // number keys pick options
  if(/^[1-9]$/.test(k)){const opts=[...document.querySelectorAll('#modal .opt, #modal .loot-row:not(.dim)')];const o=opts[+k-1];if(o){o.click();ev.preventDefault();}}
  if(k==='g'){const a=$('#modal .opt.primary');if(a)a.click();}
  return;}
 if(G.dead||G.ending)return;
 if(!ev.ctrlKey&&!ev.metaKey&&['+','=','-','_','0'].includes(k)){if(k==='0')setZoom(1);else changeZoom(k==='+'||k==='='?1:-1);ev.preventDefault();return;}
 let mv=MOVE[code]||MOVE[k];if(ev.key&&/^[1-9]$/.test(ev.key)&&code&&code.startsWith('Numpad'))mv=MOVE[code];
 if(target){if(k==='Escape'){cancelTarget();ev.preventDefault();return;}if(k==='Enter'||k==='f'||k===' '){confirmTarget();ev.preventDefault();return;}if(k==='Tab'){moveCursor(1,0);ev.preventDefault();return;}if(mv){moveCursor(mv[0],mv[1]);ev.preventDefault();return;}return;}
 if(mv){doMove(mv[0],mv[1]);ev.preventDefault();return;}
 if(code==='Numpad5'||k==='.'||k===' '){Game.wait();refresh();ev.preventDefault();return;}
 switch(k){
  case 'Escape':pauseMenu();break;case 'g':Game.pickup();refresh();break;case 'r':Game.reload();refresh();break;case 'f':startFire();break;case 't':throwMenu();break;
  case 'e':contextAction();break;case 'x':startLook();break;case 'z':rest();break;case '?':showHelp();break;
  case 'i':openTab('gear');break;case 'c':openTab('char');break;case 'q':openTab('quest');break;case 'm':openTab('map');break;case 'p':openTab('fac');break;case 'j':openTab('fac');break;case 'h':openTab('abil');break;
  case 'k':if(G.p.cls==='picker'||Game.hasItem('toolkit'))UI.openCraft();else Game.log('You need a workbench (or a toolkit).','#888');break;
  case '1':case '2':case '3':{for(const id in G.p.abilities)if(ABILITIES[id].key===k){useAbility(id);break;}break;}
  default:return;}
 ev.preventDefault();}
function openTab(t){sideTab=t;$('#side').classList.add('open');renderSide();}
function wire(){
 window.addEventListener('keydown',onKey);
 let lastZoomWheel=0;
 canvas.addEventListener('wheel',ev=>{if(modalOpen()||ev.ctrlKey||ev.metaKey||!ev.deltaY)return;ev.preventDefault();const now=performance.now();if(now-lastZoomWheel<90)return;lastZoomWheel=now;changeZoom(ev.deltaY<0?1:-1);},{passive:false});
 canvas.addEventListener('mousemove',ev=>{if(!G)return;const r=canvas.getBoundingClientRect();const t=Renderer.screenToTile(ev.clientX-r.left,ev.clientY-r.top);Renderer.hover=t;
  if(target&&target.mode==='tile'&&Game.dist(t.x,t.y,G.p.x,G.p.y)<=target.range){target.cursor={x:t.x,y:t.y};Renderer.targets=[target.cursor];}
  const d=describeTile(t.x,t.y);if(d&&!target)showTip(d,{x:ev.clientX,y:ev.clientY});});
 canvas.addEventListener('mouseleave',()=>{Renderer.hover=null;if(!target)showTip(null);});
 let press=null;
 canvas.addEventListener('pointerdown',ev=>{Sound.start();Sound.resume();press={x:ev.clientX,y:ev.clientY,t:performance.now(),long:false};if(ev.pointerType==='touch'){press.timer=setTimeout(()=>{press.long=true;const r=canvas.getBoundingClientRect();const t=Renderer.screenToTile(ev.clientX-r.left,ev.clientY-r.top);Renderer.hover=t;showTip(describeTile(t.x,t.y),{x:ev.clientX,y:ev.clientY},true);},450);}});
 canvas.addEventListener('pointerup',ev=>{if(!press)return;clearTimeout(press.timer);const long=press.long;press=null;if(long)return;tapAt(ev.clientX,ev.clientY);});
 canvas.addEventListener('contextmenu',ev=>{ev.preventDefault();const r=canvas.getBoundingClientRect();const t=Renderer.screenToTile(ev.clientX-r.left,ev.clientY-r.top);showTip(describeTile(t.x,t.y),{x:ev.clientX,y:ev.clientY},true);});
 document.addEventListener('visibilitychange',()=>{Sound.setActive(!document.hidden&&!screens.game.classList.contains('hidden'));if(document.hidden&&G&&!G.dead&&!G.ending)Game.save();});
 window.addEventListener('beforeunload',()=>{if(G&&!G.dead&&!G.ending)Game.save();});
}
function tapAt(cx,cy){if(!G||modalOpen()||G.dead||G.ending)return;const r=canvas.getBoundingClientRect();const t=Renderer.screenToTile(cx-r.left,cy-r.top);
 if(target){if(target.mode==='enemy'){let bi=-1,bd=1e9;target.list.forEach((e,i)=>{const d=(e.x-t.x)**2+(e.y-t.y)**2;if(d<bd){bd=d;bi=i;}});if(bi>=0&&bd<=2){if(target.idx===bi)confirmTarget();else{target.idx=bi;Renderer.targetIdx=bi;}}}
  else{if(Game.dist(t.x,t.y,G.p.x,G.p.y)>target.range)return;if(target.cursor.x===t.x&&target.cursor.y===t.y)confirmTarget();else{target.cursor={x:t.x,y:t.y};Renderer.targets=[target.cursor];if(target.kind==='look')showTip(describeTile(t.x,t.y));}}return;}
 const dx=t.x-G.p.x,dy=t.y-G.p.y;
 if(dx===0&&dy===0){contextAction();return;}
 if(Math.abs(dx)<=1&&Math.abs(dy)<=1){doMove(dx,dy);return;}
 const e=Game.entAt(t.x,t.y);if(e&&Game.visible(t.x,t.y)&&(Game.isHostile(e)||e.hostile)){const c=Game.canFire();if(c.ok&&Game.dist(t.x,t.y,G.p.x,G.p.y)<=c.w.range+G.p.d.range&&Game.los(G.p.x,G.p.y,t.x,t.y)){Game.fireAt(e);refresh();return;}}
 const path=Game.playerPath(t.x,t.y);if(path&&path.length>1)walkPath(path.slice(1));else{Game.log('You can\'t find a way there.','#888');refresh();}}
function walkPath(path){if(walking)clearTimeout(walking);lastEnemyCount=Game.enemiesVisible().length;
 const step=()=>{walking=null;if(!path.length||G.dead||G.ending||target||modalOpen())return;const n=path.shift();if(Game.entAt(n[0],n[1])){refresh();return;}
  const before=Game.enemiesVisible().length;doMove(n[0]-G.p.x,n[1]-G.p.y);if(Game.enemiesVisible().length>before){Game.log('You stop. Something\'s there.','#f96');refresh();return;}
  if(path.length)walking=setTimeout(step,settings.anim?95:25);};step();}
function buildTouch(){const t=$('#touch');clear(t);const pad=el('div','pad',t);
 const L=[['↖',-1,-1],['↑',0,-1],['↗',1,-1],['←',-1,0],['•',0,0],['→',1,0],['↙',-1,1],['↓',0,1],['↘',1,1]];
 for(const [g,dx,dy] of L){const b=el('button',null,pad,g);let rep=null;const go=()=>{if(target){moveCursor(dx,dy);return;}if(modalOpen()||!G||G.dead||G.ending)return;if(dx||dy)doMove(dx,dy);else{Game.wait();refresh();}};
  b.addEventListener('pointerdown',ev=>{ev.preventDefault();Sound.start();go();rep=setTimeout(function r(){go();rep=setTimeout(r,170);},380);});
  const stop=()=>{clearTimeout(rep);rep=null;};b.addEventListener('pointerup',stop);b.addEventListener('pointerleave',stop);b.addEventListener('pointercancel',stop);}
 const acts=el('div','acts',t);
 const a=(lab,fn,cls)=>{const b=el('button',cls||'',acts,lab);b.addEventListener('click',ev=>{ev.preventDefault();Sound.play('ui');fn();});return b;};
 a('Fire',()=>target?confirmTarget():startFire());a('Throw',throwMenu);a('Reload',()=>{Game.reload();refresh();});
 a('Abil',()=>{const ids=Object.keys(G.p.abilities);if(ids.length===1)useAbility(ids[0]);else openTab('abil');});a('Look',startLook);a('Menu',pauseMenu);}

// ============================================================
// CSS
// ============================================================
const CSS=`
.map-zoom{position:absolute;top:12px;right:12px;z-index:8;display:flex;gap:4px;padding:4px;border:1px solid #494553;border-radius:8px;background:#101017eb}
.map-zoom .btn{min-width:38px;min-height:38px;padding:6px 9px;font-size:15px;touch-action:manipulation}
.map-zoom #zoom-reset{min-width:64px;font-size:12px}
@import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
:root{--bg:#07070a;--panel:#0f0f14;--panel2:#15151c;--line:#26262f;--text:#d8d6d0;--muted:#8a8894;--gold:#ffe27a;--red:#ff5a5a;--font:'IBM Plex Mono','Courier New',monospace;--pix:'Silkscreen','Courier New',monospace}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px;overflow:hidden;touch-action:manipulation}
body.bigtext{font-size:15px}
button{font-family:inherit;font-size:inherit;color:inherit}
#root{position:fixed;inset:0}
.hidden{display:none!important}
.muted{color:var(--muted)}.small{font-size:0.86em}.ok-t{color:#8f8}.bad-t{color:#f77}.warn-t{color:#fb6}.safe-t{color:#8fd;font-size:0.85em}
.screen{position:absolute;inset:0;display:flex;flex-direction:column}
.btn{background:#16161c;border:1px solid #3a3a46;color:var(--text);padding:10px 22px;margin:4px;cursor:pointer;border-radius:3px;font-family:var(--pix);font-size:13px;letter-spacing:1px}
.btn:hover{border-color:var(--gold);color:var(--gold)}.btn.primary{border-color:var(--gold);color:var(--gold);background:#1e1a0c}.btn:disabled{opacity:0.3;pointer-events:none}.btn.sm{padding:3px 9px;margin:0 2px;font-size:11px}
/* title */
.s-title,.s-end{background-size:cover;background-position:center;align-items:center;justify-content:center}
.rain-fx{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(transparent 0,rgba(180,190,230,0.18) 1px,transparent 1px);background-size:3px 38px;animation:rain 0.45s linear infinite;opacity:0.5}
@keyframes rain{from{background-position:0 0}to{background-position:-10px 38px}}
.title-box{position:relative;text-align:center;padding:30px}
.title-box h1{font-family:var(--pix);font-weight:700;font-size:clamp(44px,10vw,96px);margin:0;color:var(--gold);letter-spacing:6px;text-shadow:0 0 30px rgba(255,210,100,0.45),3px 3px 0 #3a1a10}
.title-sub{font-family:var(--pix);letter-spacing:8px;color:#c9a0a8;font-size:clamp(11px,2.2vw,16px)}
.title-tag{color:#aaa;margin:10px 0 28px;font-style:italic}
.title-btns{display:flex;flex-direction:column;align-items:center}.title-btns .btn{min-width:220px}
.title-foot{margin-top:22px;color:#777;font-size:11px}
/* create */
.s-create{padding:14px;overflow-y:auto;background:radial-gradient(ellipse at top,#16141c,#07070a 70%)}
.s-create h2{font-family:var(--pix);color:var(--gold);text-align:center;margin:6px 0 10px;font-size:18px}
.create-top{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap}
.name-in{background:#101014;border:1px solid #3a3a46;color:#fff;padding:9px;font-family:var(--pix);font-size:15px;text-align:center;width:210px}
.nightmode{color:#b9a0ff;margin-left:10px}
.create-wrap{display:flex;gap:14px;max-width:1000px;margin:12px auto;width:100%;flex:1;min-height:0}
.class-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:46%;align-content:start}
.class-card{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:8px;cursor:pointer;display:grid;grid-template-columns:48px 1fr;grid-template-rows:auto auto;column-gap:8px}
.class-card:hover{border-color:#555}.class-card.sel{border-color:var(--gold);background:#1a170c}.class-card.locked{opacity:0.35;cursor:default}
.class-img{grid-row:span 2;width:48px;height:48px;image-rendering:pixelated}
.class-name{font-family:var(--pix);font-size:13px}.class-tag{font-size:11px;color:var(--muted)}
.class-detail{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:14px;overflow-y:auto}
.cd-head{display:flex;gap:12px;align-items:center}.cd-img{width:96px;height:96px;image-rendering:pixelated;background:#1a1a22;border-radius:4px}
.cd-head h3{font-family:var(--pix);margin:0;font-size:20px}
.cd-stats{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin:8px 0}
.cd-stat{display:grid;grid-template-columns:36px 1fr 20px;align-items:center;gap:6px;font-size:11px}
.cd-bar{height:6px;background:#1c1c24}.cd-bar i{display:block;height:100%;background:linear-gradient(90deg,#8a6a2a,var(--gold))}
.cd-line{margin:6px 0;font-size:12px}
.create-bar{display:flex;justify-content:center;gap:8px;padding-bottom:10px}
@media (max-width:760px){.s-create{display:block}.create-wrap{flex-direction:column}.class-grid{width:100%}.class-detail{min-height:0;overflow:visible}.create-bar{position:sticky;bottom:0;background:linear-gradient(transparent,#07070a 40%);padding:18px 0 10px}}
/* game */
.hud{background:linear-gradient(#131319,#0c0c10);border-bottom:1px solid var(--line);padding:4px 8px}
.hud-row{display:flex;flex-wrap:wrap;align-items:center;gap:3px 14px}
.hud-row.chips{gap:4px;margin-top:3px;min-height:18px}
.hud-name{display:flex;align-items:center;gap:5px}.hud-name img{width:24px;height:24px;image-rendering:pixelated}
.hud-v{white-space:nowrap}.hud-v.loc{color:#cfc4a8}.hud-v.echo{color:#b9a0ff}
.hbar{display:inline-block;width:54px;height:7px;background:#1a1a20;border:1px solid #2e2e38;vertical-align:middle;margin-left:4px}.hbar i{display:block;height:100%;transition:width .3s}
.hud-menu{background:#1a1a22;border:1px solid #3a3a46;border-radius:3px;padding:2px 9px;cursor:pointer;margin-left:auto}
.side-toggle{display:none;margin-left:0}
.chip{border:1px solid #555;border-radius:10px;padding:0 7px;font-size:11px;cursor:help;white-space:nowrap}
.chip.warn{color:#fb6;border-color:#a73}.chip.bad{color:#f66;border-color:#a33}.chip.chrome{color:#6ef;border-color:#388}.chip.flesh{color:#dbe;border-color:#86a}.chip.safe{color:#8fd;border-color:#3a8}.chip.lvl{color:var(--gold);border-color:var(--gold)}
.main{flex:1;display:flex;min-height:0}
.canvaswrap{flex:1;position:relative;min-width:0;background:#000;overflow:hidden}
.map{display:block;cursor:crosshair;touch-action:none}
.threats{position:absolute;right:6px;top:6px;display:flex;flex-direction:column;gap:3px;pointer-events:auto;z-index:4}
.threat{display:flex;align-items:center;gap:6px;background:rgba(10,10,14,0.82);border:1px solid #4a2228;border-radius:3px;padding:2px 6px 2px 2px;font-size:11px;cursor:pointer;min-width:150px}
.threat img{width:28px;height:28px;image-rendering:pixelated}.tbar{height:3px;background:#300;width:90px;margin-top:2px}.tbar i{display:block;height:100%;background:#e33}
.ctx-btn{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;background:rgba(30,26,12,0.92);border:1px solid var(--gold);color:var(--gold);padding:7px 14px;border-radius:18px;font-family:var(--pix);font-size:12px;cursor:pointer;z-index:5;white-space:nowrap}
.ctx-btn .k{border:1px solid #806a30;border-radius:3px;padding:0 4px;margin-left:5px;font-size:10px}
.tooltip{position:absolute;max-width:260px;background:rgba(10,10,14,0.94);border:1px solid #3a3a46;border-radius:3px;padding:6px 8px;font-size:11.5px;pointer-events:none;z-index:6;line-height:1.35}
.ftip{position:fixed;max-width:240px;background:#0c0c10;border:1px solid #444;padding:5px 8px;font-size:11px;z-index:60;pointer-events:none}
.tbar-top{position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(30,26,12,0.92);border:1px solid var(--gold);color:var(--gold);padding:5px 10px;border-radius:3px;font-size:11px;z-index:7;white-space:nowrap}
.side{width:290px;background:var(--panel);border-left:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.side-close{display:none}
.tabs{display:flex;border-bottom:1px solid var(--line);flex-shrink:0}
.tab{flex:1;text-align:center;padding:7px 0;cursor:pointer;color:var(--muted);font-size:10.5px;border-bottom:2px solid transparent;font-family:var(--pix)}
.tab.on{color:var(--gold);border-color:var(--gold)}.tab .dot{color:var(--gold)}
.pane{padding:8px;overflow-y:auto;flex:1}
.sec{font-family:var(--pix);color:#cfc4a8;margin:10px 0 5px;font-size:11px;letter-spacing:1px;border-bottom:1px solid var(--line);padding-bottom:2px}
.sub{color:var(--gold);font-size:11px;margin:8px 0 3px}
.eq-grid{display:flex;flex-direction:column;gap:3px}
.eq-slot{display:flex;gap:8px;align-items:center;background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:4px 6px;cursor:pointer;font-size:12px}
.eq-slot.empty{opacity:0.55;cursor:default}.eq-lab{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.ic{image-rendering:pixelated;flex-shrink:0;vertical-align:middle}
.wbar,.repbar{height:5px;background:#1c1c24;margin:3px 0 6px;position:relative}.wbar i{display:block;height:100%}
.inv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:4px}
.inv-cell{position:relative;background:var(--panel2);border:1px solid var(--line);border-radius:3px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.inv-cell:hover{border-color:var(--gold)}.inv-cell .qty{position:absolute;right:2px;bottom:1px;font-size:10px;color:#fff;text-shadow:1px 1px 0 #000}
.bod{font-size:12px;margin:2px 0}.bod.chrome{color:#8ef}.bod.flesh{color:#dbe}
.notice{background:#1e1a0c;border:1px solid #806a30;color:var(--gold);padding:4px 7px;margin:6px 0;font-size:12px}.notice-in{color:var(--gold)}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px}
.stat{display:flex;justify-content:space-between;align-items:center;background:var(--panel2);padding:3px 6px;border-radius:2px;font-size:12px;cursor:help;text-transform:capitalize}
.plus{background:#2a2410;border:1px solid var(--gold);color:var(--gold);width:20px;height:20px;cursor:pointer;margin-left:4px}
.card-row{background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:6px 8px;margin:4px 0;cursor:pointer}
.card-row:hover{border-color:var(--gold)}.card-row.dim{opacity:0.5}.card-row.quest{cursor:default}.card-row.quest:hover{border-color:var(--line)}
.tagx{font-size:9px;border:1px solid #6ef;color:#6ef;padding:0 4px;border-radius:6px}.cd{color:#f77}
.fac{margin:7px 0;cursor:help}.fac-top{display:flex;justify-content:space-between;font-size:12px}
.repbar{height:6px}.repbar .mid{position:absolute;left:50%;top:-2px;width:1px;height:10px;background:#555}.repbar i{position:absolute;top:0;height:100%}
.citymap{background:#0a0a0e;border:1px solid var(--line);border-radius:3px;margin:4px 0}
.log{height:76px;flex-shrink:0;background:#08080b;border-top:1px solid var(--line);overflow-y:auto;padding:3px 8px;font-size:11.5px;line-height:1.4}
.toasts{position:fixed;top:64px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:5px;z-index:50;pointer-events:none;width:min(520px,92vw)}
.toast{background:rgba(12,12,16,0.95);border:1px solid #666;border-left-width:3px;padding:7px 10px;font-size:12px;transition:opacity .5s,transform .5s;pointer-events:auto}
.toast.out{opacity:0;transform:translateY(-8px)}.toast.hint{border-color:#6a8aff;color:#cfd8ff}.toast.hint b{color:#8ab0ff;font-family:var(--pix);margin-right:5px}.toast .x{float:right;cursor:pointer;color:#888}
/* touch */
.touch{position:absolute;left:0;right:0;bottom:0;display:none;justify-content:space-between;align-items:flex-end;padding:8px;pointer-events:none;z-index:5}
body.show-touch .touch{display:flex}body.show-touch .ctx-btn{bottom:auto;top:8px}
.pad{display:grid;grid-template-columns:repeat(3,50px);grid-template-rows:repeat(3,50px);gap:4px;pointer-events:auto;opacity:0.9}
.pad button,.acts button{background:rgba(22,22,30,0.82);border:1px solid #3a3a46;border-radius:6px;font-size:18px;touch-action:none;user-select:none}
.pad button:active,.acts button:active{background:#3a3420;border-color:var(--gold)}
.acts{display:grid;grid-template-columns:repeat(2,64px);gap:4px;pointer-events:auto}.acts button{height:44px;font-size:11px;font-family:var(--pix)}
/* modal */
.modal{position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:40;padding:10px}
.mbox{position:relative;background:var(--panel);border:1px solid #3a3a46;border-radius:5px;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;padding:16px;box-shadow:0 10px 40px #000}
.mbox.wide{max-width:780px}
.mbox h3{font-family:var(--pix);color:var(--gold);margin:0 0 8px;font-size:15px}
.mclose{position:absolute;right:8px;top:6px;background:none;border:none;color:#888;font-size:16px;cursor:pointer}
.mtext{white-space:pre-wrap;line-height:1.5;margin-bottom:12px}.mtext.dlg{background:#0b0b0f;border-left:2px solid #5a4a2a;padding:8px 10px}
.opts{display:flex;flex-direction:column;gap:5px}.opts.row{flex-direction:row;margin-top:8px}.opts.row .opt{flex:1}
.opt{text-align:left;background:var(--panel2);border:1px solid #33333d;padding:9px 11px;border-radius:3px;cursor:pointer;line-height:1.35}
.opt:hover,.opt:focus{border-color:var(--gold);outline:none}.opt.primary{border-color:#806a30;color:var(--gold)}.opt .req{color:#6ef}
.dlg-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}.dlg-head img{width:64px;height:64px;image-rendering:pixelated;background:#16161e;border-radius:4px}.dlg-head h3{margin:0}.creds{margin-left:auto;color:var(--gold);font-family:var(--pix)}
.loot-row{display:flex;align-items:center;gap:8px;padding:5px;border:1px solid var(--line);border-radius:3px;margin:3px 0;cursor:pointer;background:var(--panel2)}
.loot-row:hover{border-color:var(--gold)}.loot-row.dim{opacity:0.45}.grow{flex:1;min-width:0}.chrome{color:#8ef}.flesh{color:#dbe}
.trade{display:flex;gap:10px}.tcol{flex:1;min-width:0}@media (max-width:640px){.trade{flex-direction:column}}
.it-head{display:flex;gap:10px;align-items:center}.it-stats{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 10px}.it-stats span{background:#1a1a22;border:1px solid #2e2e3a;padding:1px 6px;border-radius:9px;font-size:11px}
.set-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
.set-row input[type=range]{width:50%}.set-row select{background:#16161c;color:#ddd;border:1px solid #3a3a46;padding:3px}
.help div{margin:3px 0}.help b{color:var(--gold)}.help p{margin:7px 0;line-height:1.45}
.codex{border:1px solid var(--line);padding:6px 10px;margin:6px 0;border-radius:3px}.codex b{color:var(--gold)}.codex.locked{opacity:0.5}.codex p{margin:4px 0;line-height:1.45}
.run-row{border-bottom:1px solid var(--line);padding:6px 0}
.ic-ph{display:inline-block;width:28px;text-align:center}
/* end */
.end-box{position:relative;background:rgba(8,8,12,0.9);border:1px solid #3a3a46;max-width:680px;margin:16px;padding:26px;text-align:center;max-height:92vh;overflow-y:auto}
.end-kicker{font-family:var(--pix);letter-spacing:5px;color:#c9a0a8;font-size:12px}
.end-box h1{font-family:var(--pix);color:var(--gold);font-size:clamp(28px,6vw,48px);margin:6px 0 12px}
.end-text{line-height:1.6;color:#ccc}
.end-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:14px 0}.end-stats div{background:#121218;padding:6px;display:flex;flex-direction:column}.end-stats b{color:#fff;font-size:15px}
.end-unlocks{color:var(--gold);margin:12px 0;line-height:1.6}
@media (max-width:900px){
 .side{position:absolute;right:0;top:0;bottom:0;width:min(330px,88vw);z-index:30;transform:translateX(105%);transition:transform .2s;box-shadow:-6px 0 20px #000}
 .side.open{transform:none}.side-close{display:block;text-align:right;padding:8px 12px;color:#aaa;cursor:pointer;border-bottom:1px solid var(--line)}
 .side-toggle{display:inline-block}.main{position:relative}
 .hud-v .hbar{width:38px}.hud-row{gap:2px 9px;font-size:11.5px}
 .threat{min-width:0}.threat div div:first-child{max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .log{height:58px}.end-stats{grid-template-columns:repeat(2,1fr)}
}
`;

// ============================================================
// BOOT
// ============================================================
function boot(){build();loadSettings();wire();
 const start=()=>{if(!Renderer.isReady()){setTimeout(start,30);return;}showTitle();};start();
 document.addEventListener('pointerdown',()=>{Sound.start();Sound.resume();},{once:false});}
window.__nr={enterGame,showTitle,showCreate,refresh,contextFor,startFire,describeTile,tapAt:(x,y)=>{}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
