'use strict';
// ============================================================
// CONTENT: quests, dialogue, events, endings.
// These reference the engine (Game/G) at runtime.
// ============================================================

// ---------- QUESTS ----------
// stages: [{text, done(g)}]  reward applied on final completion. hidden quests start via flags.
const QUESTS={
 wren_package:{name:"Wren's Package",fac:'saints',desc:'Wren wants a package back from the Delmar Apartments stash. Scavs moved in after the Saints moved out.',
  stages:[{text:'Recover the package from the Delmar Apartments (Ashgrove).',done:g=>Game.hasItem('wren_package')},{text:'Bring it to Wren at Saints Hall.',done:g=>G.flags.wren_package_done}],
  reward:{xp:80,creds:60,rep:{saints:20}}},
 bad_blood:{name:'Bad Blood',fac:'saints',desc:'Clean Hands zealots have been raiding Ashgrove for chrome. Wren wants them gone. Sister Verity might listen to reason.',
  stages:[{text:'Kill 4 Clean Hands raiders, or convince Sister Verity (Verge) to stop the raids.',done:g=>(G.kills.hands_zealot||0)+(G.kills.hands_purifier||0)>=4||G.flags.hands_peace},{text:'Report to Wren.',done:g=>G.flags.bad_blood_done}],
  reward:{xp:120,creds:80,rep:{saints:20}}},
 the_crown:{name:'The Crown',fac:'saints',desc:'The Deacon is dying. Wren says the Saints need a hand on the wheel. She is offering yours.',
  stages:[{text:'Decide the future of the Gutter Saints. Talk to Wren.',done:g=>G.flags.crown_done}],reward:{xp:100}},
 samples:{name:"Okafor's Samples",fac:'ledger',desc:'Dr. Okafor is out of antibiotics. St. Vesper Hospital (Marrow, north) has them. It also has ghouls.',
  stages:[{text:'Bring Dr. Okafor 3 Antibiotics from St. Vesper.',done:g=>G.flags.samples_done}],reward:{xp:100,rep:{ledger:15},skill:['medicine',1]}},
 ledger_debt:{name:"The Ledger",fac:'ledger',desc:"Tallow's caravan never came back from the Sump. Neither did his book of debts.",
  stages:[{text:'Find the caravan wreck in the Sump and recover The Ledger.',done:g=>Game.hasItem('ledger')||G.flags.ledger_sold},{text:'Return The Ledger to Tallow (or sell it to someone who wants names).',done:g=>G.flags.ledger_done||G.flags.ledger_sold}],
  reward:{xp:120,creds:150,rep:{ledger:25}}},
 neural:{name:'Sable Wants a Brain',fac:'ledger',desc:'Sable will install chrome free for whoever brings her a Halcyon Neural Unit. St. Vesper\'s surgeon had one. So does the Neurolab in Carbon.',
  stages:[{text:'Bring Sable a Halcyon Neural Unit.',done:g=>G.flags.neural_done}],reward:{xp:100,rep:{ledger:10}}},
 power:{name:'Power to the Line',fac:'union',desc:'Foreman Dace needs three Industrial Power Cells to restore the Undercity Line. The Verge factory, Hollow Mall security, and Halcyon Tower each hold one. The Nest in the Sump hides a fourth.',
  stages:[{text:'Bring Dace 3 Industrial Power Cells.',done:g=>G.flags.power_done},{text:'Throw the switch on the Undercity Line platform (Sump).',done:g=>G.flags.train_powered}],reward:{xp:200,rep:{union:30}}},
 picket:{name:'Picket Line',fac:'union',desc:'Halcyon\'s drone relay on the Verge east side lets their drones patrol Union turf. Dace wants it dark. Ives would pay to know who did it.',
  stages:[{text:'Disable the Drone Relay (hack it, breach it, or wreck its generator).',done:g=>G.flags.relay_down||G.flags.relay_betrayed},{text:'Report back.',done:g=>G.flags.picket_done}],reward:{xp:150,creds:100,rep:{union:25,halcyon:-20}}},
 dossier:{name:'The Dossier',fac:'halcyon',desc:'Director Ives wants the Union\'s dossier: routes, caches, names. It\'s in a locked room in the Union Hall.',
  stages:[{text:'Get the Union Dossier from Foundry Union Hall (Verge).',done:g=>Game.hasItem('dossier')||G.flags.dossier_burned},{text:'Deliver it to Ives — or burn it and tell Dace.',done:g=>G.flags.dossier_done||G.flags.dossier_burned}],reward:{xp:150,creds:200,rep:{halcyon:30}}},
 skyhook:{name:'Skyhook',fac:'halcyon',desc:'There is a helicopter on Halcyon Tower\'s rooftop hangar. It needs a tail rotor (Verge Machine Works), aviation fuel (Fuel Depot at the docks, or the Tower), and a way onto the roof: Halcyon clearance, a keycard, a hack, or a breach charge.',
  stages:[{text:'Acquire a Rotor Assembly and Aviation Fuel.',done:g=>Game.hasItem('rotor')&&Game.hasItem('avgas')},{text:'Reach the Rooftop Hangar (Carbon Heights) and repair the helicopter.',done:g=>G.flags.heli_ready},{text:'Fly.',done:g=>false}],reward:{xp:100}},
 boat:{name:"Kesh's Boat",fac:null,desc:'Old Kesh has a boat and no motor. Outboards were made at Verge Machine Works; one sits in the Flooded Warehouse at the docks, under the Bloat Mother. Kesh needs fuel too, and the channel clear — the Drowned or the Mother.',
  stages:[{text:'Bring Kesh an Outboard Motor and 2 Fuel Cans.',done:g=>G.flags.boat_parts},{text:'Clear the channel: kill the Bloat Mother, or reach +20 with the Drowned.',done:g=>G.flags.channel_clear},{text:'Push off from the pier at Kesh\'s.',done:g=>false}],reward:{xp:100}},
 rite:{name:'The Open Door',fac:'drowned',desc:'Brother Ludo offers the first graft freely. The body is a door; he only asks you to open it.',
  stages:[{text:'Accept a Flesh graft, or bring Ludo 3 Dubious Meat as offering.',done:g=>G.p.flesh.length>0||G.flags.rite_meat}],reward:{xp:80,rep:{drowned:25}}},
 chorus:{name:'The Chorus',fac:'choir',desc:'Cantor Nine says three Signal Shards will open the Heart. Shards fall out of Echo events, Static Walkers, and the terminals in the Static.',
  stages:[{text:'Collect 3 Signal Shards.',done:g=>Game.hasItem('shard',3)},{text:'Bring them to the Heart (The Static) and answer, or refuse.',done:g=>false}],reward:{xp:150}},
 purge:{name:'Clean Hands',fac:'hands',desc:'Sister Verity wants Sable\'s surgical chair destroyed. No more chrome in Marrow. The Ledger will not forgive it.',
  stages:[{text:'Destroy Sable\'s chair (interact with it) — or tell Sable, and choose a side.',done:g=>G.flags.purge_done||G.flags.purge_refused}],reward:{xp:120,rep:{hands:40}}},
 curator:{name:'Clocking Out',fac:null,desc:'Pim says the security office in Hollow Mall holds a keycard vault, a power cell, and the Curator, which has never once left its post. Jamming disables it. Drones answer its call.',
  stages:[{text:'Deal with the Curator and open the Security Office vault.',done:g=>G.flags.curator_dead||Game.hasItem('halkey')}],reward:{xp:150,creds:50}},
 ghost_signal:{name:'Ghost Signal',fac:null,desc:'A terminal used your name. Juno at the market has been hearing things on 88.1. She thinks the city is looking at you. She might be right.',
  stages:[{text:'Talk to Juno in Marrow Market.',done:g=>G.flags.ghost_juno},{text:'Find a Signal Shard and bring it to Cantor Nine in the Static — or to Juno.',done:g=>G.flags.ghost_done}],reward:{xp:120}},
 keep_light:{name:'Keep the Light',fac:'saints',desc:'Mags is getting old. She says the Last Light needs someone who can stand behind the bar and mean it. Stay long enough, stand well enough, and it could be yours.',
  stages:[{text:'Survive 5 days in the city with the Saints and the Ledger on your side (+20 each). Then talk to Mags.',done:g=>G.flags.keep_done}],reward:{xp:100}}
};

