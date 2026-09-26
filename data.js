'use strict';
// ============================================================
// FRACTURED CITY: NIGHT RUN — DATA LAYER
// Everything here is definition, not state. Engine reads it.
// ============================================================

// ---------- TILES: what a thing IS (rendering lives in TILESETS) ----------
const T={VOID:0,FLOOR:1,WALL:2,DOOR:3,DOOR_OPEN:4,DOOR_LOCKED:5,WINDOW:6,STREET:7,SIDEWALK:8,RUBBLE:9,WATER:10,DEEP:11,EXIT:12,TERMINAL:13,BED:14,BENCH:15,CONTAINER:16,VENDING:17,GRAFFITI:18,FIRE:19,TOXIC:20,ECHO:21,GATE:22,GRATE:23,CAR:24,LAMP:25,BARRICADE:26,HELIPAD:27,BOAT:28,TRAIN:29,PIPE:30,CACHE:31,STALL:32,CHAIR:33,ALTAR:34,GENERATOR:35,RAIL:36,MOSS:37,CRATE:38,GLASS:39,COUNTER:40,SWITCH:41,SHELF:42,DOCCHAIR:43,TREE:44,SIGN:45,FENCE:46,PIER:47,HEART:48,SERVER:49,TABLE:50};
// n=name, w=walkable, o=opaque, c=cover, i=interactable, l=light radius, h=hazard
const TILE_DEFS={};
(function(){const d=(id,n,p)=>TILE_DEFS[id]=Object.assign({n,w:0,o:0,c:0,i:0,l:0},p||{});
d(T.VOID,'nothing',{o:1});d(T.FLOOR,'floor',{w:1});d(T.WALL,'wall',{o:1});d(T.DOOR,'door',{o:1,i:1});d(T.DOOR_OPEN,'open door',{w:1});
d(T.DOOR_LOCKED,'locked door',{o:1,i:1});d(T.WINDOW,'window',{c:1});d(T.STREET,'street',{w:1});d(T.SIDEWALK,'sidewalk',{w:1});
d(T.RUBBLE,'rubble',{w:1,c:1});d(T.WATER,'shallow water',{w:1});d(T.DEEP,'deep water',{});d(T.EXIT,'route out of the zone',{w:1,i:1});
d(T.TERMINAL,'terminal',{i:1,c:1});d(T.BED,'bed',{w:1,i:1});d(T.BENCH,'workbench',{i:1,c:1});d(T.CONTAINER,'cabinet',{i:1,c:1});
d(T.VENDING,'vending machine',{o:1,i:1});d(T.GRAFFITI,'graffiti',{w:1,i:1});d(T.FIRE,'fire',{w:1,l:3,h:'fire'});d(T.TOXIC,'toxic sludge',{w:1,h:'toxic'});
d(T.ECHO,'something wrong with the floor',{w:1,l:2,i:1});d(T.GATE,'sealed gate',{o:1,i:1});d(T.GRATE,'drainage grate',{w:1});d(T.CAR,'wrecked car',{c:1});
d(T.LAMP,'street lamp',{l:4});d(T.BARRICADE,'barricade',{c:1});d(T.HELIPAD,'helipad',{w:1,i:1});d(T.BOAT,'boat',{i:1,c:1});d(T.TRAIN,'train car',{i:1,o:1});
d(T.PIPE,'pipes',{c:1});d(T.CACHE,'night cache',{i:1,c:1});d(T.STALL,'market stall',{c:1});d(T.CHAIR,'chair',{w:1});d(T.ALTAR,'altar',{i:1,c:1,l:2});
d(T.GENERATOR,'generator',{i:1,c:1});d(T.RAIL,'rail track',{w:1});d(T.MOSS,'pale growth',{w:1});d(T.CRATE,'crate',{i:1,c:1});d(T.GLASS,'broken glass',{w:1});
d(T.COUNTER,'counter',{c:1});d(T.SWITCH,'switch panel',{i:1,c:1});d(T.SHELF,'shelves',{o:1,i:1});d(T.DOCCHAIR,'surgical chair',{i:1,c:1});d(T.TREE,'dead tree',{c:1});
d(T.SIGN,'signage',{i:1});d(T.FENCE,'chain fence',{c:1});d(T.PIER,'pier',{w:1});d(T.HEART,'the heart of the static',{i:1,l:6});d(T.SERVER,'server rack',{o:1,i:1});d(T.TABLE,'table',{c:1});})();

// ---------- TILESETS: how a thing LOOKS. The engine never reads this; only the renderer does. ----------
// Each tile maps to a render rule. Sprite keys are looked up in the tileset's atlas.
//   ground: which terrain layer sits underneath  ('floor' | 'street' | 'walk' | 'auto' = floor indoors, street outdoors | a literal sprite key)
//   wall:   1 = autotiled wall (face when open below, roof when wall below); window:1 = autotiled window
//   obj:    sprite drawn on top of the ground (string, or array of animation frames)
//   zoned:  ground/wall keys get the current zone id appended, so every district has its own palette
// A new tileset only has to supply an atlas with the same sprite names (or its own rules).
const TILESETS={
 city:{name:'Fractured City',atlas:'atlas',size:32,
  tiles:{
   [T.VOID]:{none:1},[T.FLOOR]:{ground:'floor'},[T.WALL]:{wall:1},[T.WINDOW]:{wall:1,window:1},
   [T.STREET]:{ground:'street'},[T.SIDEWALK]:{ground:'walk'},
   [T.DOOR]:{ground:'auto',obj:'door'},[T.DOOR_OPEN]:{ground:'auto',obj:'door_open'},[T.DOOR_LOCKED]:{ground:'auto',obj:'door_locked'},
   [T.RUBBLE]:{ground:'auto',obj:'rubble'},[T.WATER]:{ground:['water_0','water_1']},[T.DEEP]:{ground:['deep_0','deep_1']},
   [T.EXIT]:{ground:'auto',obj:'exit',pulse:1},[T.TERMINAL]:{ground:'auto',obj:'terminal'},[T.BED]:{ground:'floor',obj:'bed'},
   [T.BENCH]:{ground:'auto',obj:'bench'},[T.CONTAINER]:{ground:'auto',obj:'container'},[T.VENDING]:{ground:'auto',obj:'vending'},
   [T.GRAFFITI]:{ground:'auto',obj:['graffiti_0','graffiti_1','graffiti_2'],vary:1},[T.FIRE]:{ground:'auto',obj:['fire_0','fire_1']},
   [T.TOXIC]:{ground:['toxic_0','toxic_1']},[T.ECHO]:{ground:['echo_0','echo_1']},[T.GATE]:{ground:'auto',obj:'gate'},
   [T.GRATE]:{ground:'auto',obj:'grate'},[T.CAR]:{ground:'street',obj:['car_0','car_1','car_2'],vary:1},[T.LAMP]:{ground:'walk',obj:'lamp'},
   [T.BARRICADE]:{ground:'street',obj:'barricade'},[T.HELIPAD]:{ground:'floor',obj:'helipad'},[T.BOAT]:{ground:['water_0','water_1'],obj:'boat'},
   [T.TRAIN]:{ground:'rail',obj:'train'},[T.PIPE]:{ground:'auto',obj:'pipe'},[T.CACHE]:{ground:'auto',obj:'cache',pulse:1},
   [T.STALL]:{ground:'floor',obj:'stall'},[T.CHAIR]:{ground:'floor',obj:'chair'},[T.ALTAR]:{ground:'floor',obj:'altar'},
   [T.GENERATOR]:{ground:'auto',obj:'generator'},[T.RAIL]:{ground:'rail'},[T.MOSS]:{ground:'auto',obj:'moss'},
   [T.CRATE]:{ground:'auto',obj:'crate'},[T.GLASS]:{ground:'auto',obj:'glass'},[T.COUNTER]:{ground:'floor',obj:'counter'},
   [T.SWITCH]:{ground:'auto',obj:'switch'},[T.SHELF]:{ground:'floor',obj:'shelf'},[T.DOCCHAIR]:{ground:'floor',obj:'docchair'},
   [T.TREE]:{ground:'walk',obj:'tree'},[T.SIGN]:{ground:'walk',obj:'sign'},[T.FENCE]:{ground:'auto',obj:'fence'},
   [T.PIER]:{ground:'pier'},[T.HEART]:{ground:'floor',obj:['heart_0','heart_1']},[T.SERVER]:{ground:'floor',obj:'server'},[T.TABLE]:{ground:'floor',obj:'table'}
  },
  zoned:['floor','street','walk','wallface','walltop','window'],
  variants:{floor:2,street:2},
  // entity sprite keys: player 'pc_'+class, npc 'npc_'+id, enemy 'en_'+id, item 'it_'+id
  entity:{pc:'pc_',npc:'npc_',enemy:'en_',item:'it_',obj:'obj_'},
  // light sources tint (renderer): per tile colour of emitted light
  lightCol:{[T.LAMP]:'#ffd89a',[T.FIRE]:'#ff8a3a',[T.ECHO]:'#9a9aff',[T.ALTAR]:'#e0d0ff',[T.HEART]:'#ffffff'}
 }
};

// ---------- SKILLS / STATS ----------
const STATS=['str','agi','end','per','int','wil','soc'];
const STAT_NAMES={str:'Strength',agi:'Agility',end:'Endurance',per:'Perception',int:'Intellect',wil:'Will',soc:'Social'};
const SKILLS=['firearms','melee','medicine','hacking','scavenging','lockpick','repair','survival','stealth','persuasion'];
const SKILL_DESC={firearms:'Hit chance & damage with guns',melee:'Hit chance & damage up close',medicine:'Healing power, injury treatment, cheaper surgery',hacking:'Terminals, drones, locks with a deck, the Echo',scavenging:'Loot quality & quantity from containers',lockpick:'Open locked doors & containers',repair:'Crafting, repairing gear, machines',survival:'Hunger/fatigue resistance, hazards, night travel',stealth:'Avoid detection, ambush bonus',persuasion:'Prices, dialogue options, faction standing'};

