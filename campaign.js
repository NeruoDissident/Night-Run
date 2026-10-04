'use strict';

// Campaign projects use ordinary inventory and actions. Definitions are shared
// by the preparation menu, journal and engine checks so costs cannot drift.
const BOAT_PROJECTS = {
 hull_repair: {stage:'hull', name:'Patch the hull', items:[['scrap',6],['cloth',2]], skill:['repair',2], minutes:5, xp:40},
 hull_brace: {stage:'hull', name:'Brace the hull with extra material', items:[['scrap',10],['cloth',4]], minutes:10, xp:40},
 hull_kesh: {stage:'hull', name:'Hire Kesh to patch the hull', items:[['scrap',4]], creds:80, kesh:true, minutes:5, xp:40},
 motor: {stage:'motor', name:'Mount the outboard', items:[['outboard',1]], minutes:3, xp:50},
 fuel: {stage:'fuel', name:'Fill the reserve tank', items:[['fuel',2]], minutes:1, xp:25},
 supplies: {stage:'supplies', name:'Pack rations and water', items:[['ration',2],['water',2]], minutes:1, xp:25},
 supplies_canned: {stage:'supplies', name:'Pack canned food and water', items:[['canned',4],['water',2]], minutes:1, xp:25},
 supplies_kesh: {stage:'supplies', name:'Buy passage provisions from Kesh', items:[], creds:60, kesh:true, minutes:1, xp:25},
 bypass: {stage:'bypass', name:'Rig a decoy beacon for the channel', items:[['electronics',3],['wire_spool',2]], technical:3, minutes:5, xp:60}
};

