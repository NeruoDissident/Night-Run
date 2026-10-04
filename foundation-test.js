const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const mem=new Map(),ctx={console,assert,localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)}};vm.createContext(ctx);
vm.runInContext(['data.js','content.js','gen.js','engine.js','engine2.js'].map(f=>fs.readFileSync(__dirname+'/'+f,'utf8')).join('\n'),ctx);
vm.runInContext(`
Game.newGame('Refuge','soldier',42);assert.ok(Game.atRefuge());assert.ok(G.quests.first_steps);
const item=Game.makeItem('scrap',8);Game.addItem(item);const stack=Game.findItem('scrap');const qty=stack.qty;
assert.equal(Game.refugeTransfer(stack,false),true);assert.equal(Game.countItem('scrap'),0);assert.equal(Game.refugeState().stash[0].qty,qty);
const saved=Game.exportSave();assert.equal(Game.load(saved),true);assert.equal(Game.refugeState().stash[0].qty,qty);
assert.equal(Game.refugeTransfer(Game.refugeState().stash[0],true),true);assert.equal(Game.countItem('scrap'),qty);
Game.giveItem('electronics',2);assert.equal(Game.buildRefugeBench(),true);const xp=G.p.xp;assert.equal(Game.buildRefugeBench(),false);assert.equal(G.p.xp,xp);
const over=Game.makeItem('scrap',999);Game.refugeState().stash.push(over);assert.equal(Game.refugeTransfer(over,true),false);assert.ok(Game.refugeState().stash.includes(over));
Game.enterZone('marrow','ashgrove');assert.equal(Game.refugeTransfer(over,true),false);const exp=G.p.xp,level=G.p.level;Game.enterZone('ashgrove','marrow');Game.enterZone('marrow','ashgrove');assert.equal(G.p.xp,exp);assert.equal(G.p.level,level);
console.log('PASS stash persistence, transfer ownership, weight limit, location lock, one-time project and exploration rewards');
Game.newGame('Saves','soldier',42);Game.save();G.p.creds+=17;Game.save();const current=G,rs=RNG.s;
assert.equal(Game.load('{broken'),false);assert.equal(G,current);assert.equal(RNG.s,rs);
const future=JSON.parse(Game.exportSave());future.saveVersion=999;assert.equal(Game.load(JSON.stringify(future)),false);assert.equal(G,current);
const bad=JSON.parse(Game.exportSave());bad.p.inv=[{id:'not-an-item',qty:1}];assert.equal(Game.load(JSON.stringify(bad)),false);assert.equal(G,current);
localStorage.setItem('nr_save','broken');assert.equal(Game.load(),true);assert.ok(G.log.some(l=>l.t.includes('Recovered')));
const legacy=JSON.parse(Game.exportSave());delete legacy.saveVersion;delete legacy.refuge;delete legacy.milestones;assert.equal(Game.load(JSON.stringify(legacy)),true);assert.equal(G.saveVersion,2);assert.equal(G.refuge.stash.length,0);
Game.clearSave();assert.equal(Game.hasSave(),false);
console.log('PASS invalid/future save rejection, rollback, backup recovery, legacy migration, complete save clearing');
Game.newGame('Progress','soldier',42);Game.giveXp(360);assert.equal(G.p.level,4);assert.equal(G.p.tp,3);
const npc=G.zone.ents.find(e=>e.kind==='npc');npc.hostile=1;G.p.x=npc.x+3;G.p.y=npc.y;Game.setTile(npc.x+1,npc.y,T.DOOR);assert.doesNotThrow(()=>Game.npcAct(npc));
console.log('PASS early specialization threshold and NPC door movement');
let isolatedOrdinary=0;for(let seed=1;seed<=500;seed++){Game.newGame('Access','soldier',seed);const loot=[];for(const id of Object.keys(ZONES)){const z=Game.ensureZone(id),r=new Uint8Array(z.w*z.h),q=[[z.exits[0].x,z.exits[0].y]];r[q[0][1]*z.w+q[0][0]]=1;while(q.length){const [x,y]=q.pop();for(const [dx,dy] of DIRS8){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=z.w||ny>=z.h)continue;const k=ny*z.w+nx,t=z.t[k];if(!r[k]&&(TILE_DEFS[t].w||[T.DOOR,T.DOOR_LOCKED,T.GATE].includes(t))){r[k]=1;q.push([nx,ny]);}}}
loot.push(...z.items,...Object.values(z.conts).flatMap(c=>c.items));for(const it of z.items)if(ITEMS[it.id].type==='quest')assert.ok(r[it.y*z.w+it.x],'Floor quest '+seed+' '+id);
for(const ex of z.exits)assert.ok(r[ex.y*z.w+ex.x],'Exit '+seed+' '+id);
for(const [k,c] of Object.entries(z.conts)){if(!c.items.length)continue;const [x,y]=k.split(',').map(Number);const access=DIRS8.some(([dx,dy])=>r[(y+dy)*z.w+x+dx]);if(!access)isolatedOrdinary++;if(c.items.some(it=>ITEMS[it.id].type==='quest'))assert.ok(access,'Quest loot '+seed+' '+id+' '+k);}
}for(const id of ['wren_package','outboard','rotor','avgas','neuralunit','ledger','powercell'])assert.ok(loot.some(it=>it.id===id),'Missing '+id+' seed '+seed);}
console.log('PASS 500 cities: exits and quest containers geometrically accessible (locks treated as passable); ordinary isolated containers:',isolatedOrdinary);
`,ctx);