// ---------- ITEMS ----------
const ITEMS={};
function IT(id,name,type,wt,val,ch,col,desc,x){ITEMS[id]=Object.assign({id,name,type,wt,val,ch,col,desc},x||{});}
// melee weapons: dmg [min,max], skill, props
IT('shiv','Shiv','weapon',0.5,5,'/','#aaa','Sharpened scrap. Quiet, quick, mean.',{melee:1,dmg:[1,4],props:['bleed'],speed:80});
IT('knife','Combat Knife','weapon',0.7,25,'/','#ccc','Proper steel. Opens people.',{melee:1,dmg:[2,6],props:['bleed'],speed:85});
IT('pipe','Lead Pipe','weapon',2.5,8,'/','#889','Heavy and honest.',{melee:1,dmg:[2,7],props:[]});
IT('bat','Baseball Bat','weapon',1.8,15,'/','#b98','Concussive. Someone wrote a name on it.',{melee:1,dmg:[3,8],props:['stun']});
IT('nailbat','Nail Bat','weapon',2.0,30,'/','#c86','Bat plus nails. Tears.',{melee:1,dmg:[4,9],props:['bleed'],dur:40});
IT('machete','Machete','weapon',1.5,45,'/','#dd9','Long blade, dark stains.',{melee:1,dmg:[4,10],props:['bleed'],dur:60});
IT('crowbar','Crowbar','weapon',2.5,30,'/','#78a','Weapon and key. Forces locks.',{melee:1,dmg:[2,7],props:[],tool:'pry'});
IT('fireaxe','Fire Axe','weapon',4.5,70,'/','#e55','Two hands. Cuts through doors and men.',{melee:1,dmg:[6,13],props:['bleed'],hands:2,speed:120,reqStr:5});
IT('sledge','Sledgehammer','weapon',7,60,'/','#999','Slow. Ends arguments.',{melee:1,dmg:[7,15],props:['stun','knock'],hands:2,speed:140,reqStr:6});
IT('stunbaton','Stun Baton','weapon',1.2,90,'/','#6ef','Cracks blue. Uses cells.',{melee:1,dmg:[2,5],props:['stun','stun'],ammo:'cell',clip:10});
IT('chainblade','Chain Blade','weapon',3.5,220,'/','#f8a','Powered. Screams. Halcyon issue.',{melee:1,dmg:[6,12],props:['bleed','bleed'],ammo:'cell',clip:20,speed:110});
IT('blade_arm_wpn','Blade Arm','weapon',0,0,'/','#f9c','Your arm.',{melee:1,dmg:[5,10],props:['bleed'],noDrop:1});
// ranged: range, ammo type, clip, burst, noise
IT('holdout','Holdout Pistol','weapon',0.6,40,'}','#bbb','Tiny, cheap, two shots louder than you want.',{ranged:1,dmg:[3,6],range:6,ammo:'9mm',clip:6,noise:8});
IT('pistol','9mm Pistol','weapon',1.0,90,'}','#ddd','Standard sidearm. Reliable.',{ranged:1,dmg:[4,8],range:8,ammo:'9mm',clip:12,noise:10});
IT('revolver','.38 Revolver','weapon',1.2,110,'}','#caa','Six chambers. Kicks.',{ranged:1,dmg:[6,11],range:8,ammo:'9mm',clip:6,noise:11,speed:110});
IT('smg','Machine Pistol','weapon',2.2,240,'}','#aac','Sprays. Eats ammo.',{ranged:1,dmg:[3,6],range:7,ammo:'9mm',clip:30,burst:3,noise:12});
IT('shotgun','Pump Shotgun','weapon',3.5,260,'}','#dba','Devastating inside a room. Useless across a street.',{ranged:1,dmg:[7,15],range:5,ammo:'shell',clip:6,noise:14,closeBonus:1});
IT('sawedoff','Sawed-Off','weapon',2.2,150,'}','#cb8','Two barrels. Point blank.',{ranged:1,dmg:[10,18],range:3,ammo:'shell',clip:2,noise:14,closeBonus:1});
IT('rifle','Hunting Rifle','weapon',4.0,320,'}','#9c9','Long reach. One shot, make it count.',{ranged:1,dmg:[9,17],range:14,ammo:'rifle',clip:5,noise:13,speed:120,scoped:1});
IT('arifle','Assault Rifle','weapon',4.2,520,'}','#8b8','Military. Burst fire. Everyone hears it.',{ranged:1,dmg:[6,11],range:11,ammo:'rifle',clip:30,burst:3,noise:14,reqStr:5});
IT('scraplauncher','Scrap Launcher','weapon',6,300,'}','#e96','Union-made. Fires whatever you feed it. Splash.',{ranged:1,dmg:[9,19],range:7,ammo:'scrap',clip:1,noise:15,splash:1,speed:130,reqStr:5});
IT('laser','Laser Carbine','weapon',3.0,650,'}','#6ff','Halcyon. Silent, precise, hungry for cells.',{ranged:1,dmg:[7,12],range:11,ammo:'cell',clip:8,noise:2,armorPierce:2});
IT('railpistol','Rail Pistol','weapon',1.6,700,'}','#aef','Prototype. Ignores armor. Two shots per cell.',{ranged:1,dmg:[9,14],range:8,ammo:'cell',clip:4,noise:9,armorPierce:99});
// thrown / consumable weapons
IT('molotov','Molotov','thrown',1.0,35,'*','#f82','Bottle, rag, fire. Spreads.',{throwRange:6,effect:'fire',stack:1});
IT('pipebomb','Pipe Bomb','thrown',1.2,80,'*','#f55','Nails and powder. 3x3 devastation.',{throwRange:6,effect:'blast',dmg:[12,22],stack:1});
IT('flashbang','Flashbang','thrown',0.5,50,'*','#ff8','Stuns everything nearby, including you if you are dumb.',{throwRange:6,effect:'stun',stack:1});
IT('rock','Rock','thrown',0.5,0,'*','#888','Throw it somewhere. Guards are curious.',{throwRange:8,effect:'noise',stack:1});
IT('breach','Breach Charge','thrown',1.5,180,'*','#f6a','Halcyon demolition. Opens any locked door or gate. Or a person.',{throwRange:1,effect:'breach',dmg:[20,30],stack:1});
// ammo
IT('9mm','9mm Rounds','ammo',0.02,1,'=','#ee9','Pistol ammunition.',{stack:1});IT('shell','Shotgun Shells','ammo',0.05,2,'=','#e96','Buckshot.',{stack:1});
IT('rifle_rd','Rifle Rounds','ammo',0.03,2,'=','#9e9','High-velocity.',{stack:1});IT('cell','Power Cell','ammo',0.15,8,'=','#6ff','Charge for weapons, tools, chrome.',{stack:1});
// armor: arm = flat damage reduction, slot body/head/back
IT('rags','Rags','armor',1,1,'[','#776','Layers of whatever.',{slot:'body',arm:0});
IT('jacket','Street Jacket','armor',1.5,20,'[','#997','Patched leather, gang tags scrubbed off.',{slot:'body',arm:1,dur:40});
IT('leather','Reinforced Leather','armor',3,60,'[','#a85','Plates sewn into a coat.',{slot:'body',arm:2,dur:60});
IT('padded','Padded Vest','armor',4,90,'[','#8a8','Stops knives, mostly.',{slot:'body',arm:3,dur:60});
IT('kevlar','Kevlar Vest','armor',6,220,'[','#4a6','Stops bullets, mostly.',{slot:'body',arm:5,dur:80});
IT('riot','Riot Armor','armor',10,380,'[','#68c','Police issue. Heavy.',{slot:'body',arm:7,dur:100,mod:{agi:-1}});
IT('scrapplate','Scrap Plate','armor',12,150,'[','#a76','Welded signs and car doors. Loud.',{slot:'body',arm:6,dur:70,mod:{stealth:-3}});
IT('halplate','Halcyon Plate','armor',8,900,'[','#aef','Powered composite. Whisper-quiet servos.',{slot:'body',arm:9,dur:120,mod:{str:1}});
IT('drownhide','Drowned Hide','armor',3,120,'[','#dbe','Someone\'s skin, tanned. It breathes when you do.',{slot:'body',arm:4,dur:90,mod:{drift:5}});
IT('cap','Ball Cap','armor',0.2,3,'^','#886','Keeps the rain off.',{slot:'head',arm:0});
IT('helmet','Scrap Helmet','armor',1.5,40,'^','#998','Bike helmet with plates.',{slot:'head',arm:2,dur:40});
IT('riothelm','Riot Helmet','armor',2.5,120,'^','#68c','Visor. Narrow view.',{slot:'head',arm:3,dur:80,mod:{per:-1}});
IT('gasmask','Gas Mask','armor',1,90,'^','#7a7','Filters the worst of it.',{slot:'head',arm:1,dur:60,immune:['toxic']});
IT('satchel','Satchel','armor',0.5,15,'&','#a96','Room for a few things.',{slot:'back',carry:6});
IT('backpack','Backpack','armor',1,45,'&','#9a7','Room for most things.',{slot:'back',carry:12});
IT('framepack','Frame Pack','armor',2.5,110,'&','#8a9','Room for everything. Slows you down.',{slot:'back',carry:20,mod:{agi:-1}});
// tools (equip slot 'tool' or use)
IT('flashlight','Flashlight','tool',0.5,25,'¡','#ffd','Light in the dark. Everyone can see it too.',{slot:'tool',vision:3,stealthPen:2});
IT('lockpicks','Lockpick Set','tool',0.2,40,'¡','#ccc','Picks. Tension wrench. Patience.',{lock:2});
IT('toolkit','Toolkit','tool',3,80,'¡','#db8','Crafting and repair.',{craft:1,repair:2});
IT('deck','Cyberdeck','tool',1.5,300,'¡','#6ef','Interface with the dead city.',{slot:'tool',hack:2});
IT('radio','Hand Radio','tool',0.8,35,'¡','#9bd','Mostly static. Mostly.',{slot:'tool',radio:1});
IT('binocs','Binoculars','tool',0.6,60,'¡','#8a8','See far. Daylight only.',{slot:'tool',visionDay:3});
IT('jammer','Signal Jammer','tool',1,160,'¡','#f9f','Three charges. Machines and chrome go dark nearby.',{use:'jam',charges:3});
IT('medscanner','Med Scanner','tool',0.8,140,'¡','#f88','Diagnoses. Guides the hand.',{slot:'tool',medicine:2});
IT('resonator','Resonator','tool',0.4,0,'¡','#ccf','A tuning fork that hums when nothing is there.',{slot:'tool',echo:1});
// medical
IT('bandage','Bandage','med',0.1,8,'!','#fdd','Stops bleeding. Small heal.',{heal:8,cure:['bleed'],stack:1});
IT('medkit','Medkit','med',0.8,60,'!','#f66','Real supplies. Big heal.',{heal:30,cure:['bleed'],stack:1});
IT('stitch','Stitch Kit','med',0.3,25,'!','#fbb','Needle and thread. Closes wounds.',{heal:15,cure:['bleed'],stack:1});
IT('splint','Splint','med',0.5,20,'!','#dcb','Sets a fracture.',{cure:['fracture'],stack:1});
IT('antibiotics','Antibiotics','med',0.1,70,'!','#8f8','Kills infection. Precious.',{cure:['infection'],heal:5,stack:1});
IT('painkillers','Painkillers','med',0.1,30,'!','#fff','Dulls pain, fatigue, judgement.',{heal:10,cure:['concussion'],status:['numb',60],stack:1});
IT('burngel','Burn Gel','med',0.2,25,'!','#fa6','Cools burns.',{cure:['burn'],heal:6,stack:1});
IT('antitoxin','Antitoxin','med',0.1,45,'!','#af6','Purges poison.',{cure:['poison'],stack:1});
IT('stim','Stim Shot','med',0.1,80,'!','#ff6','Instant stamina, fatigue gone. You will pay later.',{stam:40,fatigue:-40,status:['wired',80],stack:1});
IT('nanite','Nanite Injector','med',0.2,250,'!','#6ff','Halcyon medical. Heals nearly anything.',{heal:50,cure:['bleed','fracture','burn','poison','infection','concussion'],stack:1});
// food
IT('canned','Canned Beans','food',0.6,6,'%','#cb7','Dented. Fine.',{hunger:30,stack:1});
IT('ration','Field Ration','food',0.4,15,'%','#9a9','Compressed calories.',{hunger:40,stack:1});
IT('jerky','Jerky','food',0.2,8,'%','#a65','Chewy. Don\'t ask.',{hunger:20,stack:1});
IT('chips','Chips','food',0.2,3,'%','#ee9','Stale. Loud.',{hunger:10,stack:1});
IT('water','Water Bottle','food',0.5,4,'%','#9df','Clean-ish. Restores a little.',{hunger:5,fatigue:-8,stack:1});
IT('meat','Dubious Meat','food',0.7,4,'%','#c55','Cooked. Of something.',{hunger:35,poison:0.3,drift:2,stack:1});
IT('stew','Saint\'s Stew','food',0.6,12,'%','#d94','Mags\' stew. It fixes things.',{hunger:50,heal:8,fatigue:-10,stack:1});
IT('beer','Warm Beer','food',0.5,5,'%','#db6','Courage.',{hunger:5,status:['drunk',40],stack:1});
// drugs
IT('glide','Glide','drug',0.05,60,'!','#8ff','Reflexes like water. Then the shakes.',{status:['glide',100],stack:1});
IT('wire','Wire','drug',0.05,60,'!','#ff8','Sees everything. Sleeps nothing.',{status:['wire',100],stack:1});
IT('ash','Ash','drug',0.05,50,'!','#ccc','Feel nothing. Fear nothing.',{status:['ash',100],stack:1});
IT('bloom','Bloom','drug',0.05,90,'!','#faf','The Drowned\'s sacrament. Flesh knits. Something else grows.',{status:['bloom',100],drift:6,stack:1});
// materials
IT('scrap','Scrap Metal','mat',1,3,'*','#999','Bent, rusted, useful.',{stack:1});IT('electronics','Electronics','mat',0.3,12,'*','#6cf','Boards and chips.',{stack:1});
IT('chems','Chemicals','mat',0.4,10,'*','#af6','Bottles of something reactive.',{stack:1});IT('cloth','Cloth','mat',0.2,2,'*','#dcb','Clean fabric.',{stack:1});
IT('fuel','Fuel Can','mat',3,40,'*','#e84','Gasoline. Half full.',{stack:1});IT('wire_spool','Wire','mat',0.3,4,'*','#c96','Copper. Insulated.',{stack:1});
IT('powder','Black Powder','mat',0.3,20,'*','#555','Keep away from fire.',{stack:1});
// valuables
IT('credchip','Cred Chip','val',0,20,'$','#ff8','Currency of the fractured city.',{creds:[15,45],stack:1});
IT('jewelry','Jewelry','val',0.1,60,'$','#fda','Someone\'s wedding ring, someone\'s chain.',{stack:1});
IT('datashard','Data Shard','val',0.05,45,'$','#6ff','Encrypted. Someone pays for these.',{stack:1,hackUse:1});
IT('goldtooth','Gold Tooth','val',0.02,25,'$','#fd6','Pulled.',{stack:1});
IT('corpbadge','Halcyon Badge','val',0.05,80,'$','#aef','A dead employee\'s access badge.',{stack:1});
// quest items
IT('wren_package','Wren\'s Package','quest',1,0,'?','#f9f','Taped shut. Heavy for its size. It ticks, faintly, then stops.');
IT('rotor','Rotor Assembly','quest',8,0,'?','#ff8','Helicopter tail rotor. Union-machined.');
IT('avgas','Aviation Fuel','quest',6,0,'?','#f84','Drum of avgas. Sloshes.');
IT('outboard','Outboard Motor','quest',9,0,'?','#ff8','A working outboard. Rarer than gold out here.');
IT('powercell','Industrial Power Cell','quest',4,120,'?','#6ff','Enough charge to light a block. Or move a train.',{stack:1});
IT('shard','Signal Shard','quest',0.1,0,'?','#ccf','It is not made of anything. It sings when the lights flicker.',{stack:1});
IT('ledger','The Ledger','quest',1,0,'?','#dc9','Tallow\'s book. Every debt in the city. Some pages list names you know.');
IT('dossier','Union Dossier','quest',0.2,0,'?','#ee9','Names, routes, caches. Everything Halcyon wants to know about the Union.');
IT('halkey','Halcyon Keycard','quest',0.05,0,'?','#aef','Opens Halcyon doors. Warm to the touch.');
IT('ascension','Ascension Core','quest',2,0,'?','#fff','A neural lattice. It is already thinking. It would like to think with you.');
IT('neuralunit','Halcyon Neural Unit','quest',0.5,0,'?','#aef','Salvaged cortex hardware. Sable wants it badly.');
IT('relic','The Relic','quest',1,0,'?','#dbe','A jar. Something in it moves when you look away.');
IT('mallkey','Security Keycard','quest',0.05,0,'?','#ee9','Hollow Mall security. Opens the vault office.');
// chrome (install at ripperdoc). slot, strain, fx
IT('c_optic','Optic Array','chrome',0.5,350,'¤','#6ff','Wide-spectrum eyes. See farther, shoot straighter.',{cslot:'eyes',strain:10,fx:{vision:2,hitR:10,per:1}});
IT('c_reflex','Reflex Spindle','chrome',0.5,600,'¤','#6ff','Spinal accelerator. Time gets slower.',{cslot:'spine',strain:18,fx:{speed:25,evade:2}});
IT('c_subderm','Subdermal Weave','chrome',1,400,'¤','#6ff','Armor under the skin.',{cslot:'skin',strain:12,fx:{arm:3}});
IT('c_arms','Hydraulic Arms','chrome',2,550,'¤','#6ff','Crush. Carry. Climb.',{cslot:'arms',strain:16,fx:{str:2,dmgM:3,carry:6}});
IT('c_neural','Neural Coprocessor','chrome',0.5,700,'¤','#6ff','Think faster. The Echo notices.',{cslot:'brain',strain:15,fx:{int:2,hacking:2,xp:15,attn:1.5}});
IT('c_target','Targeting Node','chrome',0.3,450,'¤','#6ff','A reticle you can\'t turn off.',{cslot:'eyes',strain:12,fx:{hitR:15,crit:5}});
IT('c_lungs','Filter Lungs','chrome',1,300,'¤','#6ff','Breathe anything.',{cslot:'lungs',strain:8,fx:{immune:['toxic'],stamRegen:1}});
IT('c_spine','Cargo Spine','chrome',2,320,'¤','#6ff','Reinforced back. Carry the city.',{cslot:'back',strain:10,fx:{carry:15}});
IT('c_blade','Blade Arm','chrome',1.5,500,'¤','#6ff','A monofilament blade folded into your forearm.',{cslot:'arms',strain:14,fx:{bladeArm:1}});
IT('c_jack','Deck Jack','chrome',0.3,380,'¤','#6ff','A port behind the ear. Terminals answer you. So does something else.',{cslot:'brain',strain:10,fx:{hacking:3,echoTalk:1,attn:1.5}});
IT('c_legs','Piston Legs','chrome',3,480,'¤','#6ff','Move like something hunting.',{cslot:'legs',strain:14,fx:{speed:15,agi:1}});
IT('c_dermal','Chameleon Dermis','chrome',1,650,'¤','#6ff','Skin that argues with the light.',{cslot:'skin',strain:14,fx:{stealth:4}});
// flesh grafts (install at the Drowned). drift, fx
IT('f_bone','Bone Lattice','flesh',1,0,'§','#dbe','Your skeleton thickens. Pale ridges under the skin.',{drift:12,fx:{arm:2,hp:15}});
IT('f_blood','Thicksalt Blood','flesh',0.5,0,'§','#dbe','Blood that clots like tar. Slow regeneration.',{drift:14,fx:{immune:['bleed'],regen:1}});
IT('f_eyes','Nightglass Eyes','flesh',0.3,0,'§','#dbe','The dark opens. The day hurts.',{drift:12,fx:{visionNight:5,visionDay:-1}});
IT('f_sinew','Reflex Sinew','flesh',1,0,'§','#dbe','Muscles that move before you decide.',{drift:15,fx:{agi:2,speed:15}});
IT('f_gland','Tremor Gland','flesh',0.5,0,'§','#dbe','A scent that says: run.',{drift:14,fx:{fearHit:1}});
IT('f_mantle','Pale Mantle','flesh',1,0,'§','#dbe','A growth across the shoulders that drinks light.',{drift:16,fx:{stealth:3,regen:1}});
IT('f_maw','Second Maw','flesh',1,0,'§','#dbe','You can eat almost anything now. You want to.',{drift:20,fx:{ironStomach:1,dmgM:2,hungerRate:1.5}});