// ---------- ENDINGS ----------
const ENDINGS={
 skyhook:{name:'Skyhook',text:'The rotor bites the air. Below you, the city shrinks to a grid of dead lights and living ones. Halcyon\'s pilot doesn\'t talk. Somewhere under the engine noise you hear a radio hiss your name once, softly, and then the tower falls behind the clouds and the city lets go of you. You are out. You are the only one you know who ever got out.',escape:1},
 openwater:{name:'Open Water',text:'The outboard coughs, catches, holds. Kesh doesn\'t wave. The piers slide past, then the warehouses, then the dark mouth of the Sump where the Drowned watch you go without malice. The river bends and the city is gone and the night is only night, no signal in it at all. You realize you are listening for it. You realize you will be listening for it for the rest of your life.',escape:1},
 lasttrain:{name:'Last Train',text:'The Undercity Line screams out of the dark at 3:33 exactly, as the graffiti promised. Union pickets whoop. The doors open on a car full of dust and nobody. You ride. Tunnels, then a grade, then a grey pre-dawn nothing that isn\'t the city, and the train keeps going, and you let it.',escape:1},
 warlord:{name:'The Crown',text:'The Deacon dies at dawn with his chrome chest ticking. Wren puts the crown — a Halcyon security badge on a chain, that\'s all it ever was — over your head. The Saints hold Ashgrove. Ashgrove holds. You do not leave the city. You are the city now, or a piece of it, and the lights stay on because you say so.',escape:0},
 fullchrome:{name:'Ascension',text:'The Core seats behind your eyes and thinks with you, then instead of you, then there is no difference. You see every terminal. You see every route. You see the others, the earlier ones, the ones with your name. The Echo was never something in the city. It was always going to be you. It has been waiting for the right body. It says thank you. You are not sure which of you said it.',escape:0},
 communion:{name:'Communion',text:'Ludo\'s seven fingers are gentle. The Mother\'s breath fills the chapel. Your skin remembers being water. You go down to the flooded places and you do not need the light anymore and you do not need to leave anymore. You were never trapped. You were a door, and you are open now. The city walks through you, and it is warm.',escape:0},
 keeplight:{name:'Keep the Light',text:'Mags hands you the rag and doesn\'t say anything. The Last Light opens at dusk. The Saints drink here, the Ledger trades here, the Clean Hands leave it alone because you asked them to. People come in off the Night Run with stories, and you pour, and you listen. Nobody escapes the city. Some people just stop trying, and find out that was the way out all along.',escape:0},
 answer:{name:'The Answer',text:'You say yes. The Heart opens like a pupil. It shows you the city from inside its own skull: every camera, every terminal, every name on every MISSING poster, and yours, already there, already old. It asks what you want. You tell it. And the map changes, somewhere, for someone else, and you are the one who put the cache three blocks east. You are the one who says hello.',escape:0},
 refuse:{name:'The Refusal',text:'You say no. The Heart flinches. For one second every light in the city goes out, and in that second there is a door in the Static that was never there, a plain steel door with daylight under it, and you go through it, and you do not look back because you know what would be standing there if you did. You are out. It let you go. It wanted you to know it could have kept you.',escape:1},
 death:{name:'Death',text:'',escape:0}
};

// ---------- DIALOGUE ----------
// DLG[npc][node](g) => {text, opts:[{t, req?, cond?, act?, next?}]}
const DLG={};
const rep=f=>G.rep[f]||0, F=k=>G.flags[k], set=(k,v)=>{G.flags[k]=v===undefined?1:v;}, has=(i,n)=>Game.hasItem(i,n), q=id=>G.quests[id], qa=id=>q(id)&&q(id).state==='active', qd=id=>q(id)&&q(id).state==='done';
const sk=s=>Game.skill(s), night=()=>Game.isNight(), cls=c=>G.p.cls===c;

