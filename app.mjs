import {LIMIT,levels,same,onFloor,initial,recordStep,step} from './game.mjs';
const $=id=>document.getElementById(id);
const symbols={U:'↑',L:'←',D:'↓',R:'→',W:'待'};
let idx=0,phase='ready',record=[],recordPos,state,history=[];
const level=()=>levels[idx];
function say(message){$('toast').textContent=message;}
function reset(){phase='ready';record=[];recordPos=[...level().start];state=initial(level());history=[];say(level().lesson+'。「記録を始める」を押そう。');draw();}
function draw(){
  const l=level(), pos=phase==='record'?recordPos:state.pos;
  $('stage').textContent=`${idx+1} / ${levels.length}　${l.name}`;
  $('status').textContent=phase==='ready'?'準備中 · 最大8手を記録':phase==='record'?`記録中 · ${record.length} / ${LIMIT} 手`:phase==='won'?'クリア！':`協力中 · ${state.turn} 手`;
  $('doors').textContent=l.gates.map((g,i)=>`${['①','②'][i]} ${state.gates[i].open ? (g.duration?`あと${state.gates[i].left}手`:'開いています') : '閉じています'}`).join(' ／ ');
  $('hint').textContent=l.hint;
  const cells=[];
  for(let y=0;y<6;y++)for(let x=0;x<6;x++){
    const p=[x,y],e=document.createElement('div');e.className='cell';
    if(!onFloor(l,p))e.classList.add('wall');
    const plate=l.plates.find(a=>same(a.at,p)),gi=l.gates.findIndex(g=>same(g.at,p));
    let label='',kind='';
    if(plate){e.classList.add('plate');label=plate.id;kind=plate.kind==='wait'?'待':plate.kind==='player'?'今':'過';}
    if(gi>=0){e.classList.add('gate');e.classList.toggle('open',state.gates[gi].open);label=['①','②'][gi];kind=l.gates[gi].duration?'時計':'';}
    if(same(l.goal,p)){e.classList.add('goal');label='⭐';}
    const mark=document.createElement('span');mark.className='mark';mark.textContent=label;e.append(mark);
    const note=document.createElement('span');note.className='kind';note.textContent=kind;e.append(note);
    const isPlayer=same(pos,p),isGhost=(phase==='play'||phase==='won')&&same(state.ghost,p);
    const actor=document.createElement('span');actor.className='actors'+(isPlayer&&isGhost?' both':'');actor.textContent=(isGhost?'👻':'')+(isPlayer?'🟣':'');e.append(actor);
    e.setAttribute('aria-label',`${x+1}列${y+1}行 ${!onFloor(l,p)?'壁':label||'通路'} ${kind} ${isGhost?'過去':''} ${isPlayer?'あなた':''}`);
    cells.push(e);
  }
  $('board').replaceChildren(...cells);
  $('board').setAttribute('aria-label',`6×6のゲーム盤。あなたは${pos[0]+1}列${pos[1]+1}行。${$('doors').textContent}`);
  $('record').replaceChildren(...Array.from({length:LIMIT},(_,i)=>{const e=document.createElement('span');e.textContent=symbols[record[i]]||'·';if((phase==='play'||phase==='won')&&i<state.turn&&i<record.length)e.className='done';return e;}));
  $('action').textContent=phase==='ready'?'記録を始める':phase==='record'?'再生して協力':phase==='play'?'記録し直す':idx<levels.length-1?'次のステージへ':'最初から遊ぶ';
  $('undo').disabled=phase==='record'?record.length===0:!history.length;
  document.querySelectorAll('[data-key]').forEach(b=>b.disabled=phase==='ready'||phase==='won');
}
function move(key){
  if(phase==='record'){
    if(record.length>=LIMIT){say('8手まで記録できます。「再生して協力」を押そう。');return;}
    const next=recordStep(level(),recordPos,key);
    if(!next){say('壁と扉には進めません。時間も進みません。');return;}
    recordPos=next;record.push(key);say(record.length===LIMIT?'8手記録しました。再生して協力しよう。':`${symbols[key]} を記録。スイッチで止まる・待つ時刻を考えよう。`);
  }else if(phase==='play'){
    const next=step(level(),state,record,key);
    if(next===state){say('進めません。「待つ」なら過去を1手進められます。');return;}
    history.push(state);state=next;
    if(state.won){phase='won';say('成功！ 過去の自分と脱出できました。');}
    else say(state.gates.some(g=>g.open)?'扉の残り手数を確認して進もう。':'過去と協力しよう。困ったらヒントや「1手戻す」を使えます。');
  }else return;
  draw();
}
$('action').onclick=()=>{
  if(phase==='ready'||phase==='play'){reset();phase='record';say(level().lesson+'。最大8手を記録しよう。');}
  else if(phase==='record'){
    if(!record.length){say('1手以上、動きか「待つ」を記録してね。');return;}
    phase='play';state=initial(level());history=[];say('あなたの1手の後に過去が動き、次の手の扉が決まります。');
  }else{idx=(idx+1)%levels.length;$('hint').parentElement.open=false;reset();}
  draw();
};
$('undo').onclick=()=>{
  if(phase==='record'&&record.length){record.pop();recordPos=[...level().start];for(const key of record)recordPos=recordStep(level(),recordPos,key);}
  else if(history.length){state=history.pop();phase='play';}else return;
  say('1手戻しました。扉と過去の状態も元に戻ります。');draw();
};
$('reset').onclick=reset;
$('help').onclick=()=>$('guide').showModal();
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>move(b.dataset.key));
document.addEventListener('keydown',e=>{
  if($('guide').open || e.repeat || e.ctrlKey || e.metaKey || e.altKey)return;
  if(e.target.closest('button,summary,input,textarea,select')&&e.key===' ')return;
  const key={ArrowUp:'U',ArrowLeft:'L',ArrowDown:'D',ArrowRight:'R',w:'W',W:'W',' ':'W'}[e.key];
  if(key){e.preventDefault();move(key);}
});
reset();