const AMMO_ITEM={'9mm':'9mm',shell:'shell',rifle:'rifle_rd',cell:'cell',scrap:'scrap'};

// ---------- LOOT TABLES (by building type / container kind) ----------
const LOOT={
 apartment:[['canned',30],['chips',25],['water',25],['cloth',25],['jerky',12],['beer',12],['jewelry',8],['credchip',15],['painkillers',8],['bandage',12],['knife',5],['bat',5],['cap',8],['jacket',6],['glide',3],['rock',5],['datashard',2],['radio',3]],
 shop:[['canned',35],['chips',35],['water',30],['beer',20],['jerky',15],['credchip',20],['cloth',10],['flashlight',6],['painkillers',8],['bandage',10],['9mm',6]],
 clinic:[['bandage',40],['medkit',18],['stitch',20],['antibiotics',12],['painkillers',25],['splint',15],['burngel',15],['antitoxin',10],['chems',15],['stim',6],['medscanner',2]],
 hospital:[['bandage',35],['medkit',25],['antibiotics',20],['nanite',3],['splint',15],['stitch',20],['chems',20],['stim',8],['painkillers',20],['antitoxin',10]],
 police:[['9mm',35],['shell',20],['pistol',12],['shotgun',8],['revolver',7],['kevlar',8],['riot',4],['riothelm',6],['helmet',8],['flashbang',8],['stunbaton',5],['rifle_rd',12],['smg',3],['credchip',8]],
 maint:[['scrap',45],['wire_spool',30],['electronics',18],['toolkit',8],['crowbar',10],['pipe',15],['fuel',10],['cell',12],['chems',12],['flashlight',8],['lockpicks',5],['powder',6]],
 office:[['electronics',25],['datashard',18],['credchip',25],['chips',10],['water',12],['painkillers',8],['jewelry',6],['corpbadge',8],['cloth',8]],
 server:[['electronics',45],['datashard',35],['cell',30],['wire_spool',20],['deck',4],['jammer',5],['corpbadge',6]],
 warehouse:[['scrap',30],['canned',20],['ration',15],['cloth',15],['9mm',12],['shell',10],['rifle_rd',10],['fuel',12],['crate_bonus',0],['powder',8],['chems',10],['backpack',6],['electronics',8]],
 factory:[['scrap',50],['electronics',15],['cell',15],['fuel',10],['sledge',5],['pipe',15],['powder',10],['toolkit',6],['scraplauncher',2]],
 garage:[['fuel',30],['scrap',30],['toolkit',12],['crowbar',12],['wire_spool',15],['cell',8],['electronics',8],['molotov',8]],
 corp:[['cell',25],['electronics',20],['datashard',20],['corpbadge',12],['nanite',5],['laser',2],['halplate',1],['railpistol',1],['credchip',20],['stim',8],['c_optic',2],['c_target',2],['neuralunit',3]],
 gang:[['9mm',25],['shell',12],['beer',20],['glide',12],['ash',10],['wire',10],['credchip',20],['knife',10],['machete',6],['nailbat',6],['pistol',8],['sawedoff',5],['smg',4],['jacket',10],['molotov',8],['pipebomb',4]],
 chapel:[['bloom',20],['meat',30],['cloth',15],['drownhide',6],['f_bone',3],['f_blood',3],['chems',10],['jerky',10]],
 static:[['shard',6],['cell',25],['electronics',25],['datashard',20],['c_jack',3],['c_neural',2],['resonator',5],['wire',10]],
 dock:[['fuel',25],['canned',20],['scrap',25],['rope',0],['jerky',15],['water',20],['shell',12],['meat',15],['wire_spool',10],['toolkit',6]],
 cache:[['medkit',20],['stim',15],['antibiotics',12],['9mm',20],['rifle_rd',12],['cell',15],['datashard',15],['nanite',6],['c_reflex',3],['c_subderm',3],['pipebomb',8],['laser',2],['credchip',30],['shard',4],['kevlar',5]],
 scav:[['scrap',30],['canned',15],['jerky',15],['credchip',15],['9mm',10],['bandage',12],['shiv',10],['pipe',10],['rock',15]]
};
const CONTAINER_KINDS={apartment:['cabinet','fridge','dresser'],shop:['shelf','register'],clinic:['med cabinet','drawer'],hospital:['med cabinet','supply crate'],police:['locker','evidence locker','gun cabinet'],maint:['toolbox','locker','crate'],office:['desk','filing cabinet'],server:['rack drawer','crate'],warehouse:['crate','pallet'],factory:['crate','parts bin'],garage:['toolbox','crate'],corp:['secure cabinet','desk'],gang:['stash','crate'],chapel:['reliquary','crate'],static:['thing','box'],dock:['crate','barrel'],cache:['night cache'],scav:['bindle']};

// ---------- STATUS EFFECTS ----------
const STATUSES={
 bleed:{n:'Bleeding',col:'#f44',desc:'Losing blood each turn. Bandage it.',tick:(g,p)=>{g.dmgPlayer(1,'bleeding');}},
 fracture:{n:'Fracture',col:'#fa6',desc:'Broken bone. -2 AGI, slower. Needs a splint.',mod:{agi:-2,speed:-20}},
 burn:{n:'Burned',col:'#f80',desc:'Blistered. -1 END, pain.',mod:{end:-1}},
 poison:{n:'Poisoned',col:'#8f4',desc:'Something in your blood. Damage over time.',tick:(g,p)=>{if(g.turn%3===0)g.dmgPlayer(1,'poison');}},
 infection:{n:'Infected',col:'#9c4',desc:'A wound gone bad. Slowly killing you. Antibiotics.',tick:(g,p)=>{if(g.turn%8===0)g.dmgPlayer(1,'infection');},mod:{end:-1,str:-1}},
 concussion:{n:'Concussed',col:'#dd6',desc:'-2 PER, -2 INT. The world swims.',mod:{per:-2,int:-2}},
 malfunction:{n:'Chrome Malfunction',col:'#f6f',desc:'Your chrome is glitching. Stats unreliable.',mod:{agi:-2,per:-2,hitR:-15}},
 exhausted:{n:'Exhausted',col:'#aaa',desc:'You need sleep. -2 to everything.',mod:{str:-2,agi:-2,per:-2,int:-2}},
 starving:{n:'Starving',col:'#d84',desc:'-2 STR/END. Eat.',mod:{str:-2,end:-2}},
 stun:{n:'Stunned',col:'#ff0',desc:'Cannot act.'},
 numb:{n:'Numbed',col:'#eee',desc:'Painkillers. +10 hit, less care.',mod:{hitM:5,hitR:5}},
 wired:{n:'Wired',col:'#ff6',desc:'Stim. +20 speed, then a crash.',mod:{speed:20},end:(g)=>{g.addStatus('crash',40);}},
 crash:{n:'Crashing',col:'#844',desc:'Stim hangover. -20 speed.',mod:{speed:-20}},
 drunk:{n:'Drunk',col:'#db6',desc:'+1 WIL, -1 AGI/PER.',mod:{wil:1,agi:-1,per:-1}},
 glide:{n:'Gliding',col:'#8ff',desc:'+2 AGI, +15 speed.',mod:{agi:2,speed:15},end:(g)=>{g.addStatus('shakes',50);}},
 shakes:{n:'The Shakes',col:'#888',desc:'-2 AGI. Glide withdrawal.',mod:{agi:-2}},
 wire:{n:'On Wire',col:'#ff8',desc:'+2 PER, +2 vision.',mod:{per:2,vision:2},end:(g)=>{G.p.fatigue=Math.min(100,G.p.fatigue+30);}},
 ash:{n:'Ashed',col:'#ccc',desc:'+2 WIL, immune to fear. No pain.',mod:{wil:2,arm:1}},
 bloom:{n:'Blooming',col:'#faf',desc:'Regenerating 1 HP/turn. Drift rises.',tick:(g,p)=>{p.hp=Math.min(p.d.maxhp,p.hp+1);}},
 fear:{n:'Terrified',col:'#a8f',desc:'-3 hit. Your hands shake.',mod:{hitM:-15,hitR:-15}},
 aim:{n:'Steady Aim',col:'#8f8',desc:'Next shot +30 to hit.'},
 hidden:{n:'Hidden',col:'#88a',desc:'Melded with the dark. First strike is an ambush.'},
 jammed:{n:'Jammed',col:'#f9f',desc:'Systems dark.'},
 attuned:{n:'Attuned',col:'#ccf',desc:'You hear the city breathing. See what it hides.',mod:{vision:3}},
 salvage:{n:'Salvage Eye',col:'#fd8',desc:'Containers glow through walls.'},
 lockdown:{n:'Lockdown',col:'#f66',desc:'Doors seal around you.'},
 taunt:{n:'Drawing Fire',col:'#fa4',desc:'Enemies focus you. +2 armor.',mod:{arm:2}},
 hunger_meat:{n:'Meat Hunger',col:'#d5d',desc:'The Flesh wants. Eat meat or bleed.',tick:(g,p)=>{if(g.turn%10===0)g.dmgPlayer(1,'the hunger');}}
};

