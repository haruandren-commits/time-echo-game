import {levels,initial,recordStep,step,same,onFloor} from './game.mjs';

// Practice uses its own state, but the real game's movement and win rules.
// Neither opening, completing nor skipping practice touches the player's game.
export function setupTutorial(){
  const $=id=>document.getElementById(id), dialog=$('tutorial');
  const level=levels[0], preference='time-echo-tutorial-v1';
  let phase,record,pos,state;
  function draw(){
    const message=phase==='ready'?'① 記録：これから動く道を覚えます。「記録を始める」を押そう。'
      :phase==='record'?(record.length<2?`② 右へ${2-record.length}回。🟣をAスイッチまで動かそう。`:'③ 記録できた！「再生して協力」でふたりがスタートに戻ります。')
      :state.won?'できた！過去にスイッチを任せ、あなたが⭐に着くとクリア。'
      :state.turn===0?'④ 右へ。あなたが1手動くと、👻も記録を1手再生します。'
      :state.turn===1?'もう1回右へ。過去をAスイッチへ進めよう。'
      :state.turn===2?'⑤ 過去がAに残り、①の扉が開いた！右へ進もう。'
      :state.turn===3?'開いている①へ、右に1手。閉じた扉には入れません。'
      :'⑥ 扉を通れた！あと1回右へ進んで⭐ゴールへ。';
    $('tutorial-message').textContent=message;
    $('tutorial-status').textContent=phase==='ready'?'記録 → 再生 → 協力 → ゴール':phase==='record'?`記録：${'→'.repeat(record.length)||'まだ0手'} / 最大8手`:`再生：${Math.min(state.turn,record.length)} / ${record.length}手 · 扉${state.gates[0].open?'開':'閉'}`;
    const current=phase==='record'?pos:state.pos;
    const cells=[];
    for(let y=0;y<6;y++)for(let x=0;x<6;x++){
      const p=[x,y],e=document.createElement('div');e.className='cell';
      if(!onFloor(level,p))e.classList.add('wall');
      let marker='';
      if(same(p,level.plates[0].at)){e.classList.add('plate');marker='A';}
      if(same(p,level.gates[0].at)){e.classList.add('gate');e.classList.toggle('open',state.gates[0].open);marker='①';}
      if(same(p,level.goal)){e.classList.add('goal');marker='⭐';}
      const label=document.createElement('span');label.className='mark';label.textContent=marker;e.append(label);
      const ghost=phase==='play'&&same(p,state.ghost),player=same(p,current);
      const actors=document.createElement('span');actors.className='actors'+(ghost&&player?' both':'');actors.textContent=(ghost?'👻':'')+(player?'🟣':'');e.append(actors);cells.push(e);
    }
    $('tutorial-board').replaceChildren(...cells);
    $('tutorial-board').setAttribute('aria-label',`練習盤面。あなたは${current[0]+1}列${current[1]+1}行。扉は${state.gates[0].open?'開いています':'閉じています'}`);
    $('tutorial-record').disabled=phase!=='ready';
    $('tutorial-right').disabled=phase==='ready'||state.won||(phase==='record'&&record.length===2);
    $('tutorial-replay').disabled=phase!=='record'||record.length!==2;
    $('tutorial-finish').hidden=!state.won;
    const target=state.won?'tutorial-finish':phase==='ready'?'tutorial-record':phase==='record'&&record.length===2?'tutorial-replay':'tutorial-right';
    dialog.querySelectorAll('.next-operation').forEach(e=>e.classList.remove('next-operation'));
    $(target).classList.add('next-operation');
    // Move keyboard focus when the current button becomes disabled.
    if(dialog.open && (document.activeElement.disabled || state.won))$(target).focus({preventScroll:true});
  }
  function open(){phase='ready';record=[];pos=[...level.start];state=initial(level);draw();dialog.showModal();$('tutorial-record').focus({preventScroll:true});}
  $('tutorial-record').onclick=()=>{phase='record';draw();};
  $('tutorial-right').onclick=()=>{
    if(phase==='record'&&record.length<2){pos=recordStep(level,pos,'R');record.push('R');}
    else if(phase==='play')state=step(level,state,record,'R');
    draw();
  };
  $('tutorial-replay').onclick=()=>{phase='play';state=initial(level);draw();};
  $('tutorial-skip').onclick=()=>dialog.close();
  $('tutorial-finish').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    try{localStorage.setItem(preference,'dismissed');}catch{/* Storage can be unavailable in private/restricted browsing. */}
    $('help').focus({preventScroll:true});
  });
  $('practice').onclick=()=>{$('guide').close();open();};
  let dismissed=false;
  try{dismissed=localStorage.getItem(preference)==='dismissed';}catch{/* Practice still works without storage. */}
  if(!dismissed)open();
}