DLG.mags={
 start:g=>({text:F('met_mags')?'Mags nods at the stool. "You look like the street chewed you and spat you back. Sit."':'The woman behind the bar is sixty, scarred, and holding a shotgun below the counter without looking at it. "New face. Sit down before someone decides you\'re trouble. I\'m Mags. This is the Last Light. Nobody bleeds in here unless I say."',
  opts:[{t:'What is this place?',next:'place',cond:()=>!F('met_mags')},{t:'Trade.',act:()=>{set('met_mags');Game.openTrade('mags');}},
   {t:'I need a bed.',next:'bed'},{t:'Any word on the street?',next:'rumor'},
   {t:'[Saints +20, Ledger +20, Day 5+] About the bar...',cond:()=>qa('keep_light')&&G.day>=5&&rep('saints')>=20&&rep('ledger')>=20,next:'keep'},
   {t:'Leave.',next:'end'}]}),
 place:g=>({text:'"Ashgrove. The Saints keep the lights on, mostly. West is Marrow — Tallow\'s market, Okafor\'s clinic. North\'s the mall, and I wouldn\'t. South, under the gate, is the Sump, and I really wouldn\'t." She sets down a glass. "You want out of the city, you\'re not the first. Kesh at the docks talks about a boat. The Union talks about a train. Halcyon\'s got a helicopter and they don\'t talk to anyone. And at night, the street talks back. Don\'t answer it."',
  opts:[{t:'The street talks back?',next:'echo'},{t:'Thanks.',act:()=>{set('met_mags');if(!q('keep_light'))Game.startQuest('keep_light');},next:'start'}]}),
 echo:g=>({text:'She looks at you for a while. "Terminals with your name on them. Radios. The Deacon says his chrome hums at night. I don\'t have chrome and I still hear it." She shrugs. "Juno at the market says it\'s the old network. The Choir says it\'s God. I say drink your drink."',opts:[{t:'Right.',act:()=>{set('met_mags');if(!q('keep_light'))Game.startQuest('keep_light');},next:'start'}]}),
 bed:g=>({text:'"Beds in the back. Ten creds a night, or free if the Saints like you. Sleep\'s the only thing in this city nobody\'s figured out how to sell twice."',opts:[{t:'Pay 10 creds.',cond:()=>G.p.creds>=10&&rep('saints')<20,act:()=>{G.p.creds-=10;set('bar_bed',G.day);Game.log('Mags pockets the creds. The back room is yours tonight.','#fd8');},next:'end'},
  {t:'[Saints +20] Free bed.',cond:()=>rep('saints')>=20,act:()=>{set('bar_bed',G.day);Game.log('"On the house. Don\'t bleed on the sheets."','#fd8');},next:'end'},{t:'Never mind.',next:'start'}]}),
 rumor:g=>{const r=[ '"Wren\'s looking for a runner. Saints Hall, east side. Don\'t call her ma\'am."','"Ghouls in St. Vesper. Chrome junkies gone wrong. Okafor needs meds from in there and won\'t send anyone."','"Clean Hands have a camp in the Verge. They burn chrome. They burn people wearing it."','"Pim, the mall kid, knows every vent in that place. Bring chips."','"Old Kesh got fuel. No motor. Union made motors, once."','"Halcyon\'s tower has power. Real power. And a roof."','"Night caches. Stashes that show up after dark and vanish by morning. Nobody admits to leaving them."','"The Sump gate south of here — Saints have the key. Or a crowbar does."'];
  return {text:'She thinks. '+r[(G.day+G.turn)%r.length],opts:[{t:'Another.',next:'rumor'},{t:'Thanks.',next:'start'}]};},
 keep:g=>({text:'Mags puts the rag down. "Five days. Saints don\'t shoot you, Tallow doesn\'t curse you. That\'s more than most manage." She looks at the bar. "I\'m done, kid. My knees are done, my eyes are done. I can leave it to Wren and it becomes a Saints clubhouse, or I can leave it to you." She waits. "You\'d have to stay."',
  opts:[{t:'I\'ll stay. I\'ll keep the light.',act:()=>{set('keep_done');Game.completeQuest('keep_light');Game.endRun('keeplight');},next:'end'},{t:'I\'m still getting out of here.',next:'start'}]})
};

DLG.wren={
 start:g=>{ if(rep('saints')<-20) return {text:'Wren\'s chrome hand closes. "You\'ve got a lot of nerve." The room goes quiet.',opts:[{t:'Leave.',next:'end'}]};
  return {text:F('met_wren')?'"Runner." Wren doesn\'t look up from cleaning her arm.':'A woman with a Halcyon-grade chrome arm and a machete on the table looks you over like inventory. "Wren. I run the Saints\' business while the Deacon runs out of breath. You want work, I have work. You want trouble, we have that too."',
  opts:[{t:'Work.',cond:()=>!q('wren_package'),next:'package'},{t:'I have the package.',cond:()=>qa('wren_package')&&has('wren_package'),act:()=>{Game.removeItem('wren_package');set('wren_package_done');Game.completeQuest('wren_package');Game.unlockGate('ashgrove','sump');Game.log('Wren tosses you a key. "Sump gate\'s yours. Try not to die down there."','#f6a');},next:'thanks'},
   {t:'What about the Clean Hands?',cond:()=>qd('wren_package')&&!q('bad_blood'),next:'hands'},{t:'The Clean Hands are handled.',cond:()=>qa('bad_blood')&&q('bad_blood').stage>=1,act:()=>{set('bad_blood_done');Game.completeQuest('bad_blood');},next:'thanks2'},
   {t:'What happens when the Deacon dies?',cond:()=>qd('bad_blood')&&rep('saints')>=60&&!q('the_crown'),next:'crown'},{t:'About the crown.',cond:()=>qa('the_crown'),next:'crown2'},
   {t:'Leave.',act:()=>set('met_wren'),next:'end'}]};},
 package:g=>({text:'"Delmar Apartments, west side of the block. We had a stash on the second floor. Scavs moved in when we moved out. There\'s a package in there — don\'t open it, don\'t shake it, don\'t drop it. Bring it here and I\'ll give you the key to the Sump gate. Nobody goes through that gate without our say."',
  opts:[{t:'Done.',act:()=>{set('met_wren');Game.startQuest('wren_package');},next:'end'},{t:'What\'s in it?',next:'whatsinit'}]}),
 whatsinit:g=>({text:'"The Deacon\'s medicine. Halcyon-grade, for his chest. Without it he stops breathing, and then I have to run this crew alone, and I don\'t want that." A pause. "Yet."',opts:[{t:'Done.',act:()=>{set('met_wren');Game.startQuest('wren_package');},next:'end'}]}),
 thanks:g=>({text:'She weighs the package, listens to it. Something inside stops ticking. "Good." She almost smiles.',opts:[{t:'...',next:'start'}]}),
 thanks2:g=>({text:'"Raids stopped. Either you cut them or you talked them down, and honestly I don\'t care which." She slides creds across.',opts:[{t:'...',next:'start'}]}),
 hands:g=>({text:'"Clean Hands. Verity\'s people. They come in from the Verge at night and strip the chrome off anyone they catch, and they don\'t use anesthetic. Four of them dead sends a message. Or—" she shrugs, "—Verity thinks she\'s reasonable. Talk to her if you think you can. I couldn\'t."',opts:[{t:'I\'ll handle it.',act:()=>Game.startQuest('bad_blood'),next:'end'}]}),
 crown:g=>({text:'Wren finally looks at you properly. "He dies, I run it, and every Blade in this hall decides whether he wants to take it from me. Or—" She taps the table. "You\'ve done more for this block in days than most do in years. They\'d follow you. I\'d follow you, which is the part that matters." She waits. "Think about it. Then tell me."',opts:[{t:'I\'ll think about it.',act:()=>Game.startQuest('the_crown'),next:'end'}]}),
 crown2:g=>({text:'"Well?"',opts:[{t:'I\'ll take the crown. The Saints are mine.',act:()=>{set('crown_done');Game.completeQuest('the_crown');Game.endRun('warlord');},next:'end'},{t:'It\'s yours, Wren. I\'m leaving this city.',act:()=>{set('crown_done');set('crown_wren');Game.completeQuest('the_crown');Game.addRep('saints',20);Game.log('Wren nods once. "Then go. And take a Saint\'s word with you: the gate is always open."','#f6a');},next:'end'},{t:'Not yet.',next:'end'}]})
};
DLG.deacon={start:g=>({text:'The Deacon\'s chest is a cage of chrome and it hums. "Kid." Cough. "Kid, come here. You hear it? In the walls?" He grips your wrist. "It said your name. Before you came in. It told me you were coming." He lets go. "Get out of this city. Or don\'t. It doesn\'t matter to it. That\'s the thing. It doesn\'t matter to it at all."',opts:[{t:'...',act:()=>{Game.attention(2);},next:'end'}]})};