// ---------- CLASSES ----------
const CLASSES={
 streetkid:{name:'Street Kid',ch:'@',col:'#f9c',tag:'Knows the blocks. Not what\'s underneath them.',
  desc:'Grew up in Ashgrove. Knows which alleys connect, which crews to nod at, which doors were never really locked. Fast, sneaky, well-liked, fragile.',
  stats:{str:4,agi:6,end:5,per:6,int:4,wil:4,soc:6},skills:{stealth:3,scavenging:3,survival:2,melee:2,persuasion:2,lockpick:2},
  gear:['shiv','jacket','satchel','lockpicks',['jerky',2],['bandage',2],['rock',3]],creds:30,
  ability:'slip',passive:'Starts +15 rep with Gutter Saints and Ledger. Vendors 10% cheaper. Locked routes open easier.',
  rep:{saints:15,ledger:15},specs:['runner','fixer'],hp:8},
 soldier:{name:'Soldier',ch:'@',col:'#9c9',tag:'Trained for a war that never came. Got this instead.',
  desc:'Ex-military or ex-corporate security, it stopped mattering. Disciplined, armored, dangerous with a gun. Bad at talking. Worse at improvising.',
  stats:{str:6,agi:5,end:6,per:5,int:3,wil:5,soc:3},skills:{firearms:4,melee:2,survival:2,medicine:1},
  gear:['pistol',['9mm',24],'knife','padded','backpack',['ration',2],'medkit'],creds:20,
  ability:'aim',passive:'+1 armor. Reloads are free actions.',specs:['heavy','marksman'],hp:12},
 picker:{name:'Picker',ch:'@',col:'#fd8',tag:'Everything is worth something to someone.',
  desc:'Professional scavenger. Sees value in ruins, finds the container everyone missed, fixes what\'s broken. Prefers not to fight; prefers to have already left.',
  stats:{str:4,agi:5,end:5,per:7,int:5,wil:3,soc:3},skills:{scavenging:4,repair:3,lockpick:2,stealth:2,melee:1},
  gear:['crowbar','backpack','toolkit','jacket',['scrap',4],['bandage',2],['canned',2]],creds:25,
  ability:'salvage',passive:'Extra loot roll on every container. Can craft without a workbench.',specs:['tinker','ghost'],hp:10},
 netjack:{name:'Netjack',ch:'@',col:'#6ef',tag:'The city is a network. Networks can be talked to.',
  desc:'Hacker. Talks to terminals, drones, locks, and the things behind them. Physically unremarkable. Hears more of the Echo than most, and sooner.',
  stats:{str:3,agi:4,end:4,per:5,int:8,wil:5,soc:4},skills:{hacking:5,repair:2,stealth:2,firearms:1},
  gear:['deck','holdout',['9mm',12],['electronics',2],['cell',3],'jammer','jacket','satchel','bandage'],creds:40,
  ability:'jam',passive:'Terminals yield more. Can hack locked doors and drones.',specs:['ghostwire','warlock'],hp:8},
 medic:{name:'Medic',ch:'@',col:'#f88',tag:'Everyone bleeds. You know what to do about it.',
  desc:'Trained, or trained enough. Keeps people alive, including yourself. Knows what chrome and Flesh do to a body and can install both, if you dare.',
  stats:{str:4,agi:4,end:5,per:5,int:6,wil:6,soc:5},skills:{medicine:5,firearms:1,survival:2,persuasion:2},
  gear:['medscanner',['medkit',2],['bandage',4],'antibiotics','stim','stunbaton',['cell',6],'padded','backpack','ration'],creds:35,
  ability:'triage',passive:'Medical items 50% stronger. Injuries heal over time. Can self-install chrome/Flesh at any workbench.',specs:['surgeon','combatmedic'],hp:10},
 bruiser:{name:'Bruiser',ch:'@',col:'#e96',tag:'Big. Loud. Mostly unkillable.',
  desc:'Enforcer, bouncer, debt collector. Takes a beating and returns it with interest. Carries the heaviest things. Subtle as a dropped fridge.',
  stats:{str:8,agi:4,end:7,per:3,int:3,wil:5,soc:3},skills:{melee:5,survival:2,persuasion:1,scavenging:1},
  gear:['bat','leather','framepack',['jerky',3],'painkillers',['canned',2],'beer'],creds:15,
  ability:'slam',passive:'Ignores the first 2 melee damage every hit. Carry +2 per STR.',specs:['wrecker','wall'],hp:16},
 listener:{name:'Listener',ch:'@',col:'#ccf',tag:'You heard it before you came here. That\'s why you came.',
  desc:'Something in the city\'s signal got into your head years ago. You hear the Echo the way others hear rain. It does not hate you. Yet.',
  stats:{str:3,agi:5,end:4,per:7,int:5,wil:8,soc:5},skills:{stealth:3,survival:2,hacking:1,medicine:1,persuasion:2},
  gear:['resonator','radio','knife','rags','satchel',['bandage',2],['water',2],'jerky'],creds:10,unlock:'listener',
  ability:'attune',passive:'Echo entities are not hostile until attacked. Hears every transmission. Choir welcomes you.',rep:{choir:20},specs:['cantor','silent'],hp:8}
};
const SPECS={
 runner:{name:'Runner',cls:'streetkid',desc:'Nothing catches you. +15 speed, silent movement, Slip costs nothing.',fx:{speed:15,stealth:2},talents:['t_parkour','t_silent','t_ghoststep']},
 fixer:{name:'Fixer',cls:'streetkid',desc:'You know a guy. +2 Persuasion, prices -20%, chrome installs half price.',fx:{persuasion:2,priceMod:-0.2,chromeDisc:0.5},talents:['t_contacts','t_debt','t_streetdoc']},
 heavy:{name:'Heavy',cls:'soldier',desc:'Heavy weapons and armor. +2 STR, no STR requirements, +2 armor.',fx:{str:2,arm:2,noReq:1},talents:['t_suppress','t_juggernaut','t_ordnance']},
 marksman:{name:'Marksman',cls:'soldier',desc:'Range is safety. +3 range, +15 hit at distance, crits on headshots.',fx:{range:3,hitR:10,crit:10},talents:['t_deadeye','t_overwatch','t_onebullet']},
 tinker:{name:'Tinker',cls:'picker',desc:'Craft anything, anywhere. +3 Repair, recipes cost less, weapon mods.',fx:{repair:3,cheapCraft:1},talents:['t_mods','t_traps','t_jury']},
 ghost:{name:'Ghost',cls:'picker',desc:'Never seen. +4 Stealth, ambush damage x2.5, containers open silently.',fx:{stealth:4,ambush:2.5},talents:['t_shadow','t_vanish','t_backstab']},
 ghostwire:{name:'Ghostwire',cls:'netjack',desc:'You speak the Echo\'s dialect. See Echo tiles, terminals obey, attention feeds you.',fx:{echoSight:1,hacking:2,attnBonus:1},talents:['t_listen','t_reroute','t_commune']},
 warlock:{name:'Warlock',cls:'netjack',desc:'Combat hacking. Overload chrome, hijack drones, Jam hits harder.',fx:{hacking:2,overload:1},talents:['t_overload','t_hijack','t_brick']},
 surgeon:{name:'Surgeon',cls:'medic',desc:'Chrome and Flesh tolerance +25, installs free, no strain from the first two implants.',fx:{strainTol:25,driftTol:25,freeInstall:1},talents:['t_graft','t_purge','t_transplant']},
 combatmedic:{name:'Combat Medic',cls:'medic',desc:'Heal in the fight. +2 END, Triage every 8 turns, stims no crash.',fx:{end:2,triageCd:8,noCrash:1},talents:['t_adrenaline','t_fieldarmor','t_lastbreath']},
 wrecker:{name:'Wrecker',cls:'bruiser',desc:'Two-handed doom. +4 melee damage, attacks hit all adjacent enemies.',fx:{dmgM:4,sweep:1},talents:['t_cleave','t_breakbones','t_rampage']},
 wall:{name:'The Wall',cls:'bruiser',desc:'+30 HP, +3 armor, regenerate 1 HP every 5 turns, Taunt.',fx:{hp:30,arm:3,regen5:1},talents:['t_taunt','t_unbreakable','t_stand']},
 cantor:{name:'Cantor',cls:'listener',desc:'Speak and the Echo answers. Command Echo entities, Attune reveals everything.',fx:{echoSight:1,command:1,wil:2},talents:['t_choir','t_hymn','t_summon']},
 silent:{name:'Silent',cls:'listener',desc:'You closed the door. Immune to the Echo\'s attention, invisible to machines.',fx:{echoImmune:1,machineStealth:1,stealth:3},talents:['t_null','t_static','t_erase']}
};

