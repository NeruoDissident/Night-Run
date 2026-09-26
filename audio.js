'use strict';
// ============================================================
// AUDIO — everything synthesized with WebAudio. No files.
// Zone ambience layers (from ZONES[id].ambient), a slow generative
// pad that darkens at night and sours as the Echo pays attention,
// and short combat / interface sounds.
// ============================================================
const Sound=(function(){
 const A={};let ac=null,master,sfxG,ambG,musG,noiseBuf=null;let started=false;
 A.vol={master:0.7,sfx:0.8,amb:0.6,music:0.45};A.muted=false;
 const layers={};let curZone=null,musicTimer=null,ambTimer=null,chordI=0;

 A.start=function(){if(started)return;try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}started=true;
  master=ac.createGain();master.connect(ac.destination);sfxG=ac.createGain();ambG=ac.createGain();musG=ac.createGain();
  sfxG.connect(master);ambG.connect(master);musG.connect(master);A.applyVol();
  noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  startMusic();ambTimer=setInterval(ambTick,400);};
 A.resume=function(){if(ac&&ac.state==='suspended')ac.resume();};
 A.applyVol=function(){if(!ac)return;const m=A.muted?0:A.vol.master;master.gain.value=m;sfxG.gain.value=A.vol.sfx;ambG.gain.value=A.vol.amb;musG.gain.value=A.vol.music;};

 function noise(){const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.loopStart=Math.random();return s;}
 function env(g,t,a,peak,dec,sus){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(Math.max(0.0001,sus||0.0001),t+a+dec);}

 // ---------- one-shot SFX ----------
 function burstNoise(dur,freq,q,gain,type,dest){const t=ac.currentTime;const n=noise();const f=ac.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q||1;const g=ac.createGain();env(g,t,0.003,gain,dur);n.connect(f);f.connect(g);g.connect(dest||sfxG);n.start(t);n.stop(t+dur+0.05);}
 function tone(freq,dur,type,gain,slide,dest,delay){const t=ac.currentTime+(delay||0);const o=ac.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(gain,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+dur+0.05);}
 A.play=function(k,opt){if(!ac||A.muted)return;opt=opt||{};
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
   case 'echo':{const t=ac.currentTime;const o=ac.createOscillator(),m=ac.createOscillator(),mg=ac.createGain(),g=ac.createGain();o.type='sine';o.frequency.value=440;m.frequency.value=7+Math.random()*30;mg.gain.value=300;m.connect(mg);mg.connect(o.frequency);env(g,t,0.05,0.12,1.2);o.connect(g);g.connect(sfxG);o.start(t);m.start(t);o.stop(t+1.4);m.stop(t+1.4);burstNoise(0.6,3000,0.4,0.08,'highpass');break;}
   case 'radio':burstNoise(0.7,1600,0.4,0.12,'bandpass');tone(880,0.5,'sine',0.03,860);break;
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
  layer('hum',g=>{const o=ac.createOscillator();o.frequency.value=55;const o2=ac.createOscillator();o2.frequency.value=110.4;const g2=ac.createGain();g2.gain.value=0.3;o.connect(g);o2.connect(g2);g2.connect(g);o.start();o2.start();return[o,o2];});
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
 function ambTick(){if(!ac||!G||!G.zone||A.muted)return;const amb=G.zone.def.ambient||[];
  if(amb.includes('drip')&&Math.random()<0.25)tone(1200+Math.random()*1400,0.18,'sine',0.04*A.vol.amb,600,ambG);
  if(amb.includes('industrial')&&Math.random()<0.05){burstNoise(0.4,200+Math.random()*1800,6,0.12,'bandpass',ambG);}
  if(amb.includes('muzak')&&Math.random()<0.3){const s=[523,587,659,784,880];tone(s[(Math.random()*5)|0]*(Math.random()<0.5?0.5:1),0.9,'triangle',0.025,null,ambG);}
  if(amb.includes('static')&&Math.random()<0.06)burstNoise(0.08,4000,1,0.1,'highpass',ambG);
  if(Game.isNight()&&Math.random()<0.02)tone(90+Math.random()*40,2.5,'sine',0.05,60,ambG); // distant things
  if(G.attention>=40&&Math.random()<0.015)A.play('radio');
  const want=(G.rain&&G.zone.kind!=='tunnel');if(layers.rain&&layers.rain.on!==want)A.setZone();}

 // ---------- music: slow minor pad ----------
 const CHORDS=[[57,60,64],[53,57,60],[55,59,62],[52,55,59],[57,60,64],[50,53,57],[52,56,59],[45,52,57]];
 function mtof(m){return 440*Math.pow(2,(m-69)/12);}
 function startMusic(){const play=()=>{if(!ac)return;if(A.muted||!A.vol.music){musicTimer=setTimeout(play,4000);return;}
   const night=G&&Game.isNight?Game.isNight():false;const att=G?G.attention:0;const ch=CHORDS[chordI++%CHORDS.length];
   const t=ac.currentTime;const dur=9;
   const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=night?500:900;f.Q.value=0.7;const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.05,t+3);g.gain.linearRampToValueAtTime(0.0001,t+dur);f.connect(g);g.connect(musG);
   const notes=ch.map(n=>n-(night?12:0));if(att>=30)notes.push(notes[0]+6);// tritone creeps in
   for(const n of notes)for(const det of [-6,6]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=mtof(n);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+dur+0.1);}
   if(Math.random()<0.5){const o=ac.createOscillator();o.type='sine';o.frequency.value=mtof(ch[(Math.random()*3)|0]+24);const g2=ac.createGain();env(g2,t+2+Math.random()*3,0.01,0.03,2.5);o.connect(g2);g2.connect(musG);o.start(t);o.stop(t+dur);}
   musicTimer=setTimeout(play,(dur-1.5)*1000);};
  play();}
 return A;
})();
