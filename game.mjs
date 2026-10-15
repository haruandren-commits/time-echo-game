export const LIMIT = 8;
export const DIRECTIONS = { U:[0,-1], L:[-1,0], D:[0,1], R:[1,0], W:[0,0] };
export const same = (a,b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const row = (y) => Array.from({length:6},(_,x)=>[x,y]);
export const levels = [
  {name:'はじめての協力', lesson:'過去をスイッチに残す', start:[0,2], goal:[5,2],
    floors:row(2), plates:[{id:'A',at:[2,2],kind:'hold'}],
    gates:[{at:[4,2],rule:'hold',plates:['A']}],
    hint:'右へ2手を記録して終了。過去がAに残ったら、あなたは扉の先へ。'},
  {name:'止まることも記憶', lesson:'スイッチの上で「待つ」を記録', start:[0,4], goal:[4,2],
    floors:[[0,4],[1,4],[2,4],[2,3],[2,2],[3,2],[4,2]],
    plates:[{id:'A',at:[2,4],kind:'wait'}], gates:[{at:[3,2],rule:'latch',plates:['A']}],
    hint:'Aは待機スイッチ。過去がAで「待つ」を再生すると扉が開き続ける。立つだけでは開かない。'},
  {name:'遅れて届く合図', lesson:'開く時刻を遅らせる', start:[0,4], goal:[5,2],
    floors:[...row(4).slice(0,5),[0,3],[4,3],[4,2],[5,2]],
    plates:[{id:'A',at:[0,3],kind:'pulse'}], gates:[{at:[4,2],rule:'pulse',plates:['A'],duration:2}],
    hint:'過去がAへ入ると、扉は次の2手だけ開く。記録の最初で何手か待ち、あなたが扉へ近づく時間を作ろう。'},
  {name:'ふたりの合図', lesson:'あなたもスイッチを担当', start:[0,3], goal:[5,3],
    floors:[...row(3),[0,2],[0,1],[1,1]],
    plates:[{id:'A',at:[1,1],kind:'ghost'},{id:'B',at:[2,3],kind:'player'}],
    gates:[{at:[4,3],rule:'dual',plates:['A','B']}],
    hint:'過去がA、あなたがBを同時に踏むと扉が開き続ける。ひとりで順番に踏んでも開かない。'},
  {name:'8手の約束', lesson:'待機・制限時間・ふたりの協力', start:[0,4], goal:[5,1],
    floors:[...row(4),[0,3],[0,2],[1,2],[2,2],[5,3],[5,2],[5,1]],
    plates:[{id:'A',at:[0,2],kind:'wait'},{id:'B',at:[2,2],kind:'ghost'},{id:'C',at:[4,4],kind:'player'}],
    gates:[{at:[3,4],rule:'pulseWait',plates:['A'],duration:3},{at:[5,2],rule:'dual',plates:['B','C']}],
    hint:'過去がAで待つと①が次の3手だけ開く。その間に通過し、過去のBとあなたのCで②を開こう。'}
];
export const onFloor = (level,p) => level.floors.some(f=>same(f,p));
export function initial(level) {
  return {pos:[...level.start],ghost:[...level.start],turn:0,won:false,
    gates:level.gates.map(()=>({open:false,left:0})),message:''};
}
export function recordStep(level,pos,key) {
  const d=DIRECTIONS[key];
  if(!d) return null;
  const next=[pos[0]+d[0],pos[1]+d[1]];
  return onFloor(level,next) && !level.gates.some(g=>same(g.at,next)) ? next : null;
}
// A turn uses the doors visible before input. Then the ghost replays one action,
// existing timers decrease, and switches set the doors for the next turn.
// Invalid movement consumes no turn. W is an explicit action, including in recordings.
export function step(level,state,record,key,{ghostEnabled=true}={}) {
  if(state.won || !DIRECTIONS[key]) return state;
  const d=DIRECTIONS[key], next=[state.pos[0]+d[0],state.pos[1]+d[1]];
  const gateIndex=level.gates.findIndex(g=>same(g.at,next));
  if(!onFloor(level,next) || (key!=='W' && gateIndex>=0 && !state.gates[gateIndex].open)) return state;
  const s=structuredClone(state), oldGhost=s.ghost;
  const ghostKey=ghostEnabled ? record[s.turn] : undefined;
  if(!ghostEnabled) s.ghost=null;
  else if(ghostKey) {
    const gd=DIRECTIONS[ghostKey];
    s.ghost=[s.ghost[0]+gd[0],s.ghost[1]+gd[1]];
  }
  s.pos=next;s.turn++;
  const plate=id=>level.plates.find(p=>p.id===id);
  s.gates=s.gates.map((g,i)=>{
    const spec=level.gates[i], p=plate(spec.plates[0]);
    if(spec.rule==='hold') return {open:same(s.ghost,p.at),left:0};
    if(spec.rule==='latch') return {open:g.open || (same(s.ghost,p.at)&&ghostKey==='W'),left:0};
    if(spec.rule==='dual') {
      const other=plate(spec.plates[1]);
      return {open:g.open || (same(s.ghost,p.at)&&same(s.pos,other.at)),left:0};
    }
    const triggered=spec.rule==='pulse'
      ? same(s.ghost,p.at)&&!same(oldGhost,p.at)
      : same(s.ghost,p.at)&&ghostKey==='W';
    const left=triggered ? spec.duration : Math.max(0,g.left-1);
    return {open:left>0,left};
  });
  s.won=same(s.pos,level.goal);
  return s;
}