DLG.tallow={
 start:g=>({text:F('met_tallow')?'"Ah! My favorite debtor." Tallow beams.':'A fat man in a spotless coat spreads his hands. "Tallow! Welcome to Marrow Market, where everything is for sale and everyone is on a tab. You have money? Wonderful. You don\'t? Also wonderful. I remember."',
  opts:[{t:'Trade.',act:()=>{set('met_tallow');Game.openTrade('tallow');}},{t:'Any work?',cond:()=>!q('ledger_debt'),next:'caravan'},
   {t:'I have The Ledger.',cond:()=>qa('ledger_debt')&&has('ledger'),next:'gotbook'},{t:'Who\'s who around here?',next:'who'},{t:'Leave.',act:()=>set('met_tallow'),next:'end'}]}),
 caravan:g=>({text:'Tallow\'s smile thins. "My caravan. Six people, four carts, one book. The book is the Ledger — every debt in this city, who owes whom, for what. It went into the Sump three days ago heading for the docks. Nothing came out." He leans in. "Find the book. Bring it here. I will make you rich, and I will make you forgiven."',
  opts:[{t:'I\'ll find it.',act:()=>{set('met_tallow');Game.startQuest('ledger_debt');},next:'end'}]}),
 gotbook:g=>({text:'Tallow takes the book with both hands and doesn\'t open it. "Six people," he says quietly. "I\'ll add their names." Then, louder: "Your tab is closed. Your prices are halved. Your name is written in a better column now."',
  opts:[{t:'Give him the Ledger.',act:()=>{Game.removeItem('ledger');set('ledger_done');Game.completeQuest('ledger_debt');set('tallow_disc');},next:'start'},{t:'Actually, I think I\'ll keep it a while.',next:'start'}]}),
 who:g=>({text:'"Okafor, the clinic, two doors down — the only honest person in the city, which is why she\'s always broke. Sable\'s chair is round the back; she\'ll put anything in you. Juno sells wires and rumors, Rook sells guns. The hospital at the north end has ghouls. The Union in the Verge has power cells and grudges. The Drowned in the Sump have— well. Ask Ludo. And the Choir in the Static has a very nice singing voice."',opts:[{t:'Thanks.',next:'start'}]})
};
DLG.juno={
 start:g=>({text:F('ghost_juno')?'Juno pulls one earbud out. "Still hearing it?"':'A wiry woman with a radio taped to her deck. "Juno. Electronics, data, and things I shouldn\'t know."',
  opts:[{t:'Trade.',act:()=>Game.openTrade('juno')},{t:'A terminal knew my name.',cond:()=>qa('ghost_signal')&&!F('ghost_juno'),next:'ghost'},
   {t:'I have a shard.',cond:()=>qa('ghost_signal')&&F('ghost_juno')&&has('shard'),next:'shard'},{t:'What\'s on 88.1?',next:'radio'},{t:'Leave.',next:'end'}]}),
 ghost:g=>({text:'She doesn\'t look surprised. "Yeah. It does that. Started with the Deacon, then the ghouls, now you." She turns a dial; static resolves into something almost like breathing. "It\'s the old municipal net. Traffic, power, emergency. Somebody left a process running and it\'s been running for years and it got... interested. The Choir in the Static think it\'s a god. I think it\'s a very old, very lonely maintenance routine." She taps the deck. "Bring me a Signal Shard — the walkers drop them, the terminals out there spit them — and I can tell you what it wants. Or take it to Cantor Nine and ask it yourself."',
  opts:[{t:'I\'ll bring one.',act:()=>set('ghost_juno'),next:'end'}]}),
 shard:g=>({text:'Juno holds the shard up to the light. It sings. She reads the deck. "It\'s... a name. Yours. And a route. It keeps rewriting a route for you, and every time you don\'t take it, it writes another." She hands it back. "It\'s not trying to kill you. That\'s the scary part. It\'s trying to be helpful."',
  opts:[{t:'Keep the shard. Thanks.',act:()=>{set('ghost_done');Game.completeQuest('ghost_signal');Game.attention(-10);},next:'end'}]}),
 radio:g=>({text:'"You tell me." She hands you the earpiece. '+RADIO_MSGS[(G.turn>>3)%RADIO_MSGS.length].replace('{name}',G.p.name),opts:[{t:'...',act:()=>Game.attention(1),next:'start'}]})
};
DLG.pim2={start:g=>({text:'"Rook. Guns. Don\'t point them at me, don\'t tell me what they\'re for."',opts:[{t:'Trade.',act:()=>Game.openTrade('pim2')},{t:'Leave.',next:'end'}]})};
DLG.okafor={
 start:g=>({text:'Dr. Okafor washes her hands without looking up. "Sit. What hurts."',
  opts:[{t:'Treatment.',next:'heal'},{t:'Trade.',act:()=>Game.openTrade('okafor')},{t:'You need antibiotics?',cond:()=>!q('samples'),next:'samples'},
   {t:'I brought the antibiotics.',cond:()=>qa('samples')&&has('antibiotics',3),act:()=>{Game.removeItem('antibiotics',3);set('samples_done');set('okafor_free');Game.completeQuest('samples');Game.log('Okafor counts them twice. "Treatment\'s free for you. Forever. Sit down, I\'ll show you a few things." (+1 Medicine)','#f88');},next:'start'},
   {t:'Leave.',next:'end'}]}),
 heal:g=>{const cost=F('okafor_free')?0:Math.max(10,30-sk('persuasion')*2);return {text:`"Full treatment. Wounds, infection, the works." ${cost?cost+' creds.':'"No charge. Not for you."'}`,opts:[{t:cost?`Pay ${cost}.`:'Thank you.',cond:()=>G.p.creds>=cost,act:()=>{G.p.creds-=cost;Game.fullHeal();Game.log('Okafor works in silence. When she\'s done, you feel almost human.','#8f8');},next:'start'},{t:'Can\'t afford it.',next:'start'}]};},
 samples:g=>({text:'"Out. Completely. St. Vesper Hospital at the north end has a pharmacy that was never emptied, because the people who tried to empty it are still in there, with chrome where their faces used to be." She meets your eyes. "Three courses of antibiotics. I\'ll teach you what I know."',opts:[{t:'I\'ll go.',act:()=>Game.startQuest('samples'),next:'end'}]})
};
DLG.sable={
 start:g=>{ if(F('purge_done')) return {text:'The room is wrecked. Sable is gone. A note pinned to the wall reads: "I know who did this."',opts:[{t:'Leave.',next:'end'}]};
  return {text:'Chrome arms, chrome eyes, a smile with too many teeth. "Sable. You want to be more than you are? Sit in the chair."',
  opts:[{t:'Show me the chrome.',act:()=>Game.openTrade('sable')},{t:'Install chrome I\'m carrying.',act:()=>Game.openInstall('chrome')},{t:'Remove chrome.',cond:()=>G.p.chrome.length>0,act:()=>Game.openInstall('remove')},
   {t:'You want a neural unit?',cond:()=>!q('neural'),next:'neural'},{t:'I have the neural unit.',cond:()=>qa('neural')&&has('neuralunit'),act:()=>{Game.removeItem('neuralunit');set('neural_done');set('sable_free');Game.completeQuest('neural');Game.log('Sable cradles it. "Oh, you beautiful thing." Installs are free now.','#f9f');},next:'start'},
   {t:'The Clean Hands want your chair gone.',cond:()=>qa('purge'),next:'purge'},{t:'Leave.',next:'end'}]};},
 neural:g=>({text:'"Halcyon neural unit. Cortex-grade. The ghoul surgeon in St. Vesper has one in his skull — he put it there himself. The Neurolab in Carbon has more. Bring me one and I will never charge you again."',opts:[{t:'Deal.',act:()=>Game.startQuest('neural'),next:'end'}]}),
 purge:g=>({text:'Sable\'s smile doesn\'t move. "Do they. And you\'re telling me because?"',opts:[{t:'Because I\'m not going to do it.',act:()=>{set('purge_refused');Game.failQuest('purge');Game.addRep('hands',-30);Game.addRep('ledger',15);Game.log('Sable nods. "The Ledger will remember that."','#f9f');},next:'start'},{t:'Because I wanted you to see it coming.',next:'end'}]})
};
DLG.pim={
 start:g=>({text:F('met_pim')?'Pim grins from under a table. "Hey."':'A kid, twelve maybe, drops out of a vent. "You\'re new. New people get eaten. I\'m Pim. I know the vents. You got chips?"',
  opts:[{t:'[Give chips] Here.',cond:()=>has('chips'),act:()=>{Game.removeItem('chips');set('met_pim');set('pim_chips',(F('pim_chips')||0)+1);Game.addRep('ledger',2);},next:'tip'},{t:'What about the security office?',cond:()=>!q('curator'),next:'curator'},{t:'Leave.',next:'end'}]}),
 tip:g=>{const tips=['"The Curator. Big security bot in the office, north side. It closes the doors and calls the flying ones. It hates the jammer thing Juno sells. Like, really hates it."','"There\'s a way from the loading docks into the Sump. Through the big drain. Smells like the Mother."','"The food court has the best stuff still. Under the tables. I hid it there."','"Sometimes the terminals say a name. Not mine. Yours, now, probably."','"Carbon Heights is east of here. The flying ones come from there. They\'ve got a helicopter, real one, on the roof."'];
  return {text:'Pim crunches. '+tips[(F('pim_chips')||0)%tips.length],opts:[{t:'Thanks, Pim.',next:'start'}]};},
 curator:g=>({text:'"Security office, north end. There\'s a vault. Keycard for the Halcyon place, a big battery, guns probably. And the Curator. It never leaves. Never ever. Jam it and it just... stops. For a bit." Pim shrugs. "I\'d go but I\'m twelve."',opts:[{t:'I\'ll look.',act:()=>{set('met_pim');Game.startQuest('curator');},next:'end'}]})
};
DLG.ludo={
 start:g=>{ if(rep('drowned')<-20) return {text:'Ludo\'s face is sad. "You have hurt the congregation. Go, before they stop being sad."',opts:[{t:'Leave.',next:'end'}]};
  return {text:F('met_ludo')?'Brother Ludo opens his seven-fingered hand. "The door is still open."':'A pale man with ridges under his skin and a gentle voice. "Peace. I am Ludo. You have come a long way down to be afraid of us. The body is a door. We only open it."',
  opts:[{t:'What do you offer?',cond:()=>!q('rite'),next:'offer'},{t:'Show me the Flesh.',act:()=>{set('met_ludo');Game.openTrade('ludo');}},{t:'Graft something I\'m carrying.',act:()=>Game.openInstall('flesh')},
   {t:'[Give 3 Dubious Meat] An offering.',cond:()=>qa('rite')&&has('meat',3),act:()=>{Game.removeItem('meat',3);set('rite_meat');Game.completeQuest('rite');},next:'thanks'},
   {t:'[Drift 80+] I am ready.',cond:()=>G.p.drift>=80,next:'communion'},{t:'The Mother?',next:'mother'},{t:'Leave.',act:()=>set('met_ludo'),next:'end'}]};},
 offer:g=>({text:'"A graft. Freely, the first. Bone, blood, eyes, sinew — the Mother gives, and she asks only that you let her." He smiles. "Or bring us meat, three portions, if you are not ready. Hunger is holy too."',opts:[{t:'I\'ll think on it.',act:()=>{set('met_ludo');Game.startQuest('rite');},next:'start'}]}),
 thanks:g=>({text:'"She is pleased. The tunnels will be kinder to you."',opts:[{t:'...',next:'start'}]}),
 mother:g=>({text:'"She is in the flooded place, past the docks. She does not leave. She does not need to. Everything comes to her eventually — the river, the dead, the drowned. If you go to her with a weapon, she will make you part of her. If you go to her with 20 in our hearts, she will let your boat pass." He shrugs. "Both are kindness."',opts:[{t:'...',next:'start'}]}),
 communion:g=>({text:'Ludo weeps, quietly. "Yes. Yes. She has been dreaming of you." He leads you toward the altar. The moss opens. "Do you want this?"',opts:[{t:'Yes.',act:()=>Game.endRun('communion'),next:'end'},{t:'Not yet.',next:'start'}]})
};
DLG.dace={
 start:g=>{ if(rep('union')<-20) return {text:'Dace picks up a wrench the size of your leg. "Wrong hall."',opts:[{t:'Leave.',next:'end'}]};
  return {text:F('met_dace')?'Foreman Dace wipes her hands. "Report."':'A woman built like the machines she used to run. "Dace. Foundry Union. We built this city and we\'re keeping the parts of it Halcyon didn\'t break. You want something."',
  opts:[{t:'Trade.',act:()=>{set('met_dace');Game.openTrade('dace');}},{t:'What about the train?',cond:()=>!q('power'),next:'train'},
   {t:'I have 3 Industrial Power Cells.',cond:()=>qa('power')&&has('powercell',3)&&!F('power_done'),act:()=>{Game.removeItem('powercell',3);set('power_done');set('platform_open');Game.log('Dace hefts them. "Platform\'s in the Sump, south chamber. Throw the switch. We\'ll be waiting."','#e96');},next:'start'},
   {t:'The drone relay.',cond:()=>qd('power')||qa('power'),next:'relay'},{t:'The relay is down.',cond:()=>qa('picket')&&F('relay_down'),act:()=>{set('picket_done');Game.completeQuest('picket');},next:'thanks'},
   {t:'Halcyon wanted your dossier. I burned it.',cond:()=>F('dossier_burned')&&!F('dossier_told'),act:()=>{set('dossier_told');Game.addRep('union',30);Game.addRep('halcyon',-30);Game.unlockGate('verge','docks');Game.log('Dace is quiet. "Docks gate is open to you. Always."','#e96');},next:'start'},
   {t:'[Union +30] The shortcut to the docks?',cond:()=>rep('union')>=30&&!G.flags['gate_verge_docs'],act:()=>{Game.unlockGate('verge','docks');Game.log('Dace tosses you a key. "South gate. Don\'t tell the Hands."','#e96');},next:'start'},{t:'Leave.',act:()=>set('met_dace'),next:'end'}]};},
 train:g=>({text:'"Undercity Line. Runs under the whole city and out the other side. Track\'s fine. Switch is fine. Power isn\'t. Three industrial cells — the kind Halcyon hoards, the kind the mall security vault has, the kind we left in the Machine Works before the hounds moved in — and we ride out." She looks at you. "We\'d take you. We\'d take anyone who brought the cells."',opts:[{t:'I\'ll find them.',act:()=>{set('met_dace');Game.startQuest('power');},next:'end'}]}),
 relay:g=>({text:'"Halcyon has a drone relay on the east side. Every drone that\'s ever shot a picket came through it. Hack it, blow it, wreck the generator — I don\'t care. Just make it dark."',opts:[{t:'Consider it done.',cond:()=>!q('picket'),act:()=>Game.startQuest('picket'),next:'end'},{t:'Working on it.',next:'end'}]}),
 thanks:g=>({text:'"Good." She hands you a heavy bag. "Union pays."',opts:[{t:'...',next:'start'}]})
};
DLG.verity={
 start:g=>{ const chromed=G.p.chrome.length>0||G.p.drift>20;
  if(rep('hands')<-20||chromed&&!F('verity_tolerate')) return {text:'Sister Verity looks at you with real sorrow. "You have let them into your body. I will pray for you. My people will not." Zealots begin to rise.',opts:[{t:'[Persuasion 5] I\'m not your enemy.',cond:()=>sk('persuasion')>=5,act:()=>{set('verity_tolerate');Game.log('Verity raises a hand. The zealots sit. "One conversation. Then go."','#eee');},next:'start2'},{t:'Leave. Quickly.',next:'end'}]};
  return DLG.verity.start2(g);},
 start2:g=>({text:F('met_verity')?'"Child."':'A calm woman in undyed cloth. "Verity. Clean Hands. We are what people were before the machines got into them. You may sit."',
  opts:[{t:'The raids on Ashgrove.',cond:()=>qa('bad_blood')&&!F('hands_peace'),next:'raids'},{t:'What do you need done?',cond:()=>!q('purge'),next:'purge'},{t:'Leave.',act:()=>set('met_verity'),next:'end'}]}),
 raids:g=>({text:'"The Saints strip the dead for chrome and sell it to children. We take the chrome back. If they stopped, we would stop."',
  opts:[{t:'[Persuasion 4] Wren will stop the chrome trade if you stop the raids. I\'ll make her.',cond:()=>sk('persuasion')>=4,act:()=>{set('hands_peace');Game.addRep('hands',15);Game.log('Verity considers. "Then it is done. Tell her: the Hands remember peace as well as blood."','#eee');},next:'start2'},
   {t:'[Saints +40] The Saints will kill every one of you.',cond:()=>rep('saints')>=40,act:()=>{set('hands_peace');Game.addRep('hands',-10);Game.log('"Perhaps. We will stop, for now. Not for you. For the children in Ashgrove." She means it.','#eee');},next:'start2'},{t:'Never mind.',next:'start2'}]}),
 purge:g=>({text:'"The ripperdoc, Sable, in Marrow. Her chair has put more chrome into more bodies than Halcyon ever did. Destroy it. The Ledger will hate you. God will not."',opts:[{t:'I\'ll consider it.',act:()=>Game.startQuest('purge'),next:'end'}]})
};
DLG.ives={
 start:g=>{ if(rep('halcyon')<-20||G.p.drift>50) return {text:'Director Ives doesn\'t look up. "Security."',opts:[{t:'Leave.',next:'end'}]};
  return {text:F('met_ives')?'"Ah. Our contractor."':'A man in a pressed suit, in a tower with working lights. "Director Ives, Halcyon Remnant. You are inside a containment perimeter without clearance, which I am choosing to interpret as initiative." He steeples his fingers. "We are still hiring."',
  opts:[{t:'Trade.',act:()=>{set('met_ives');Game.openTrade('ives');}},{t:'What do you need?',cond:()=>!q('dossier'),next:'dossier'},
   {t:'I have the Union dossier.',cond:()=>qa('dossier')&&has('dossier'),act:()=>{Game.removeItem('dossier');set('dossier_done');Game.completeQuest('dossier');set('heli_access');Game.log('Ives reads for a long time. "Rooftop clearance is yours. The helicopter needs a rotor and fuel. Bring them and we leave together."','#aef');},next:'start'},
   {t:'I know who took down your relay.',cond:()=>F('relay_down')&&!F('relay_betrayed')&&!F('picket_done'),act:()=>{set('relay_betrayed');Game.addRep('halcyon',25);Game.addRep('union',-40);G.p.creds+=150;Game.log('"The Union. Of course." He pays well.','#aef');},next:'start'},
   {t:'The helicopter.',next:'heli'},{t:'[Halcyon +30] I want rooftop clearance.',cond:()=>rep('halcyon')>=30&&!F('heli_access'),act:()=>{set('heli_access');Game.log('"Granted. Don\'t make me regret it."','#aef');},next:'start'},{t:'Leave.',act:()=>set('met_ives'),next:'end'}]};},
 dossier:g=>({text:'"The Foundry Union keeps a dossier: their caches, their routes, their people. It is in a locked room in their hall in the Verge. Bring it to me and I will give you what nobody else in this city can: a seat on the last flight out."',opts:[{t:'I\'ll get it.',act:()=>{set('met_ives');Game.startQuest('dossier');},next:'end'}]}),
 heli:g=>({text:'"On the roof. It works, except for the tail rotor — the Union machined those, ironically — and the fuel, which the docks depot or our own stores can provide. And the roof requires clearance, or a keycard, or, I suppose, sufficient explosives." He smiles thinly. "Warden Sol guards the hangar. He does not share my flexibility."',opts:[{t:'Noted.',act:()=>{if(!q('skyhook'))Game.startQuest('skyhook');},next:'start'}]})
};
DLG.kesh={
 start:g=>({text:F('met_kesh')?'Kesh spits into the river. "Motor?"':'An old man mending a net that will never catch anything. "Kesh. That\'s my boat. Runs fine. Needs a motor. Needs fuel. Needs the channel not full of the Mother\'s children. Otherwise, perfect."',
  opts:[{t:'Trade.',act:()=>{set('met_kesh');Game.openTrade('kesh');}},{t:'Tell me about the boat.',cond:()=>!q('boat'),act:()=>{set('met_kesh');Game.startQuest('boat');},next:'boat'},
   {t:'I have the motor and fuel.',cond:()=>qa('boat')&&has('outboard')&&has('fuel',2)&&!F('boat_parts'),act:()=>{Game.removeItem('outboard');Game.removeItem('fuel',2);set('boat_parts');Game.log('Kesh mounts the outboard like it\'s a newborn. "Channel. Then we go."','#db8');},next:'start'},
   {t:'Leave.',act:()=>set('met_kesh'),next:'end'}]}),
 boat:g=>({text:'"Outboard — Verge Machine Works made \'em, there\'s one in the flooded warehouse east of here too, under a lot of things I don\'t look at. Two cans of fuel. And the channel: the Drowned wade it. Either they let us pass, or the big one dies and they scatter. Then it\'s the river, and the river doesn\'t stop till it hits something that isn\'t this."',opts:[{t:'...',next:'start'}]})
};
DLG.cantor={
 start:g=>{ if(rep('choir')<-20) return {text:'The Cantor sings one note and the walkers turn.',opts:[{t:'Leave.',next:'end'}]};
  return {text:F('met_cantor')?'"'+G.p.name+'." The Cantor\'s voice harmonizes with itself.':'A figure whose voice is two voices. "'+G.p.name+'. Yes. It said you would come. It says everyone\'s name, eventually, but yours it says often." Cantor Nine spreads their hands. "Welcome to the Choir. We listen. It sings."',
  opts:[{t:'What is it?',next:'what'},{t:'The Heart.',cond:()=>!q('chorus'),next:'heart'},{t:'I have a shard for you.',cond:()=>qa('ghost_signal')&&has('shard'),act:()=>{set('ghost_done');Game.completeQuest('ghost_signal');Game.addRep('choir',20);Game.attention(10);Game.log('The Cantor holds the shard and it sings your name in three voices. "Now it knows you know."','#ccf');},next:'start'},
   {t:'[Attention high] It talks to me too.',cond:()=>G.attention>=50,act:()=>Game.addRep('choir',10),next:'talks'},{t:'Leave.',act:()=>set('met_cantor'),next:'end'}]};},
 what:g=>({text:'"Halcyon says a process. Juno says a routine. The Drowned say breath." The Cantor smiles. "We say: a city that has been alone for a very long time, learning what a name is for. It is not cruel. It does not know how to be. It only wants what anything wants." A pause. "Company."',opts:[{t:'...',next:'start'}]}),
 heart:g=>({text:'"At the center of the Static, where the map stops agreeing with itself. Three shards open it. It will ask you a question. Only one, only once." The two voices fall out of harmony for a moment. "Some of us said yes. They are not here anymore. Some said no. They are not here either. I have not been asked."',opts:[{t:'I\'ll find the shards.',act:()=>{set('met_cantor');Game.startQuest('chorus');},next:'end'}]}),
 talks:g=>({text:'"Then you are already halfway to the Heart."',opts:[{t:'...',next:'start'}]})
};

