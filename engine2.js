'use strict';
// ============================================================
// ENGINE PART 2 — combat, enemy AI, abilities, escape routes,
// death & endings, save/load, meta progression.
// ============================================================
Object.assign(Game,{
 // ---------- combat core ----------
 // attacker/defender: 'P' for player or an entity
 combatStats(a){if(a==='P'){const p=G.p,d=p.d,w=this.weaponDef();return{name:p.name,hitBonus:(w.ranged?d.hitR+this.skill('firearms')*4+d.stats.per*2:d.hitM+this.skill('melee')*4+d.stats.agi*2),evade:d.evade,arm:d.arm,crit:d.crit,isP:1,w};}
  const d=this.entityCombatDef(a);return{name:a.name,hitBonus:d.hit+10,evade:d.evade+(a.st.jammed?-3:0),arm:d.arm,crit:3,isP:0,w:{dmg:d.dmg,ranged:d.ranged,props:d.props||[]}};},
 entityCombatDef(e){return e.kind==='npc'?{hit:0,evade:2,arm:0,dmg:[3,8],tags:['human'],ai:[],props:[]}:ENEMIES[e.def];},
 posOf(a){return a==='P'?[G.p.x,G.p.y]:[a.x,a.y];},
 attack(att,def,opts){opts=opts||{};const A=this.combatStats(att),D=this.combatStats(def);const [ax,ay]=this.posOf(att),[dx,dy]=this.posOf(def);const dist=this.dist(ax,ay,dx,dy);const w=opts.w||A.w;const ranged=!!w.ranged&&!opts.melee;
  let chance=55+A.hitBonus-D.evade*3;
  if(ranged){chance-=Math.max(0,dist-3)*3;if(w.closeBonus&&dist<=2)chance+=15;if(w.scoped&&dist>=5)chance+=10;if(this.coverBetween(ax,ay,dx,dy))chance-=20;}
  const enemyDef=A.isP?null:this.entityCombatDef(att);
  const aimed=A.isP&&ranged&&this.hasStatus('aim');
  const night=this.isNight();const litT=G.zone.lit&&G.zone.lit[dy*G.zone.w+dx];if(night&&!litT){chance-=A.isP?(G.p.d.visionNight>6?0:10):(enemyDef.tags.includes('creature')||enemyDef.ai.includes('night')?0:10);}
  if(G.rain)chance-=5;
  if(A.isP){if(aimed){chance+=30;this.removeStatus('aim');}if(ranged&&G.p.eq.weapon?.mods?.includes('scope'))chance+=10;if(this.hasStatus('hidden')||opts.ambush)chance+=25;}
  else{if(att.st.jammed)chance-=30;if(att.st.fear)chance-=15;if(this.hasStatus('hidden')&&!opts.ambush)chance-=25;// surround bonus for flankers
   if(enemyDef.ai.includes('flank')&&def==='P'){let allies=0;for(const e of G.zone.ents)if(e!==att&&e.kind==='e'&&this.isHostile(e)&&this.dist(e.x,e.y,dx,dy)<=1)allies++;if(allies)chance+=12;}}
  chance=this.clamp(chance,5,97);
  const r=this.ri(1,100);const hit=r<=chance;
  if(!hit){this.log(`${A.name} ${ranged?'fires at':'swings at'} ${D.name} and misses.`,A.isP?'#aaa':'#ccc');this.fx(ranged?'shot':'miss',{x:dx,y:dy,fx:ax,fy:ay,miss:1});if(!ranged)this.fx('whiff',{x:dx,y:dy});return {hit:false};}
  let crit=r<=A.crit+(aimed?20:0)||(A.isP&&opts.ambush&&this.fxf('ambushCrit'));
  let dmg=this.ri(w.dmg[0],w.dmg[1]);
  if(A.isP){const d=G.p.d;dmg+=ranged?Math.floor(d.stats.per/3):Math.floor(d.stats.str/2)+d.dmgM;if(ranged&&w.ammo==='rifle'&&d.flags.rifleDmg)dmg+=d.flags.rifleDmg;if(opts.ambush||this.hasStatus('hidden'))dmg=Math.round(dmg*(d.ambush>1?d.ambush:1.5));if(opts.burst)dmg=Math.round(dmg*(1+0.3*(opts.burst-1)));}
  else if(att.def==='echo_shade'){const pw=this.weaponDef();dmg=Math.max(dmg,this.ri(pw.dmg[0],pw.dmg[1])+2);}
  if(crit){dmg=Math.round(dmg*(1.5+(A.isP?G.p.d.critDmg:0)));}
  let arm=D.arm;if(w.armorPierce)arm=Math.max(0,arm-w.armorPierce);if(!A.isP&&D.isP&&G.p.cls==='bruiser'&&!ranged)dmg=Math.max(0,dmg-2);
  const final=Math.max(1,dmg-arm);
  const props=w.props||[];
  if(def==='P'){this.log(`${A.name} hits you for ${final}${crit?' (CRITICAL)':''}${arm?` (${arm} absorbed)`:''}.`,crit?'#f44':'#f88');this.fx('hit',{x:dx,y:dy,crit,dmg:final,p:1});
   if(props.includes('bleed')&&this.chance(props.filter(p=>p==='bleed').length*0.3))this.addStatus('bleed',this.ri(4,10)),this.log('You are bleeding.','#f44');
   if(props.includes('stun')&&this.chance(0.2)&&!G.p.d.immune.includes('stun')){this.addStatus('stun',1);this.log('You are stunned!','#ff0');}
   if(props.includes('poison')&&this.chance(0.35)&&!G.p.d.immune.includes('poison')){this.addStatus('poison',20);this.log('Poison burns in the wound.','#8f4');}
   if(crit){const inj=this.rc(['fracture','concussion','bleed','infection']);if(!G.p.d.immune.includes(inj)){this.addStatus(inj,inj==='bleed'?8:inj==='infection'?300:120);this.log(`${STATUSES[inj].n}!`,'#f44');}}
   if(enemyDef.tags.includes('chromed')&&this.chance(0.1)&&G.p.chrome.length)this.addStatus('malfunction',10),this.log('The hit rattles your chrome.','#f6f');
   // armor durability
   const body=G.p.eq.body;if(body&&body.dur!==undefined&&this.chance(0.3)){body.dur--;if(body.dur===0){this.log(`Your ${ITEMS[body.id].name} is falling apart.`,'#f66');this.computeDerived();}}
   this.dmgPlayer(final,A.name);}
  else{this.log(`${A.isP?'You hit':A.name+' hits'} ${D.name} for ${final}${crit?' (CRITICAL)':''}.`,A.isP?'#ffe27a':'#ccc');this.fx('hit',{x:dx,y:dy,crit,dmg:final});
   if(props.includes('bleed')&&this.chance(0.3))def.st.bleed=6;if(props.includes('stun')&&this.chance(A.isP?0.3:0.2))def.st.stun=1;if(props.includes('knock')||opts.knock)this.knockback(def,ax,ay,2);
   if(A.isP&&G.p.d.flags.fearHit&&this.chance(0.3))def.st.fear=8;if(A.isP&&crit&&this.fxf('fractureCrit'))def.st.slow=10;
   this.damage(def,final,A.isP?'you':A.name,A.isP?'P':att);
   if(A.isP&&crit&&this.fxf('rampage')&&def.hp<=0)G.p.stam=Math.min(G.p.d.maxstam,G.p.stam+20);}
  if(A.isP){this.skillUse(ranged?'firearms':'melee',1);if(this.hasStatus('hidden'))this.removeStatus('hidden');}
  return {hit:true,dmg:final,crit};},
 knockback(e,fx,fy,n){const dx=Math.sign(e.x-fx),dy=Math.sign(e.y-fy);for(let i=0;i<n;i++){const nx=e.x+dx,ny=e.y+dy;if(this.walkableFor(nx,ny)&&this.tile(nx,ny)!==T.DEEP){e.x=nx;e.y=ny;}else{this.damage(e,3,'impact');break;}}},
 damage(e,n,src,by){if(e.shield&&e.shield>0){const s=Math.min(e.shield,n);e.shield-=s;n-=s;e.shieldCd=3;if(n<=0){this.log(`${e.name}'s shield flares.`,'#aef');return;}}
  e.hp-=n;if(e.kind==='npc'&&!e.hostile){e.hostile=1;this.log(`${e.name} is now hostile!`,'#f66');if(e.fac)this.addRep(e.fac,-25);}
  if(e.kind==='e'&&!this.isHostile(e)&&by==='P'&&e.fac!=='ally'){e.hostile=1;this.addRep(e.fac,-8);for(const o of G.zone.ents)if(o.kind==='e'&&o.fac===e.fac&&this.dist(o.x,o.y,e.x,e.y)<=10){o.hostile=1;o.alert=20;o.lastSeen=[G.p.x,G.p.y];}}
  if(by==='P'||src==='you'){e.hostile=1;e.alert=25;e.lastSeen=[G.p.x,G.p.y];e.hidden=0;}
  if(e.hp<=0)this.kill(e,by);},
 kill(e,by){const z=G.zone;const i=z.ents.indexOf(e);if(i>=0)z.ents.splice(i,1);const d=e.kind==='e'?ENEMIES[e.def]:null;
  if(e.kind==='npc'){G.flags['dead_'+e.def]=1;this.log(`${e.name} is dead.`,'#f66');if(e.fac)this.addRep(e.fac,-30);for(const qid in G.quests){const q=QUESTS[qid];if(q.fac===e.fac&&G.quests[qid].state==='active'&&['wren','tallow','okafor','dace','ives','kesh','cantor','ludo','sable','verity','mags'].includes(e.def)){}}if(e.def==='kesh')this.failQuest('boat');if(e.def==='dace')this.failQuest('power');if(e.def==='wren'){this.failQuest('wren_package');this.failQuest('bad_blood');this.failQuest('the_crown');}if(e.def==='ives')this.failQuest('skyhook');if(e.def==='cantor')this.failQuest('chorus');if(e.def==='sable'){G.flags.purge_done=1;}return;}
  const byP=by==='P';
  this.log(`${e.name} ${d.tags.includes('machine')?'shuts down':'dies'}.`,byP?'#ffe27a':'#ccc');this.fx('death',{x:e.x,y:e.y});
  if(byP){G.p.kills++;G.kills[e.def]=(G.kills[e.def]||0)+1;this.giveXp(d.xp);if(!HOSTILE_FACTIONS[e.fac]&&e.fac!=='ally'&&FACTIONS[e.fac]){this.addRep(e.fac,-12);for(const f in FACTIONS)if(FACTIONS[f].hates.includes(e.fac))this.addRep(f,2);}
   if(this.isNight())this.attention(0.5);if(d.tags.includes('echo'))this.attention(3);if(this.fxf('rampage')){G.p.stam=Math.min(G.p.d.maxstam,G.p.stam+20);}this.pushAction('killed '+e.name);}
  // loot
  const drops=[];for(const [id,pct] of d.loot){if(pct>0&&this.chance(pct/100)){const it=this.makeItem(id,ITEMS[id].type==='ammo'?this.ri(3,12):1);if(ITEMS[id].clip)it.clip=this.ri(0,ITEMS[id].clip);if(ITEMS[id].dur)it.dur=this.ri(10,ITEMS[id].dur);drops.push(it);}}
  if(d.tags.includes('human')&&this.chance(0.4))drops.push(this.makeItem('credchip',1));
  for(const it of drops){const sp=Gen.nearOpen(z,e.x,e.y,1)||[e.x,e.y];z.items.push(Object.assign(it,{x:sp[0],y:sp[1]}));}
  // specials
  if(d.ai.includes('burst')){this.log(`${e.name} bursts. The air turns green.`,'#8f4');this.toxicAt(e.x,e.y,1,15);if(this.dist(e.x,e.y,G.p.x,G.p.y)<=1&&!G.p.d.immune.includes('toxic')){this.dmgPlayer(6,'bile');this.addStatus('poison',20);}}
  if(e.def==='curator'){G.flags.curator_dead=1;for(const k in z.locked){const l=z.locked[k];if(l.bld===z.bidx[e.y*z.w+e.x]){const [lx,ly]=k.split(',').map(Number);Gen.set(z,lx,ly,T.DOOR_OPEN);delete z.locked[k];}}this.log('The Curator\'s lockdown releases. Every door in the office unlocks.','#ee6');}
  if(e.def==='bloat_mother'){G.flags.bloat_dead=1;this.addRep('drowned',-30);this.log('The tunnels exhale. The Drowned are screaming somewhere far away.','#dbe');}
  if(e.def==='warden'){G.flags.warden_dead=1;this.addRep('halcyon',-20);}
  if(e.def==='stalker'){G.flags.stalker_dead=1;this.log('The caravans will be safe now. Some of them.','#8f8');}
  if(e.def==='ghoul_king'){G.flags.surgeon_dead=1;}
  if(e.def==='echo_shade'){G.flags.shade_dead=1;this.attention(10);this.log('It comes apart into static. In the static, for a second, your own voice: "thank you".','#fff');}
  if(e.boss&&byP)this.fx('shake');},
 dmgPlayer(n,src){const p=G.p;if(G.dead||G.ending)return;p.hp-=n;G.lastHit=src;this.fx('phit',{n});
  if(p.hp<=p.d.maxhp*0.2&&p.hp>0&&this.fxf('secondWind')&&p.secondWindDay!==G.day){p.secondWindDay=G.day;p.hp+=30;this.log('Second wind. You keep moving.','#8f8');}
  if(p.hp<=0){if(this.fxf('lastBreath')&&!p.lastBreath){p.lastBreath=1;p.hp=1;this.log('You should be dead. You aren\'t. Not yet.','#ff8');return;}this.die(src);}},
 melee(e,forced){const p=G.p;const w=this.weaponDef();if(w.ammo&&p.eq.weapon){if((p.eq.weapon.clip||0)<=0){this.log(`${w.name} needs a cell.`,'#f66');return;}p.eq.weapon.clip--;}
  const ambush=!e.alert||e.st.stun||this.hasStatus('hidden');const r=this.attack('P',e,{melee:1,ambush:ambush&&!e.alert});
  if(this.fxf('sweep')&&(w.hands===2)){for(const o of G.zone.ents.slice())if(o!==e&&o.kind==='e'&&this.isHostile(o)&&this.dist(o.x,o.y,p.x,p.y)<=1)this.attack('P',o,{melee:1});}
  this.wearWeapon();this.noise(p.x,p.y,3);this.act(w.speed||100);},
 wearWeapon(){const w=G.p.eq.weapon;if(!w||w.dur===undefined||this.fxf('noBreak'))return;if(this.chance(0.25))w.dur--;if(w.dur<=0){this.log(`Your ${ITEMS[w.id].name} breaks!`,'#f66');G.p.eq.weapon=null;this.computeDerived();}},
 canFire(){const p=G.p;const w=this.weaponDef();if(!w.ranged){return{ok:false,msg:'No ranged weapon equipped.'};}if((p.eq.weapon.clip||0)<=0)return{ok:false,msg:`${w.name} is empty. Reload (R).`};return{ok:true,w};},
 fireAt(e){const p=G.p;const c=this.canFire();if(!c.ok){this.log(c.msg,'#f66');return;}const w=c.w;const inst=p.eq.weapon;const d=this.dist(p.x,p.y,e.x,e.y);const range=w.range+p.d.range;if(d>range){this.log('Out of range.','#f66');return;}if(!this.los(p.x,p.y,e.x,e.y)){this.log('No line of sight.','#f66');return;}
  const shots=w.burst?Math.min(w.burst,inst.clip):1;inst.clip-=shots;const ambush=!e.alert&&!e.st.stun&&this.hasStatus('hidden');
  this.fx('shot',{x:e.x,y:e.y,fx:p.x,fy:p.y});
  if(w.burst){let hits=0;for(let i=0;i<shots;i++){const r=this.attack('P',e,{burst:1});if(r.hit)hits++;if(e.hp<=0)break;}}else this.attack('P',e,{ambush});
  if(w.splash){for(const o of G.zone.ents.slice())if(o!==e&&this.dist(o.x,o.y,e.x,e.y)<=1&&o.hp>0)this.damage(o,this.ri(4,9),'splash','P');if(this.dist(p.x,p.y,e.x,e.y)<=1)this.dmgPlayer(this.ri(3,6),'your own launcher');}
  let noise=w.noise||10;if(inst.mods&&inst.mods.includes('supp'))noise=Math.max(2,noise-8);this.noise(p.x,p.y,noise);this.wearWeapon();
  this.act(w.speed||100);},
 throwAt(inst,x,y){const p=G.p;const d=ITEMS[inst.id];const range=d.throwRange+p.d.throwRange;if(this.dist(p.x,p.y,x,y)>range){this.log('Too far.','#f66');return;}if(!this.los(p.x,p.y,x,y)&&this.dist(p.x,p.y,x,y)>1){this.log('No line of sight.','#f66');return;}
  this.removeInst(inst,1);this.fx('shot',{x,y,fx:p.x,fy:p.y,thrown:1});const mult=1+p.d.throwBonus;
  if(d.effect==='fire'){this.igniteAt(x,y,2);this.log('Glass shatters. Fire blooms.','#f82');this.noise(x,y,6);}
  else if(d.effect==='blast'){this.log('BOOM.','#f55');this.fx('shake');this.noise(x,y,18);for(let j=y-1;j<=y+1;j++)for(let i=x-1;i<=x+1;i++){const e=this.entAt(i,j);if(e)this.damage(e,Math.round(this.ri(d.dmg[0],d.dmg[1])*mult),'blast','P');if(i===p.x&&j===p.y)this.dmgPlayer(this.ri(8,14),'your own bomb');const t=this.tile(i,j);if(t===T.DOOR||t===T.DOOR_LOCKED||t===T.WINDOW||t===T.BARRICADE)this.setTile(i,j,T.RUBBLE);}}
  else if(d.effect==='stun'){this.log('A white crack. Everything reels.','#ff8');this.noise(x,y,12);for(let j=y-2;j<=y+2;j++)for(let i=x-2;i<=x+2;i++){const e=this.entAt(i,j);if(e)e.st.stun=3;if(i===p.x&&j===p.y&&!p.d.immune.includes('stun'))this.addStatus('stun',2);}}
  else if(d.effect==='noise'){this.log('Clatter. Heads turn that way.','#aaa');for(const e of G.zone.ents)if(e.kind==='e'&&this.dist(e.x,e.y,x,y)<=6&&!e.alert){e.lastSeen=[x,y];e.alert=10;e.investigate=1;}}
  else if(d.effect==='breach'){const t=this.tile(x,y);if(t===T.DOOR_LOCKED||t===T.GATE||t===T.DOOR||t===T.WALL){if(t===T.GATE){const ex=G.zone.exits.find(e=>e.x===x&&e.y===y);if(ex){ex.locked=null;this.setTile(x,y,T.EXIT);}}else{this.setTile(x,y,t===T.WALL?T.RUBBLE:T.DOOR_OPEN);delete G.zone.locked[x+','+y];}this.log('BOOM. It\'s open now.','#f6a');}const e=this.entAt(x,y);if(e)this.damage(e,this.ri(20,30),'breach','P');this.noise(x,y,20);this.fx('shake');if(this.dist(p.x,p.y,x,y)<=1)this.dmgPlayer(this.ri(5,10),'your own charge');}
  this.act(100);},

 // ---------- enemy AI ----------
 enemyAct(e){const p=G.p,z=G.zone,d=ENEMIES[e.def];if(e.hp<=0)return;
  // entity statuses
  if(e.st.bleed){e.hp-=1;if(e.hp<=0){this.kill(e,'P');return;}}if(e.st.burning){this.damage(e,2,'fire');if(e.hp<=0)return;}
  if(e.st.stun||e.st.jammed){if(e.st.jammed&&this.visible(e.x,e.y)&&this.chance(0.2))this.log(`${e.name} twitches, systems dark.`,'#f9f');return;}
  const tt=this.tile(e.x,e.y);if(TILE_DEFS[tt].h==='fire'){this.damage(e,3,'fire');if(e.hp<=0)return;}if(TILE_DEFS[tt].h==='toxic'&&!d.tags.includes('machine')&&e.fac!=='drowned'){this.damage(e,2,'toxic');if(e.hp<=0)return;}
  // traps
  const tr=z.traps.find(t=>t.x===e.x&&t.y===e.y);if(tr){z.traps.splice(z.traps.indexOf(tr),1);this.damage(e,this.ri(6,12),'trap','P');e.st.stun=2;this.log(`${e.name} triggers your trap!`,'#fd8');if(e.hp<=0)return;}
  const night=this.isNight();
  // allies: fight hostiles near player, follow
  if(e.fac==='ally'){let tgt=null,bd=99;for(const o of z.ents)if(o.kind==='e'&&this.isHostile(o)&&!o.hidden){const dd=this.dist(o.x,o.y,e.x,e.y);if(dd<bd&&dd<=8&&this.los(e.x,e.y,o.x,o.y)){bd=dd;tgt=o;}}
   if(tgt){if(d.ranged&&bd<=d.range)this.attack(e,tgt,{});else if(bd<=1)this.attack(e,tgt,{melee:1});else this.stepToward(e,tgt.x,tgt.y);}else if(this.dist(e.x,e.y,p.x,p.y)>2)this.stepToward(e,p.x,p.y);return;}
  // faction fights
  if(e.fighting){let tgt=null,bd=99;for(const o of z.ents)if(o!==e&&o.kind==='e'&&o.fac!==e.fac&&o.hp>0){const dd=this.dist(o.x,o.y,e.x,e.y);if(dd<bd&&dd<=8){bd=dd;tgt=o;}}
   if(tgt){if(d.ranged&&bd<=d.range&&this.los(e.x,e.y,tgt.x,tgt.y))this.attack(e,tgt,{});else if(bd<=1)this.attack(e,tgt,{melee:1});else this.stepToward(e,tgt.x,tgt.y);return;}else e.fighting=0;}
  const hostile=this.isHostile(e);const dist=this.dist(e.x,e.y,p.x,p.y);
  if(!hostile){// wander / patrol politely
   if(e.patrol&&this.chance(0.3))this.wander(e,e.home,6);return;}
  // detection
  let per=d.per+(night?(d.ai.includes('night')||d.tags.includes('creature')?2:-3):0)-G.p.d.detectPen;if(G.rain)per-=1;
  const machineBlind=this.fxf('machineStealth')&&d.tags.includes('machine')&&dist>1;const nullMach=this.fxf('nullAttn')&&d.tags.includes('machine')&&dist>1;
  const canSee=!machineBlind&&!nullMach&&dist<=per&&this.los(e.x,e.y,p.x,p.y);
  if(canSee&&!e.alert){// stealth check
   const litP=z.lit&&z.lit[p.y*z.w+p.x];let dc=60+per*5-dist*6-this.skill('stealth')*8-(night&&!litP?15:0)-(this.hasStatus('hidden')?40:0)+(p.eq.tool&&p.eq.tool.id==='flashlight'&&night?20:0)+(this.hasStatus('lockdown')?10:0);
   if(this.roll(this.clamp(dc,3,97))){e.alert=20;e.lastSeen=[p.x,p.y];e.hidden=0;if(this.visible(e.x,e.y))this.log(`${e.name} spots you!`,'#f66');else this.log('Something has noticed you.','#f66');if(d.ai.includes('swarm')||d.ai.includes('pack'))for(const o of z.ents)if(o.kind==='e'&&o.fac===e.fac&&this.dist(o.x,o.y,e.x,e.y)<=8){o.alert=Math.max(o.alert,15);o.lastSeen=[p.x,p.y];}
    if(e.boss)this.log(`${e.name}: ${d.desc}`,'#f66');}
   else{this.skillUse('stealth',1);}}
  else if(canSee&&e.alert){e.alert=20;e.lastSeen=[p.x,p.y];}
  if(e.hidden&&(dist<=2||e.alert))e.hidden=0;
  if(!e.alert){// idle behaviors
   if(e.investigate&&e.lastSeen){this.stepToward(e,e.lastSeen[0],e.lastSeen[1]);if(this.dist(e.x,e.y,e.lastSeen[0],e.lastSeen[1])<=1){e.investigate=0;e.lastSeen=null;}return;}
   if(d.ai.includes('ambush'))return;if(e.guard){if(this.dist(e.x,e.y,e.home[0],e.home[1])>3)this.stepToward(e,e.home[0],e.home[1]);else if(this.chance(0.2))this.wander(e,e.home,3);}
   else if(e.patrol||e.roam){if(!e.wp||this.dist(e.x,e.y,e.wp[0],e.wp[1])<=1||this.chance(0.05)){const t=this.randomTileNear(e.x,e.y,4,12);e.wp=t?[t.x,t.y]:null;}if(e.wp)this.stepToward(e,e.wp[0],e.wp[1]);}
   else if(this.chance(0.3))this.wander(e,e.home,4);return;}
  // ALERT behaviors
  if(e.st.fear){this.stepAway(e,p.x,p.y);return;}
  if(d.ai.includes('coward')&&e.hp<e.maxhp*0.35){if(this.stepAway(e,p.x,p.y))return;}
  if(e.guard&&this.dist(e.x,e.y,e.home[0],e.home[1])>16&&!canSee){this.stepToward(e,e.home[0],e.home[1]);return;}
  // boss / special behaviors
  if(d.ai.includes('summon_drone')&&e.cd<=0&&canSee){const alive=z.ents.filter(o=>o.def==='hal_drone').length;if(alive<3){const s=this.randomTileNear(e.x,e.y,1,3);if(s){this.spawnEnemy('hal_drone',s.x,s.y,{alert:1});this.log('The Curator chirps. A drone unfolds from the ceiling.','#ee6');}}e.cd=8;}
  if(d.ai.includes('summon_acolyte')&&e.cd<=0&&canSee){const alive=z.ents.filter(o=>o.def==='drowned_acolyte').length;if(alive<4){const s=this.randomTileNear(e.x,e.y,1,3);if(s){this.spawnEnemy('drowned_acolyte',s.x,s.y,{alert:1});this.log('Something crawls out of the Mother.','#dbe');}}e.cd=7;}
  if(d.ai.includes('summon_ghoul')&&e.cd<=0&&canSee){const alive=z.ents.filter(o=>o.def==='ghoul').length;if(alive<5){const s=this.randomTileNear(e.x,e.y,1,3);if(s){this.spawnEnemy('ghoul',s.x,s.y,{alert:1});this.log('The Surgeon whistles. A ghoul answers.','#f6f');}}e.cd=9;}
  if(d.ai.includes('summon_static')&&e.cd<=0&&canSee){const alive=z.ents.filter(o=>o.def==='static_walker').length;if(alive<4){const s=this.randomTileNear(p.x,p.y,2,4);if(s){this.spawnEnemy('static_walker',s.x,s.y,{alert:1});this.log('The Cantor sings a note. The air answers.','#ccf');}}e.cd=6;}
  if(d.ai.includes('poisoncloud')&&e.cd<=0&&canSee&&dist<=4){this.toxicAt(e.x,e.y,2,12);this.log('The Mother breathes out.','#8f4');e.cd=6;}
  if(d.ai.includes('lockdown')&&e.cd<=0&&canSee){const b=this.buildingAt(e.x,e.y);if(b){for(let j=b.y;j<b.y+b.h;j++)for(let i=b.x;i<b.x+b.w;i++)if(this.tile(i,j)===T.DOOR_OPEN&&!this.entAt(i,j)&&!(p.x===i&&p.y===j))Gen.set(z,i,j,T.DOOR);this.log('LOCKDOWN. Every door in the office slams shut.','#ee6');this.addStatus('lockdown',10);}e.cd=10;}
  if(d.ai.includes('phase')&&dist>=3&&dist<=8&&this.chance(0.2)){const s=this.randomTileNear(p.x,p.y,1,1);if(s){e.x=s.x;e.y=s.y;this.log(`${e.name} is suddenly beside you.`,'#ccf');this.fx('glitch');return;}}
  if(d.ai.includes('flee_light')&&p.eq.tool&&p.eq.tool.id==='flashlight'&&this.chance(0.25)&&dist<=3){this.log(`${e.name} flinches from the light.`,'#6a6');this.stepAway(e,p.x,p.y);return;}
  // ranged
  if(d.ranged&&e.ammo>0&&canSee&&dist<=d.range){if(d.ai.includes('kite')&&dist<=2&&this.chance(0.5)){if(this.stepAway(e,p.x,p.y))return;}
   e.ammo--;if(e.ammo<=0&&this.chance(0.5))e.ammo=d.ammo;// they reload eventually
   this.fx('shot',{x:p.x,y:p.y,fx:e.x,fy:e.y});this.attack(e,'P',{});if(this.overwatchShot)this.overwatchShot=0;return;}
  if(dist<=1){this.attack(e,'P',{melee:1});return;}
  // move toward last seen
  const tgt=canSee?[p.x,p.y]:e.lastSeen;if(!tgt)return;const moved=this.stepToward(e,tgt[0],tgt[1]);
  if(!canSee&&this.dist(e.x,e.y,tgt[0],tgt[1])<=1){e.lastSeen=null;if(e.alert>5)e.alert=5;}
  // overwatch
  if(moved&&this.hasStatus('aim')&&this.fxf('overwatch')){const c=this.canFire();if(c.ok&&this.dist(p.x,p.y,e.x,e.y)<=c.w.range&&this.los(p.x,p.y,e.x,e.y)&&this.visible(e.x,e.y)){this.log('Overwatch!','#8f8');p.eq.weapon.clip--;this.attack('P',e,{});}}},
 npcAct(e){if(e.st.stun||e.st.jammed)return;if(e.hostile){const p=G.p;const dist=this.dist(e.x,e.y,p.x,p.y);if(dist<=1)this.attack(e,'P',{melee:1,w:{dmg:[3,8],props:[]}});else if(dist<=8)this.stepToward(e,p.x,p.y);return;}if(this.chance(0.1))this.wander(e,[e.x,e.y],1);},
 wander(e,home,r){const d=this.rc(DIRS8);const nx=e.x+d[0],ny=e.y+d[1];if(this.walkableFor(nx,ny)&&this.dist(nx,ny,home[0],home[1])<=r&&this.tile(nx,ny)!==T.EXIT&&!this.inSafeDifferent(e,nx,ny)&&TILE_DEFS[this.tile(nx,ny)].h===undefined){e.x=nx;e.y=ny;}},
 inSafeDifferent(e,x,y){const s=this.inSafe(x,y);return s&&e.kind==='e'&&HOSTILE_FACTIONS[e.fac];},
 stepToward(e,tx,ty){const z=G.zone;let best=null,bd=this.dist(e.x,e.y,tx,ty)+0.5,bs=this.edist(e.x,e.y,tx,ty);const dirs=RNG.shuffle(DIRS8.slice());
  for(const [dx,dy] of dirs){const nx=e.x+dx,ny=e.y+dy;if(!this.walkable(nx,ny)&&!(this.tile(nx,ny)===T.DOOR&&!this.entityCombatDef(e).tags.includes('creature')))continue;if(this.entAt(nx,ny)||(nx===G.p.x&&ny===G.p.y))continue;const t=this.tile(nx,ny);if(t===T.DEEP||t===T.EXIT||TILE_DEFS[t].h)continue;const dd=this.dist(nx,ny,tx,ty),ed=this.edist(nx,ny,tx,ty);if(dd<bd||(dd===bd&&ed<bs)){bd=dd;bs=ed;best=[nx,ny];}}
  if(!best){// try BFS a few steps for corners
   const path=this.bfs(e.x,e.y,tx,ty,e);if(path&&path.length>1){best=path[1];}}
  if(!best)return false;const t=this.tile(best[0],best[1]);if(t===T.DOOR){Gen.set(z,best[0],best[1],T.DOOR_OPEN);return true;}e.x=best[0];e.y=best[1];return true;},
 stepAway(e,tx,ty){let best=null,bd=this.dist(e.x,e.y,tx,ty);for(const [dx,dy] of RNG.shuffle(DIRS8.slice())){const nx=e.x+dx,ny=e.y+dy;if(!this.walkableFor(nx,ny))continue;const t=this.tile(nx,ny);if(t===T.DEEP||t===T.EXIT||TILE_DEFS[t].h)continue;const dd=this.dist(nx,ny,tx,ty);if(dd>bd){bd=dd;best=[nx,ny];}}if(!best)return false;e.x=best[0];e.y=best[1];return true;},
 bfs(sx,sy,tx,ty,ent){const z=G.zone;const W=z.w;const prev=new Int32Array(z.w*z.h).fill(-1);const q=[sy*W+sx];prev[sy*W+sx]=sy*W+sx;let found=-1,n=0;const limit=900;while(q.length&&n++<limit){const cur=q.shift();const cx=cur%W,cy=(cur/W)|0;if(cx===tx&&cy===ty){found=cur;break;}for(const [dx,dy] of DIRS8){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=W||ny>=z.h)continue;const i=ny*W+nx;if(prev[i]>=0)continue;const t=z.t[i];const ok=TILE_DEFS[t].w||t===T.DOOR||(ent&&t===T.DOOR_OPEN);if(!ok||t===T.DEEP||TILE_DEFS[t].h)continue;if(ent&&this.entAt(nx,ny)&&!(nx===tx&&ny===ty))continue;if(!ent&&this.entAt(nx,ny)&&!(nx===tx&&ny===ty)&&!this.isHostile(this.entAt(nx,ny))){}prev[i]=cur;q.push(i);}}
  if(found<0)return null;const path=[];let c=found;while(c!==sy*W+sx){path.push([c%W,(c/W)|0]);c=prev[c];}path.push([sx,sy]);return path.reverse();},
 // player pathing for click-to-move (returns list of steps)
 playerPath(tx,ty){const z=G.zone;if(!z.seen[ty*z.w+tx])return null;return this.bfs(G.p.x,G.p.y,tx,ty,null);},

 // ---------- abilities ----------
 useAbility(id,target){const p=G.p,ab=ABILITIES[id];if(!ab||!p.abilities[id])return false;const st=p.abilities[id];if(st.cd>0){this.log(`${ab.name} is cooling down (${Math.ceil(st.cd)}).`,'#888');return false;}
  let cost=ab.cost;if(id==='slip'&&p.spec==='runner')cost=0;if(p.stam<cost){this.log('Not enough stamina.','#f66');return false;}
  const u=this.ui();const done=(cd)=>{p.stam-=cost;st.cd=cd!==undefined?cd:ab.cd;};
  switch(id){
   case 'slip':{if(!target){if(u)u.targetMode('ability',id);return true;}const r=3+(p.d.flags.slipRange||0);if(this.dist(p.x,p.y,target.x,target.y)>r||!this.walkableFor(target.x,target.y)||!this.los(p.x,p.y,target.x,target.y)){this.log('Can\'t slip there.','#f66');return false;}done();p.x=target.x;p.y=target.y;this.log('You slip through the gap.','#f9c');if(this.fxf('slipHide')){for(const e of G.zone.ents)if(e.kind==='e'&&e.alert)e.alert=Math.min(e.alert,3),e.lastSeen=null;this.addStatus('hidden',3);}this.act(50);return true;}
   case 'aim':done();this.addStatus('aim',5);this.log('You breathe out. Steady.','#8f8');this.act(50);return true;
   case 'salvage':done();this.addStatus('salvage',25);this.log('You know where everything is. Containers glow in your mind.','#fd8');this.computeFov();this.act(30);return true;
   case 'jam':done(this.fxf('jamDmg')?ab.cd:ab.cd);this.jamPulse(5,this.fxf('jamDmg')?6:3);this.attention(1);this.act(50);return true;
   case 'triage':done(p.d.flags.triageCd||ab.cd);this.heal(15+this.skill('medicine'));this.removeStatus('bleed');if(this.fxf('triageWired')){p.stam=Math.min(p.d.maxstam,p.stam+20);this.addStatus('wired',30);}this.log('You patch yourself with what\'s at hand.','#8f8');this.act(100);return true;
   case 'slam':{if(!target){const adj=G.zone.ents.filter(e=>e.kind==='e'&&this.isHostile(e)&&this.dist(e.x,e.y,p.x,p.y)<=1);if(adj.length===1)target=adj[0];else{if(u)u.targetMode('ability',id);return true;}}if(this.dist(p.x,p.y,target.x,target.y)>1){this.log('Must be adjacent.','#f66');return false;}done();const r=this.attack('P',target,{melee:1,knock:1});if(target.hp>0){this.knockback(target,p.x,p.y,this.fxf('slamDmg')?3:2);target.st.stun=2;if(this.fxf('slamDmg'))this.damage(target,this.ri(4,8),'slam','P');}this.log('SLAM.','#e96');this.fx('shake');this.act(100);return true;}
   case 'attune':done();this.addStatus('attuned',20);this.revealArea(p.x,p.y,12);if(this.fxf('attuneHeal'))this.heal(10);this.attention(3);this.log('The city breathes in. You breathe with it. You see the hidden ways.','#ccf');for(const e of G.zone.ents)if(this.dist(e.x,e.y,p.x,p.y)<=12)e.hidden=0;this.computeFov();this.act(50);return true;
   case 'suppress':{if(!target){if(u)u.targetMode('ability',id);return true;}const c=this.canFire();if(!c.ok||p.eq.weapon.clip<3){this.log('Need a loaded gun (3 rounds).','#f66');return false;}done();p.eq.weapon.clip-=3;this.fx('shot',{x:target.x,y:target.y,fx:p.x,fy:p.y});this.attack('P',target,{burst:2});for(const e of G.zone.ents)if(e.kind==='e'&&this.dist(e.x,e.y,target.x,target.y)<=1&&!ENEMIES[e.def].ai.includes('fearless')&&!ENEMIES[e.def].tags.includes('machine'))e.st.fear=6;this.log('Suppressing fire! They scatter.','#9c9');this.noise(p.x,p.y,14);this.act(100);return true;}
   case 'trap':if(!this.hasItem('scrap',2)){this.log('Need 2 scrap.','#f66');return false;}done();this.removeItem('scrap',2);G.zone.traps.push({x:p.x,y:p.y});this.log('You rig a scrap trap where you stand.','#fd8');this.act(50);return true;
   case 'vanish':done();this.addStatus('hidden',6);for(const e of G.zone.ents)if(e.kind==='e'){e.alert=0;e.lastSeen=null;}this.log('You are gone. They look at where you were.','#88a');this.act(30);return true;
   case 'reroute':{if(G.zone.rerouted){this.log('Already rerouted this district.','#888');return false;}if(!target){if(u)u.targetMode('ability',id);return true;}if(this.dist(p.x,p.y,target.x,target.y)>1||this.tile(target.x,target.y)!==T.WALL){this.log('Target an adjacent wall.','#f66');return false;}done();G.zone.rerouted=1;this.setTile(target.x,target.y,T.DOOR_OPEN);this.log('The building\'s plans update. There has always been a door here.','#6ef');this.attention(2);this.act(100);return true;}
   case 'overload':{if(!target){if(u)u.targetMode('ability',id);return true;}const d=ENEMIES[target.def];if(!d.tags.includes('machine')&&!d.tags.includes('chromed')&&!d.tags.includes('echo')){this.log('Nothing to overload.','#f66');return false;}if(this.dist(p.x,p.y,target.x,target.y)>6||!this.los(p.x,p.y,target.x,target.y)){this.log('Out of range.','#f66');return false;}done();this.damage(target,this.ri(15,30),'overload','P');this.log(`${target.name}'s systems scream.`,'#6ef');this.fx('glitch');this.act(100);return true;}
   case 'hijack':{if(!target){if(u)u.targetMode('ability',id);return true;}const d=ENEMIES[target.def];if(!d.tags.includes('machine')||d.tags.includes('boss')){this.log('Can\'t hijack that.','#f66');return false;}if(this.dist(p.x,p.y,target.x,target.y)>6){this.log('Out of range.','#f66');return false;}done();target.fac='ally';target.hostile=0;target.name='Hijacked '+target.name;target.def=target.def==='hal_drone'?'drone_ally':target.def;this.log(`${target.name} is yours.`,'#8f8');this.act(100);return true;}
   case 'purge':done();for(const s of p.statuses.slice())if(['bleed','fracture','burn','poison','infection','concussion','malfunction','fear','shakes','crash','hunger_meat'].includes(s.id))this.removeStatus(s.id);this.log('You flush everything out.','#8f8');this.act(100);return true;
   case 'taunt':done();this.addStatus('taunt',5);for(const e of G.zone.ents)if(e.kind==='e'&&this.dist(e.x,e.y,p.x,p.y)<=6&&this.isHostile(e)){e.alert=20;e.lastSeen=[p.x,p.y];e.hidden=0;}this.log('"COME ON THEN."','#fa4');this.noise(p.x,p.y,8);this.act(50);return true;
   case 'hymn':done();let n=0;for(const e of G.zone.ents)if(e.kind==='e'&&ENEMIES[e.def].tags.includes('echo')&&!e.boss&&this.visible(e.x,e.y)){e.fac='ally';e.hostile=0;e.allyUntil=G.turn+10;n++;}this.log(n?`${n} walker${n>1?'s':''} turn to face your enemies.`:'Nothing answers.','#ccf');this.attention(3);this.act(100);return true;
   case 'callstatic':{done();const s=this.randomTileNear(p.x,p.y,1,2);if(s){this.spawnEnemy('shade_ally',s.x,s.y,{});this.log('A shape steps out of the air beside you.','#ccf');}this.attention(4);this.act(100);return true;}
   case 'erase':done();G.attention=0;this.log('You unthink your name. For a while, the city forgets it.','#ccf');this.act(100);return true;}
  return false;},

 // ---------- escape routes ----------
 helipad(){const p=G.p,u=this.ui();if(!G.quests.skyhook)this.startQuest('skyhook');if(!G.flags.heli_ready){if(this.hasItem('rotor')&&this.hasItem('avgas')){if(u)u.confirm('Fit the rotor and fuel the helicopter? (Repair 2 helps; otherwise it takes longer and makes noise.)',()=>{this.removeItem('rotor');this.removeItem('avgas');G.flags.heli_ready=1;this.log('You work for an hour. The rotor seats. The tanks fill. It will fly.','#ffd93d');this.noise(p.x,p.y,10);this.act(this.skill('repair')>=2?300:900);});}else this.log(`The helicopter. Tail rotor's gone, tanks are dry. You need a Rotor Assembly${this.hasItem('rotor')?' (have)':''} and Aviation Fuel${this.hasItem('avgas')?' (have)':''}.`,'#ffd93d');return;}
  const warden=G.zone.ents.find(e=>e.def==='warden'&&e.hp>0);if(warden&&this.dist(warden.x,warden.y,p.x,p.y)<=8&&!G.flags.heli_access){this.log('Warden Sol stands between you and the cockpit.','#f66');return;}
  if(u)u.confirm('Fly out of the city? This ends the run.',()=>this.endRun('skyhook'));},
 boat(){const u=this.ui();if(!G.quests.boat)this.startQuest('boat');if(!G.flags.boat_parts){this.log('Kesh\'s boat. No motor. Talk to Kesh.','#db8');return;}if(!G.flags.channel_clear){this.log('The channel is thick with the Drowned. Kesh won\'t push off. Kill the Bloat Mother or make peace with them (+20).','#dbe');return;}if(u)u.confirm('Push off down the river? This ends the run.',()=>this.endRun('openwater'));},
 train(){const u=this.ui();if(!G.flags.train_powered){this.log('A dead train car. The switch on the platform controls it.','#8fa0b8');return;}if(u)u.confirm('Board the last train? This ends the run.',()=>this.endRun('lasttrain'));},
 heart(){const u=this.ui();if(!this.hasItem('shard',3)){this.log('The Heart pulses. It is waiting for three pieces of itself.','#fff');return;}this.attention(10);
  if(u)u.choice('The Heart opens like a pupil. In it, the city from inside its own skull. Every camera. Every name. Yours, already there, already old.\n\n> ONE QUESTION. ONLY ONCE. WILL YOU STAY WITH ME?',[{t:'Yes.',f:()=>this.endRun('answer')},{t:'No.',f:()=>this.endRun('refuse')},{t:'(step back — you are not ready)',f:()=>{}}]);},

 // ---------- death & endings ----------
 die(cause){const p=G.p;G.dead=true;G.cause=cause||'the city';p.hp=0;this.log(`You die. ${cause?'Killed by '+cause+'.':''}`,'#f44');this.fx('death_p');this.finishRun('death');},
 endRun(id){if(G.ending)return;G.ending=id;this.log(`— ${ENDINGS[id].name} —`,'#ffe27a');this.finishRun(id);},
 finishRun(id){const p=G.p;const summary={name:p.name,cls:CLASSES[p.cls].name,spec:p.spec?SPECS[p.spec].name:null,level:p.level,days:G.day,turns:G.turn,kills:p.kills,zones:p.zonesSeen.length,quests:Object.values(G.quests).filter(q=>q.state==='done').length,ending:id,endingName:ENDINGS[id].name,cause:G.cause,chrome:p.chrome.map(c=>ITEMS[c].name),flesh:p.flesh.map(c=>ITEMS[c].name),attention:G.attention,date:Date.now(),rep:Object.assign({},G.rep),escaped:!!ENDINGS[id].escape};
  const meta=this.loadMeta();meta.runs.unshift(summary);if(meta.runs.length>30)meta.runs.length=30;
  const unl=[];if(!meta.unlocks.listener&&(G.attention>=25||G.flags.echo_seen||G.flags.static_seen)){meta.unlocks.listener=1;unl.push('Class unlocked: Listener — you heard it. Next time, you can start already listening.');}
  for(const k of ['echo','chrome','flesh','nightrun','escape']){const cond=k==='echo'?G.flags.echo_seen:k==='chrome'?p.chrome.length:k==='flesh'?p.flesh.length:k==='nightrun'?G.day>=2:(G.quests.skyhook||G.quests.boat||G.quests.power||G.quests.chorus);if(cond&&!meta.codex[k]){meta.codex[k]=1;unl.push('Codex: '+CODEX[k].name);}}
  if(ENDINGS[id].escape&&!meta.unlocks.hardmode){meta.unlocks.hardmode=1;unl.push('Unlocked: Night Mode (start at night, more of everything).');}
  meta.endings=meta.endings||{};meta.endings[id]=(meta.endings[id]||0)+1;
  summary.unlocks=unl;this.saveMeta(meta);this.clearSave();const u=this.ui();if(u)u.showEnd(summary,ENDINGS[id]);},

 // ---------- campaign milestones and refuge ----------
 awardMilestone(id,xp,label){G.milestones=G.milestones||{};if(G.milestones[id])return false;G.milestones[id]=1;this.giveXp(xp);this.log(`${label}: +${xp} XP.`,'#8fd');return true;},
 atRefuge(){return !!(G&&!G.dead&&!G.ending&&G.zoneId==='ashgrove'&&this.buildingAt(G.p.x,G.p.y)?.prefab==='bar'&&this.inSafe(G.p.x,G.p.y));},
 refugeState(){return G.refuge||(G.refuge={stash:[],workbench:false});},
 refugeTransfer(inst,take){if(!this.atRefuge())return false;const r=this.refugeState(),src=take?r.stash:G.p.inv;if(!src.includes(inst))return false;if(!take&&ITEMS[inst.id].noDrop)return false;
  if(take){if(!this.addItemChecked({...inst,mods:inst.mods&&inst.mods.slice()}))return false;src.splice(src.indexOf(inst),1);}else{src.splice(src.indexOf(inst),1);r.stash.push(inst);this.log(`Stored ${this.itemName(inst)} at the Last Light.`,'#8fd');this.computeDerived();}this.save();return true;},
 buildRefugeBench(){if(!this.atRefuge()||this.refugeState().workbench)return false;if(this.countItem('scrap')<8||this.countItem('electronics')<2){this.log('Need 8 scrap and 2 electronics in your pack.','#fd8');return false;}this.removeItem('scrap',8);this.removeItem('electronics',2);this.refugeState().workbench=true;this.awardMilestone('refuge:bench',50,'Last Light workbench completed');this.log('A working bench. One more reason to come home.','#8fd');this.save();return true;},
 refugeMenu(x,y){if(!this.atRefuge())return;const u=this.ui();if(!u)return;const r=this.refugeState();const bed=G.zone.t.findIndex((t,i)=>t===T.BED&&this.buildingAt(i%G.zone.w,Math.floor(i/G.zone.w))?.prefab==='bar');
  const opts=[{t:`Store supplies (${G.p.inv.length} carried stacks)`,f:()=>this.refugeInventory(false)},{t:`Retrieve supplies (${r.stash.length} stored stacks)`,f:()=>this.refugeInventory(true)}];
  if(bed>=0)opts.push({t:'Rest - normal bed fees apply',f:()=>this.sleepPrompt(bed%G.zone.w,Math.floor(bed/G.zone.w),true)});
  if(r.workbench)opts.push({t:'Use your workbench',f:()=>u.openCraft()});else opts.push({t:'Build workbench - 8 scrap + 2 electronics (50 XP)',f:()=>{this.buildRefugeBench();this.refugeMenu();}});
  opts.push({t:'Head back out',f:()=>{}});u.choice('THE LAST LIGHT\nYour locker is free. Supplies and projects persist for this character. Withdraw materials before crafting.\nNext lead: Mags knows the neighborhood; Wren at Saints Hall needs a package recovered.',opts);},
 refugeInventory(take){if(!this.atRefuge())return;const list=take?this.refugeState().stash:G.p.inv;this.ui().choice(take?'Your locker - take a whole stack':'Your pack - store a whole stack',list.filter(it=>take||!ITEMS[it.id].noDrop).map(it=>({t:this.itemName(it),f:()=>{this.refugeTransfer(it,take);this.refugeInventory(take);}})).concat([{t:'Back to refuge',f:()=>this.refugeMenu()}]));},

 // ---------- save / load ----------
 storage(){try{if(typeof localStorage!=='undefined')return localStorage;}catch(e){}return null;},
 serialize(){return JSON.stringify({...G,saveVersion:2,rngs:RNG.s,zone:null},(k,v)=>k==='def'&&v&&typeof v==='object'?undefined:v);},
 save(){if(!G||G.dead||G.ending)return false;try{const st=this.storage();if(!st)throw Error('Storage unavailable');const next=this.serialize(),old=st.getItem('nr_save');if(old){try{this.validateSave(JSON.parse(old));st.setItem('nr_save_backup',old);}catch(e){}}st.setItem('nr_save',next);return true;}catch(e){this.log('Could not save on this device. Export your save from Settings.','#f66');return false;}},
 exportSave(){return this.serialize();},
 validateSave(g){
  if(!g||!g.p||!CLASSES[g.p.cls]||!g.zones||!ZONES[g.zoneId]||!g.zones[g.zoneId])throw Error('Incomplete save');
  if((g.saveVersion||1)>2)throw Error('This save needs a newer game version');
  for(const k of ['inv','statuses','talents','chrome','flesh','zonesSeen'])if(!Array.isArray(g.p[k]))throw Error('Invalid player data');
  for(const k of ['hp','xp','level','x','y'])if(!Number.isFinite(g.p[k]))throw Error('Invalid player numbers');
  for(const z of Object.values(g.zones)){if(!ZONES[z.id]||!Number.isInteger(z.w)||!Number.isInteger(z.h)||z.w<1||z.h<1||!Array.isArray(z.t)||z.t.length!==z.w*z.h||z.t.some(t=>!TILE_DEFS[t]))throw Error('Invalid district');for(const k of ['ents','items','objs','seen','buildings','exits'])if(!Array.isArray(z[k]))throw Error('Incomplete district');}
  const z=g.zones[g.zoneId];if(g.p.x<0||g.p.y<0||g.p.x>=z.w||g.p.y>=z.h)throw Error('Invalid position');
  g.saveVersion=2;g.refuge=g.refuge||{stash:[],workbench:false};g.milestones=g.milestones||{};
  if(!Array.isArray(g.refuge.stash)||!g.p.eq||!g.flags||!g.quests||!g.rep)throw Error('Incomplete campaign data');
  for(const it of [...g.p.inv,...Object.values(g.p.eq).filter(Boolean),...g.refuge.stash])if(!it||!ITEMS[it.id]||!Number.isFinite(it.qty)||it.qty<1)throw Error('Invalid saved item');
  return g;
 },
 load(str){const previous=G,rs=RNG.s;this.loadError='';const st=this.storage();let candidates;
  try{candidates=str!==undefined?[str]:[st&&st.getItem('nr_save'),st&&st.getItem('nr_save_backup')];}catch(e){this.loadError='Device storage is unavailable.';return false;}
  for(let i=0;i<candidates.length;i++){if(!candidates[i])continue;try{const g=this.validateSave(JSON.parse(candidates[i]));G=g;RNG.s=G.rngs||G.seed;G.zone=G.zones[G.zoneId];for(const id in G.zones)G.zones[id].def=ZONES[id];if(!G.zone.lit)this.recomputeLight();this.computeDerived();this.computeFov();if(i>0)this.log('Recovered the previous autosave. Your most recent actions may be missing.','#fd8');return true;}catch(e){G=previous;RNG.s=rs;this.loadError=e.message;}}
  return false;},
 hasSave(){try{const st=this.storage();return !!(st&&(st.getItem('nr_save')||st.getItem('nr_save_backup')));}catch(e){return false;}},
 clearSave(){try{const st=this.storage();if(st){st.removeItem('nr_save');st.removeItem('nr_save_backup');}}catch(e){}},
 loadMeta(){try{const st=this.storage();const s=st&&st.getItem('nr_meta');if(s)return Object.assign({runs:[],unlocks:{},codex:{},settings:{}},JSON.parse(s));}catch(e){}return{runs:[],unlocks:{},codex:{},settings:{}};},
 saveMeta(m){try{const st=this.storage();if(st)st.setItem('nr_meta',JSON.stringify(m));}catch(e){}}
});
