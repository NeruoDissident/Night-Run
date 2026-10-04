'use strict';
// ============================================================
// AUDIO — everything synthesized with WebAudio. No files.
// Zone ambience layers (from ZONES[id].ambient), a slow generative
// pad that darkens at night and sours as the Echo pays attention,
// and short combat / interface sounds.
// ============================================================
const Sound=(function(){
 const A={};let ac=null,master,sfxG,ambG,musG,noiseBuf=null;let started=false;
 A.vol={master:0.7,sfx:0.65,amb:0.3,music:0};A.muted=false;
 let active=false;
 const voices=new Set();
 function track(source,nodes){voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();for(const n of nodes)n.disconnect();};}
 A.setActive=function(value){active=!!value;A.applyVol();};
 const layers={};let curZone=null,musicTimer=null,ambTimer=null,chordI=0;

 A.start=function(){if(started)return;try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}started=true;
  master=ac.createGain();const limiter=ac.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=8;master.connect(limiter);limiter.connect(ac.destination);sfxG=ac.createGain();ambG=ac.createGain();musG=ac.createGain();
  sfxG.connect(master);ambG.connect(master);musG.connect(master);A.applyVol();
  noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  startMusic();ambTimer=setInterval(ambTick,400);};
 A.resume=function(){if(ac&&active&&!document.hidden&&!A.muted&&ac.state==='suspended')ac.resume().catch(()=>{});};
 A.applyVol=function(){if(!ac)return;const audible=active&&!document.hidden&&!A.muted;
  for(const [node,value] of [[master,audible?A.vol.master:0],[sfxG,A.vol.sfx],[ambG,A.vol.amb],[musG,A.vol.music]]){node.gain.cancelScheduledValues(ac.currentTime);node.gain.setTargetAtTime(value,ac.currentTime,0.04);}
  if(audible)A.resume();else{for(const source of voices){try{source.stop();}catch(e){}}if(ac.state==='running')ac.suspend().catch(()=>{});}};

 function noise(){const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.loopStart=Math.random();return s;}
 function env(g,t,a,peak,dec,sus){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(Math.max(0.0001,sus||0.0001),t+a+dec);}

 // ---------- one-shot SFX ----------
 function burstNoise(dur,freq,q,gain,type,dest){if(!active||document.hidden||A.muted)return;const t=ac.currentTime;const n=noise();const f=ac.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q||1;const g=ac.createGain();g.gain.value=0;env(g,t,0.003,gain,dur);n.connect(f);f.connect(g);g.connect(dest||sfxG);track(n,[f,g]);n.start(t);n.stop(t+dur+0.05);}
 function tone(freq,dur,type,gain,slide,dest,delay){if(!active||document.hidden||A.muted)return;const t=ac.currentTime+(delay||0);const o=ac.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);const g=ac.createGain();g.gain.value=0;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(gain,t+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(dest||sfxG);track(o,[g]);o.start(t);o.stop(t+dur+0.05);}
 A.play=function(k,opt){if(!ac||!active||document.hidden||A.muted)return;opt=opt||{};
  switch(k){
   case 'step':burstNoise(0.05,opt.wet?900:420+Math.random()*120,1.2,opt.wet?0.12:0.07,'bandpass');break;
   case 'hit':burstNoise(0.12,900,0.8,0.35,'lowpass');tone(120,0.12,'triangle',0.35,50);break;
   case 'crit':burstNoise(0.2,1400,0.6,0.45,'lowpass');tone(90,0.25,'sawtooth',0.25,40);break;
   case 'phit':tone(70,0.25,'sine',0.5,40);burstNoise(0.15,500,1,0.3,'lowpass');break;
   case 'miss':burstNoise(0.14,2500,2,0.12,'highpass');break;
   case 'shot':burstNoise(0.25,1800,0.5,0.55,'lowpass');tone(90,0.18,'square',0.2,40);break;
   case 'laser':tone(1800,0.2,'sawtooth',0.12,300);break;
   case 'boom':burstNoise(0.9,300,0.5,0.8,'lowpass');tone(50,0.8,'sine',0.6,25);break;
   case 'door':tone(180,0.12,'square',0.05,120);burstNoise(0.1,300,2,0.1);break;
   case 'pickup':tone(660,0.07,'square',0.06);tone(990,0.09,'square',0.05,null,null,0.06);break;
   case 'click':tone(1200,0.03,'square',0.04);break;
   case 'reload':burstNoise(0.03,3000,4,0.2,'bandpass');setTimeout(()=>burstNoise(0.04,2200,4,0.2),120);break;
   case 'level':[523,659,784,1046].forEach((f,i)=>tone(f,0.3,'triangle',0.12,null,null,i*0.09));break;
   case 'quest':[440,554,659].forEach((f,i)=>tone(f,0.4,'sine',0.1,null,null,i*0.12));break;
   case 'death':tone(220,1.8,'sawtooth',0.18,40);burstNoise(1.5,200,0.5,0.3,'lowpass');break;
   case 'kill':tone(160,0.3,'triangle',0.18,60);break;
   case 'echo':burstNoise(0.25,1200,0.5,0.07,'bandpass');break;
   case 'radio':burstNoise(0.25,1600,0.4,0.06,'bandpass');break;
   case 'alert':tone(740,0.08,'square',0.07);tone(740,0.08,'square',0.07,null,null,0.12);break;
   case 'heal':tone(520,0.25,'sine',0.08,780);break;
   case 'zone':tone(110,1.5,'sine',0.15,55);burstNoise(1.2,400,0.5,0.1,'lowpass');break;
   case 'ui':tone(900,0.04,'triangle',0.05);break;
   case 'deny':tone(200,0.12,'square',0.06,150);break;
   case 'glass':burstNoise(0.1,5000,3,0.12,'highpass');break;
  }};

 // ---------- ambience ----------
 function layer(name,build){if(layers[name])return layers[name];const g=ac.createGain();g.gain.value=0;g.connect(ambG);const nodes=build(g);layers[name]={g,nodes,on:false};return layers[name];}
 function setLayer(name,on,vol){const L=layers[name];if(!L)return;const t=ac.currentTime;L.g.gain.cancelScheduledValues(t);L.g.gain.setTargetAtTime(on?(vol||0.2):0,t,1.2);L.on=on;}
 function buildLayers(){
  layer('rain',g=>{const n=noise();const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=1200;const f2=ac.createBiquadFilter();f2.type='lowpass';f2.frequency.value=7000;n.connect(f);f.connect(f2);f2.connect(g);n.start();return[n];});
  layer('hum',g=>{const n=noise();const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=180;n.connect(f);f.connect(g);n.start();return[n];});
  layer('wind',g=>{const n=noise();const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=500;f.Q.value=0.6;const l=ac.createOscillator();l.frequency.value=0.08;const lg=ac.createGain();lg.gain.value=300;l.connect(lg);lg.connect(f.frequency);n.connect(f);f.connect(g);n.start();l.start();return[n,l];});
  layer('water',g=>{const n=noise();const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=380;const l=ac.createOscillator();l.frequency.value=0.2;const lg=ac.createGain();lg.gain.value=120;l.connect(lg);lg.connect(f.frequency);n.connect(f);f.connect(g);n.start();l.start();return[n,l];});
  layer('crowd',g=>{const n=noise();const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=700;f.Q.value=2;const l=ac.createOscillator();l.frequency.value=0.6;const lg=ac.createGain();lg.gain.value=0.5;const vg=ac.createGain();vg.gain.value=0.5;l.connect(lg);lg.connect(vg.gain);n.connect(f);f.connect(vg);vg.connect(g);n.start();l.start();return[n,l];});
  layer('industrial',g=>{const n=noise();const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=140;n.connect(f);f.connect(g);n.start();return[n];});
  layer('static',g=>{const n=noise();const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=2600;f.Q.value=0.8;const l=ac.createOscillator();l.type='square';l.frequency.value=3.3;const lg=ac.createGain();lg.gain.value=0.6;const vg=ac.createGain();vg.gain.value=0.4;l.connect(lg);lg.connect(vg.gain);n.connect(f);f.connect(vg);vg.connect(g);n.start();l.start();return[n,l];});
  layer('drip',g=>[]);layer('muzak',g=>[]);
 }
 const AMB_VOL={rain:0.22,hum:0.06,wind:0.12,water:0.2,crowd:0.08,industrial:0.35,static:0.05,drip:0,muzak:0};
 A.setZone=function(){if(!ac||!G||!G.zone)return;if(!layers.rain)buildLayers();const amb=(G.zone.def.ambient||[]).slice();if(G.rain&&G.zone.kind!=='tunnel')amb.push('rain');
  for(const n in layers)setLayer(n,amb.includes(n),AMB_VOL[n]*(Game.isNight()?1.2:1));curZone=G.zone.id;};
 function ambTick(){if(!ac||!active||document.hidden||!G||!G.zone||A.muted)return;const amb=G.zone.def.ambient||[];
  if(amb.includes('drip')&&Math.random()<0.12)burstNoise(0.06,900,0.5,0.025,'bandpass',ambG);
  if(amb.includes('industrial')&&Math.random()<0.025){burstNoise(0.25,240,0.5,0.04,'lowpass',ambG);}
  if(amb.includes('static')&&Math.random()<0.06)burstNoise(0.08,4000,1,0.1,'highpass',ambG);
  const want=amb.includes('rain')||!!(G.rain&&G.zone.kind!=='tunnel');if(layers.rain&&layers.rain.on!==want)A.setZone();}

 // ---------- music: slow minor pad ----------
 const CHORDS=[[57,60,64],[53,57,60],[55,59,62],[52,55,59],[57,60,64],[50,53,57],[52,56,59],[45,52,57]];
 function mtof(m){return 440*Math.pow(2,(m-69)/12);}
 function startMusic(){const play=()=>{if(!ac)return;if(!active||document.hidden||A.muted||!A.vol.music){musicTimer=setTimeout(play,2000);return;}
   // Optional, quiet chords with space between them; no random high notes.
   const ch=CHORDS[chordI++%CHORDS.length];
   for(const n of ch)tone(mtof(n-12),3,'sine',0.018,null,musG);
   musicTimer=setTimeout(play,12000);};
  play();}
 return A;
})();