Object.assign(Game, {
 boatState() {
  if(!G.boatCampaign) {
   // Existing assembled boats retain their earned departure eligibility.
   const ready=!!G.flags.boat_parts;
   G.boatCampaign={hull:ready,motor:ready,fuel:ready,supplies:ready,bypass:false};
  }
  return G.boatCampaign;
 },
 boatSite() {
  if(!G||G.dead||G.ending||G.zoneId!=='docks')return false;
  if(this.buildingAt(G.p.x,G.p.y)?.prefab==='kesh')return true;
  return G.zone.t.some((t,k)=>t===T.BOAT&&this.dist(G.p.x,G.p.y,k%G.zone.w,Math.floor(k/G.zone.w))<=1);
 },
 boatwrightAvailable() {
  return !!G.zones.docks?.ents.some(e=>e.def==='kesh'&&e.hp>0&&!e.hostile);
 },
 boatPassage() {
  if(G.flags.bloat_dead)return 'The Mother is dead; the channel is scattered.';
  if((G.rep.drowned||0)>=20)return 'The Drowned will let you pass (+20 standing).';
  if(this.boatState().bypass)return 'Your decoy beacon will draw the Drowned away.';
  return null;
 },
 boatChecklist() {
  const s=this.boatState();
  return [
   {done:s.hull,text:'Hull sealed - repair it, use extra salvage, or hire Kesh'},
   {done:s.motor,text:'Outboard mounted - Verge Machine Works or Flooded Warehouse'},
   {done:s.fuel,text:'Reserve tank filled - 2 Fuel Cans; Fuel Depot or dock trade'},
   {done:s.supplies,text:'Provisions packed - food and water, or buy a passage pack'},
   {done:!!this.boatPassage(),text:this.boatPassage()||'Channel - Drowned +20, defeat the Mother, or build a decoy'}
  ];
 },
 boatProjectRequirements(id) {
  const p=BOAT_PROJECTS[id];if(!p)return ['Unknown project.'];
  const missing=[];
  if(!this.boatSite())missing.push('Work at the boat or Kesh\'s shack.');
  if(this.boatState()[p.stage])missing.push('Already completed.');
  if(p.kesh&&!this.boatwrightAvailable())missing.push('Kesh is unavailable. Use a salvage alternative.');
  if(p.skill&&this.skill(p.skill[0])<p.skill[1])missing.push(`${p.skill[0]} ${p.skill[1]} required.`);
  if(p.technical&&Math.max(this.skill('repair'),this.skill('hacking'))<p.technical)missing.push(`Repair or Hacking ${p.technical} required.`);
  for(const [id,n] of p.items)if(this.countItem(id)<n)missing.push(`${ITEMS[id].name}: ${this.countItem(id)}/${n}.`);
  if((p.creds||0)>G.p.creds)missing.push(`Creds: ${G.p.creds}/${p.creds}.`);
  return missing;
 },
 boatProjectLabel(id) {
  const p=BOAT_PROJECTS[id],costs=p.items.map(([id,n])=>`${n} ${ITEMS[id].name}`);
  if(p.creds)costs.push(`${p.creds} creds`);
  if(p.skill)costs.push(`${p.skill[0]} ${p.skill[1]}`);
  if(p.technical)costs.push(`Repair or Hacking ${p.technical}`);
  return `${p.name} - ${costs.join(' + ')}; about ${p.minutes} minutes`;
 },
 completeBoatProject(id) {
  const missing=this.boatProjectRequirements(id);
  if(missing.length){this.log(missing.join(' '),'#fd8');return false;}
  const p=BOAT_PROJECTS[id];
  for(const [it,n] of p.items)this.removeItem(it,n);
  G.p.creds-=p.creds||0;
  this.boatState()[p.stage]=true;
  G.flags.boat_parts=this.boatState().motor&&this.boatState().fuel?1:0;
  this.awardMilestone('boat:'+p.stage,p.xp,p.name);
  this.log('Boat project completed: '+p.name+'.','#db8');
  this.act(p.minutes*100);
  this.save();return true;
 },
 boat() {
  if(!this.boatSite())return;
  this.startQuest('boat');const u=this.ui();if(!u)return;
  const lines=this.boatChecklist().map(s=>(s.done?'[ready] ':'[needed] ')+s.text);
  const opts=[];
  for(const [stage,label] of Object.entries({hull:'Repair the hull',motor:'Fit the motor',fuel:'Stock fuel',supplies:'Pack provisions',bypass:'Plan a technical passage'})) {
   if(this.boatState()[stage]||(stage==='bypass'&&this.boatPassage()))continue;
   opts.push({t:label,f:()=>this.boatStageMenu(stage)});
  }
  if(this.boatChecklist().every(s=>s.done))opts.push({t:'Launch the boat - finish this run',f:()=>this.launchBoat()});
  opts.push({t:'Return to the city',f:()=>{}});
  if(u.clearNotifications)u.clearNotifications();
  u.choice('KESH\'S BOAT\n\n'+lines.join('\n')+'\n\nDeliver projects in any order. Installed parts stay here. Supplies in your Last Light locker must be withdrawn first.',opts);
 },
 boatStageMenu(stage) {
  if(!this.boatSite())return;const u=this.ui();if(!u)return;
  const leads={hull:'Seal the hull with scrap and cloth. Skill saves material; Kesh can work for a fee.',motor:'Outboards: Verge Machine Works, or the Flooded Warehouse in Rust Docks.',fuel:'Fuel: the Fuel Depot in Rust Docks, garages, or Kesh\'s trade stock.',supplies:'Keep some food for yourself. Packed provisions cannot be eaten in the city.',bypass:'A decoy draws the Drowned away from your crossing. Alternatives: earn +20 standing through Brother Ludo, or defeat the Mother.'};
  const opts=Object.keys(BOAT_PROJECTS).filter(id=>BOAT_PROJECTS[id].stage===stage).map(id=>({t:this.boatProjectLabel(id),f:()=>{
   const missing=this.boatProjectRequirements(id);
   u.choice(this.boatProjectLabel(id)+'\n\n'+(missing.length?missing.join('\n'):'Materials will be consumed. This work advances time.'),[
    ...(!missing.length?[{t:'Complete this project',f:()=>{this.completeBoatProject(id);if(!G.dead&&!G.ending)this.boat();}}]:[]),
    {t:'Back to boat',f:()=>this.boat()}
   ]);
  }}));
  opts.push({t:'Back to boat',f:()=>this.boat()});u.choice(leads[stage]||'Boat project',opts);
 },
 buildRefugeInfirmary() {
  const r=this.refugeState();
  if(!this.atRefuge()||r.infirmary)return false;
  if(!r.workbench||this.countItem('cloth')<6||this.countItem('chems')<2||this.countItem('scrap')<4){this.log('Needs a built workbench, 6 Cloth, 2 Chemicals and 4 Scrap in your pack.','#fd8');return false;}
  this.removeItem('cloth',6);this.removeItem('chems',2);this.removeItem('scrap',4);
  r.infirmary=true;this.awardMilestone('refuge:infirmary',50,'Last Light treatment corner');this.save();return true;
 },
 refugeTreatment() {
  const r=this.refugeState();
  if(!this.atRefuge()||!r.infirmary)return false;
  if(r.treatedDay===G.day){this.log('The treatment corner needs fresh sterile supplies tomorrow.','#fd8');return false;}
  if(G.p.hp>=G.p.d.maxhp&&!this.hasStatus('bleed')){this.log('You do not need treatment.','#8fd');return false;}
  if(this.countItem('bandage')<1){this.log('Bring one Bandage from your pack.','#fd8');return false;}
  this.removeItem('bandage',1);r.treatedDay=G.day;this.removeStatus('bleed');this.heal(20);
  this.log('Clean dressings, a steady hand. Bleeding stopped; up to 20 HP restored.','#8fd');this.act(100);this.save();return true;
 },
 endingDetails(id) {
  if(id!=='openwater')return ENDINGS[id];
  const passages={peace:'At the mouth of the Sump, the Drowned lift their hands and let you pass. Ludo kept his word.',force:'At the mouth of the Sump, nothing gathers. The Mother is gone. You carry the silence downstream.',decoy:'Your beacon wakes on the far bank. Shapes turn toward its borrowed heartbeat. You kill the light and slip past.'};
  const kesh=this.boatwrightAvailable()?'Kesh takes the tiller. For once, he has nothing to say.':'You take the tiller yourself. Kesh is not here to see his boat leave.';
  return {...ENDINGS[id],text:'The patched hull holds. The outboard catches. Food and water knock softly against the spare fuel cans. '+kesh+' '+(passages[G.flags.boat_departure]||passages.peace)+' The river bends and the city disappears. For the first time in days, tomorrow asks for something other than survival.'};
 },
 launchBoat() {
  if(!this.boatSite()||!this.boatChecklist().every(s=>s.done))return false;
  const passage=this.boatPassage();
  this.ui()?.confirm('The hull is sealed, the motor is ready, and provisions are aboard.\n'+passage+'\n\nLeave the city? This ends the run.',()=>{
   if(!this.boatSite()||!this.boatChecklist().every(s=>s.done))return;
   G.flags.boat_departure=G.flags.bloat_dead?'force':(G.rep.drowned||0)>=20?'peace':'decoy';
   this.endRun('openwater');
  });return true;
 }
});
