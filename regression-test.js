// Deterministic regressions for the first reliability pass. Run: node regression-test.js
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const mem=new Map();const ctx={console,assert,localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)}};
vm.createContext(ctx);vm.runInContext(['data.js','content.js','gen.js','engine.js','engine2.js'].map(f=>fs.readFileSync(__dirname+'/'+f,'utf8')).join('\n'),ctx);
vm.runInContext(`
for(let seed=1;seed<=500;seed++){
 Game.newGame('Generation','soldier',seed);
 for(const id of Object.keys(ZONES)){
  const z=Game.ensureZone(id);
  for(const [nid,n] of Object.entries(NPCS))if(n.zone===id){
   const e=z.ents.find(e=>e.kind==='npc'&&e.def===nid);
   assert.ok(e,'Missing '+nid+' seed '+seed);assert.ok(TILE_DEFS[z.t[e.y*z.w+e.x]].w,'Blocked NPC '+nid);
   assert.equal(z.ents.filter(o=>o.x===e.x&&o.y===e.y).length,1,'Overlapping NPC '+nid);
  }
 }
}
console.log('PASS 500 cities / 4,000 districts: all named NPCs spawn on unoccupied walkable tiles');
function arena(cls='soldier'){
 Game.newGame('Combat',cls,42);G.zone.ents=[];G.zone.objs=[];G.p.x=20;G.p.y=20;G.time=12*60;
 for(let y=18;y<=23;y++)for(let x=18;x<=23;x++)Game.setTile(x,y,T.FLOOR);
 const e=Game.makeEnemy('scav_rat',21,20,G.zone,{});e.alert=20;G.zone.ents=[e];return e;
}
for(const duration of [1,2]){
 const e=arena();e.st.stun=duration;let actions=0;const oldAttack=Game.attack;Game.attack=function(...args){if(args[0]===e)actions++;return oldAttack.apply(this,args)};
 for(let i=0;i<duration;i++)Game.wait();assert.equal(actions,0,'Stun must block full duration');Game.wait();assert.equal(actions,1);Game.attack=oldAttack;
}
console.log('PASS stun suppresses the promised number of enemy actions');
arena();const npc=Game.makeNpc('mags',21,20,G.zone);G.zone.ents=[npc];G.time=22*60;
assert.doesNotThrow(()=>Game.attack('P',npc,{melee:1}));npc.hostile=1;assert.doesNotThrow(()=>Game.npcAct(npc));
console.log('PASS NPC combat and night retaliation');
arena('listener');const echo=Game.makeEnemy('static_walker',21,20,G.zone,{});G.zone.ents=[echo];assert.equal(Game.isHostile(echo),false);Game.damage(echo,1,'you','P');assert.equal(Game.isHostile(echo),true);
console.log('PASS Listener Echo neutrality ends when harmed');
let e=arena();const oldRi=Game.ri;Game.ri=(a,b)=>a===1&&b===100?20:a;Game.addStatus('aim',5);const aimed=Game.attack('P',e);assert.equal(aimed.crit,true);assert.equal(Game.hasStatus('aim'),false);Game.ri=oldRi;
e=arena();const base=55+Game.combatStats('P').hitBonus-Game.combatStats(e).evade*3;
Game.ri=(a,b)=>a===1&&b===100?base+5:a;assert.equal(Game.attack('P',e).hit,false);G.p.eq.weapon.mods.push('scope');assert.equal(Game.attack('P',e).hit,true);Game.ri=oldRi;
console.log('PASS aimed critical bonus and fitted scope accuracy');
const save=Game.exportSave(),next=RNG.next();assert.equal(Game.load(save),true);assert.equal(RNG.next(),next);
console.log('PASS save/load RNG continuity');
`,ctx);
