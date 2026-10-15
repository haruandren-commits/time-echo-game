// Uses the cloud runtime's Playwright and Chromium; no application dependencies.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const assets={'/':'index.html','/index.html':'index.html','/app.mjs':'app.mjs','/game.mjs':'game.mjs','/style.css':'style.css'};
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const solutions=[['RR','RRRRR'],['RRW','RRUURR'],['WWWU','RRRRUUR'],['UUR','RRWRRR'],['UUWRR','RRWRRRUUU']];
(async()=>{
 const server=http.createServer((req,res)=>{
   const file=assets[req.url];if(!file){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',types[path.extname(file)]);res.end(fs.readFileSync(path.join(root,file)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const [width,height] of [[375,667],[390,844],[320,568],[430,932]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(`http://127.0.0.1:${server.address().port}/`);
   assert.equal(response.status(),200);await page.waitForSelector('.cell');assert.equal(await page.locator('.cell').count(),36);
   for(let i=0;i<5;i++){
     await page.locator('#action').tap();
     // Record, undo a wait, and confirm the limit can be reached and undone.
     if(i===0){
       await page.locator('[data-key=W]').tap();await page.locator('#undo').tap();
       assert.match(await page.locator('#status').innerText(),/0 \/ 8/);
       for(let j=0;j<8;j++)await page.locator('[data-key=W]').tap();
       await page.locator('[data-key=W]').tap();assert.match(await page.locator('#status').innerText(),/8 \/ 8/);
       for(let j=0;j<8;j++)await page.locator('#undo').tap();
     }
     for(const key of solutions[i][0])await page.locator(`[data-key=${key}]`).tap();
     await page.locator('#action').tap();
     for(const key of solutions[i][1])await page.locator(`[data-key=${key}]`).tap();
     assert.equal(await page.locator('#status').innerText(),'クリア！');
     // Undo the winning move, replay it, and verify the entire state can be restored.
     await page.locator('#undo').tap();assert.match(await page.locator('#status').innerText(),/協力中/);
     await page.locator(`[data-key=${solutions[i][1].at(-1)}]`).tap();
     assert.equal(await page.locator('#status').innerText(),'クリア！');
     // Every primary control must remain within the viewport without scrolling.
     await page.evaluate(()=>scrollTo(0,0));
     const layout=await page.evaluate(()=>({
       wide:document.documentElement.scrollWidth>innerWidth,
       controls:[...document.querySelectorAll('.console button')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.dataset.key,x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};})
     }));
     assert.equal(layout.wide,false);
     for(const c of layout.controls){assert.ok(c.w>=44&&c.h>=44,JSON.stringify(c));assert.ok(c.y>=0&&c.bottom<=height,`${width}x${height}: ${JSON.stringify(c)}`);}
     await page.locator('#action').tap();
   }
   assert.match(await page.locator('#stage').innerText(),/1 \/ 5/);
   await page.locator('#help').tap();assert.equal(await page.locator('dialog').evaluate(e=>e.open),true);
   await page.locator('dialog button').tap();
   await page.locator('#action').tap();await page.locator('[data-key=R]').tap();await page.locator('#reset').tap();
   assert.match(await page.locator('#status').innerText(),/準備中/);
   assert.equal(await page.locator('#undo').isDisabled(),true);
   await page.screenshot({path:`/tmp/time-echo-${width}x${height}.png`,fullPage:true});
   assert.deepEqual(errors,[]);
   console.log(`${width}x${height}: all 5 stages, undo, reset, help, touch controls and viewport PASS`);
   await page.close();
 }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
