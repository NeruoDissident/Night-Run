// Headless smoke test: loads the game files, creates runs for every class, plays random turns, exercises systems.
const fs=require('fs'),vm=require('vm');
const src=['data.js','content.js','gen.js','engine.js','engine2.js'].map(f=>fs.readFileSync(__dirname+'/'+f,'utf8')).join('\n');
const ctx={console,localStorage:(()=>{const m={};return{getItem:k=>m[k]||null,setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>{delete m[k];}};})()};
vm.createContext(ctx);
ctx.UI={onLog(){},refresh(){},fx(){},confirm(m,f){f&&f();},choice(t,o){const x=o.find(a=>a.f)||o[0];x.f&&x.f();},openLoot(c){for(const it of c.items.slice()){c.items.splice(c.items.indexOf(it),1);}},openTrade(){},openInstall(){},showDialogue(e,node){ctx.lastNode=node;},closeDialogue(){},targetMode(){},openCraft(){},showEnd(s){ctx.ended=s;}};
vm.runInContext(src,ctx,{filename:'game.js'});
vm.runInContext(`
const results=[];
for(const cls of Object.keys(CLASSES)){
 const g=Game.newGame('Tester',cls,12345+cls.length*7);
 let errors=0;
 // walk the map randomly, visit all zones
 const zonesToVisit=Object.keys(ZONES);
 for(const zid of zonesToVisit){ Game.enterZone(zid,G.zoneId); 
   const z=G.zone; 
   // sanity: exits reachable
   const reach=Gen.flood(z,G.p.x,G.p.y); for(const ex of z.exits){ if(!reach[ex.y*z.w+ex.x]) { console.log('UNREACHABLE EXIT',zid,ex); errors++; } }
   for(const b of z.buildings){ let ok=false; for(let j=b.y;j<b.y+b.h;j++)for(let i=b.x;i<b.x+b.w;i++) if(reach[j*z.w+i]&&z.t[j*z.w+i]!==T.WALL) ok=true; if(!ok){console.log('UNREACHABLE BUILDING',zid,b.name);errors++;} }
   for(let t=0;t<150;t++){ const d=DIRS8[Math.floor(Math.random()*8)]; try{ Game.move(d[0],d[1]); if(Math.random()<0.1)Game.pickup(); if(Math.random()<0.05){ const inv=G.p.inv; if(inv.length) Game.useInst(inv[Math.floor(Math.random()*inv.length)]); } if(Math.random()<0.05){ const en=Game.enemiesVisible(); if(en.length) Game.fireAt(en[0]); } if(Math.random()<0.05){ for(const id in G.p.abilities) Game.useAbility(id,null); } }catch(e){ console.log('ERR',cls,zid,e.stack); errors++; break; } if(G.dead||G.ending)break; }
   if(G.dead||G.ending)break;
 }
 // test dialogue graph for each npc
 for(const nid in DLG){ for(const node in DLG[nid]){ try{ const n=DLG[nid][node](G); for(const o of n.opts){ if(o.cond) o.cond(); } }catch(e){ console.log('DLG ERR',nid,node,e.message); errors++; } } }
 // quests stage fns
 for(const qid in QUESTS){ for(const st of QUESTS[qid].stages){ try{ st.done(G);}catch(e){ console.log('QUEST ERR',qid,e.message); errors++; } } }
 // events
 for(const ev of EVENTS){ try{ if(ev.cond(G)) ev.run(G); }catch(e){ console.log('EVENT ERR',ev.id,e.message); errors++; } }
 // save/load round trip
 if(!G.dead&&!G.ending){ const s=Game.exportSave(); const ok=Game.load(s); if(!ok){console.log('LOAD FAIL');errors++;} }
 // crafting
 for(const r of RECIPES){ try{ Game.canCraft(r);}catch(e){console.log('RECIPE ERR',r.id,e.message);errors++;} }
 results.push({cls,level:G.p.level,hp:G.p.hp,dead:G.dead,ending:G.ending,turn:G.turn,zones:G.p.zonesSeen.length,errors,inv:G.p.inv.length,attention:G.attention});
}
console.log(JSON.stringify(results,null,1));
// vendor stock/prices
Game.newGame('T','soldier',7); for(const n in NPCS){ if(NPCS[n].vendor){ const st=Game.vendorStock(n); for(const e of st) Game.price(e.id,1,n); } }
// death path
Game.dmgPlayer(9999,'test'); console.log('ended:',ended&&ended.endingName, 'meta runs', Game.loadMeta().runs.length);
`,ctx);