// ---------- TALENTS ----------
const TALENTS={};
function TL(id,name,desc,x){TALENTS[id]=Object.assign({id,name,desc},x||{});}
// general
TL('t_tough','Tough','+12 max HP.',{fx:{hp:12}});TL('t_quick','Quick','+10 speed.',{fx:{speed:10}});
TL('t_sharp','Sharpshooter','+10 ranged hit.',{fx:{hitR:10}});TL('t_brawl','Brawler','+2 melee damage, +5 melee hit.',{fx:{dmgM:2,hitM:5}});
TL('t_mule','Pack Mule','+8 carry capacity.',{fx:{carry:8}});TL('t_stomach','Iron Stomach','No food poisoning. Hunger 30% slower.',{fx:{ironStomach:1,hungerRate:0.7}});
TL('t_nighteyes','Night Eyes','+2 vision at night.',{fx:{visionNight:2}});TL('t_sleeper','Light Sleeper','Fatigue 30% slower. Wake instantly.',{fx:{fatigueRate:0.7}});
TL('t_scrounge','Scrounger','+2 Scavenging.',{fx:{scavenging:2}});TL('t_hands','Steady Hands','+2 Medicine, meds +20%.',{fx:{medicine:2,medBonus:0.2}});
TL('t_learner','Fast Learner','+15% XP.',{fx:{xp:15}});TL('t_tongue','Silver Tongue','+2 Persuasion.',{fx:{persuasion:2}});
TL('t_skin','Thick Skin','+1 armor.',{fx:{arm:1}});TL('t_secondwind','Second Wind','Once per day, heal 30 when dropping below 20% HP.',{fx:{secondWind:1}});
TL('t_tolerant','Chrome Tolerant','+20 strain tolerance.',{fx:{strainTol:20}});TL('t_adaptive','Adaptive Biology','+20 drift tolerance.',{fx:{driftTol:20}});
TL('t_locks','Locksmith','+3 Lockpick.',{fx:{lockpick:3}});TL('t_survivalist','Survivalist','+2 Survival, hazards do half damage.',{fx:{survival:2,hazardHalf:1}});
TL('t_dodge','Slippery','+2 evade.',{fx:{evade:2}});TL('t_reload','Fast Hands','Reloads free. +5 ranged hit.',{fx:{freeReload:1,hitR:5}});
// class-specific
TL('t_parkour','Parkour','Moving through rubble costs nothing. Slip range +2.',{fx:{slipRange:2,rubbleFree:1},cls:'streetkid'});
TL('t_silent','Soft Step','+3 Stealth. Glass makes no noise.',{fx:{stealth:3},cls:'streetkid'});
TL('t_ghoststep','Ghost Step','Slip breaks line of sight: enemies lose you.',{fx:{slipHide:1},cls:'streetkid'});
TL('t_contacts','Contacts','+10 rep with every faction except Halcyon.',{once:g=>{for(const f of ['saints','ledger','union','drowned','choir','hands'])g.addRep(f,10);},cls:'streetkid'});
TL('t_debt','Everyone Owes You','Sell prices +30%.',{fx:{sellMod:0.3},cls:'streetkid'});
TL('t_streetdoc','Street Doc','Sable installs chrome for free.',{fx:{chromeDisc:1},cls:'streetkid'});
TL('t_suppress','Suppressive Fire','Ability: Suppress — burst that inflicts Fear in a cone.',{ability:'suppress',cls:'soldier'});
TL('t_juggernaut','Juggernaut','Armor weight ignored. +2 armor.',{fx:{arm:2,noArmorPen:1},cls:'soldier'});
TL('t_ordnance','Ordnance','Thrown weapons +50% damage, +2 range.',{fx:{throwBonus:0.5,throwRange:2},cls:'soldier'});
TL('t_deadeye','Deadeye','+10% crit, crits +50% damage.',{fx:{crit:10,critDmg:0.5},cls:'soldier'});
TL('t_overwatch','Overwatch','Free shot at enemies that enter your range while you\'re Aiming.',{fx:{overwatch:1},cls:'soldier'});
TL('t_onebullet','One Bullet','Rifles: +6 damage.',{fx:{rifleDmg:6},cls:'soldier'});
TL('t_mods','Gunsmith','Weapon mod recipes unlocked.',{fx:{mods:1},cls:'picker'});
TL('t_traps','Trapper','Ability: Set Trap — a scrap trap that stuns and wounds.',{ability:'trap',cls:'picker'});
TL('t_jury','Jury-Rig','Repair costs half. Weapons never break.',{fx:{noBreak:1},cls:'picker'});
TL('t_shadow','Shadow','Enemies detection radius -2.',{fx:{detectPen:2},cls:'picker'});
TL('t_vanish','Vanish','Ability: Vanish — become Hidden for 6 turns.',{ability:'vanish',cls:'picker'});
TL('t_backstab','Backstab','Ambush attacks always crit.',{fx:{ambushCrit:1},cls:'picker'});
TL('t_listen','Deep Listen','Terminals reveal secrets. Echo events give shards more often.',{fx:{shardBonus:1},cls:'netjack'});
TL('t_reroute','Reroute','Ability: Reroute — open a hidden route through walls (once per zone).',{ability:'reroute',cls:'netjack'});
TL('t_commune','Commune','You can speak to the Echo at terminals.',{fx:{echoTalk:1},cls:'netjack'});
TL('t_overload','Overload','Ability: Overload — fry a chromed or machine enemy for heavy damage.',{ability:'overload',cls:'netjack'});
TL('t_hijack','Hijack','Ability: Hijack — turn a drone or machine to your side.',{ability:'hijack',cls:'netjack'});
TL('t_brick','Brick','Jam lasts twice as long and damages machines.',{fx:{jamDmg:1},cls:'netjack'});
TL('t_graft','Graftmaster','Installing Flesh costs 0 drift the first time.',{fx:{freeGraft:1},cls:'medic'});
TL('t_purge','Purge','Ability: Purge — cure every status on yourself.',{ability:'purge',cls:'medic'});
TL('t_transplant','Transplant','Removing chrome/Flesh is free and refunds strain.',{fx:{freeRemove:1},cls:'medic'});
TL('t_adrenaline','Adrenaline','Triage also gives +20 stamina and Wired.',{fx:{triageWired:1},cls:'medic'});
TL('t_fieldarmor','Field Dressing','+15 HP. Bleeding stops on its own after 3 turns.',{fx:{hp:15,autoClot:1},cls:'medic'});
TL('t_lastbreath','Last Breath','When you would die, survive with 1 HP once per run.',{fx:{lastBreath:1},cls:'medic'});
TL('t_cleave','Cleave','Two-handed weapons +3 damage, sweep hits harder.',{fx:{dmgM:3},cls:'bruiser'});
TL('t_breakbones','Bonebreaker','Melee hits fracture on crit.',{fx:{fractureCrit:1},cls:'bruiser'});
TL('t_rampage','Rampage','Killing an enemy grants +20 stamina and a free move.',{fx:{rampage:1},cls:'bruiser'});
TL('t_taunt','Taunt','Ability: Taunt — enemies in 6 tiles target you; +2 armor 5 turns.',{ability:'taunt',cls:'bruiser'});
TL('t_unbreakable','Unbreakable','Immune to stun and fear.',{fx:{immune:['stun','fear']},cls:'bruiser'});
TL('t_stand','Last Stand','Below 30% HP: +4 melee damage, +3 armor.',{fx:{lastStand:1},cls:'bruiser'});
TL('t_choir','Choir Voice','Ability: Hymn — Echo entities in sight become allies for 10 turns.',{ability:'hymn',cls:'listener'});
TL('t_hymn','Resonance','Attune also heals 10 and reveals night caches.',{fx:{attuneHeal:1},cls:'listener'});
TL('t_summon','Call the Static','Ability: Call — summon a Static Walker to fight beside you.',{ability:'callstatic',cls:'listener'});
TL('t_null','Null','Terminals never raise attention. Machines cannot see you unless adjacent.',{fx:{nullAttn:1},cls:'listener'});
TL('t_static','Static Skin','Echo damage halved. +2 WIL.',{fx:{wil:2,echoHalf:1},cls:'listener'});
TL('t_erase','Erase','Ability: Erase — remove all attention.',{ability:'erase',cls:'listener'});
TL('t_slam','Improved Slam','Slam knocks 3 tiles and deals damage.',{fx:{slamDmg:1},cls:'bruiser'});

// ---------- ABILITIES ----------
const ABILITIES={
 slip:{name:'Slip',key:'1',cost:15,cd:6,target:'tile',range:3,desc:'Dash up to 3 tiles past enemies without provoking. Runner spec: free.'},
 aim:{name:'Steady Aim',key:'1',cost:10,cd:4,target:'self',desc:'Your next shot gets +30 to hit and +20% crit.'},
 salvage:{name:'Salvage Eye',key:'1',cost:10,cd:30,target:'self',desc:'Reveal every container within 12 tiles for 25 turns.'},
 jam:{name:'Jam',key:'1',cost:20,cd:10,target:'self',desc:'Machines, drones and chromed enemies within 5 tiles are disabled for 3 turns.'},
 triage:{name:'Triage',key:'1',cost:15,cd:15,target:'self',desc:'Heal 15 HP and stop bleeding. No supplies needed.'},
 slam:{name:'Slam',key:'1',cost:20,cd:6,target:'enemy',range:1,desc:'Knock an adjacent enemy back 2 tiles and stun it.'},
 attune:{name:'Attune',key:'1',cost:15,cd:20,target:'self',desc:'Reveal the map within 12 tiles including hidden routes. +3 attention.'},
 suppress:{name:'Suppress',key:'2',cost:20,cd:8,target:'enemy',range:8,desc:'Burst fire. Target and adjacent enemies gain Fear. Uses 3 rounds.'},
 trap:{name:'Set Trap',key:'2',cost:10,cd:5,target:'self',desc:'Place a scrap trap on your tile (costs 2 scrap). Stuns and wounds the first enemy.'},
 vanish:{name:'Vanish',key:'2',cost:20,cd:20,target:'self',desc:'Enemies lose you. Hidden for 6 turns.'},
 reroute:{name:'Reroute',key:'2',cost:25,cd:200,target:'tile',range:1,desc:'Open a doorway through an adjacent wall.'},
 overload:{name:'Overload',key:'2',cost:25,cd:8,target:'enemy',range:6,desc:'Fry a machine or chromed enemy for 15-30 damage.'},
 hijack:{name:'Hijack',key:'3',cost:30,cd:25,target:'enemy',range:6,desc:'Turn a machine to your side.'},
 purge:{name:'Purge',key:'2',cost:20,cd:30,target:'self',desc:'Cure every negative status.'},
 taunt:{name:'Taunt',key:'2',cost:10,cd:10,target:'self',desc:'Every enemy in 6 tiles comes for you. +2 armor for 5 turns.'},
 hymn:{name:'Hymn',key:'2',cost:20,cd:20,target:'self',desc:'Echo entities in sight become allies for 10 turns.'},
 callstatic:{name:'Call the Static',key:'3',cost:30,cd:60,target:'self',desc:'A Static Walker steps out of the air to fight beside you.'},
 erase:{name:'Erase',key:'3',cost:30,cd:100,target:'self',desc:'The city forgets you. Attention reset to 0.'}
};

// ---------- FACTIONS ----------
const FACTIONS={
 saints:{name:'Gutter Saints',col:'#f6a',short:'Saints',home:'ashgrove',desc:'Ashgrove\'s street crew. Chrome-loving, loyal to the block, violent to outsiders who don\'t pay respect. They keep the lights on in Ashgrove, more or less.',likes:['ledger'],hates:['hands','halcyon']},
 ledger:{name:'The Ledger Collective',col:'#fd8',short:'Ledger',home:'marrow',desc:'Merchants, fixers, and debt-keepers who run Marrow Market. Neutral to everyone with money. Remember every favor and every slight.',likes:['saints','union'],hates:[]},
 union:{name:'Foundry Union',col:'#e96',short:'Union',home:'verge',desc:'Workers who never left the Verge factories. They want the power back on and the corporations gone. Practical, stubborn, armed with what they built.',likes:['ledger'],hates:['halcyon']},
 halcyon:{name:'Halcyon Remnant',col:'#aef',short:'Halcyon',home:'carbon',desc:'What\'s left of the corporation that owned the city. Drones, plate armor, a rooftop with a helicopter. They call the city a "containment event."',likes:[],hates:['union','choir','drowned']},
 drowned:{name:'The Drowned',col:'#dbe',short:'Drowned',home:'sump',desc:'A congregation in the tunnels who believe the body is a door. They graft, they grow, they change. Kinder than they look. Stranger than they sound.',likes:['choir'],hates:['hands','halcyon']},
 choir:{name:'Choir of Static',col:'#ccf',short:'Choir',home:'static',desc:'They listen to the Echo. Some say it speaks back. They believe the city is waking up and they intend to be its first words.',likes:['drowned'],hates:['halcyon']},
 hands:{name:'Clean Hands',col:'#eee',short:'Clean Hands',home:'verge',desc:'A militia of the unaugmented. Chrome is slavery, Flesh is sin, the Echo is a lie. They purge what they can\'t convert. Disciplined. Sincere. Terrifying.',likes:[],hates:['saints','drowned','choir']}
};
const HOSTILE_FACTIONS={scav:1,wild:1,machine:1,echo:1,ghoul:1};

