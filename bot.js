// Browser bot: plays through the real UI with random-but-sane actions, answering every modal.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const classes=['streetkid','soldier','picker','netjack','medic','bruiser','listener'];
  for(const cls of classes){
   const page=await browser.newPage({viewport:{width:1100,height:720}});
   page.on('pageerror',e=>errors.push(cls+' PAGEERROR: '+e.message+' | '+(e.stack||'').split('\n').slice(1,3).join(' ')));
   page.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text()))errors.push(cls+' CONSOLE: '+m.text());});
   await page.goto('file://'+__dirname+'/index.html');await page.waitForTimeout(500);
   await page.evaluate((c)=>{const m=Game.loadMeta();m.unlocks.listener=1;Game.saveMeta(m);Game.newGame('Bot',c,1000+c.length);__nr.enterGame(true);},cls);
   const res=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const keys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','y','u','b','n','g','e','f','r','1','2','x','z','c','q','m','p','i','h','t','k','.'];
    const press=k=>window.dispatchEvent(new KeyboardEvent('keydown',{key:k,code:k.startsWith('Arrow')?k:'',bubbles:true}));
    let steps=0,zones=new Set();
    for(let i=0;i<900;i++){
     if(G.dead||G.ending)break;
     const modal=document.querySelector('#modal:not(.hidden)');
     if(modal){const opts=[...modal.querySelectorAll('.opt,.loot-row:not(.dim)')];if(opts.length&&Math.random()<0.9){opts[(Math.random()*opts.length)|0].click();}else{const c=modal.querySelector('.mclose');if(c)c.click();else if(opts.length)opts[opts.length-1].click();}await sleep(0);continue;}
     if(document.querySelector('#tbar')){press(Math.random()<0.6?'Enter':(Math.random()<0.5?'ArrowRight':'Escape'));continue;}
     const k=keys[(Math.random()*keys.length)|0];press(k);steps++;
     // occasionally travel through a known exit
     if(i%150===149){const ex=G.zone.exits.find(e=>!e.locked);if(ex){Game.enterZone(ex.to,G.zoneId);}}
     zones.add(G.zoneId);
     if(i%40===0)await sleep(1);
    }
    // extra system pokes
    try{Game.giveItem('molotov',1);const inst=G.p.inv.find(x=>x.id==='molotov');Game.useInst(inst);}catch(e){return 'throw fail '+e.message;}
    return {steps,zones:[...zones],dead:G.dead,cause:G.cause,turn:G.turn,zone:G.zoneId,log:G.log.slice(-8).map(l=>l.t)};
   });
   await page.waitForTimeout(300);
   await page.screenshot({path:`/tmp/bot_${cls}.png`});
   console.log(cls,JSON.stringify(res));
   await page.close();
  }
  console.log('ERRORS',JSON.stringify(errors,null,1));
  await browser.close();
})();
