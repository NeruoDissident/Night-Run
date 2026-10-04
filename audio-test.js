// Audio scheduling/lifecycle regression tests; no speakers or browser needed.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const nodes=[],timers=[],intervals=[];
class Param{constructor(v=1){this.value=v;this.events=[];}setValueAtTime(v,t){this.events.push(['set',v,t]);}linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);}exponentialRampToValueAtTime(v,t){this.events.push(['exp',v,t]);}setTargetAtTime(v,t){this.events.push(['target',v,t]);}cancelScheduledValues(){}}
class Node{constructor(type){this.kind=type;this.gain=new Param();this.frequency=new Param(440);this.Q=new Param();this.detune=new Param();nodes.push(this);}connect(){}disconnect(){this.disconnected=true;}start(t){this.started=t;}stop(t){this.stopped=t===undefined?'now':t;if(t===undefined&&this.onended)this.onended();}}
class Context{constructor(){this.currentTime=10;this.sampleRate=100;this.state='running';this.destination={};}createGain(){return new Node('gain')}createOscillator(){return new Node('osc')}createBufferSource(){return new Node('noise')}createBiquadFilter(){return new Node('filter')}createDynamicsCompressor(){const n=new Node('compressor');n.threshold=new Param();n.knee=new Param();n.ratio=new Param();return n;}createBuffer(){return{getChannelData:()=>new Float32Array(200)}}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}}
const ctx={assert,console,window:{AudioContext:Context},document:{hidden:false},setTimeout:f=>(timers.push(f),timers.length),setInterval:f=>(intervals.push(f),intervals.length),nodes,timers,intervals,G:{zone:{id:'test',kind:'street',def:{ambient:['hum','drip','muzak','industrial','static']}},attention:100},Game:{isNight:()=>true}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/audio.js','utf8'),ctx);
vm.runInContext(`
Sound.setActive(true);Sound.start();Sound.setZone();assert.equal(Sound.vol.music,0);
const ambientOsc=nodes.filter(n=>n.kind==='osc').length;for(let i=0;i<300;i++)intervals[0]();assert.equal(nodes.filter(n=>n.kind==='osc').length,ambientOsc,'Ambient ticks must not emit pitched beeps');
Sound.vol.music=0.4;timers[0]();const notes=nodes.filter(n=>n.kind==='osc').slice(ambientOsc);assert.equal(notes.length,3);for(const n of notes){assert.equal(n.started,10);assert.ok(n.stopped<=13.1);}
Sound.play('level');Sound.setActive(false);assert.ok(notes.every(n=>n.stopped==='now'));const count=nodes.length;intervals[0]();Sound.play('shot');assert.equal(nodes.length,count,'No new audio outside play');
Sound.setActive(true);Sound.muted=true;Sound.applyVol();Sound.play('hit');assert.equal(nodes.length,count,'Mute stops new effects');
console.log('PASS no random ambient tones; optional bounded music; active voices stop outside play; mute suppresses effects');
`,ctx);