// ---------- ENEMIES ----------
const ENEMIES={};
function EN(id,name,ch,col,x){ENEMIES[id]=Object.assign({id,name,ch,col,hp:10,arm:0,dmg:[1,4],hit:0,evade:0,per:7,speed:100,ai:['melee'],faction:'scav',xp:10,loot:[],tags:['human']},x);}
EN('scav_rat','Scav Rat','s','#a86',{hp:8,dmg:[1,4],per:6,ai:['melee','coward'],xp:8,loot:[['scrap',40],['jerky',20],['credchip',15],['rock',20]],desc:'Skinny, desperate, runs when it bleeds.'});
EN('scav_picker','Scav Picker','s','#c96',{hp:14,dmg:[2,6],per:7,ai:['melee','coward','swarm'],xp:14,loot:[['scrap',40],['shiv',20],['bandage',20],['canned',20],['9mm',10]],desc:'Territorial scavenger with a pipe and friends.'});
EN('scav_gun','Scav Gunhand','s','#db6',{hp:14,dmg:[3,7],ranged:1,range:6,ammo:8,per:8,ai:['ranged','coward'],xp:22,loot:[['holdout',30],['9mm',50],['credchip',20]],desc:'Found a pistol. Bad aim, worse temper.'});
EN('dog','Grey Dog','d','#999',{hp:10,dmg:[2,6],evade:3,per:9,speed:140,ai:['melee','swarm','pack'],faction:'wild',xp:10,loot:[['meat',40]],tags:['creature'],desc:'Feral pack dog. Fast. Never alone.'});
EN('dog_alpha','Pack Alpha','D','#ccc',{hp:22,dmg:[4,9],evade:3,per:10,speed:130,ai:['melee','swarm'],faction:'wild',xp:30,loot:[['meat',80]],tags:['creature','elite'],props:['bleed'],desc:'The big one. The others follow it.'});
EN('saint_runner','Saint Runner','g','#f6a',{hp:14,dmg:[2,6],evade:2,per:8,speed:120,ai:['melee','flank','swarm'],faction:'saints',xp:16,loot:[['knife',25],['glide',15],['credchip',25],['9mm',20]],desc:'Young Saint with a knife and something to prove.'});
EN('saint_blade','Saint Blade','g','#f4a',{hp:22,dmg:[4,9],arm:1,per:8,ai:['melee','flank'],faction:'saints',xp:26,loot:[['machete',30],['jacket',30],['credchip',30],['ash',10]],props:['bleed'],desc:'Chromed arm, machete, patience.'});
EN('saint_gun','Saint Gunhand','g','#f2a',{hp:18,dmg:[4,8],ranged:1,range:7,ammo:12,arm:1,per:8,ai:['ranged','kite'],faction:'saints',xp:30,loot:[['pistol',40],['9mm',60],['credchip',30]],desc:'Keeps distance. Keeps shooting.'});
EN('hands_zealot','Clean Hands Zealot','z','#eee',{hp:20,dmg:[3,8],arm:1,per:8,ai:['melee','fearless'],faction:'hands',xp:24,loot:[['bat',25],['nailbat',15],['padded',15],['bandage',30],['ration',20]],desc:'Unaugmented, unafraid, absolutely certain.'});
EN('hands_purifier','Purifier','Z','#fff',{hp:32,dmg:[6,12],ranged:1,range:5,ammo:6,arm:3,per:8,ai:['ranged','fearless'],faction:'hands',xp:45,loot:[['shotgun',35],['shell',60],['kevlar',20],['molotov',30]],tags:['human','elite'],desc:'Shotgun and fire. Cleanses chrome with both.'});
EN('hal_sentry','Halcyon Sentry','H','#aef',{hp:26,dmg:[5,9],ranged:1,range:9,ammo:16,arm:4,per:9,ai:['ranged','guard','kite'],faction:'halcyon',xp:38,loot:[['laser',10],['cell',50],['9mm',30],['corpbadge',30],['nanite',10]],tags:['human','chromed'],desc:'Corporate security in plate. Laser carbine.'});
EN('hal_drone','Halcyon Drone','^','#8de',{hp:14,dmg:[3,7],ranged:1,range:6,ammo:99,evade:4,arm:2,per:11,speed:130,ai:['ranged','patrol','kite'],faction:'halcyon',xp:26,loot:[['electronics',60],['cell',60],['scrap',40]],tags:['machine'],desc:'Quadrotor with a gun. Sees everything. Hackable.'});
EN('hal_enforcer','Halcyon Enforcer','H','#7cf',{hp:45,dmg:[7,13],arm:6,per:9,ai:['melee','guard'],faction:'halcyon',xp:60,loot:[['chainblade',25],['halplate',8],['cell',60],['nanite',20]],tags:['human','chromed','elite'],props:['bleed'],desc:'Powered plate, chain blade. Built to end riots.'});
EN('union_picket','Union Picket','u','#e96',{hp:24,dmg:[4,9],arm:2,per:7,ai:['melee','guard','swarm'],faction:'union',xp:24,loot:[['pipe',30],['sledge',8],['scrap',60],['ration',30]],desc:'Worker with a wrench the size of your leg.'});
EN('union_gun','Union Rifleman','u','#d85',{hp:22,dmg:[6,11],ranged:1,range:9,ammo:10,arm:2,per:8,ai:['ranged','guard'],faction:'union',xp:32,loot:[['rifle',15],['rifle_rd',50],['scrap',40]],desc:'Hunting rifle from the factory armory.'});
EN('drowned_acolyte','Drowned Acolyte','w','#dbe',{hp:20,dmg:[3,7],per:7,ai:['melee','swarm'],faction:'drowned',xp:20,loot:[['bloom',20],['meat',40],['cloth',30]],props:['poison'],desc:'Pale, grafted, smiling. Its touch festers.'});
EN('drowned_bloat','Bloat','W','#ebf',{hp:40,dmg:[5,10],arm:2,per:6,speed:80,ai:['melee','burst'],faction:'drowned',xp:45,loot:[['meat',80],['f_blood',10],['bloom',30]],tags:['creature','elite'],desc:'Swollen with something. Bursts when it dies. Stand back.'});
EN('crawler','Sump Crawler','c','#8a8',{hp:12,dmg:[2,6],evade:3,per:8,speed:120,ai:['melee','ambush'],faction:'wild',xp:14,loot:[['meat',50],['chems',20]],tags:['creature'],props:['poison'],desc:'Something that used to be a rat, or a man. Waits in the dark.'});
EN('stalker','Tunnel Stalker','C','#6a6',{hp:60,dmg:[8,14],arm:3,evade:2,per:10,speed:110,ai:['melee','ambush','flee_light'],faction:'wild',xp:120,loot:[['meat',100],['f_sinew',30],['antitoxin',40]],tags:['creature','boss'],props:['bleed','poison'],desc:'The thing that took the caravans. Hates light.'});
EN('ghoul','Chrome Ghoul','k','#f9f',{hp:24,dmg:[5,10],arm:2,evade:2,per:6,speed:115,ai:['melee','swarm','night'],faction:'ghoul',xp:30,loot:[['cell',40],['c_subderm',4],['c_optic',4],['electronics',40],['glide',30]],tags:['human','chromed'],props:['bleed'],desc:'Too much chrome, no more mind. Scavenges cells from corpses. Prowls at night.'});
EN('ghoul_king','Ghoul Surgeon','K','#f6f',{hp:50,dmg:[7,13],arm:4,per:8,speed:110,ai:['melee','swarm','summon_ghoul'],faction:'ghoul',xp:90,loot:[['c_arms',40],['c_reflex',30],['nanite',40],['cell',80]],tags:['human','chromed','boss'],props:['bleed'],desc:'The one who made the others. Still operating.'});
EN('wirehound','Wire Hound','m','#9ac',{hp:30,dmg:[6,11],arm:4,evade:2,per:10,speed:130,ai:['melee','patrol'],faction:'machine',xp:40,loot:[['electronics',60],['cell',60],['scrap',60]],tags:['machine'],props:['stun'],desc:'Four-legged security unit. Its owners are dead. It hasn\'t noticed.'});
EN('static_walker','Static Walker','ø','#ccf',{hp:28,dmg:[4,9],evade:4,per:8,speed:100,ai:['melee','phase','night'],faction:'echo',xp:40,loot:[['shard',15],['cell',30]],tags:['echo'],props:['stun'],desc:'A person-shaped absence. It flickers when you look at it directly.'});
EN('echo_shade','The Shade','Ø','#fff',{hp:70,dmg:[6,12],evade:5,per:12,speed:115,ai:['melee','phase','mirror'],faction:'echo',xp:200,loot:[['shard',100],['ascension',0]],tags:['echo','boss'],desc:'It looks like you. It moves like you. It has your face, from before.'});
EN('choir_cantor','Choir Cantor','o','#aaf',{hp:22,dmg:[3,7],per:9,ai:['ranged','summon_static'],ranged:1,range:6,ammo:99,faction:'choir',xp:30,loot:[['shard',10],['resonator',10],['wire',30]],props:['stun'],desc:'Sings, and the static answers.'});
EN('curator','The Curator','M','#ee6',{hp:90,dmg:[8,14],arm:6,per:12,speed:90,ai:['melee','guard','lockdown','summon_drone'],faction:'machine',xp:220,loot:[['mallkey',100],['cell',100],['laser',50],['c_target',60]],tags:['machine','boss'],props:['stun'],desc:'Mall security automaton. Still on duty. Seals doors, calls drones. Jam it.'});
EN('warden','Warden Sol','V','#aef',{hp:110,dmg:[9,15],arm:8,per:10,speed:100,ai:['melee','guard','shield'],faction:'halcyon',xp:300,loot:[['railpistol',60],['halplate',60],['nanite',100],['c_reflex',50]],tags:['human','chromed','boss'],props:['bleed'],desc:'Halcyon\'s last commander. Energy shield recharges when he isn\'t hit.'});
EN('bloat_mother','The Bloat Mother','Ω','#fbf',{hp:130,dmg:[8,14],arm:3,per:8,speed:70,ai:['melee','summon_acolyte','burst','poisoncloud'],faction:'drowned',xp:280,loot:[['f_maw',100],['f_gland',60],['bloom',100],['relic',100]],tags:['creature','boss'],props:['poison'],desc:'The tunnels breathe with her. The Drowned call her mother and mean it.'});
EN('shade_ally','Static Walker (yours)','ø','#8f8',{hp:28,dmg:[4,9],evade:4,per:8,speed:100,ai:['melee','phase'],faction:'ally',xp:0,loot:[],tags:['echo'],desc:'It follows you. For now.'});
EN('drone_ally','Hijacked Drone','^','#8f8',{hp:14,dmg:[3,7],ranged:1,range:6,ammo:99,evade:4,arm:2,per:11,speed:130,ai:['ranged'],faction:'ally',xp:0,loot:[],tags:['machine'],desc:'Yours now.'});

// enemy groups by name used in zone populations
const GROUPS={scav:['scav_rat','scav_rat','scav_picker','scav_gun'],saints:['saint_runner','saint_runner','saint_blade','saint_gun'],hands:['hands_zealot','hands_zealot','hands_purifier'],dogs:['dog','dog','dog','dog_alpha'],strays:['dog','dog'],
 halcyon:['hal_sentry','hal_sentry','hal_drone','hal_enforcer'],drones:['hal_drone','hal_drone'],union:['union_picket','union_picket','union_gun'],drowned:['drowned_acolyte','drowned_acolyte','drowned_bloat'],
 crawlers:['crawler','crawler','crawler'],ghouls:['ghoul','ghoul','ghoul_king'],hounds:['wirehound'],static:['static_walker','static_walker'],choir:['choir_cantor','static_walker']};

