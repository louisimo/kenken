import { useState, useMemo, useEffect, useRef } from "react";

// ═══ CONSTANTS ════════════════════════════════════════════════════════════════
const N = 9;
const CAGE_LINE_W = "2.5px";

const THEMES = {
  dark: {
    name: "dark",
    bg:          "#0C0C0E",
    gridBg:      "linear-gradient(170deg,#09090B 0%,#111114 55%,#090909 100%)",
    cellBg:      "#181818",
    selPenBg:    "#5C4700",
    selPenRing:  "#FFD60A",
    selPclBg:    "#4A3200",
    selPclRing:  "#FF8C00",
    conflictBg:  "#3D0A0A",
    cageOkBg:    "#0A2A10",
    thinLine:    "1px solid rgba(255,255,255,0.22)",
    cageLine:    "rgba(255,255,255,0.92)",
    accent:      "#FFD60A",
    accentText:  "#000",
    green:       "#30D158",
    red:         "#FF453A",
    pencilBlue:  "#FFFFFF",
    numColor:    "#EFEFEF",
    dimText:     "rgba(255,255,255,0.55)",
    veryDimText: "rgba(255,255,255,0.35)",
    mutedText:   "rgba(255,255,255,0.55)",
    panelBg:     "#141416",
    panelBorder: "rgba(255,255,255,0.12)",
    btnBg:       "#1A1A1C",
    btnBorder:   "rgba(255,255,255,0.15)",
    modeBg:      "#141416",
    modeActivePcl: "#2A1E00",
    inputBg:     "#222",
    inputBorder: "rgba(255,214,10,0.2)",
    cageLabelColor: "#FFD60A",
    timerColor:  "#FFD60A",
    logoColor:   "#FFD60A",
  },
  pantone: {
    name: "pantone",
    bg:          "#DFE9DC",
    gridBg:      "linear-gradient(160deg,#E4EDE0 0%,#D8E5D3 60%,#CEDFCA 100%)",
    cellBg:      "#F0F5EE",
    selPenBg:    "#FFF0B0",
    selPenRing:  "#8B6914",
    selPclBg:    "#B8D8F5",
    selPclRing:  "#3A7CB8",
    conflictBg:  "#FAEAEA",
    cageOkBg:    "#E8F4EC",
    thinLine:    "1px solid rgba(80,110,75,0.25)",
    cageLine:    "rgba(55,85,50,0.80)",
    accent:      "#6B8C3E",
    accentText:  "#fff",
    green:       "#2E7D52",
    red:         "#C0392B",
    pencilBlue:  "#3A7CB8",
    numColor:    "#2C3E2C",
    dimText:     "rgba(60,80,55,0.45)",
    veryDimText: "rgba(60,80,55,0.32)",
    mutedText:   "rgba(60,80,55,0.60)",
    panelBg:     "#E6EEE3",
    panelBorder: "rgba(80,110,75,0.18)",
    btnBg:       "#EBF2E8",
    btnBorder:   "rgba(80,110,75,0.18)",
    modeBg:      "#E6EEE3",
    modeActivePcl: "#C8D9C4",
    inputBg:     "#F4F9F2",
    inputBorder: "rgba(107,140,62,0.35)",
    cageLabelColor: "#5C3D11",
    timerColor:  "#4A6B2A",
    logoColor:   "#4A6B2A",
  },
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,700&family=JetBrains+Mono:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;font-feature-settings:"zero" 0;}
button{cursor:pointer;font-family:inherit;transition:opacity .14s,transform .1s;}
button:active:not(:disabled){transform:scale(.92);}
button:disabled{cursor:default;opacity:.35;}
input{font-family:inherit;}
input:focus{outline:none;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{transform:scale(.55);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}
`;

// ═══ UTILS ════════════════════════════════════════════════════════════════════
const emptyPen    = () => Array.from({length:N}, () => Array(N).fill(0));
const emptyPencil = () => Array.from({length:N}, () => Array(N).fill([]));
const clone       = x  => JSON.parse(JSON.stringify(x));
const key         = (r,c) => `${r},${c}`;

function buildCageMap(cages) {
  const m = {};
  cages.forEach((cage,i) => cage.cells.forEach(([r,c]) => { m[key(r,c)] = i; }));
  return m;
}
function topLeft(cage) {
  return [...cage.cells].sort(([r1,c1],[r2,c2]) => r1!==r2?r1-r2:c1-c2)[0];
}
function evalCage(cage, pen) {
  const v = cage.cells.map(([r,c]) => pen[r][c]);
  if (v.some(x=>!x)) return "?";
  const {op, target} = cage;
  if (!op)    return v[0]===target?"ok":"err";
  if (op==="+") return v.reduce((a,b)=>a+b,0)===target?"ok":"err";
  if (op==="×") return v.reduce((a,b)=>a*b,1)===target?"ok":"err";
  if (op==="-") return Math.abs(v[0]-v[1])===target?"ok":"err";
  if (op==="÷") { const mx=Math.max(...v),mn=Math.min(...v); return mn&&mx%mn===0&&mx/mn===target?"ok":"err"; }
  return "?";
}
function getConflicts(pen) {
  const bad = new Set();
  for (let r=0;r<N;r++) {
    const s={};
    for (let c=0;c<N;c++) { const v=pen[r][c]; if(!v) continue; if(s[v]!=null){bad.add(key(r,c));bad.add(key(r,s[v]));}else s[v]=c; }
  }
  for (let c=0;c<N;c++) {
    const s={};
    for (let r=0;r<N;r++) { const v=pen[r][c]; if(!v) continue; if(s[v]!=null){bad.add(key(r,c));bad.add(key(s[v],c));}else s[v]=r; }
  }
  return bad;
}

// ═══ IN-BROWSER PUZZLE GENERATOR ══════════════════════════════════════════════

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Latin square via random permutation groups — instant, always valid
function genLatinSquare(n) {
  const rowP = shuffle(Array.from({length:n},(_,i)=>i));
  const colP = shuffle(Array.from({length:n},(_,i)=>i));
  const digP = shuffle(Array.from({length:n},(_,i)=>i));
  return Array.from({length:n},(_,r) =>
    Array.from({length:n},(_,c) => digP[(rowP[r]+colP[c])%n]+1)
  );
}

// Cage shape templates — anchor cell is [0,0], offsets applied at placement
const TPL_H = [
  [[0,0],[0,1]],  [[0,0],[0,-1]],
  [[0,0],[0,1],[0,2]],  [[0,0],[0,-1],[0,-2]],  [[0,0],[0,-1],[0,1]],
];
const TPL_V = [
  [[0,0],[1,0]],  [[0,0],[-1,0]],
  [[0,0],[1,0],[2,0]],  [[0,0],[-1,0],[-2,0]],  [[0,0],[-1,0],[1,0]],
];
const TPL_L = [
  [[0,0],[0,1],[1,0]],  [[0,0],[0,-1],[1,0]],  [[0,0],[0,1],[-1,0]],  [[0,0],[0,-1],[-1,0]],
  [[0,0],[0,1],[1,1]],  [[0,0],[0,1],[-1,1]],  [[0,0],[0,-1],[1,-1]], [[0,0],[0,-1],[-1,-1]],
  [[0,0],[1,0],[1,1]],  [[0,0],[1,0],[1,-1]],  [[0,0],[-1,0],[-1,1]],[[0,0],[-1,0],[-1,-1]],
];
const TPL_FOUR = [
  [[0,0],[0,1],[1,0],[1,1]],    [[0,0],[0,-1],[1,0],[1,-1]],
  [[0,0],[0,1],[-1,0],[-1,1]], [[0,0],[0,-1],[-1,0],[-1,-1]],
  [[0,0],[1,0],[2,0],[2,1]],   [[0,0],[1,0],[2,0],[2,-1]],
  [[0,0],[-1,0],[-2,0],[-2,1]],[[0,0],[-1,0],[-2,0],[-2,-1]],
  [[0,0],[0,1],[0,2],[1,0]],   [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[0,-1],[0,-2],[1,0]], [[0,0],[0,-1],[0,-2],[1,-2]],
  [[0,0],[0,1],[0,2],[1,1]],   [[0,0],[0,1],[0,2],[-1,1]],
  [[0,0],[1,0],[2,0],[1,1]],   [[0,0],[1,0],[2,0],[1,-1]],
  [[0,0],[0,1],[1,1],[1,2]],   [[0,0],[0,-1],[1,-1],[1,-2]],
  [[0,0],[0,1],[-1,1],[-1,2]], [[0,0],[0,-1],[-1,-1],[-1,-2]],
];

function canPlace(cells, covered, n) {
  return cells.every(([r,c]) => r>=0 && r<n && c>=0 && c<n && !covered.has(key(r,c)));
}

// Weighted cage type selection — balances H / V / L ~equally, 4-cell capped at 2
function pickType(sc) {
  const {H,V,L,F} = sc, m = H+V+L+F;
  const allowF = F < 2;
  const wH = Math.max(0.08, 0.35 - (m>0 ? H/m : 0));
  const wV = Math.max(0.08, 0.35 - (m>0 ? V/m : 0));
  const wL = Math.max(0.08, 0.30 - (m>0 ? L/m : 0));
  const wF = allowF ? 0.15 : 0;
  const tot = wH+wV+wL+wF;
  let r = Math.random()*tot;
  r -= wH; if (r<=0) return 'H';
  r -= wV; if (r<=0) return 'V';
  r -= wL; if (r<=0) return 'L';
  return 'F';
}

// Weighted operator selection — boosts ÷ and - when underrepresented, caps × at 5
function pickOp(vals, oc) {
  const n = vals.length;
  if (n === 1) return {op:'', target:vals[0]};
  const boost = op => Math.max(1, 6 - Math.max(0, (oc[op]||0) - 2));
  // Hard cap: once we have 5 × cages, weight drops to near-zero for multi-cell
  const multCount = oc['×'] || 0;
  const multW = n === 2
    ? Math.max(0.5, boost('×') * (1 - Math.max(0, multCount - 3) * 0.3))
    : Math.max(0,   boost('×') * (1 - Math.max(0, multCount - 3) * 0.5));
  const cs = [];
  if (n === 2) {
    const mx = Math.max(...vals), mn = Math.min(...vals);
    cs.push({op:'+', target:vals[0]+vals[1],            w:boost('+')});
    if (Math.abs(vals[0]-vals[1])>0)
      cs.push({op:'-', target:Math.abs(vals[0]-vals[1]), w:boost('-')});
    cs.push({op:'×', target:vals[0]*vals[1],             w:multW});
    if (mx % mn === 0) {
      const divTarget = mx/mn;
      const BANNED_DIV = new Set([5,6,7,8,9]);
      if (!BANNED_DIV.has(divTarget))
        cs.push({op:'÷', target:divTarget, w:boost('÷')*3});
    }
  } else {
    const sum  = vals.reduce((a,b)=>a+b,0);
    const prod = vals.reduce((a,b)=>a*b,1);
    cs.push({op:'+', target:sum, w:boost('+')});
    if (prod <= 1500 && multW > 0) cs.push({op:'×', target:prod, w:multW});
  }
  const tot = cs.reduce((s,c)=>s+c.w, 0);
  let r = Math.random()*tot;
  for (const c of cs) { r -= c.w; if (r<=0) return c; }
  return cs[cs.length-1];
}

// Tile the 9×9 grid with cages — runs in ~1ms
function genCages(sol, n) {
  const covered = new Set(), cages = [];
  const sc = {H:0,V:0,L:0,F:0};
  const oc = {'+':0,'-':0,'×':0,'÷':0};

  let cells = [];
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) cells.push([r,c]);
  cells = shuffle(cells);

  for (const [ar,ac] of cells) {
    if (covered.has(key(ar,ac))) continue;

    const type = pickType(sc);
    const tpls = type==='H' ? TPL_H : type==='V' ? TPL_V : type==='F' ? TPL_FOUR : TPL_L;

    let placed = false;

    for (const tpl of shuffle(tpls)) {
      const attempt = tpl.map(([dr,dc]) => [ar+dr, ac+dc]);
      if (canPlace(attempt, covered, n)) {
        attempt.forEach(([r,c]) => covered.add(key(r,c)));
        const {op, target} = pickOp(attempt.map(([r,c])=>sol[r][c]), oc);
        cages.push({cells:attempt, op, target});
        sc[type]++;
        if (op) oc[op]++;
        placed = true;
        break;
      }
    }

    // Fallback: simpler 2-cell and L-corner shapes
    if (!placed) {
      for (const tpl of shuffle([...TPL_H.slice(0,2), ...TPL_V.slice(0,2), ...TPL_L.slice(0,4)])) {
        const attempt = tpl.map(([dr,dc]) => [ar+dr, ac+dc]);
        if (canPlace(attempt, covered, n)) {
          attempt.forEach(([r,c]) => covered.add(key(r,c)));
          const {op, target} = pickOp(attempt.map(([r,c])=>sol[r][c]), oc);
          cages.push({cells:attempt, op, target});
          const rows = new Set(attempt.map(([r])=>r));
          const t2 = attempt.length===2 ? (rows.size===1?'H':'V') : 'L';
          sc[t2]++;
          if (op) oc[op]++;
          placed = true;
          break;
        }
      }
    }

    // Last resort: single-cell cage (will be merged in post-processing)
    if (!placed) {
      covered.add(key(ar,ac));
      cages.push({cells:[[ar,ac]], op:'', target:sol[ar][ac]});
    }
  }

  // ── Post-process: absorb excess singles into any adjacent cage ───────
  // Build a full cell→cageIndex map (all cages, not just singles)
  const DIRS = [[0,1],[0,-1],[1,0],[-1,0]];

  function buildCellMap() {
    const m = {};
    cages.forEach((cg,i) => { if(cg) cg.cells.forEach(([r,c]) => { m[key(r,c)] = i; }); });
    return m;
  }

  let singles = cages.map((cg,i) => cg.cells.length===1 ? i : -1).filter(i=>i>=0);

  while (singles.length > 3) {
    const cellMap = buildCellMap();
    let merged = false;

    // Prefer merging single+single first (keeps cages small), then single+any
    for (const preferSingleOnly of [true, false]) {
      if (merged) break;
      for (const si of shuffle(singles)) {
        if (!cages[si] || cages[si].cells.length !== 1) continue;
        const [r,c] = cages[si].cells[0];
        for (const [dr,dc] of shuffle(DIRS)) {
          const nr = r+dr, nc = c+dc;
          if (nr<0||nr>=n||nc<0||nc>=n) continue;
          const ni = cellMap[key(nr,nc)];
          if (ni === undefined || ni === si || !cages[ni]) continue;
          const neighborSize = cages[ni].cells.length;
          if (preferSingleOnly && neighborSize !== 1) continue;
          const newSize = neighborSize + 1;
          if (newSize > 4) continue; // never exceed 4-cell
          // Enforce 4-cell cap of 2 during merge
          if (newSize === 4) {
            const fourCount = cages.filter(Boolean).filter(cg => cg.cells.length === 4).length;
            if (fourCount >= 2) continue;
          }
          // Absorb single (si) into neighbor cage (ni)
          const newCells = [...cages[ni].cells, [r,c]];
          const vals = newCells.map(([rr,cc]) => sol[rr][cc]);
          const {op, target} = pickOp(vals, oc);
          cages[ni] = {cells: newCells, op, target};
          cages[si] = null;
          if (op) oc[op]++;
          merged = true;
          break;
        }
        if (merged) break;
      }
    }

    cages.splice(0, cages.length, ...cages.filter(Boolean));
    singles = cages.map((cg,i) => cg.cells.length===1 ? i : -1).filter(i=>i>=0);
    if (!merged) break; // safety — truly isolated, give up
  }

  return cages;
}

// Public entry — retries up to 3 times to keep singles ≤ 3
function generatePuzzle() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const solution = genLatinSquare(N);
    const cages    = genCages(solution, N);
    if (cages.filter(cg => cg.cells.length === 1).length <= 3) {
      return {id:`p_${Date.now()}`, solution, cages};
    }
  }
  // Guaranteed fallback (rare): just return last attempt regardless
  const solution = genLatinSquare(N);
  return {id:`p_${Date.now()}`, solution, cages: genCages(solution, N)};
}

// ═══ MAIN COMPONENT ═══════════════════════════════════════════════════════════
export default function KenKen() {
  const [screen,    setScreen]    = useState("login");
  const [nameInput, setNameInput] = useState("");
  const [username,  setUsername]  = useState("");
  const [users,     setUsers]     = useState({});
  const [statsData, setStatsData] = useState([]);
  const [themeName, setThemeName] = useState("pantone");

  const [puzzle, setPuzzle] = useState(null);

  const [pen,    setPen]    = useState(emptyPen);
  const [pencil, setPencil] = useState(emptyPencil);
  const [mode,   setMode]   = useState("pen");
  const [won,    setWon]    = useState(false);
  const [elapsed, setElapsed] = useState("00:00");
  const [wrongFlash, setWrongFlash] = useState(new Set());
  const flashTimer = useRef(null);
  const [cageFontScale, setCageFontScale] = useState(1.5);
  const [pencilFontScale, setPencilFontScale] = useState(1.0);
  const [pencilGridScale, setPencilGridScale] = useState(1.1);

  const [sel,    setSel]    = useState(null);
  const [selSet, setSelSet] = useState(new Set());

  const histRef        = useRef({stack:[{pen:emptyPen(),pencil:emptyPencil()}], index:0});
  const [histTick, setHistTick] = useState(0);
  const saveTimer      = useRef(null);
  const pencilInputted = useRef(false);

  // Timer: accumulated seconds + current active-period start
  const accumRef       = useRef(0);
  const activeStartRef = useRef(null);

  const T = THEMES[themeName] || THEMES.dark;

  function fmtSec(s) {
    const t = Math.max(0, Math.round(s));
    return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
  }
  function liveElapsed() {
    return accumRef.current + (activeStartRef.current ? (Date.now()-activeStartRef.current)/1000 : 0);
  }
  function pauseTimer() {
    if (activeStartRef.current) { accumRef.current += (Date.now()-activeStartRef.current)/1000; activeStartRef.current=null; }
  }
  function resumeTimer() { if (!activeStartRef.current) activeStartRef.current = Date.now(); }

  // ─── Timer tick ───────────────────────────────────────────────────
  useEffect(()=>{
    if (screen!=="game"||won) return;
    resumeTimer();
    const t = setInterval(()=>setElapsed(fmtSec(liveElapsed())), 1000);
    return () => clearInterval(t);
  },[screen,won,puzzle]);

  // ─── Pause on tab/window inactive ─────────────────────────────────
  useEffect(()=>{
    const onHide =()=>{ if(screen==="game"&&!won) pauseTimer(); };
    const onShow =()=>{ if(screen==="game"&&!won) resumeTimer(); };
    const onVis  =()=>{ document.hidden ? onHide() : onShow(); };
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("blur",onHide);
    window.addEventListener("focus",onShow);
    return()=>{
      document.removeEventListener("visibilitychange",onVis);
      window.removeEventListener("blur",onHide);
      window.removeEventListener("focus",onShow);
    };
  },[screen,won]);

  // ─── Init ─────────────────────────────────────────────────────────
  useEffect(()=>{ initApp(); },[]);
  async function initApp(){
    try {
      const u=await window.storage.get("kenken_users",true).catch(()=>null);
      if(u) setUsers(JSON.parse(u.value));
      const last=await window.storage.get("kenken_last_user").catch(()=>null);
      if(last){ const n=last.value; setUsername(n); setNameInput(n); if(await restoreGame(n)) setScreen("game"); }
    } catch(e){}
  }

  async function restoreGame(name){
    try {
      const s=await window.storage.get(`kenken_game_${name}`).catch(()=>null);
      if(!s) return false;
      const d=JSON.parse(s.value); if(!d.puzzle) return false;
      setPuzzle(d.puzzle); setPen(d.pen||emptyPen()); setPencil(d.pencil||emptyPencil());
      histRef.current={stack:d.histStack||[{pen:d.pen||emptyPen(),pencil:d.pencil||emptyPencil()}],index:d.histIdx??0};
      setHistTick(t=>t+1); setWon(d.won||false);
      // Restore timer state
      accumRef.current = d.accum || 0;
      activeStartRef.current = null;
      setElapsed(fmtSec(accumRef.current));
      return true;
    } catch(e){ return false; }
  }

  function scheduleSave(state){
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      if(!username) return;
      try{ await window.storage.set(`kenken_game_${username}`,JSON.stringify(state)); }catch(e){}
    },600);
  }

  // ─── Login ────────────────────────────────────────────────────────
  async function handleLogin(){
    const name=nameInput.trim(); if(!name) return;
    setUsername(name);
    const nu={...clone(users)};
    if(!nu[name]) nu[name]={registered:Date.now(),completed:0,totalTime:0};
    nu[name].lastSeen=Date.now(); setUsers(nu);
    try{ await window.storage.set("kenken_users",JSON.stringify(nu),true); await window.storage.set("kenken_last_user",name); }catch(e){}
    const restored=await restoreGame(name);
    if(!restored) startNewGame(name);
    setScreen("game");
  }

  // ─── New game — synchronous, instant ──────────────────────────────
  function startNewGame(forUser){
    accumRef.current = 0; activeStartRef.current = null; setElapsed("00:00");
    const ep=emptyPen(),epc=emptyPencil();
    setPen(ep); setPencil(epc);
    histRef.current={stack:[{pen:ep,pencil:epc}],index:0};
    setHistTick(v=>v+1); setWon(false); setSel(null); setSelSet(new Set()); pencilInputted.current=false;
    const p = generatePuzzle();
    setPuzzle(p);
    const uname = forUser || username;
    if(uname) scheduleSave({puzzle:p,pen:ep,pencil:epc,histStack:[{pen:ep,pencil:epc}],histIdx:0,won:false,accum:0});
  }

  // ─── Derived ──────────────────────────────────────────────────────
  const cageMap  = useMemo(()=>puzzle?buildCageMap(puzzle.cages):{},[puzzle]);
  const conflicts= useMemo(()=>getConflicts(pen),[pen]);
  const cageStat = useMemo(()=>{ if(!puzzle) return {}; const s={}; puzzle.cages.forEach((c,i)=>{s[i]=evalCage(c,pen);}); return s; },[puzzle,pen]);

  // Win detection
  useEffect(()=>{
    if(!puzzle||won) return;
    if(conflicts.size>0||pen.some(r=>r.some(v=>!v))) return;
    if(puzzle.cages.every((_,i)=>cageStat[i]==="ok")){
      pauseTimer();
      (async()=>{
      setWon(true);
      const el = Math.round(accumRef.current);
      const nu=clone(users);
      if(nu[username]){nu[username].completed++;nu[username].totalTime+=el;nu[username].lastCompleted=Date.now();}
      setUsers(nu);
      window.storage.set("kenken_users",JSON.stringify(nu),true).catch(()=>{});
      window.storage.set(`kenken_game_${username}`,JSON.stringify({puzzle,pen,pencil,histStack:histRef.current.stack,histIdx:histRef.current.index,won:true,accum:el})).catch(()=>{});
      // Load leaderboard for win screen
      try {
        const u=await window.storage.get("kenken_users",true).catch(()=>null);
        if(u){ const parsed=JSON.parse(u.value); const arr=Object.entries(parsed).map(([name,d])=>({name,completed:d.completed||0,avgTime:d.completed?Math.floor(d.totalTime/d.completed):0})).sort((a,b)=>b.completed-a.completed||a.avgTime-b.avgTime); setStatsData(arr); }
      } catch(e){}
      })();
    }
  },[pen,cageStat,conflicts,puzzle,won]);

  // ─── History ──────────────────────────────────────────────────────
  function pushHistState(np,npc){
    const {stack,index}=histRef.current;
    const ns=[...stack.slice(0,index+1),{pen:clone(np),pencil:clone(npc)}].slice(-80);
    histRef.current={stack:ns,index:ns.length-1}; setHistTick(t=>t+1);
    scheduleSave({puzzle,pen:np,pencil:npc,histStack:ns,histIdx:ns.length-1,won,accum:accumRef.current});
  }
  function undo(){ const {stack,index}=histRef.current; if(index<=0) return; const ni=index-1,s=stack[ni]; histRef.current={stack,index:ni}; setPen(clone(s.pen)); setPencil(clone(s.pencil)); setHistTick(t=>t+1); scheduleSave({puzzle,pen:s.pen,pencil:s.pencil,histStack:stack,histIdx:ni,won,accum:accumRef.current}); }
  function redo(){ const {stack,index}=histRef.current; if(index>=stack.length-1) return; const ni=index+1,s=stack[ni]; histRef.current={stack,index:ni}; setPen(clone(s.pen)); setPencil(clone(s.pencil)); setHistTick(t=>t+1); scheduleSave({puzzle,pen:s.pen,pencil:s.pencil,histStack:stack,histIdx:ni,won,accum:accumRef.current}); }

  // ─── Selection ────────────────────────────────────────────────────
  function handleCellClick(r,c){
    if(mode==="pen"){
      pencilInputted.current=false;
      setSel(s=>s&&s[0]===r&&s[1]===c?null:[r,c]);
      setSelSet(new Set());
    } else {
      if(pencilInputted.current){
        pencilInputted.current=false;
        setSel([r,c]);
        setSelSet(new Set([key(r,c)]));
      } else {
        setSel([r,c]);
        setSelSet(prev=>{ const ns=new Set(prev); const k=key(r,c); if(ns.has(k)) ns.delete(k); else ns.add(k); return ns; });
      }
    }
  }

  // ─── Input ────────────────────────────────────────────────────────
  function inputNum(n){
    if(!puzzle) return;
    if(mode==="pen"){
      if(!sel) return;
      const [r,c]=sel;
      const np=clone(pen),npc=clone(pencil);
      np[r][c]=np[r][c]===n?0:n;
      if(np[r][c]!==0){
        npc[r][c]=[];
        for(let cc=0;cc<N;cc++) if(cc!==c) npc[r][cc]=(npc[r][cc]||[]).filter(v=>v!==n);
        for(let rr=0;rr<N;rr++) if(rr!==r) npc[rr][c]=(npc[rr][c]||[]).filter(v=>v!==n);
      }
      setPen(np); setPencil(npc); pushHistState(np,npc);
    } else {
      const targets=selSet.size>0?[...selSet].map(k=>k.split(",").map(Number)):(sel?[sel]:[]);
      if(targets.length===0) return;
      pencilInputted.current=true;
      const npc=clone(pencil);
      targets.forEach(([r,c])=>{
        if(pen[r][c]!==0) return;
        // Build set of pen values already placed in same row or col
        const usedInLine = new Set();
        for(let cc=0;cc<N;cc++) if(cc!==c && pen[r][cc]) usedInLine.add(pen[r][cc]);
        for(let rr=0;rr<N;rr++) if(rr!==r && pen[rr][c]) usedInLine.add(pen[rr][c]);
        // If the number is already placed in the same line, remove it from marks (don't add)
        const marks=[...(npc[r][c]||[])];
        const i=marks.indexOf(n);
        if(usedInLine.has(n)){
          // Auto-remove if somehow present, never add
          if(i>=0) marks.splice(i,1);
        } else {
          if(i>=0) marks.splice(i,1); else marks.push(n);
        }
        npc[r][c]=marks.sort((a,b)=>a-b);
      });
      setPencil(npc); pushHistState(pen,npc);
    }
  }

  function clearSel(){
    if(!puzzle) return;
    if(mode==="pen"){
      if(!sel) return;
      const [r,c]=sel;
      const np=clone(pen),npc=clone(pencil);
      np[r][c]=0; npc[r][c]=[];
      setPen(np); setPencil(npc); pushHistState(np,npc);
    } else {
      const targets=selSet.size>0?[...selSet].map(k=>k.split(",").map(Number)):(sel?[sel]:[]);
      if(targets.length===0) return;
      const npc=clone(pencil);
      targets.forEach(([r,c])=>{ npc[r][c]=[]; });
      setPencil(npc); pushHistState(pen,npc);
      // Reset selection after deletion, same as after insertion
      pencilInputted.current=true;
    }
  }

  function checkWrong(){
    if(!puzzle) return;
    const bad = new Set();
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const v=pen[r][c];
      if(v && v!==puzzle.solution[r][c]) bad.add(key(r,c));
    }
    if(bad.size===0) return;
    setWrongFlash(bad);
    clearTimeout(flashTimer.current);
    flashTimer.current=setTimeout(()=>setWrongFlash(new Set()), 2000);
  }

  function switchMode(m){
    pencilInputted.current=false;
    setMode(m);
    if(m==="pen"){ setSelSet(new Set()); } else { setSel(null); }
  }

  // ─── Keyboard ─────────────────────────────────────────────────────
  useEffect(()=>{
    const h=(e)=>{
      if(screen!=="game") return;
      if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key==="z"){ e.preventDefault(); undo(); return; }
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||(e.shiftKey&&e.key==="z"))){ e.preventDefault(); redo(); return; }
      if(e.key==="p"){ switchMode("pen"); return; }
      if(e.key==="k"){ switchMode("pencil"); return; }
      const n=parseInt(e.key);
      if(n>=1&&n<=9){ inputNum(n); return; }
      if(e.key==="Backspace"||e.key==="Delete"||e.key==="0"){ clearSel(); return; }
      if(sel){
        const [r,c]=sel;
        const mv={ArrowUp:[r-1,c],ArrowDown:[r+1,c],ArrowLeft:[r,c-1],ArrowRight:[r,c+1]};
        if(mv[e.key]){
          const [nr,nc]=mv[e.key];
          if(nr>=0&&nr<N&&nc>=0&&nc<N){
            e.preventDefault(); setSel([nr,nc]);
            if(mode==="pencil"){
              if(e.shiftKey){ setSelSet(prev=>{ const ns=new Set(prev); ns.add(key(nr,nc)); return ns; }); }
              else           { setSelSet(new Set([key(nr,nc)])); }
            }
          }
        }
      }
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  });

  // ─── Leaderboard ──────────────────────────────────────────────────
  async function openStats(){
    try {
      const u=await window.storage.get("kenken_users",true).catch(()=>null);
      if(u){ const parsed=JSON.parse(u.value); const arr=Object.entries(parsed).map(([name,d])=>({name,completed:d.completed||0,avgTime:d.completed?Math.floor(d.totalTime/d.completed):0})).sort((a,b)=>b.completed-a.completed||a.avgTime-b.avgTime); setStatsData(arr); }
    } catch(e){}
    setScreen("stats");
  }


  // ─── Layout ───────────────────────────────────────────────────────
  const CELL  = Math.min(54, Math.floor(Math.min(typeof window!=="undefined"?window.innerWidth-12:498,498)/N));
  const CELL_H = Math.floor(CELL * 1.3);
  const GRIDW = CELL*N;

  // ═══ LOGIN ════════════════════════════════════════════════════════
  if(screen==="login") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",padding:24,fontFamily:"JetBrains Mono,monospace"}}>
      <style>{FONTS}</style>
      <div style={{marginBottom:44,textAlign:"center"}}>
        <h1 style={{fontFamily:"Playfair Display,serif",fontSize:72,fontWeight:900,color:T.logoColor,letterSpacing:"-3px",lineHeight:1}}>KenKen</h1>
        <p style={{color:T.dimText,fontSize:10,letterSpacing:".38em",marginTop:7,textTransform:"uppercase"}}>9×9 · arithmetic puzzle</p>
      </div>
      <div style={{width:"100%",maxWidth:340,background:T.panelBg,border:`1px solid ${T.panelBorder}`,borderRadius:14,padding:"24px 22px"}}>
        <p style={{color:T.mutedText,fontSize:12,marginBottom:16,lineHeight:1.75}}>Enter your name to play. Progress saves across sessions.</p>
        <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Your name…" autoFocus
          style={{width:"100%",padding:"12px 14px",background:T.inputBg,border:`1.5px solid ${T.inputBorder}`,borderRadius:7,color:T.numColor,fontSize:15,marginBottom:12,display:"block"}}/>
        <button onClick={handleLogin} style={{width:"100%",padding:12,borderRadius:7,border:"none",background:T.accent,color:T.accentText,fontSize:14,fontWeight:700}}>Play →</button>
      </div>
      <button onClick={openStats} style={{marginTop:14,background:"transparent",border:`1px solid ${T.panelBorder}`,borderRadius:7,padding:"7px 20px",color:T.dimText,fontSize:11}}>🏆 Leaderboard</button>
      <button onClick={()=>setThemeName(n=>n==="dark"?"pantone":"dark")} style={{marginTop:8,background:"transparent",border:`1px solid ${T.panelBorder}`,borderRadius:7,padding:"7px 20px",color:T.dimText,fontSize:11}}>{themeName==="dark"?"🌿 Pantone":"🌑 Dark"}</button>
    </div>
  );

  // ═══ STATS ════════════════════════════════════════════════════════
  if(screen==="stats") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",padding:24,fontFamily:"JetBrains Mono,monospace"}}>
      <style>{FONTS}</style>
      <h2 style={{fontFamily:"Playfair Display,serif",fontSize:44,fontWeight:900,color:T.logoColor,marginBottom:6}}>Leaderboard</h2>
      <p style={{color:T.veryDimText,fontSize:10,letterSpacing:".3em",marginBottom:28,textTransform:"uppercase"}}>Global Rankings</p>
      <div style={{width:"100%",maxWidth:440,background:T.panelBg,borderRadius:12,border:`1px solid ${T.panelBorder}`,overflow:"hidden",marginBottom:24}}>
        {statsData.length===0
          ?<p style={{color:T.dimText,textAlign:"center",padding:36,fontSize:12}}>No players yet!</p>
          :statsData.map((u,i)=>(
            <div key={u.name} style={{display:"flex",alignItems:"center",padding:"11px 16px",borderBottom:i<statsData.length-1?`1px solid ${T.panelBorder}`:"none",background:u.name===username?`${T.accent}18`:"transparent"}}>
              <span style={{width:22,height:22,borderRadius:"50%",flexShrink:0,marginRight:11,background:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":T.panelBorder,color:i<3?"#000":T.dimText,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{i+1}</span>
              <span style={{flex:1,color:u.name===username?T.accent:T.numColor,fontSize:13,fontWeight:u.name===username?700:400}}>{u.name}</span>
              <span style={{color:T.green,fontSize:12,marginRight:12,fontWeight:700}}>{u.completed}✓</span>
              <span style={{color:T.dimText,fontSize:10}}>{u.avgTime?`${Math.floor(u.avgTime/60)}m${u.avgTime%60}s`:"—"}</span>
            </div>
          ))}
      </div>
      <button onClick={()=>setScreen(username?"game":"login")} style={{background:T.accent,color:T.accentText,border:"none",borderRadius:7,padding:"10px 28px",fontSize:13,fontWeight:700}}>
        {username?"← Back to Game":"Play"}
      </button>
    </div>
  );

  // ═══ WIN SCREEN ═══════════════════════════════════════════════════
  if(screen==="game"&&won) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",padding:"24px 16px",fontFamily:"JetBrains Mono,monospace",animation:"fadeIn .4s ease"}}>
      <style>{FONTS}</style>
      {/* Trophy + title */}
      <div style={{textAlign:"center",marginBottom:28,animation:"pop .5s cubic-bezier(.34,1.56,.64,1)"}}>
        <div style={{fontSize:64,lineHeight:1,marginBottom:10}}>🏆</div>
        <h1 style={{fontFamily:"Playfair Display,serif",fontSize:52,fontStyle:"italic",fontWeight:900,color:T.logoColor,margin:0}}>Solved!</h1>
        <p style={{color:T.dimText,fontSize:10,letterSpacing:".3em",marginTop:6,textTransform:"uppercase"}}>puzzle complete</p>
      </div>

      {/* Time card */}
      <div style={{background:T.panelBg,border:`1px solid ${T.panelBorder}`,borderRadius:14,padding:"18px 36px",textAlign:"center",marginBottom:20}}>
        <p style={{color:T.dimText,fontSize:10,letterSpacing:".2em",textTransform:"uppercase",marginBottom:6}}>Your time</p>
        <p style={{color:T.timerColor,fontSize:44,fontWeight:700,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{elapsed}</p>
        <p style={{color:T.mutedText,fontSize:12,marginTop:8}}>Well played, <strong style={{color:T.accent}}>{username}</strong>!</p>
      </div>

      {/* Leaderboard */}
      <div style={{width:"100%",maxWidth:400,background:T.panelBg,borderRadius:12,border:`1px solid ${T.panelBorder}`,overflow:"hidden",marginBottom:24}}>
        <p style={{color:T.dimText,fontSize:9,letterSpacing:".25em",textTransform:"uppercase",padding:"10px 16px 6px",borderBottom:`1px solid ${T.panelBorder}`}}>Leaderboard</p>
        {statsData.length===0
          ?<p style={{color:T.dimText,textAlign:"center",padding:24,fontSize:12}}>No other players yet</p>
          :statsData.slice(0,8).map((u,i)=>(
            <div key={u.name} style={{display:"flex",alignItems:"center",padding:"9px 14px",borderBottom:i<Math.min(statsData.length,8)-1?`1px solid ${T.panelBorder}`:"none",background:u.name===username?`${T.accent}18`:"transparent"}}>
              <span style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginRight:10,background:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":T.panelBorder,color:i<3?"#000":T.dimText,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700}}>{i+1}</span>
              <span style={{flex:1,color:u.name===username?T.accent:T.numColor,fontSize:12,fontWeight:u.name===username?700:400}}>{u.name}</span>
              <span style={{color:T.green,fontSize:11,marginRight:10,fontWeight:700}}>{u.completed}✓</span>
              <span style={{color:T.dimText,fontSize:10}}>{u.avgTime?`${Math.floor(u.avgTime/60)}m${u.avgTime%60}s`:"—"}</span>
            </div>
          ))}
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={()=>setWon(false)} style={{padding:"11px 22px",borderRadius:7,border:`1.5px solid ${T.panelBorder}`,background:"transparent",color:T.numColor,fontSize:13}}>Review</button>
        <button onClick={()=>startNewGame(username)} style={{padding:"11px 28px",borderRadius:7,border:"none",background:T.accent,color:T.accentText,fontSize:13,fontWeight:700}}>New Puzzle →</button>
      </div>
    </div>
  );
  if (!puzzle) { startNewGame(username||"Player"); return null; }

  const {stack,index:histIndex}=histRef.current;
  const canUndo=histIndex>0, canRedo=histIndex<stack.length-1;

  const labelMap={};
  puzzle.cages.forEach((cg,i)=>{ const[lr,lc]=topLeft(cg); labelMap[key(lr,lc)]=i; });
  const multiCount=mode==="pencil"?selSet.size:0;

  function numIsActive(n){
    if(mode==="pen") return sel&&pen[sel[0]][sel[1]]===n;
    const targets=selSet.size>0?[...selSet].map(k=>k.split(",").map(Number)):(sel?[sel]:[]);
    const editable=targets.filter(([r,c])=>pen[r][c]===0);
    return editable.length>0&&editable.every(([r,c])=>(pencil[r]?.[c]||[]).includes(n));
  }

  return (
    <div style={{minHeight:"100vh",background:T.gridBg,display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 6px 30px",fontFamily:"JetBrains Mono,monospace",userSelect:"none"}}>
      <style>{FONTS}</style>

      {/* Top bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",maxWidth:GRIDW+14,marginBottom:8}}>
        <div style={{display:"flex",alignItems:"baseline",gap:7}}>
          <span style={{fontFamily:"Playfair Display,serif",fontSize:24,fontWeight:900,color:T.logoColor}}>KenKen</span>
          <span style={{color:T.veryDimText,fontSize:9,letterSpacing:".14em"}}>9×9</span>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color:T.timerColor,fontSize:18,fontWeight:700,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{elapsed}</div>
          <div style={{color:T.dimText,fontSize:9.5,marginTop:1}}>{username}</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{border:`${CAGE_LINE_W} solid ${T.cageLine}`,lineHeight:0,borderRadius:2,boxShadow:themeName==="dark"?"0 0 40px rgba(255,255,255,.05),0 18px 44px rgba(0,0,0,.75)":"0 4px 24px rgba(60,90,55,.18)"}}>
        {Array.from({length:N},(_,r)=>(
          <div key={r} style={{display:"flex"}}>
            {Array.from({length:N},(_,c)=>{
              const cid    = cageMap[key(r,c)];
              const cg     = puzzle.cages[cid];
              const lidx   = labelMap[key(r,c)];
              const pv     = pen[r][c];
              const marks  = pencil[r]?.[c]||[];
              const inCon  = conflicts.has(key(r,c));
              const stat   = cageStat[cid];
              const cageOk = stat==="ok"&&!inCon;
              const cageErr= stat==="err";
              const isPenSel=mode==="pen"&&sel&&sel[0]===r&&sel[1]===c;
              const isPclSel=mode==="pencil"&&selSet.has(key(r,c));
              const isSel  = isPenSel||isPclSel;

              let bg=T.cellBg;
              if(wrongFlash.has(key(r,c)))  bg=T.conflictBg;
              else if(isPenSel)             bg=T.selPenBg;
              else if(isPclSel)             bg=T.selPclBg;
              else if((inCon||cageErr)&&pv) bg=T.conflictBg;
              else if(cageOk&&pv)           bg=T.cageOkBg;

              const numColor=wrongFlash.has(key(r,c))?T.red:inCon||cageErr?T.red:cageOk?T.green:T.numColor;
              const cageBR=c===N-1||cageMap[key(r,c+1)]!==cid;
              const cageBB=r===N-1||cageMap[key(r+1,c)]!==cid;

              return (
                <div key={c} onClick={()=>handleCellClick(r,c)} style={{
                  width:CELL,height:CELL_H,position:"relative",
                  background:bg,display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",overflow:"hidden",
                  borderRight:cageBR?`${CAGE_LINE_W} solid ${T.cageLine}`:T.thinLine,
                  borderBottom:cageBB?`${CAGE_LINE_W} solid ${T.cageLine}`:T.thinLine,
                  transition:"background .1s",
                  zIndex:0,
                }}>
                  {lidx!==undefined&&(
                    <span style={{position:"absolute",top:2,left:3,fontSize:Math.max(7,Math.floor(CELL*0.22*cageFontScale)),fontWeight:700,color:T.cageLabelColor,lineHeight:1,pointerEvents:"none",whiteSpace:"nowrap",zIndex:1}}>
                      {String(cg.target).replace(/0/g,'𝟢')}{cg.op==="÷"?"/":cg.op}
                    </span>
                  )}
                  {pv>0&&(
                    <span style={{fontSize:CELL>44?22:17,fontWeight:700,color:numColor,lineHeight:1,transition:"color .1s"}}>{pv}</span>
                  )}
                  {pv===0&&marks.length>0&&(()=>{
                    const gSize    = Math.floor(Math.min(CELL, CELL_H) * 0.82 * pencilGridScale);
                    const cellSlot = gSize / 3;
                    const fontSize = Math.max(5, Math.min(cellSlot * 0.95, cellSlot * pencilFontScale));
                    return (
                      <div style={{position:"absolute",bottom:2,right:2,width:gSize,height:gSize,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(3,1fr)",overflow:"hidden"}}>
                        {[1,2,3,4,5,6,7,8,9].map(n=>(
                          <div key={n} style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize,fontWeight:700,color:marks.includes(n)?T.pencilBlue:"transparent",lineHeight:1}}>
                            {marks.includes(n)?n:""}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{width:"100%",maxWidth:GRIDW+14,marginTop:10,display:"flex",flexDirection:"column",gap:8}}>

        {/* Mode toggle + pencil badge + undo/redo */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{display:"flex",background:T.modeBg,borderRadius:7,padding:3,border:`1px solid ${T.btnBorder}`}}>
              {[{m:"pen",icon:"✒",label:"Pen"},{m:"pencil",icon:"✏",label:"Pencil"}].map(({m,icon,label})=>(
                <button key={m} onClick={()=>switchMode(m)} style={{
                  padding:"5px 12px",borderRadius:5,border:"none",
                  background:mode===m?(m==="pen"?T.accent:T.modeActivePcl):"transparent",
                  color:mode===m?(m==="pen"?T.accentText:T.numColor):T.dimText,
                  fontSize:10.5,fontWeight:700,letterSpacing:".04em",transition:"all .14s",
                }}>{icon} {label}</button>
              ))}
            </div>
            {multiCount>0&&(
              <div style={{background:`${T.pencilBlue}20`,border:`1px solid ${T.pencilBlue}55`,borderRadius:5,padding:"3px 8px",color:T.pencilBlue,fontSize:9.5,fontWeight:700}}>
                {multiCount} cell{multiCount>1?"s":""} ✓
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:4}}>
            {[{sym:"↩",fn:undo,dis:!canUndo},{sym:"↪",fn:redo,dis:!canRedo}].map(({sym,fn,dis})=>(
              <button key={sym} onClick={fn} disabled={dis} style={{width:34,height:34,borderRadius:6,border:`1px solid ${T.btnBorder}`,background:T.btnBg,color:dis?T.veryDimText:T.mutedText,fontSize:15}}>{sym}</button>
            ))}
          </div>
        </div>

        {/* Number pad */}
        <div style={{display:"flex",gap:3}}>
          {Array.from({length:9},(_,i)=>i+1).map(n=>{
            const active=numIsActive(n);
            return (
              <button key={n} onClick={()=>inputNum(n)} style={{
                flex:1,height:42,borderRadius:6,
                border:`1.5px solid ${active?(mode==="pen"?T.selPenRing:T.selPclRing):T.btnBorder}`,
                background:active?(mode==="pen"?`${T.selPenRing}20`:`${T.selPclRing}20`):T.btnBg,
                color:active?(mode==="pen"?T.selPenRing:T.selPclRing):T.numColor,
                fontSize:17,fontWeight:700,transition:"all .1s",
              }}>{n}</button>
            );
          })}
          <button onClick={clearSel} style={{width:42,height:42,borderRadius:6,flexShrink:0,border:`1px solid ${T.red}30`,background:`${T.red}0C`,color:T.red,fontSize:15}}>⌫</button>
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"center",flexWrap:"wrap"}}>
          {[{color:T.selPenRing,label:"Pen sel"},{color:T.pencilBlue,label:"Pencil sel"},{color:T.green,label:"Cage ✓"},{color:T.red,label:"Conflict"}].map(({color,label})=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:2,background:color,opacity:.85}}/>
              <span style={{color:T.dimText,fontSize:8.5}}>{label}</span>
            </div>
          ))}
        </div>

        {/* Font size controls */}
        <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",flexWrap:"wrap"}}>
          {[
            {label:"Clue",    scale:cageFontScale,   set:setCageFontScale,   min:0.75, max:2.7,  base:1.5},
            {label:"↔ Grid",  scale:pencilGridScale,  set:setPencilGridScale, min:0.33, max:1.32, base:1.1},
            {label:"Aᵢ Font", scale:pencilFontScale,  set:setPencilFontScale, min:0.4,  max:2.5,  base:1.0},
          ].map(({label,scale,set,min,max,base})=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:3}}>
              <span style={{color:T.dimText,fontSize:8.5,width:36,textAlign:"right"}}>{label}</span>
              <button onClick={()=>set(s=>+(Math.max(min,s-0.1)).toFixed(2))} style={{width:24,height:24,borderRadius:5,border:`1px solid ${T.btnBorder}`,background:T.btnBg,color:T.mutedText,fontSize:13,lineHeight:1}}>−</button>
              <span style={{color:T.dimText,fontSize:8.5,width:26,textAlign:"center"}}>{Math.round(scale/base*100)}%</span>
              <button onClick={()=>set(s=>+(Math.min(max,s+0.1)).toFixed(2))} style={{width:24,height:24,borderRadius:5,border:`1px solid ${T.btnBorder}`,background:T.btnBg,color:T.mutedText,fontSize:13,lineHeight:1}}>+</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={checkWrong} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.red}40`,background:`${T.red}0C`,color:T.red,fontSize:10,fontWeight:700}}>🔍 Check</button>
          {[{l:"🏆 Board",f:openStats},{l:"↺ Reset",f:()=>{const ep=emptyPen(),epc=emptyPencil();setPen(ep);setPencil(epc);pushHistState(ep,epc);setSel(null);setSelSet(new Set());}},{l:"🎲 New",f:()=>startNewGame(username)}].map(({l,f})=>(
            <button key={l} onClick={f} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${T.btnBorder}`,background:"transparent",color:T.dimText,fontSize:10}}>{l}</button>
          ))}
          <button onClick={()=>setThemeName(n=>n==="dark"?"pantone":"dark")} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${T.btnBorder}`,background:"transparent",color:T.dimText,fontSize:10}}>{themeName==="dark"?"🌿 Pantone":"🌑 Dark"}</button>
        </div>

        <p style={{textAlign:"center",color:T.veryDimText,fontSize:8.5,lineHeight:1.7}}>
          Pencil: tap multiple cells then press a number to mark all · Shift+Arrow expands selection<br/>
          P=Pen · K=Pencil · Arrows navigate · Backspace clears · Ctrl+Z/Y undo/redo
        </p>
      </div>

    </div>
  );
}
