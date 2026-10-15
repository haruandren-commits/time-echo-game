import test from 'node:test';
import assert from 'node:assert/strict';
import {levels,LIMIT,DIRECTIONS,initial,recordStep,step,same} from '../game.mjs';
export const solutions=[
  {record:'RR',play:'RRRRR'},
  {record:'RRW',play:'RRUURR'},
  {record:'WWWU',play:'RRRRUUR'},
  {record:'UUR',play:'RRWRRR'},
  {record:'UUWRR',play:'RRWRRRUUU'}
];
function recording(level,keys){let p=level.start;assert.ok(keys.length<=LIMIT);for(const key of keys){p=recordStep(level,p,key);assert.ok(p,`invalid recording ${keys}`);}return [...keys];}
function solve(level,record,{ghostEnabled=true,allowWait=true,forbidPlayerPlate=false}={}){
  const queue=[initial(level)],seen=new Set();
  for(let head=0;head<queue.length;head++){
    const s=queue[head];
    if(s.won)return true;
    const key=JSON.stringify([s.pos,s.ghost,Math.min(s.turn,record.length),s.gates]);
    if(seen.has(key))continue;seen.add(key);
    for(const action of Object.keys(DIRECTIONS)){
      if(action==='W'&&!allowWait)continue;
      const n=step(level,s,record,action,{ghostEnabled});
      if(n===s)continue;
      if(forbidPlayerPlate&&level.plates.some(p=>p.kind==='player'&&same(n.pos,p.at)))continue;
      queue.push(n);
    }
  }
  return false;
}
function* recordings(level,pos=level.start,keys=[]){
  if(keys.length)yield keys;
  if(keys.length===LIMIT)return;
  for(const action of ['U','L','D','R']){
    const next=recordStep(level,pos,action);
    if(next)yield* recordings(level,next,[...keys,action]);
  }
}
for(const [i,l] of levels.entries()){
  test(`stage ${i+1}: legal recording and complete solution`,()=>{
    const example=solutions[i],rec=recording(l,example.record);let s=initial(l);
    for(const key of example.play){const next=step(l,s,rec,key);assert.notEqual(next,s,`blocked ${key} at turn ${s.turn}`);s=next;}
    assert.equal(s.won,true);
  });
  test(`stage ${i+1}: cannot win without the past`,()=>assert.equal(solve(l,[],{ghostEnabled:false}),false));
}
test('stages 2 and 5: all legal recordings without waiting are unsolvable',()=>{
  for(const i of [1,4]){
    let count=0;
    for(const rec of recordings(levels[i])){count++;assert.equal(solve(levels[i],rec),false,`unexpected solution: stage ${i+1}, ${rec}`);}
    assert.ok(count>0);console.log(`stage ${i+1}: checked ${count} recordings without W`);
  }
});
test('stage 3: going straight to the switch opens too early',()=>{
  assert.equal(solve(levels[2],['U']),false);
  assert.equal(solve(levels[2],[...'WWWU']),true);
});
test('stages 4 and 5: the current player must also operate a switch',()=>{
  for(const i of [3,4]) assert.equal(solve(levels[i],[...solutions[i].record],{forbidPlayerPlate:true}),false);
});
test('waiting is an action; standing after a recording is not a recorded wait',()=>{
  let s=initial(levels[1]);for(const a of 'RRWWWW')s=step(levels[1],s,[...'RR'],a);
  assert.equal(s.gates[0].open,false);
});
test('timed door expires even while the ghost remains on the switch',()=>{
  let s=initial(levels[2]);s=step(levels[2],s,['U'],'W');assert.equal(s.gates[0].left,2);
  s=step(levels[2],s,['U'],'W');assert.equal(s.gates[0].left,1);
  s=step(levels[2],s,['U'],'W');assert.equal(s.gates[0].open,false);
  s=step(levels[2],s,['U'],'W');assert.equal(s.gates[0].open,false);
});
test('blocked movement does not advance time; state snapshots remain intact for undo',()=>{
  const l=levels[0],s=initial(l),before=JSON.stringify(s);
  assert.equal(step(l,s,['R'],'U'),s);
  const next=step(l,s,['R'],'R');assert.equal(next.turn,1);assert.equal(JSON.stringify(s),before);
});
test('all maps are in bounds, unique, and have traversable starts, goals and fixtures',()=>{
  for(const l of levels){
    assert.equal(new Set(l.floors.map(p=>p.join(','))).size,l.floors.length);
    for(const p of l.floors)assert.ok(p.every(n=>Number.isInteger(n)&&n>=0&&n<6));
    const fixtures=[l.start,l.goal,...l.plates.map(p=>p.at),...l.gates.map(g=>g.at)];
    assert.equal(new Set(fixtures.map(p=>p.join(','))).size,fixtures.length);
    for(const p of fixtures)assert.ok(l.floors.some(f=>same(f,p)));
  }
});