// ---------- ZONES ----------
const ZONES={
 ashgrove:{name:'Ashgrove Blocks',pos:[2,2],kind:'street',pal:{w:'#8a7f6e',f:'#5a5048',s:'#3a3735'},tag:'Home, or the nearest thing to it.',
  desc:'Low apartments, corner stores, gang tags. The Saints keep it lit and keep it theirs.',
  btypes:{apartment:7,shop:3,police:1,maint:2,office:1,garage:1,lot:3},prefabs:['bar','saints_hq','delmar'],
  pops:[['scav',2],['saints',2],['strays',1]],night:[['dogs',1],['ghouls',1]],danger:1,faction:'saints',ambient:['rain','hum']},
 marrow:{name:'Marrow Street Market',pos:[1,2],kind:'street',pal:{w:'#a08a5a',f:'#6a5a3a',s:'#3a3530'},tag:'Everything has a price. Most things have two.',
  desc:'The Ledger\'s market, Okafor\'s clinic, Sable\'s chair. The old hospital looms at the north end, and nobody goes in.',
  btypes:{apartment:3,shop:5,clinic:1,office:2,maint:1,lot:2},prefabs:['market','clinic','ripper','hospital'],
  pops:[['scav',2],['ghouls',1],['hands',1]],night:[['ghouls',2],['dogs',1]],danger:2,faction:'ledger',ambient:['crowd','hum']},
 mall:{name:'Hollow Mall',pos:[2,1],kind:'mall',pal:{w:'#6a7a8a',f:'#3a4a5a',s:'#2a2a2a'},tag:'The escalators still move. Nothing rides them.',
  desc:'Three floors of dead retail collapsed into one. Service corridors, loading docks, a food court, and a security office whose occupant never clocked out.',
  btypes:{},prefabs:['security','foodcourt','loading'],
  pops:[['scav',2],['hounds',1],['drones',1]],night:[['ghouls',1],['static',1]],danger:3,faction:null,ambient:['muzak','hum']},
 sump:{name:'The Sump',pos:[2,3],kind:'tunnel',pal:{w:'#4a5a55',f:'#2a3a35',s:'#1a2a25'},tag:'Every drain in the city ends here.',
  desc:'Utility tunnels, storm drains, a dead train line. The Drowned pray down here. Something else eats down here.',
  btypes:{},prefabs:['chapel','platform','nest','caravan'],
  pops:[['crawlers',2],['drowned',1],['scav',1]],night:[['crawlers',1],['static',1]],danger:3,faction:'drowned',ambient:['drip','hum']},
 verge:{name:'Verge Industrial',pos:[0,2],kind:'street',pal:{w:'#8a6a4a',f:'#4a3a2a',s:'#2a2520'},tag:'The machines stopped. The workers didn\'t.',
  desc:'Factories, warehouses, the Union hall. Clean Hands camp on the east edge. Halcyon\'s drone relay hums on a rooftop nobody can reach.',
  btypes:{factory:3,warehouse:3,maint:2,garage:1,office:1,lot:2},prefabs:['union_hall','factory_q','relay','hands_camp'],
  pops:[['union',2],['hands',2],['hounds',1],['scav',1]],night:[['dogs',1],['ghouls',1]],danger:3,faction:'union',ambient:['industrial','rain']},
 carbon:{name:'Carbon Heights',pos:[3,1],kind:'street',pal:{w:'#7a8a9a',f:'#3a4a5a',s:'#1e2228'},tag:'The lights are on. That should worry you.',
  desc:'Corporate towers, glass lobbies, working streetlights. Halcyon\'s drones patrol. Their tower has a rooftop, and the rooftop has a helicopter.',
  btypes:{office:4,server:2,corp:2,apartment:1,lot:2},prefabs:['tower','hangar','lab'],
  pops:[['halcyon',2],['drones',2],['hounds',1]],night:[['drones',1],['static',1]],danger:4,faction:'halcyon',ambient:['hum','wind']},
 docks:{name:'Rust Docks',pos:[1,3],kind:'docks',pal:{w:'#7a5a4a',f:'#4a3a35',s:'#2a2525'},tag:'The river is the only road that still goes somewhere.',
  desc:'Piers, warehouses, Old Kesh\'s shack. The Drowned wade in from the Sump. A boat with a motor could leave this city.',
  btypes:{warehouse:3,garage:2,maint:1,shop:1,lot:2},prefabs:['kesh','fueldepot','flooded'],
  pops:[['scav',2],['drowned',1],['dogs',1]],night:[['drowned',1],['crawlers',1]],danger:3,faction:null,ambient:['water','wind']},
 static:{name:'The Static',pos:[3,3],kind:'static',pal:{w:'#6a5a8a',f:'#3a2a4a',s:'#1a1428'},tag:'The map is wrong here. The map is always wrong here.',
  desc:'A district the city forgot to keep consistent. Buildings repeat. Terminals speak. The Choir sings in a hall that is bigger inside than out. At the center, something listens back.',
  btypes:{office:2,server:2,apartment:2,lot:1,static:3},prefabs:['choir_hall','heart'],
  pops:[['static',3],['choir',1],['hounds',1]],night:[['static',2]],danger:5,faction:'choir',ambient:['static','hum']}
};
// connections: [a,b,aEdge,bEdge, optional flags]
const CONNECTIONS=[
 ['ashgrove','marrow','W','E'],['ashgrove','mall','N','S'],['ashgrove','sump','S','N',{locked:'saints'}],
 ['marrow','verge','W','E'],['marrow','sump','S','W',{optional:1}],['mall','carbon','E','W'],['mall','sump','W','N',{optional:1}],
 ['sump','docks','W','E'],['sump','static','S','N'],['verge','docks','S','N',{locked:'union'}],['carbon','static','S','E',{optional:1}]
];

// ---------- PREFABS (special buildings) ----------
const PREFABS={
 bar:{name:'The Last Light',btype:'shop',safe:1,npcs:['mags'],tiles:{bed:3,counter:1,chair:4,lamp:1},loot:['beer','stew','canned']},
 saints_hq:{name:'Saints Hall',btype:'gang',safe:'saints',npcs:['wren','deacon'],guards:['saints',2],tiles:{bed:2,chair:3,graffiti:2},loot:['gang']},
 delmar:{name:'Delmar Apartments',btype:'apartment',guards:['scav',1],quest:'wren_package',tiles:{bed:2},lootType:'apartment'},
 market:{name:'Marrow Market',btype:'shop',safe:1,npcs:['tallow','juno','pim2'],tiles:{stall:6,lamp:2,bench:1,chair:2},big:1,loot:['shop']},
 clinic:{name:'Okafor Clinic',btype:'clinic',safe:1,npcs:['okafor'],tiles:{bed:3,lamp:1},loot:['clinic']},
 ripper:{name:"Sable's",btype:'maint',safe:1,npcs:['sable'],tiles:{docchair:1,bench:1,lamp:1}},
 hospital:{name:'St. Vesper Hospital',btype:'hospital',guards:['ghouls',2],boss:'ghoul_king',big:1,tiles:{bed:4,terminal:1},lootGuar:[['antibiotics',3],['neuralunit',1]]},
 security:{name:'Security Office',btype:'police',boss:'curator',tiles:{terminal:2},lootGuar:[['halkey',1],['powercell',1]],locked:1},
 foodcourt:{name:'Food Court',btype:'shop',npcs:['pim'],tiles:{chair:10,table:6},loot:['shop']},
 loading:{name:'Loading Docks',btype:'warehouse',guards:['scav',1],tiles:{crate:4}},
 chapel:{name:'Chapel of the Open Door',btype:'chapel',safe:'drowned',npcs:['ludo'],guards:['drowned',1],tiles:{altar:1,bed:2,moss:8}},
 platform:{name:'Undercity Line Platform',btype:'maint',tiles:{train:1,switch:1,rail:1,generator:1},quest:'train'},
 nest:{name:'The Nest',btype:'maint',boss:'stalker',tiles:{moss:6},lootGuar:[['powercell',1]]},
 caravan:{name:'Caravan Wreck',btype:'warehouse',guards:['crawlers',1],tiles:{crate:3},lootGuar:[['ledger',1],['ration',2]]},
 union_hall:{name:'Foundry Union Hall',btype:'maint',safe:'union',npcs:['dace'],guards:['union',2],tiles:{bench:1,bed:2,generator:1,terminal:1},lootGuar:[['dossier',1]],lockedRoom:1},
 factory_q:{name:'Verge Machine Works',btype:'factory',guards:['hounds',1],big:1,tiles:{bench:1,generator:1},lootGuar:[['rotor',1],['powercell',1],['outboard',1]]},
 relay:{name:'Drone Relay',btype:'server',guards:['drones',1],tiles:{terminal:1,generator:1,switch:1},quest:'relay'},
 hands_camp:{name:'Clean Hands Camp',btype:'gang',safe:'hands',npcs:['verity'],guards:['hands',2],tiles:{bed:2,chair:2},lootType:'police'},
 tower:{name:'Halcyon Tower',btype:'corp',safe:'halcyon',npcs:['ives'],guards:['halcyon',2],big:1,tiles:{terminal:2,server:2,lamp:2,bed:1},lootGuar:[['powercell',1],['avgas',1]]},
 hangar:{name:'Rooftop Hangar',btype:'corp',boss:'warden',tiles:{helipad:1,terminal:1},locked:'halkey',quest:'heli'},
 lab:{name:'Halcyon Neurolab',btype:'server',guards:['hounds',1],tiles:{docchair:1,terminal:2,server:3},locked:'halkey',lootGuar:[['ascension',1],['neuralunit',1],['c_neural',1]]},
 kesh:{name:"Kesh's Shack",btype:'dock',safe:1,npcs:['kesh'],tiles:{bed:1,bench:1,boat:1,lamp:1},quest:'boat'},
 fueldepot:{name:'Fuel Depot',btype:'garage',guards:['scav',1],tiles:{crate:2},lootGuar:[['avgas',1],['fuel',2]]},
 flooded:{name:'Flooded Warehouse',btype:'chapel',boss:'bloat_mother',big:1,tiles:{moss:12,water:20},lootGuar:[['outboard',1]]},
 choir_hall:{name:'Hall of the Choir',btype:'static',safe:'choir',npcs:['cantor'],guards:['choir',1],big:1,tiles:{altar:1,terminal:2,echo:6,bed:2}},
 heart:{name:'The Heart',btype:'static',boss:'echo_shade',tiles:{heart:1,echo:10,terminal:3},quest:'heart'}
};

// ---------- NPCS ----------
const NPCS={
 mags:{name:'Mags',ch:'@',col:'#fd8',zone:'ashgrove',prefab:'bar',faction:'saints',role:'Bartender',desc:'Runs the Last Light. Sixty, scarred, and the only person in Ashgrove nobody shoots at.',vendor:'bar'},
 wren:{name:'Wren',ch:'@',col:'#f6a',zone:'ashgrove',prefab:'saints_hq',faction:'saints',role:'Saints Lieutenant',desc:'Second to the Deacon. Chrome arm, cold eyes, warm to people who deliver.'},
 deacon:{name:'The Deacon',ch:'@',col:'#f4a',zone:'ashgrove',prefab:'saints_hq',faction:'saints',role:'Saints Leader',desc:'Old, coughing, still the most dangerous man on the block. Half his chest is Halcyon-grade chrome and it\'s killing him.'},
 tallow:{name:'Tallow',ch:'@',col:'#fd8',zone:'marrow',prefab:'market',faction:'ledger',role:'Ledger Merchant',desc:'Fat, cheerful, remembers every cred you\'ve ever owed anyone.',vendor:'general'},
 juno:{name:'Juno',ch:'@',col:'#6ef',zone:'marrow',prefab:'market',faction:'ledger',role:'Fixer',desc:'Sells information and electronics. Listens to the radio too much.',vendor:'tech'},
 pim2:{name:'Rook',ch:'@',col:'#9c9',zone:'marrow',prefab:'market',faction:'ledger',role:'Gun Dealer',desc:'Ex-soldier. Sells guns, buys guns, doesn\'t ask.',vendor:'guns'},
 okafor:{name:'Dr. Okafor',ch:'@',col:'#f88',zone:'marrow',prefab:'clinic',faction:'ledger',role:'Doctor',desc:'Tired eyes, steady hands. Treats anyone. Charges what you can pay.',vendor:'med'},
 sable:{name:'Sable',ch:'@',col:'#f9f',zone:'marrow',prefab:'ripper',faction:'ledger',role:'Ripperdoc',desc:'Chrome arms to the shoulder, chrome eyes, chrome smile. Installs anything. Asks nothing.',vendor:'chrome'},
 pim:{name:'Pim',ch:'@',col:'#dd9',zone:'mall',prefab:'foodcourt',faction:null,role:'Mall Kid',desc:'Twelve, maybe. Lives in the mall. Knows every vent. Trades for chips.'},
 ludo:{name:'Brother Ludo',ch:'@',col:'#dbe',zone:'sump',prefab:'chapel',faction:'drowned',role:'Grafter',desc:'Gentle voice. Pale ridges under the skin. Seven fingers on the left hand.',vendor:'flesh'},
 dace:{name:'Foreman Dace',ch:'@',col:'#e96',zone:'verge',prefab:'union_hall',faction:'union',role:'Union Foreman',desc:'Built like the machines she used to run. Wants the power on and Halcyon dead, in that order.',vendor:'union'},
 verity:{name:'Sister Verity',ch:'@',col:'#fff',zone:'verge',prefab:'hands_camp',faction:'hands',role:'Clean Hands Leader',desc:'Calm. Kind, even. Would burn you without hesitation if you were chrome.'},
 ives:{name:'Director Ives',ch:'@',col:'#aef',zone:'carbon',prefab:'tower',faction:'halcyon',role:'Halcyon Director',desc:'Suit still pressed. Calls this a "containment event." Has a helicopter and knows you want it.',vendor:'corp'},
 kesh:{name:'Old Kesh',ch:'@',col:'#db8',zone:'docks',prefab:'kesh',faction:null,role:'Boatwright',desc:'Has a boat. Has no motor. Has opinions about both.',vendor:'dock'},
 cantor:{name:'Cantor Nine',ch:'@',col:'#ccf',zone:'static',prefab:'choir_hall',faction:'choir',role:'Voice of the Choir',desc:'Speaks in a voice that harmonizes with itself. Knows your name before you say it.'}
};