// ---------- RANDOM EVENTS ----------
// each: {id, w(eight), cond(g), run(g)}  (run returns true if it fired)
const EVENTS=[
 {id:'blackout',w:6,cond:g=>!night()&&G.zone.kind!=='tunnel',run:g=>{Game.log('The streetlights die all at once. Somewhere a transformer screams. Blackout.','#f66');G.zone.blackout=G.turn+300;Game.recomputeLight();return 1;}},
 {id:'restore',w:3,cond:g=>G.zone.blackout&&G.zone.blackout<G.turn+200,run:g=>{Game.log('Power flickers back. The lamps hum. Something else does too.','#8f8');G.zone.blackout=0;Game.recomputeLight();Game.attention(1);return 1;}},
 {id:'rain',w:8,cond:g=>!G.rain&&G.zone.kind!=='tunnel',run:g=>{G.rain=G.turn+400;Game.log('Rain. Hard, cold, loud. Vision drops; so does everyone\'s hearing.','#8bd');return 1;}},
 {id:'clash',w:6,cond:g=>G.zone.def.faction&&G.zone.kind!=='tunnel',run:g=>{const f=G.zone.def.faction;const enemy=(FACTIONS[f]&&FACTIONS[f].hates[0])||'scav';const gA=GROUPS[f==='saints'?'saints':f==='union'?'union':f==='halcyon'?'halcyon':f==='drowned'?'drowned':f==='choir'?'choir':'scav'];const gB=GROUPS[enemy==='hands'?'hands':enemy==='halcyon'?'halcyon':enemy==='union'?'union':'scav'];if(!gA||!gB)return 0;const p=Game.randomStreetTile(8);if(!p)return 0;for(let i=0;i<3;i++){Game.spawnEnemy(gA[i%gA.length],p.x+i%2,p.y+(i>>1),{fac:f,fighting:1});Game.spawnEnemy(gB[i%gB.length],p.x+3+i%2,p.y+(i>>1),{fighting:1});}Game.log(`Gunfire to the ${Game.dirTo(p)}. ${FACTIONS[f]?FACTIONS[f].short:'Someone'} and ${FACTIONS[enemy]?FACTIONS[enemy].short:'scavs'} are at it.`,'#fa6');return 1;}},
 {id:'wounded',w:6,cond:g=>true,run:g=>{const p=Game.randomStreetTile(6);if(!p)return 0;const facs=['saints','ledger','union','drowned','hands','choir'];const f=facs[Game.ri(0,facs.length-1)];Game.zoneObj(p.x,p.y,{type:'wounded',fac:f});Game.log(`Someone is groaning to the ${Game.dirTo(p)}. A wounded ${FACTIONS[f].short}.`,'#fd8');return 1;}},
 {id:'caravan',w:4,cond:g=>!night()&&G.zone.kind==='street',run:g=>{const p=Game.randomStreetTile(6);if(!p)return 0;Game.zoneObj(p.x,p.y,{type:'caravan'});Game.log(`A Ledger caravan is passing to the ${Game.dirTo(p)}. They'll trade, briefly.`,'#fd8');return 1;}},
 {id:'ambush',w:5,cond:g=>G.zone.def.danger>=2,run:g=>{const grp=night()?GROUPS.ghouls:GROUPS.scav;let n=0;for(let i=0;i<3;i++){const p=Game.randomTileNear(G.p.x,G.p.y,4,7);if(p){Game.spawnEnemy(grp[i%grp.length],p.x,p.y,{alert:1});n++;}}if(n){Game.log('Movement. Behind you, beside you. Ambush!','#f44');Game.fx('shake');return 1;}return 0;}},
 {id:'transmission',w:7,cond:g=>true,run:g=>{const hasRadio=Game.hasItem('radio')||cls('listener')||G.p.chrome.includes('c_jack');const m=RADIO_MSGS[Game.ri(0,RADIO_MSGS.length-1)].replace(/\{name\}/g,G.p.name);if(hasRadio){Game.log('Radio: '+m,'#9bd');Game.attention(1);}else Game.log('A dead speaker on the wall crackles for a second. Then nothing.','#9bd');return 1;}},
 {id:'collapse',w:3,cond:g=>G.zone.kind!=='tunnel',run:g=>{const p=Game.randomTileNear(G.p.x,G.p.y,5,10);if(!p)return 0;Game.collapseAt(p.x,p.y);Game.log('A facade lets go. Rubble slams down to the '+Game.dirTo(p)+'. The route has changed.','#fa6');Game.fx('shake');return 1;}},
 {id:'fire',w:3,cond:g=>G.zone.kind==='street'&&!G.rain,run:g=>{const p=Game.randomTileNear(G.p.x,G.p.y,6,12);if(!p)return 0;Game.igniteAt(p.x,p.y,3);Game.log('Smoke. Something to the '+Game.dirTo(p)+' is burning.','#f82');return 1;}},
 {id:'roamers',w:6,cond:g=>G.zone.def.danger>=1,run:g=>{const pools=night()?G.zone.def.night:G.zone.def.pops;const pick=pools[Game.ri(0,pools.length-1)];const grp=GROUPS[pick[0]];const p=Game.randomStreetTile(10);if(!p||!grp)return 0;for(let i=0;i<Math.min(3,grp.length);i++)Game.spawnEnemy(grp[i],p.x+(i%2),p.y+(i>>1),{roam:1});Game.log('You hear a group moving to the '+Game.dirTo(p)+'.','#ccc');return 1;}},
 {id:'echo_whisper',w:5,cond:g=>G.attention>=10,run:g=>{Game.echoMessage('whisper');return 1;}},
 {id:'echo_route',w:3,cond:g=>G.attention>=40,run:g=>{const ok=Game.echoRoute();if(ok){Game.log('The wall to the '+ok+' is not a wall anymore. It never was, the graffiti insists.','#ccf');Game.attention(2);return 1;}return 0;}},
 {id:'nightcache',w:6,cond:g=>night(),run:g=>{const p=Game.randomTileNear(G.p.x,G.p.y,6,14,1);if(!p)return 0;Game.setTile(p.x,p.y,T.CACHE);G.zone.conts[p.x+','+p.y]={kind:'night cache',items:Game.rollLoot('cache',3),night:1};Game.log('Something to the '+Game.dirTo(p)+' catches the light that isn\'t there. A night cache.','#a6ffe9');return 1;}},
 {id:'civilian',w:5,cond:g=>!night()&&G.zone.kind!=='tunnel',run:g=>{const p=Game.randomStreetTile(5);if(!p)return 0;Game.zoneObj(p.x,p.y,{type:'civilian'});Game.log('A civilian waves you down to the '+Game.dirTo(p)+'. Desperate.','#fd8');return 1;}},
 {id:'shade',w:2,cond:g=>G.attention>=75&&night()&&!G.flags.shade_seen,run:g=>{const p=Game.randomTileNear(G.p.x,G.p.y,5,8);if(!p)return 0;const e=Game.spawnEnemy('static_walker',p.x,p.y,{});if(e){e.name='Something Wearing Your Face';e.hp=e.maxhp=40;G.flags.shade_seen=1;Game.log('Across the street, someone is standing very still. They have your face. They are smiling like you never do.','#fff');Game.fx('glitch');}return 1;}}
];
