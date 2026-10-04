// Exploratory controller: full-map path knowledge, real movement/combat costs.
// Limited retreat, equipment, trading and resupply decisions; failures are not human win rates.
const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={console,localStorage:{getItem(){return null},setItem(){},removeItem(){}}};vm.createContext(ctx);
vm.runInContext(['data.js','content.js','gen.js','engine.js','engine2.js','campaign.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n'),ctx);
const results=vm.runInContext(`(()=>{
const results=[];let stage='',actions=0;
const ui={onLog(){},refresh(){},fx(){},showEnd(){},showDialogue(){},closeDialogue(){},openLoot(c){for(const it of c.items.slice()){if(it.id===stage.slice(5)||['food','med','ammo','val'].includes(ITEMS[it.id].type)){while(Game.totalWeight()+ITEMS[it.id].wt*it.qty>G.p.d.carry){const excess=G.p.inv.find(i=>ITEMS[i.id].type==='mat'&&i.id!=='fuel');if(!excess)break;Game.dropInst(excess,true);}if(Game.addItemChecked(it))c.items.splice(c.items.indexOf(it),1);}}},confirm(m,fn){if(!m.startsWith('Attack '))fn()},choice(t,opts){const o=opts.find(o=>/move aside/.test(o.t))||opts.find(o=>/Pick the lock/.test(o.t))||opts.find(o=>/Leave|Not now|step back/.test(o.t));if(o)o.f()},targetMode(){}};
Game.ui=()=>ui;
function maintain(){
 const p=G.p;
 if(p.hp<p.d.maxhp*.6){if(p.abilities.triage&&p.abilities.triage.cd<=0){Game.useAbility('triage');return true;}const it=p.inv.find(i=>ITEMS[i.id].heal&&ITEMS[i.id].type==='med');if(it){Game.useInst(it);return true;}}
 if(p.hunger>65){const it=p.inv.find(i=>ITEMS[i.id].hunger);if(it){Game.useInst(it);return true;}}
 if(p.level>=4&&!p.spec)Game.chooseSpec(CLASSES[p.cls].specs[p.cls==='bruiser'?1:0]);
 while(p.tp>0){const ids=Game.availableTalents();const id=ids.find(id=>TALENTS[id].fx&&(TALENTS[id].fx.arm||TALENTS[id].fx.dmgM||TALENTS[id].fx.hp))||ids[0];if(!id)break;Game.chooseTalent(id);}
 while(p.sp>0)Game.chooseStat('end');return false;
}
function combat(){const p=G.p;const enemies=Game.enemiesVisible().filter(e=>e.alert).sort((a,b)=>Game.dist(a.x,a.y,p.x,p.y)-Game.dist(b.x,b.y,p.x,p.y));const e=enemies[0];if(!e)return false;const dist=Game.dist(e.x,e.y,p.x,p.y),w=Game.weaponDef();
 if(p.abilities.jam&&p.abilities.jam.cd<=0&&dist<=6&&ENEMIES[e.def].tags.includes('machine')){Game.useAbility('jam',e);return true;}
 if(p.abilities.slam&&p.abilities.slam.cd<=0&&dist<=1){Game.useAbility('slam',e);return true;}
 if(w.ranged&&dist<=w.range&&Game.los(p.x,p.y,e.x,e.y)){if(p.eq.weapon.clip>0){Game.fireAt(e);return true;}if(Game.findItem(AMMO_ITEM[w.ammo])){Game.reload();return true;}}
 if(dist<=1){if(w.ammo&&p.eq.weapon.clip<=0){const alt=p.inv.find(i=>ITEMS[i.id].melee&&!ITEMS[i.id].ammo);if(alt)Game.useInst(alt);else if(Game.findItem(AMMO_ITEM[w.ammo]))Game.reload();else Game.unequip('weapon');}else Game.melee(e);return true;}return false;
}
function pathTo(tx,ty,adj){const z=G.zone,p=G.p,start=p.y*z.w+p.x,prev=new Int32Array(z.w*z.h).fill(-1),q=[start];prev[start]=start;let dest=-1;for(let qi=0;qi<q.length;qi++){const i=q[qi],x=i%z.w,y=(i/z.w)|0;if(Game.dist(x,y,tx,ty)<=adj){dest=i;break;}for(const [dx,dy] of DIRS8){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=z.w||ny>=z.h)continue;const j=ny*z.w+nx,t=z.t[j];if(prev[j]>=0||TILE_DEFS[t].h||t===T.DEEP||(!TILE_DEFS[t].w&&![T.DOOR,T.DOOR_LOCKED,T.GATE].includes(t)))continue;const e=Game.entAt(nx,ny);if(e&&e.kind==='npc')continue;if(t===T.EXIT&&(nx!==tx||ny!==ty))continue;prev[j]=i;q.push(j);}}
 if(dest<0)return null;if(dest===start)return [0,0];while(prev[dest]!==start)dest=prev[dest];return [dest%z.w-p.x,((dest/z.w)|0)-p.y];}
function go(getTarget,adj=1){let stuck=0;for(let k=0;k<700&&!G.dead&&!G.ending;k++){
 actions++;if(actions>3500)throw Error('action limit');const target=getTarget();if(!target)throw Error('target missing '+stage);if(Game.dist(G.p.x,G.p.y,target.x,target.y)<=adj)return true;
 const oldTurn=G.turn;if(maintain()||combat())continue;const d=pathTo(target.x,target.y,adj);if(!d){Game.wait();if(++stuck>30)throw Error('no path '+stage);continue;}Game.move(...d);if(G.turn===oldTurn){if(++stuck>12)throw Error('blocked '+stage);}else stuck=0;
 }if(G.dead)return false;throw Error('path limit '+stage);}
function npc(id){stage='NPC '+id;return go(()=>G.zone.ents.find(e=>e.def===id));}
function option(id,node,text){const e=G.zone.ents.find(e=>e.def===id);if(!e||Game.dist(G.p.x,G.p.y,e.x,e.y)>1)throw Error('not adjacent');const o=DLG[id][node](G).opts.find(o=>o.t.includes(text)&&(!o.cond||o.cond()));if(!o)throw Error('option missing '+id+' '+text);Game.dlgChoose(e,o);}
function travel(id){stage='travel '+id;const from=G.zoneId;const ok=go(()=>G.zoneId===from?G.zone.exits.find(e=>e.to===id):{x:G.p.x,y:G.p.y},0);if(ok&&G.zoneId!==id)throw Error('travel did not transition');return ok;}
function loot(id){stage='loot '+id;const z=G.zone;const k=Object.keys(z.conts).find(k=>z.conts[k].items.some(i=>i.id===id));if(!k)throw Error('no container '+id);const [x,y]=k.split(',').map(Number);if(!go(()=>({x,y})))return false;const c=z.conts[k];for(let n=0;n<30&&c.locked&&!G.dead;n++)Game.interactTile(x,y);if(G.dead)return false;Game.interactTile(x,y);if(!Game.hasItem(id))throw Error('could not take '+id);return true;}
for(const cls of ['streetkid','soldier','picker','netjack','medic','bruiser'])for(let seed=1;seed<=5;seed++){
 actions=0;stage='start';Game.newGame('Journey',cls,seed);let error=null;try{
 if(npc('wren')){option('wren','start','Work.');option('wren','package','Done.');if(loot('wren_package')&&npc('wren'))option('wren','start','I have the package.');}
 if(!G.dead&&G.quests.wren_package?.state==='done'){
  if(travel('marrow')&&travel('verge')&&loot('outboard')&&travel('marrow')&&travel('ashgrove')&&travel('sump')&&npc('ludo')){
   option('ludo','start','What do you offer');option('ludo','offer','think on it');const meat=Game.vendorStock('ludo').find(i=>i.id==='meat');while(meat&&meat.qty>0&&!Game.hasItem('meat',3)){if(!Game.buy('ludo',meat))break;}if(Game.hasItem('meat',3))option('ludo','start','An offering');
   if(travel('docks')&&npc('kesh')){Game.startQuest('boat');const idx=G.zone.t.indexOf(T.BOAT);const atBoat=()=>go(()=>({x:idx%G.zone.w,y:Math.floor(idx/G.zone.w)}));const supply=(id,n)=>{let tries=0;while(!G.dead&&Game.countItem(id)<n&&tries++<10){const before=Game.countItem(id);if(!loot(id)||Game.countItem(id)===before)return false;}return Game.countItem(id)>=n;};
    for(const id of ['motor','fuel','hull_kesh','supplies_kesh']){const project=BOAT_PROJECTS[id];let ready=true;for(const [it,n] of project.items)if(!supply(it,n)){ready=false;break;}if(!ready||G.dead)break;stage='build '+id;if(!atBoat()||!Game.completeBoatProject(id))throw Error('project incomplete '+id);}
    if(!G.dead&&atBoat()){stage='launch';Game.launchBoat();}
   }

  }
 }
 }catch(e){error=e.message;}
 results.push({cls,seed,actions,turns:G.turn,day:G.day,level:G.p.level,hp:G.p.hp,kills:G.p.kills,zones:G.p.zonesSeen,quest:G.quests.wren_package?.state,ending:G.ending,cause:G.cause,stage,error,lastLog:G.log.slice(-5).map(l=>l.t)});
}return results;
})()`,ctx);
if(process.env.NR_REPORT)fs.writeFileSync(process.env.NR_REPORT,JSON.stringify(results,null,2));
console.log(JSON.stringify({kind:'Exploratory normal-action expeditions; not a pass/fail balance test',trials:results.length,packageCompleted:results.filter(r=>r.quest==='done').length,deaths:results.filter(r=>r.hp<=0).length,escapes:results.filter(r=>r.ending==='openwater').length,results:results.map(({lastLog,...r})=>r)},null,2));