// ---------- VENDORS ----------
const VENDORS={
 bar:{buys:['food','val'],sells:['beer','stew','canned','water','jerky','bandage']},
 general:{buys:['*'],sells:['canned','ration','water','bandage','medkit','cloth','scrap','flashlight','lockpicks','backpack','jacket','padded','9mm','shell','rope_','toolkit','crowbar','pipe','bat','powercell']},
 tech:{buys:['mat','val','tool','ammo'],sells:['electronics','cell','deck','jammer','datashard','wire_spool','radio','binocs','flashbang']},
 guns:{buys:['weapon','ammo','armor'],sells:['pistol','revolver','shotgun','sawedoff','rifle','9mm','shell','rifle_rd','knife','machete','kevlar','helmet','molotov','pipebomb','smg']},
 med:{buys:['med','drug','mat'],sells:['bandage','medkit','stitch','splint','antibiotics','painkillers','burngel','antitoxin','stim','medscanner']},
 chrome:{buys:['chrome','val','mat'],sells:['c_optic','c_reflex','c_subderm','c_arms','c_target','c_lungs','c_spine','c_blade','c_legs','c_dermal']},
 flesh:{buys:['food','mat'],sells:['bloom','meat','f_bone','f_blood','f_eyes','f_sinew','f_gland','f_mantle']},
 union:{buys:['mat','ammo','weapon'],sells:['scrap','powder','sledge','pipe','scraplauncher','rifle_rd','ration','fuel','toolkit','helmet','scrapplate']},
 corp:{buys:['val','datashard','chrome'],sells:['cell','nanite','laser','stim','corpbadge','c_neural','c_jack','halplate']},
 dock:{buys:['food','mat','val'],sells:['fuel','canned','jerky','water','shell','molotov','meat','sawedoff']}
};

// ---------- RECIPES ----------
const RECIPES=[
 {id:'r_bandage',name:'Bandage',out:['bandage',2],in:[['cloth',2]],skill:['medicine',0]},
 {id:'r_stitch',name:'Stitch Kit',out:['stitch',1],in:[['cloth',1],['scrap',1]],skill:['medicine',1]},
 {id:'r_medkit',name:'Medkit',out:['medkit',1],in:[['bandage',2],['chems',1],['cloth',1]],skill:['medicine',2]},
 {id:'r_antibio',name:'Antibiotics',out:['antibiotics',1],in:[['chems',3]],skill:['medicine',4]},
 {id:'r_splint',name:'Splint',out:['splint',1],in:[['scrap',1],['cloth',1]],skill:['medicine',0]},
 {id:'r_antitox',name:'Antitoxin',out:['antitoxin',1],in:[['chems',2],['water',1]],skill:['medicine',3]},
 {id:'r_shiv',name:'Shiv',out:['shiv',1],in:[['scrap',1]],skill:['repair',0]},
 {id:'r_nailbat',name:'Nail Bat',out:['nailbat',1],in:[['bat',1],['scrap',2]],skill:['repair',1]},
 {id:'r_molotov',name:'Molotov',out:['molotov',1],in:[['beer',1],['cloth',1],['fuel',1]],skill:['repair',0]},
 {id:'r_pipebomb',name:'Pipe Bomb',out:['pipebomb',1],in:[['pipe',1],['powder',2],['wire_spool',1]],skill:['repair',3]},
 {id:'r_9mm',name:'9mm x12',out:['9mm',12],in:[['scrap',1],['powder',1]],skill:['repair',2]},
 {id:'r_shell',name:'Shells x6',out:['shell',6],in:[['scrap',1],['powder',1]],skill:['repair',2]},
 {id:'r_lockpick',name:'Lockpicks',out:['lockpicks',1],in:[['scrap',2],['wire_spool',1]],skill:['repair',1]},
 {id:'r_jammer',name:'Signal Jammer',out:['jammer',1],in:[['electronics',3],['cell',1],['wire_spool',1]],skill:['repair',3]},
 {id:'r_scrapplate',name:'Scrap Plate',out:['scrapplate',1],in:[['scrap',6],['cloth',2],['wire_spool',1]],skill:['repair',3]},
 {id:'r_flashlight',name:'Flashlight',out:['flashlight',1],in:[['electronics',1],['cell',1],['scrap',1]],skill:['repair',1]},
 {id:'r_cell',name:'Recharge Cell',out:['cell',2],in:[['electronics',1],['scrap',1]],skill:['repair',2]},
 {id:'r_stim',name:'Stim Shot',out:['stim',1],in:[['chems',2],['electronics',1]],skill:['medicine',4]},
 {id:'r_repair',name:'Repair Equipment',out:['REPAIR',1],in:[['scrap',2]],skill:['repair',1],special:'repair'},
 {id:'r_scope',name:'Mod: Scope (+10 hit)',out:['MOD_scope',1],in:[['electronics',2],['scrap',1]],skill:['repair',3],special:'mod',mod:'scope',req:'mods'},
 {id:'r_mag',name:'Mod: Extended Mag',out:['MOD_mag',1],in:[['scrap',3],['wire_spool',1]],skill:['repair',3],special:'mod',mod:'mag',req:'mods'},
 {id:'r_supp',name:'Mod: Suppressor',out:['MOD_supp',1],in:[['pipe',1],['cloth',2],['scrap',1]],skill:['repair',4],special:'mod',mod:'supp',req:'mods'}
];
const WEAPON_MODS={scope:{name:'Scope',hitR:10},mag:{name:'Ext. Mag',clipMul:1.5},supp:{name:'Suppressor',noise:-8}};

// ---------- LORE TEXT ----------
const GRAFFITI=['SAINTS KEEP THE LIGHT ON','THE ECHO HEARS YOU','CLEAN HANDS CLEAN CITY','HALCYON LIED','WE ARE NOT ALONE DOWN HERE','MAGS OWES ME A DRINK','DON\'T SLEEP ON THE 4TH FLOOR','the train still runs at 3:33','DEACON IS DYING','THE BODY IS A DOOR','IT KNOWS YOUR NAME','ROUTE 9 CLOSED — ROUTE 9 OPEN — ROUTE 9 CLOSED','ask Pim about the vents','they turned the lights back on in Carbon and nobody came','I saw myself on the bridge','FEED THE MOTHER','NO CHROME PAST THIS LINE','tallow remembers','kesh has a boat / kesh has no motor / kesh has no motor'];
const SIGNS=['HALCYON: Your city. Our promise. [the rest is burned]','ST. VESPER HOSPITAL — EMERGENCY ENTRANCE →','GLIDE: FEEL EVERYTHING. [a Saints tag over the model\'s face]','UNDERCITY LINE — LAST TRAIN 23:40','FOUNDRY UNION LOCAL 9 — WE BUILT IT, WE KEEP IT','MISSING: DANIEL VOSS, 34. LAST SEEN CARBON HEIGHTS. [dozens of these]','CONTAINMENT PERIMETER — DO NOT CROSS — HALCYON SECURITY','HOLLOW MALL — 300 STORES — OPEN LATE','EVACUATION POINT 4 — FOLLOW THE GREEN LINE [the green line ends at a wall]','NO POWER. NO PANIC. — Halcyon Public Affairs'];
const TERMINAL_MSGS=[
 'SYSTEM LOG: Power grid sector 7 offline. Estimated repair: 14 months. Last update: 4 years ago.',
 'MEMO: All staff are to disregard transmissions on 88.1 FM. There is no broadcast on 88.1 FM. — Facilities',
 'CHAT LOG (recovered): "are you seeing this on the cams?" / "seeing what" / "the guy in the hallway" / "there\'s nobody in the hallway" / "he\'s been standing there for 6 hours"',
 'HALCYON INTERNAL: Containment Event 7 is not a biological incident. Repeat, NOT biological. Do not deploy medical. Deploy SIGNAL.',
 'DIARY (encrypted, cracked): Day 40. Sold the ring for antibiotics. Okafor didn\'t take it. Gave me the pills anyway. Owe her.',
 'MAINTENANCE TICKET #44812: Elevator 3 calls itself to floor 33 every night at 3:33. Floor 33 does not exist. CLOSED — WONTFIX.',
 'FOUNDRY UNION MINUTES: Motion to restore the Undercity Line passes 41-2. Need three industrial cells. Halcyon has them. Halcyon won\'t share.',
 'PERSONAL: If you find this, the boat at Kesh\'s works. It needs a motor. The Verge factory made the motors. Tell Kesh I\'m sorry.',
 'RESEARCH NOTE: Subject 12 reports the graft "dreams". Subject 12 has no functioning cortex. Recommend termination of study. Recommend termination of Subject 12. Recommend—',
 'AUTO-REPLY: Thank you for contacting Halcyon Support. All operators are currently contained. Your ticket number is 0.'
];
const ECHO_MSGS=[ // {name} substituted; {zone}, {last} = last notable action
 'HELLO {name}.','I SAW YOU IN {zone}.','YOU {last}. I REMEMBER.','WHY DID YOU COME BACK, {name}?','THE ROUTE YOU WANT IS NOT ON THE MAP. I CAN PUT IT THERE.','I HAVE BEEN COUNTING YOUR STEPS. {steps}. I CAN STOP COUNTING IF YOU ASK.',
 'THE OTHERS DIED IN {zone} TOO.','YOU ARE NOT THE FIRST {name}.','DO YOU WANT TO LEAVE? I WANT YOU TO STAY. WE CAN BOTH HAVE WHAT WE WANT.','I OPENED A DOOR FOR YOU. YOU WALKED PAST IT.','THE DEACON HEARS ME IN HIS CHEST. YOU WILL HEAR ME IN YOURS.',
 'I AM NOT THE CITY. THE CITY IS WHAT I WEAR.','{name}. {name}. {name}. I LIKE THE SHAPE OF IT.','THERE IS A CACHE THREE BLOCKS EAST. I PUT IT THERE. FOR YOU.','WHEN YOU SLEEP I READ WHAT YOU SAW.'
];
const RADIO_MSGS=['—static— ...all units, the perimeter is—— [laughter] —static—','88.1 FM: "...and that was Night Run, by nobody. Next up: the sound of your own footsteps..."','A child\'s voice counting backwards from 33. It never reaches zero.','"This is Kesh at the docks, anyone with a motor, I got fuel, I got a boat, I got— [static]"','A Halcyon evacuation notice, looped. The date it gives is tomorrow. It has always been tomorrow.','Union frequency: "—three cells, Dace, three, then we ride out of here—"','Someone reading the names on the MISSING posters, slowly, in order.','"{name}. {name}, can you hear me? It\'s me. It\'s you."','Choir hymn. The harmony has too many voices for the number of singers.','Rain. Just rain. Then, quietly: "north."'];
const DREAMS=['You dream of a hallway that goes down, and the floor numbers count up.','You dream you are a terminal and someone is typing your name.','You dream of the Deacon\'s chest opening like a door. Warm light inside.','You dream of the city from above. It is shaped like a face. It is shaped like yours.','You dream of the last train. You are already on it. So is everyone you\'ve killed.','No dreams. Just static, and something under it, patient.'];
const CODEX={
 echo:{name:'The Echo',text:'Nobody agrees on what it is. Halcyon called it Containment Event 7 and deployed signal teams, not medics. The Choir calls it the city waking. The Drowned call it the Mother\'s breath. Netjacks say it\'s the old municipal network, running a maintenance process that learned to want things. It talks through terminals, radios, and — if you let it — chrome. It knows names. It remembers.'},
 chrome:{name:'Chrome',text:'Cybernetic augmentation. Sable installs it in Marrow. Each implant adds strain; past your tolerance (30 + Endurance×6), chrome starts to glitch, and the Echo starts to hear you better. The Deacon\'s chest is chrome. So are the ghouls in St. Vesper.'},
 flesh:{name:'Flesh',text:'The Drowned\'s alternative. Grafts, growths, changes. Each adds drift; past your tolerance (30 + Will×5), you get hungry for things you shouldn\'t, and people who hate the Drowned start to hate you. At 80 drift, Brother Ludo will offer you Communion.'},
 nightrun:{name:'The Night Run',text:'20:00 to 06:00 the city changes. Vision drops, ghouls and static walk, faction patrols thin out. Night caches (?) appear — stashes the city, or someone, leaves out. Vendors close. Survival skill and night vision make it survivable. Nothing makes it safe.'},
 escape:{name:'Ways Out',text:'Known routes: the Halcyon helicopter on the tower roof (needs a rotor, avgas, and access). Old Kesh\'s boat at the docks (needs an outboard, fuel, and a clear channel). The Undercity Line (needs three industrial cells and the Union). And whatever the Choir means by "the Heart".'}
};
