/* =====================================================================
   AETHER SAND  —  a high-fidelity falling-sand simulator
   Vanilla JS · cellular-automata + real heat field + ballistic particles
   ===================================================================== */

(() => {
  "use strict";

  /* ============================ Material IDs ======================== */
  const EMPTY=0, WALL=1, SAND=2, RAINBOW=3, WATER=4, ICE=5, SNOW=6, SALT=7,
        OIL=8, ACID=9, LAVA=10, FIRE=11, SMOKE=12, STEAM=13, WOOD=14,
        PLANT=15, GLASS=16, STONE=17, METAL=18, GUNPOWDER=19, FIREWORK=20,
        SPARK=21, COAL=22, HEAT=23, COOL=24, CLONER=25, VOID=26;

  // cell types
  const STATIC=0, POWDER=1, LIQUID=2, GAS=3, TOOL=4;

  const AMBIENT = 20;

  /* ============================ Material table ===================== */
  // trans: phase transitions by temperature [{c:+1 above / -1 below, t, to, p}]
  const M = {
    [EMPTY]:    { name:"Eraser", type:TOOL,   d:0,   c1:[0,0,0],       c2:[0,0,0] },
    [WALL]:     { name:"Wall",   type:STATIC, d:1e5, c1:[70,74,86],    c2:[52,56,66],  k:0.05 },
    [SAND]:     { name:"Sand",   type:POWDER, d:200, c1:[233,196,106], c2:[199,158,74], k:0.05,
                  trans:[{c:1,t:1100,to:GLASS,p:0.25}] },
    [RAINBOW]:  { name:"Rainbow",type:POWDER, d:200, c1:[255,90,90],   c2:[120,90,255], k:0.05, rainbow:true },
    [WATER]:    { name:"Water",  type:LIQUID, d:100, disp:7, c1:[56,140,224], c2:[40,108,196], a:205, k:0.13,
                  trans:[{c:1,t:100,to:STEAM},{c:-1,t:0,to:ICE,p:0.18}] },
    [ICE]:      { name:"Ice",    type:STATIC, d:1e4, c1:[176,224,246], c2:[140,196,224], a:230, k:0.10, base:-12,
                  trans:[{c:1,t:0,to:WATER,p:0.25}] },
    [SNOW]:     { name:"Snow",   type:POWDER, d:50,  c1:[245,250,255], c2:[214,226,238], k:0.08, base:-3,
                  trans:[{c:1,t:1,to:WATER,p:0.3}] },
    [SALT]:     { name:"Salt",   type:POWDER, d:190, c1:[240,240,246], c2:[206,210,222], k:0.05 },
    [OIL]:      { name:"Oil",    type:LIQUID, d:80,  disp:4, c1:[86,72,58], c2:[58,48,40], a:235, k:0.04, flam:1,
                  trans:[{c:1,t:180,to:FIRE,p:0.5}] },
    [ACID]:     { name:"Acid",   type:LIQUID, d:105, disp:4, c1:[150,240,80], c2:[110,200,40], a:220, k:0.06, emit:0.35 },
    [LAVA]:     { name:"Lava",   type:LIQUID, d:160, disp:1, c1:[255,140,40], c2:[196,52,16], k:0.08, base:1100,
                  trans:[{c:-1,t:400,to:STONE,p:0.35}] },
    [FIRE]:     { name:"Fire",   type:GAS,    d:1,   c1:[255,230,150], c2:[255,80,24], k:0.2, base:650 },
    [SMOKE]:    { name:"Smoke",  type:GAS,    d:2,   c1:[54,54,62], c2:[28,28,34], a:150, k:0.05 },
    [STEAM]:    { name:"Steam",  type:GAS,    d:3,   c1:[210,218,230], c2:[170,180,196], a:120, k:0.08, base:110,
                  trans:[{c:-1,t:95,to:WATER,p:0.02}] },
    [WOOD]:     { name:"Wood",   type:STATIC, d:1e4, c1:[120,79,46], c2:[92,58,32], k:0.02, flam:1,
                  trans:[{c:1,t:250,to:FIRE,p:0.4}] },
    [PLANT]:    { name:"Plant",  type:STATIC, d:1e4, c1:[86,176,74], c2:[54,128,52], k:0.03, flam:1,
                  trans:[{c:1,t:180,to:FIRE,p:0.4}] },
    [GLASS]:    { name:"Glass",  type:STATIC, d:1e4, c1:[180,220,235], c2:[150,196,214], a:120, k:0.05,
                  trans:[{c:1,t:1450,to:LAVA,p:0.04}] },
    [STONE]:    { name:"Stone",  type:STATIC, d:1e4, c1:[128,132,142], c2:[92,96,108], k:0.06,
                  trans:[{c:1,t:1050,to:LAVA,p:0.15}] },
    [METAL]:    { name:"Metal",  type:STATIC, d:1e4, c1:[150,158,176], c2:[104,112,130], k:0.45, cond:1,
                  trans:[{c:1,t:1400,to:LAVA,p:0.05}] },
    [GUNPOWDER]:{ name:"Powder", type:POWDER, d:180, c1:[70,72,80], c2:[42,44,52], k:0.05, flam:1 },
    [FIREWORK]: { name:"Firework",type:POWDER,d:150, c1:[230,90,120], c2:[120,120,200], k:0.05 },
    [SPARK]:    { name:"Spark",  type:TOOL,   d:0,   c1:[180,240,255], c2:[120,210,255] },
    [COAL]:     { name:"Coal",   type:POWDER, d:210, c1:[58,58,64], c2:[30,30,34], k:0.06, flam:1 },
    [HEAT]:     { name:"Heat",   type:TOOL,   d:0,   c1:[255,150,60], c2:[255,80,30] },
    [COOL]:     { name:"Freeze", type:TOOL,   d:0,   c1:[160,224,255], c2:[96,174,255] },
    [CLONER]:   { name:"Cloner", type:STATIC, d:1e4, c1:[120,232,200], c2:[64,168,150], k:0.05 },
    [VOID]:     { name:"Void",   type:STATIC, d:1e5, c1:[70,34,104], c2:[26,12,46], k:0.02 },
  };

  // fast lookup arrays
  const MAXID = 27;
  const TYPE=new Int8Array(MAXID), DENS=new Float32Array(MAXID), COND=new Float32Array(MAXID),
        EMIT=new Float32Array(MAXID), FLAM=new Uint8Array(MAXID), BASET=new Float32Array(MAXID),
        WINDF=new Float32Array(MAXID), CHCOND=new Uint8Array(MAXID);
  for (let id=0; id<MAXID; id++){
    const m=M[id]; if(!m) continue;
    TYPE[id]=m.type; DENS[id]=m.d||0; COND[id]=m.k!=null?m.k:0.05;
    EMIT[id]=m.emit||0; FLAM[id]=m.flam?1:0; BASET[id]=m.base!=null?m.base:AMBIENT;
  }
  EMIT[FIRE]=1; EMIT[LAVA]=1;
  COND[EMPTY]=0.04;
  WINDF[SMOKE]=1; WINDF[STEAM]=1; WINDF[FIRE]=1; WINDF[SNOW]=0.7;
  WINDF[WATER]=0.25; WINDF[OIL]=0.25; WINDF[ACID]=0.25;
  WINDF[SAND]=0.08; WINDF[SALT]=0.08; WINDF[GUNPOWDER]=0.08; WINDF[RAINBOW]=0.08; WINDF[COAL]=0.06;
  CHCOND[METAL]=1; CHCOND[WATER]=1; CHCOND[ACID]=1; CHCOND[GUNPOWDER]=1; CHCOND[FIREWORK]=1;

  // palette shown in UI
  const PALETTE = [SAND, RAINBOW, WATER, ICE, SNOW, SALT, OIL, ACID, LAVA, FIRE,
                   COAL, GUNPOWDER, FIREWORK, SPARK, HEAT, COOL, WOOD, PLANT,
                   METAL, STONE, GLASS, CLONER, VOID, SMOKE, WALL, EMPTY];

  const SPAWN_PROB = {
    [SAND]:0.85,[RAINBOW]:0.85,[WATER]:0.9,[SNOW]:0.7,[SALT]:0.8,[OIL]:0.9,
    [ACID]:0.8,[LAVA]:0.95,[FIRE]:0.5,[SMOKE]:0.4,[GUNPOWDER]:0.85,[COAL]:0.9,
    [ICE]:1,[WOOD]:1,[PLANT]:1,[METAL]:1,[STONE]:1,[GLASS]:1,[WALL]:1,
    [FIREWORK]:0.5,[EMPTY]:1,
  };

  /* ============================ Canvas / state ===================== */
  const sim=document.getElementById("sim"), glow=document.getElementById("glow");
  const sctx=sim.getContext("2d"), gctx=glow.getContext("2d");
  sctx.imageSmoothingEnabled=false; gctx.imageSmoothingEnabled=false;

  let SCALE,W,H,N;
  let grid,shade,life,vel,charge,moved,temp,tempB;
  let simImg,sim32,glowImg,glow32;
  let LS,LW,LH,LN,lightR,lightG,lightB,lightT;
  let lighting=true;

  function allocate(w,h){
    const old = grid ? {grid,temp,W,H} : null;
    W=w; H=h; N=W*H;
    grid=new Uint8Array(N); shade=new Uint8Array(N); life=new Int16Array(N);
    vel=new Float32Array(N); charge=new Int8Array(N); moved=new Uint8Array(N);
    temp=new Float32Array(N).fill(AMBIENT); tempB=new Float32Array(N);
    sim.width=W; sim.height=H; glow.width=W; glow.height=H;
    simImg=sctx.createImageData(W,H); glowImg=gctx.createImageData(W,H);
    sim32=new Uint32Array(simImg.data.buffer); glow32=new Uint32Array(glowImg.data.buffer);
    LS=3; LW=Math.ceil(W/LS); LH=Math.ceil(H/LS); LN=LW*LH;
    lightR=new Float32Array(LN); lightG=new Float32Array(LN);
    lightB=new Float32Array(LN); lightT=new Float32Array(LN);
    if(old){
      const cw=Math.min(old.W,W),ch=Math.min(old.H,H);
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
        const a=y*W+x,b=y*old.W+x; grid[a]=old.grid[b]; temp[a]=old.temp[b];
      }
    }
  }
  function resize(){
    SCALE=Math.max(3,Math.ceil(window.innerWidth/560));
    allocate(Math.ceil(window.innerWidth/SCALE), Math.ceil(window.innerHeight/SCALE));
  }

  /* ============================ Helpers ============================ */
  const rnd=Math.random;
  const r255=()=> (rnd()*256)|0;
  const clamp=(v,a,b)=> v<a?a:v>b?b:v;

  function defaultLife(m){
    switch(m){
      case FIRE: return 50+(rnd()*60|0);
      case SMOKE: return 110+(rnd()*150|0);
      case STEAM: return 150+(rnd()*150|0);
      case FIREWORK: return 18+(rnd()*36|0);
      case COAL: return 480+(rnd()*320|0);
      default: return 0;
    }
  }
  function convert(i,m){ grid[i]=m; shade[i]=r255(); life[i]=defaultLife(m); vel[i]=0; moved[i]=1; }
  function spawn(i,m){ convert(i,m); temp[i]=BASET[m]; charge[i]=0; }

  function swap(a,b){
    let t;
    t=grid[a];grid[a]=grid[b];grid[b]=t;
    t=shade[a];shade[a]=shade[b];shade[b]=t;
    t=life[a];life[a]=life[b];life[b]=t;
    t=vel[a];vel[a]=vel[b];vel[b]=t;
    t=temp[a];temp[a]=temp[b];temp[b]=t;
    t=charge[a];charge[a]=charge[b];charge[b]=t;
    moved[a]=1; moved[b]=1;
  }
  function canDisplace(srcM,dst){
    const dm=grid[dst];
    if(dm===EMPTY) return true;
    if(TYPE[dm]===STATIC) return false;
    return DENS[dm] < DENS[srcM];
  }
  function applySrc(i,target,rate){ temp[i]+=(target-temp[i])*rate; }
  function heatN(i,amt){
    const x=i%W;
    if(i-W>=0)temp[i-W]+=amt; if(i+W<N)temp[i+W]+=amt;
    if(x>0)temp[i-1]+=amt; if(x<W-1)temp[i+1]+=amt;
  }
  function forN8(x,i,fn){
    const off=[-W-1,-W,-W+1,-1,1,W-1,W,W+1];
    const dxs=[-1,0,1,-1,1,-1,0,1];
    for(let k=0;k<8;k++){
      const ni=i+off[k]; if(ni<0||ni>=N) continue;
      const nx=x+dxs[k]; if(nx<0||nx>=W) continue;
      if(fn(ni,grid[ni])) return true;
    }
    return false;
  }
  function forCard(i,fn){
    const x=i%W;
    if(i-W>=0)fn(i-W); if(i+W<N)fn(i+W);
    if(x>0)fn(i-1); if(x<W-1)fn(i+1);
  }

  /* ============================ Gravity / wind ===================== */
  let GX=0,GY=1,zeroG=false,WIND=0;
  const GACCEL=0.45, MAXV=9;
  let FALL,RISE,PERP;
  function dirOffsets(dx,dy){
    const str=[dy*W+dx,dx,dy];
    let dias;
    if(dx===0) dias=[[dy*W-1,-1,dy],[dy*W+1,1,dy]];
    else if(dy===0) dias=[[-W+dx,dx,-1],[W+dx,dx,1]];
    else dias=[[dy*W,0,dy],[dx,dx,0]];
    return {str,dias};
  }
  function setGravity(gx,gy){
    GX=gx; GY=gy; zeroG=(gx===0&&gy===0);
    FALL=dirOffsets(gx,gy); RISE=dirOffsets(-gx,-gy);
    PERP = gx===0 ? [[1,1,0],[-1,-1,0]] : [[W,0,1],[-W,0,-1]];
  }

  function applyWind(x,i,m){
    if(WIND===0) return;
    const wf=WINDF[m]; if(!wf) return;
    if(rnd()<Math.abs(WIND)*wf*0.9){
      const dir=WIND>0?1:-1, nx=x+dir;
      if(nx>=0&&nx<W && canDisplace(m,i+dir)) swap(i,i+dir);
    }
  }

  /* ============================ Movement =========================== */
  function brownian(x,y,i,m){
    if(rnd()<0.22){
      const d=rnd()*4|0, dx=[1,-1,0,0][d], dy=[0,0,1,-1][d];
      const nx=x+dx,ny=y+dy;
      if(nx>=0&&nx<W&&ny>=0&&ny<H&&canDisplace(m,i+dy*W+dx)){swap(i,i+dy*W+dx);return true;}
    }
    return false;
  }
  function moveFalling(x,y,i,m){
    if(zeroG) return brownian(x,y,i,m);
    let v=vel[i]+GACCEL; if(v>MAXV)v=MAXV; vel[i]=v;
    const steps=(v|0)||1;
    const sOff=FALL.str[0],sdx=FALL.str[1],sdy=FALL.str[2];
    let ci=i,cx=x,cy=y,did=false;
    for(let s=0;s<steps;s++){
      const nx=cx+sdx,ny=cy+sdy;
      if(nx<0||nx>=W||ny<0||ny>=H) break;
      const ni=ci+sOff;
      if(canDisplace(m,ni)){ swap(ci,ni); ci=ni;cx=nx;cy=ny;did=true; } else break;
    }
    if(did) return true;
    const dl=FALL.dias, order = rnd()<0.5?[dl[0],dl[1]]:[dl[1],dl[0]];
    for(const d of order){
      const nx=x+d[1],ny=y+d[2];
      if(nx<0||nx>=W||ny<0||ny>=H) continue;
      const ni=i+d[0];
      if(canDisplace(m,ni)){ swap(i,ni); vel[ni]*=0.55; return true; }
    }
    vel[i]=1; return false;
  }
  function moveLiquid(x,y,i,m,disp){
    if(moveFalling(x,y,i,m)) return true;
    if(zeroG) return false;
    const first=rnd()<0.5?0:1;
    for(let s=0;s<2;s++){
      const p=PERP[(first+s)%2];
      let target=i;
      for(let kk=1;kk<=disp;kk++){
        const nx=x+p[1]*kk,ny=y+p[2]*kk;
        if(nx<0||nx>=W||ny<0||ny>=H) break;
        const ni=i+p[0]*kk;
        if(canDisplace(m,ni)) target=ni; else break;
      }
      if(target!==i){ swap(i,target); return true; }
    }
    return false;
  }
  function moveGas(x,y,i,m){
    if(zeroG) return brownian(x,y,i,m);
    const cand=[RISE.str];
    const dl=RISE.dias; if(rnd()<0.5){cand.push(dl[0],dl[1]);} else {cand.push(dl[1],dl[0]);}
    for(const d of cand){
      const nx=x+d[1],ny=y+d[2];
      if(nx<0||nx>=W||ny<0||ny>=H) continue;
      const ni=i+d[0];
      if(canDisplace(m,ni)){ swap(i,ni); return true; }
    }
    if(rnd()<0.6){
      const dir=rnd()<0.5?1:-1,nx=x+dir;
      if(nx>=0&&nx<W&&canDisplace(m,i+dir)){swap(i,i+dir);return true;}
    }
    return false;
  }

  /* ============================ Thermal transitions =============== */
  function tryThermal(i,m){
    const tr=M[m].trans; if(!tr) return false;
    const t=temp[i];
    for(let k=0;k<tr.length;k++){
      const r=tr[k];
      if((r.c>0 ? t>=r.t : t<=r.t) && (r.p==null || rnd()<r.p)){
        convert(i,r.to); return true;
      }
    }
    return false;
  }

  /* ============================ Explosions ======================== */
  function explode(cx,cy,power){
    const r=power, r2=r*r;
    for(let dy=-r;dy<=r;dy++){
      const ny=cy+dy; if(ny<0||ny>=H) continue;
      for(let dx=-r;dx<=r;dx++){
        const nx=cx+dx; if(nx<0||nx>=W) continue;
        const dd=dx*dx+dy*dy; if(dd>r2) continue;
        const i=ny*W+nx, m=grid[i];
        if(m===WALL) continue;
        temp[i]=Math.max(temp[i],520);
        if(dd<r2*0.32){
          if(FLAM[m]||m===GUNPOWDER||m===EMPTY) convert(i,FIRE);
          else if(TYPE[m]===POWDER||TYPE[m]===LIQUID) grid[i]=EMPTY;
        } else if(FLAM[m]||m===GUNPOWDER){ temp[i]=Math.max(temp[i],260); }
      }
    }
    const cnt=24+(rnd()*22|0);
    for(let a=0;a<cnt;a++){
      const ang=rnd()*6.2832, spd=0.8+rnd()*3.2;
      addP(cx,cy,Math.cos(ang)*spd,Math.sin(ang)*spd,22+rnd()*26,255,150+(rnd()*80|0),40,KSPARK);
    }
  }

  /* ============================ Per-material ====================== */
  function upFire(x,y,i){
    applySrc(i,650,0.5); heatN(i,18);
    if(--life[i]<=0){ if(rnd()<0.5) convert(i,SMOKE); else grid[i]=EMPTY; return; }
    moveGas(x,y,i,FIRE); applyWind(x,i,FIRE);
  }
  function upLava(x,y,i){
    applySrc(i,1100,0.55); heatN(i,22);
    if(rnd()<0.6) moveLiquid(x,y,i,LAVA,1);
  }
  function upWater(x,y,i){
    forN8(x,i,(ni,nm)=>{ if(nm===SALT && rnd()<0.02){ grid[ni]=EMPTY; } return false; });
    moveLiquid(x,y,i,WATER,M[WATER].disp); applyWind(x,i,WATER);
  }
  function upSteam(x,y,i){
    if(--life[i]<=0){ convert(i, rnd()<0.4?WATER:EMPTY); return; }
    moveGas(x,y,i,STEAM); applyWind(x,i,STEAM);
  }
  function upSmoke(x,y,i){
    if(--life[i]<=0 || (y===0&&rnd()<0.08)){ grid[i]=EMPTY; return; }
    moveGas(x,y,i,SMOKE); applyWind(x,i,SMOKE);
  }
  function upAcid(x,y,i){
    let gone=false;
    forN8(x,i,(ni,nm)=>{
      if(nm!==EMPTY&&nm!==ACID&&nm!==WALL&&nm!==GLASS&&TYPE[nm]!==GAS && rnd()<0.05){
        grid[ni]=EMPTY;
        if(rnd()<0.4){ grid[i]=EMPTY; gone=true; return true; }
      }
      return false;
    });
    if(gone) return;
    moveLiquid(x,y,i,ACID,M[ACID].disp); applyWind(x,i,ACID);
  }
  function upSalt(x,y,i){
    let d=false;
    forCard(i,(ni)=>{ if(grid[ni]===WATER && rnd()<0.012){ grid[i]=EMPTY; d=true; } });
    if(!d) moveFalling(x,y,i,SALT);
  }
  function upSnow(x,y,i){
    applySrc(i,-3,0.2);
    if(rnd()<0.6) moveFalling(x,y,i,SNOW);
    applyWind(x,i,SNOW);
  }
  function upIce(i){ applySrc(i,-12,0.3); }
  function upPlant(x,y,i){
    let water=-1; const empties=[];
    forN8(x,i,(ni,nm)=>{ if(nm===WATER) water=ni; else if(nm===EMPTY) empties.push(ni); return false; });
    if(water>=0 && empties.length && rnd()<0.1){
      empties.sort((a,b)=>a-b);
      const tgt = rnd()<0.7?empties[0]:empties[(rnd()*empties.length)|0];
      convert(tgt,PLANT); temp[tgt]=temp[i]; grid[water]=EMPTY;
    }
  }
  function upGunpowder(x,y,i){
    if(temp[i]>=200){ explode(x,y,6); grid[i]=EMPTY; return; }
    let lit=false;
    forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA){ lit=true; return true;} return false; });
    if(lit){ explode(x,y,6); grid[i]=EMPTY; return; }
    moveFalling(x,y,i,GUNPOWDER);
  }
  function upCoal(x,y,i){
    if(temp[i]>320){
      applySrc(i,640,0.18); heatN(i,12);
      if(rnd()<0.05){ const e=emptyNeighbor(x,i); if(e>=0) convert(e,FIRE); }
      if(--life[i]<=0){ convert(i, rnd()<0.5?SMOKE:EMPTY); return; }
    }
    moveFalling(x,y,i,COAL);
  }
  function upFirework(x,y,i){
    if(--life[i]<=0 || temp[i]>120){ launchRocket(x,y); grid[i]=EMPTY; return; }
    moveFalling(x,y,i,FIREWORK);
  }
  function upCloner(x,y,i){
    let src=life[i];
    if(src<=0){
      forN8(x,i,(ni,nm)=>{
        if(nm!==EMPTY&&nm!==CLONER&&nm!==VOID&&nm!==WALL&&TYPE[nm]!==TOOL){ src=nm; return true; }
        return false;
      });
      if(src>0) life[i]=src;
    }
    if(src>0 && rnd()<0.5){ const e=emptyNeighbor(x,i); if(e>=0) spawn(e,src); }
  }
  function upVoid(x,y,i){
    forN8(x,i,(ni,nm)=>{
      if(nm!==EMPTY&&nm!==VOID&&nm!==WALL&&nm!==CLONER){ grid[ni]=EMPTY; charge[ni]=0; vel[ni]=0; }
      return false;
    });
  }
  function emptyNeighbor(x,i){
    const c=[[-W,0,-1],[W,0,1],[-1,-1,0],[1,1,0]];
    const s=rnd()*4|0;
    for(let k=0;k<4;k++){
      const d=c[(s+k)%4]; const nx=x+d[1];
      if(nx<0||nx>=W) continue; const ni=i+d[0];
      if(ni>=0&&ni<N&&grid[ni]===EMPTY) return ni;
    }
    return -1;
  }

  /* ============================ Charge (electricity) ============== */
  // Electricity travels as a constant-strength pulse leaving a brief
  // refractory trail (charge<0) so a current can run the full length of a wire.
  function propagateCharge(){
    for(let i=0;i<N;i++){
      const c=charge[i];
      if(c===0) continue;
      if(c<0){ charge[i]=c+1; continue; }
      const m=grid[i];
      applySrc(i,140,0.5);
      if(m===GUNPOWDER){ const x=i%W; explode(x,(i/W)|0,6); grid[i]=EMPTY; charge[i]=0; continue; }
      if(m===FIREWORK){ life[i]=0; }
      if(FLAM[m]){ heatN(i,26); temp[i]+=16; }
      if(m===WATER && rnd()<0.05){ convert(i,STEAM); }
      forCard(i,(ni)=>{ if(charge[ni]===0 && CHCOND[grid[ni]]) charge[ni]=4; });
      const nc=c-1;
      charge[i]= nc>0 ? nc : -8;
    }
  }

  /* ============================ Particle system =================== */
  const MAXP=4500, KSPARK=0, KEMBER=1, KROCKET=2;
  const PX=new Float32Array(MAXP),PY=new Float32Array(MAXP),
        PVX=new Float32Array(MAXP),PVY=new Float32Array(MAXP),
        PL=new Float32Array(MAXP),PM=new Float32Array(MAXP),
        PR=new Uint8Array(MAXP),PG=new Uint8Array(MAXP),PB=new Uint8Array(MAXP),
        PK=new Uint8Array(MAXP);
  let pn=0;
  function addP(x,y,vx,vy,life,r,g,b,kind){
    if(pn>=MAXP) return;
    const k=pn++; PX[k]=x;PY[k]=y;PVX[k]=vx;PVY[k]=vy;PL[k]=life;PM[k]=life;
    PR[k]=r;PG[k]=g;PB[k]=b;PK[k]=kind;
  }
  function killP(k){ pn--; if(k!==pn){ PX[k]=PX[pn];PY[k]=PY[pn];PVX[k]=PVX[pn];PVY[k]=PVY[pn];
    PL[k]=PL[pn];PM[k]=PM[pn];PR[k]=PR[pn];PG[k]=PG[pn];PB[k]=PB[pn];PK[k]=PK[pn]; } }
  function launchRocket(x,y){
    const sp=2.0+rnd()*1.2;
    addP(x,y, -GX*sp+(rnd()-0.5)*0.8, -GY*sp+(rnd()-0.5)*0.8, 36+rnd()*22, 255,210,150, KROCKET);
  }
  function burst(x,y){
    const rainbow=rnd()<0.45, baseH=rnd()*360, count=70+(rnd()*60|0);
    for(let a=0;a<count;a++){
      const ang=rnd()*6.2832, spd=0.5+rnd()*2.6;
      const h=(rainbow?rnd()*360:baseH+(rnd()-0.5)*46)/360;
      const c=hsl(h,1,0.62);
      addP(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,28+rnd()*42,c[0],c[1],c[2],KSPARK);
    }
    const gi=((y|0)*W+(x|0)); if(gi>=0&&gi<N) temp[gi]+=60;
  }
  function updateParticles(){
    const wpx=WIND*0.06;
    for(let k=0;k<pn;){
      PVX[k]+=GX*0.05+wpx; PVY[k]+=GY*0.05;
      PVX[k]*=0.992; PVY[k]*=0.992;
      PX[k]+=PVX[k]; PY[k]+=PVY[k];
      PL[k]--;
      const kind=PK[k];
      if(kind===KROCKET){
        if(rnd()<0.85) addP(PX[k],PY[k],(rnd()-0.5)*0.3,(rnd()-0.5)*0.3,8+rnd()*8,255,170,70,KEMBER);
        const moving=(PVX[k]*GX+PVY[k]*GY);
        if(PL[k]<=0 || moving>=-0.15){ burst(PX[k],PY[k]); killP(k); continue; }
      } else {
        const gx=PX[k]|0, gy=PY[k]|0;
        if(gx<0||gx>=W||gy<0||gy>=H){ killP(k); continue; }
        const ci=gy*W+gx, cell=grid[ci];
        if(cell!==EMPTY){
          if(FLAM[cell]) temp[ci]+=34;
          if(TYPE[cell]===STATIC || TYPE[cell]===POWDER){ temp[ci]+=8; killP(k); continue; }
        }
      }
      if(PL[k]<=0){ killP(k); continue; }
      k++;
    }
  }

  /* ============================ Heat diffusion ==================== */
  function diffuse(){
    for(let y=0;y<H;y++){
      const row=y*W;
      for(let x=0;x<W;x++){
        const i=row+x, t=temp[i];
        let sum=0,cnt=0;
        if(y>0){sum+=temp[i-W];cnt++;}
        if(y<H-1){sum+=temp[i+W];cnt++;}
        if(x>0){sum+=temp[i-1];cnt++;}
        if(x<W-1){sum+=temp[i+1];cnt++;}
        const avg=sum/cnt;
        let nt=t+(avg-t)*COND[grid[i]];
        if(grid[i]===EMPTY) nt+=(AMBIENT-nt)*0.02;
        tempB[i]= nt<-60?-60: nt>2200?2200: nt;
      }
    }
    const tmp=temp; temp=tempB; tempB=tmp;
  }

  /* ============================ Simulation step =================== */
  function step(){
    moved.fill(0);
    const ltr = rnd()<0.5;
    for(let y=H-1;y>=0;y--){
      const row=y*W;
      for(let n=0;n<W;n++){
        const x=ltr?n:W-1-n;
        const i=row+x, m=grid[i];
        if(m===EMPTY||m===WALL||moved[i]) continue;
        if(tryThermal(i,m)) continue;
        switch(m){
          case SAND: case RAINBOW: moveFalling(x,y,i,m); break;
          case SALT: upSalt(x,y,i); break;
          case SNOW: upSnow(x,y,i); break;
          case WATER: upWater(x,y,i); break;
          case OIL: moveLiquid(x,y,i,OIL,M[OIL].disp); applyWind(x,i,OIL); break;
          case ACID: upAcid(x,y,i); break;
          case LAVA: upLava(x,y,i); break;
          case FIRE: upFire(x,y,i); break;
          case SMOKE: upSmoke(x,y,i); break;
          case STEAM: upSteam(x,y,i); break;
          case PLANT: upPlant(x,y,i); break;
          case ICE: upIce(i); break;
          case GUNPOWDER: upGunpowder(x,y,i); break;
          case COAL: upCoal(x,y,i); break;
          case FIREWORK: upFirework(x,y,i); break;
          case CLONER: upCloner(x,y,i); break;
          case VOID: upVoid(x,y,i); break;
          // WOOD, GLASS, STONE, METAL: thermal only
        }
      }
    }
    propagateCharge();
    diffuse();
    updateParticles();
  }

  /* ============================ Rendering ========================= */
  const lerp=(a,b,t)=>(a+(b-a)*t)|0;
  function hsl(h,s,l){
    let r,g,b;
    if(s===0){r=g=b=l;}
    else{
      const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
      const f=(t)=>{ if(t<0)t+=1; if(t>1)t-=1;
        if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q;
        if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
      r=f(h+1/3);g=f(h);b=f(h-1/3);
    }
    return [r*255|0,g*255|0,b*255|0];
  }
  const HEAT_STOPS=[[-40,[40,90,255]],[0,[0,200,255]],[20,[10,16,34]],
    [120,[70,230,120]],[320,[255,210,50]],[640,[255,90,20]],[1100,[255,245,210]]];
  function heatRGB(t){
    if(t<=HEAT_STOPS[0][0]) return HEAT_STOPS[0][1];
    for(let k=1;k<HEAT_STOPS.length;k++){
      if(t<=HEAT_STOPS[k][0]){
        const a=HEAT_STOPS[k-1],b=HEAT_STOPS[k],f=(t-a[0])/(b[0]-a[0]);
        return [lerp(a[1][0],b[1][0],f),lerp(a[1][1],b[1][1],f),lerp(a[1][2],b[1][2],f)];
      }
    }
    return HEAT_STOPS[HEAT_STOPS.length-1][1];
  }

  /* ============================ Dynamic lighting ================== */
  // Emissive cells/particles splat colour into a coarse buffer that is
  // blurred and added back onto nearby matter — real coloured light.
  function blurChan(buf,tmp,r){
    for(let y=0;y<LH;y++){ const row=y*LW;
      for(let x=0;x<LW;x++){ let s=0,c=0;
        for(let k=-r;k<=r;k++){ const xx=x+k; if(xx<0||xx>=LW)continue; s+=buf[row+xx]; c++; }
        tmp[row+x]=s/c; } }
    for(let x=0;x<LW;x++){
      for(let y=0;y<LH;y++){ let s=0,c=0;
        for(let k=-r;k<=r;k++){ const yy=y+k; if(yy<0||yy>=LH)continue; s+=tmp[yy*LW+x]; c++; }
        buf[y*LW+x]=s/c; } }
  }
  function blurLight(){
    for(let p=0;p<4;p++){ blurChan(lightR,lightT,2); blurChan(lightG,lightT,2); blurChan(lightB,lightT,2); }
  }
  function applyLight(){
    const GAIN=0.62;
    for(let i=0;i<N;i++){
      if(grid[i]===EMPTY) continue;
      const li=((((i/W)|0)/LS|0)*LW)+(((i%W)/LS)|0);
      const lr=lightR[li]*GAIN, lg=lightG[li]*GAIN, lb=lightB[li]*GAIN;
      if(lr<0.8&&lg<0.8&&lb<0.8) continue;
      const px=sim32[i];
      let r=(px&255)+lr, g=((px>>8)&255)+lg, b=((px>>16)&255)+lb;
      if(r>255)r=255; if(g>255)g=255; if(b>255)b=255;
      sim32[i]=(px&0xff000000)|((b|0)<<16)|((g|0)<<8)|(r|0);
    }
  }

  let heatMap=false;
  function render(now){
    const t=now*0.012;
    const lit = lighting && !heatMap;
    if(lit){ lightR.fill(0); lightG.fill(0); lightB.fill(0); }
    for(let i=0;i<N;i++){
      const m=grid[i];
      if(m===EMPTY){
        if(heatMap){
          const d=temp[i]-AMBIENT, mag=clamp(Math.abs(d)/60,0,1);
          if(mag>0.02){ const c=heatRGB(temp[i]); sim32[i]=((mag*150|0)<<24)|(c[2]<<16)|(c[1]<<8)|c[0]; }
          else sim32[i]=0;
        } else sim32[i]=0;
        glow32[i]=0; continue;
      }
      const mat=M[m], sh=shade[i]/255;
      let r,g,b,a=mat.a||255;

      if(heatMap){
        const c=heatRGB(temp[i]); r=c[0];g=c[1];b=c[2];
      } else if(m===RAINBOW){
        const h=((shade[i]*1.4 + t*40 + i*0.15)%360)/360;
        const c=hsl(h,0.95,0.6); r=c[0];g=c[1];b=c[2];
      } else if(m===FIRE){
        const lt=clamp(life[i]/100,0,1), fl=0.85+0.15*Math.sin(t*3+i);
        r=(255*fl)|0; g=(lerp(50,235,lt)*fl)|0; b=lerp(8,130,lt*lt);
      } else if(m===LAVA){
        const fl=0.78+0.22*Math.sin(t+i*0.7)*0.5+sh*0.18;
        r=Math.min(255,lerp(mat.c2[0],mat.c1[0],sh)*(0.9+fl*0.2))|0;
        g=Math.min(255,lerp(mat.c2[1],mat.c1[1],sh)*(0.7+fl*0.4))|0;
        b=lerp(mat.c2[2],mat.c1[2],sh);
      } else {
        r=lerp(mat.c1[0],mat.c2[0],sh); g=lerp(mat.c1[1],mat.c2[1],sh); b=lerp(mat.c1[2],mat.c2[2],sh);
        if(charge[i]>0){ const u=clamp(charge[i]/10,0,1);
          r=lerp(r,170,u); g=lerp(g,235,u); b=lerp(b,255,u); }
        // depth shading — surfaces exposed to empty above catch a soft rim light
        if(TYPE[m]!==GAS && i>=W && grid[i-W]===EMPTY){
          r+=((255-r)*0.12)|0; g+=((255-g)*0.12)|0; b+=((255-b)*0.12)|0;
        }
        // incandescence — hot matter glows like a heated blackbody
        const T=temp[i];
        if(T>500){
          const u=clamp((T-500)/950,0,1);
          const ig=clamp(55+u*200,0,255)|0, ib=clamp((u-0.42)*460,0,255)|0;
          const mix=clamp(u*1.05,0,0.94);
          r=lerp(r,255,mix); g=lerp(g,ig,mix); b=lerp(b,ib,mix);
        }
      }
      sim32[i]=(a<<24)|(b<<16)|(g<<8)|r;

      let ge=0;
      if(!heatMap){
        if(EMIT[m]){ const gw=EMIT[m]; ge=(255<<24)|(((b*gw)|0)<<16)|(((g*gw)|0)<<8)|((r*gw)|0); }
        else if(temp[i]>560){ const gi=clamp((temp[i]-560)/640,0,1); ge=((gi*235|0)<<24)|(b<<16)|(g<<8)|r; }
        else if(charge[i]>0){ const u=(clamp(charge[i]/8,0,1)*255)|0; ge=(u<<24)|(255<<16)|(235<<8)|120; }
        else if(m===ACID){ ge=(120<<24)|(40<<16)|(220<<8)|110; }
      }
      glow32[i]=ge;
      if(lit && ge){
        const a=(ge>>>24)*0.00392, li=((((i/W)|0)/LS|0)*LW)+(((i%W)/LS)|0);
        lightR[li]+=(ge&255)*a; lightG[li]+=((ge>>8)&255)*a; lightB[li]+=((ge>>16)&255)*a;
      }
    }
    if(lit){
      for(let k=0;k<pn;k++){
        const lx=(PX[k]/LS)|0, ly=(PY[k]/LS)|0;
        if(lx<0||lx>=LW||ly<0||ly>=LH) continue;
        const li=ly*LW+lx, a=clamp(PL[k]/PM[k],0,1)*0.6;
        lightR[li]+=PR[k]*a; lightG[li]+=PG[k]*a; lightB[li]+=PB[k]*a;
      }
      blurLight(); applyLight();
    }
    sctx.putImageData(simImg,0,0);
    gctx.putImageData(glowImg,0,0);
    drawParticles();
  }
  function drawParticles(){
    if(pn===0) return;
    gctx.save(); gctx.globalCompositeOperation="lighter";
    for(let k=0;k<pn;k++){
      const a=clamp(PL[k]/PM[k],0,1), r=PR[k],g=PG[k],b=PB[k];
      const sz=PK[k]===KROCKET?1.7:1.2;
      sctx.fillStyle="rgba("+r+","+g+","+b+","+a+")";
      sctx.fillRect(PX[k]-sz*0.5,PY[k]-sz*0.5,sz,sz);
      gctx.fillStyle="rgba("+r+","+g+","+b+","+(a*0.85)+")";
      gctx.fillRect(PX[k]-sz,PY[k]-sz,sz*2,sz*2);
    }
    gctx.restore();
  }

  /* ============================ Painting ========================== */
  let currentMat=SAND, brush=10, painting=false, eraseBtn=false;
  let lastPx=null,lastPy=null;
  let pointerInside=false,pointerX=0,pointerY=0;
  let fireworkCooldown=0;

  function paintTemp(cx,cy,sign){
    const rad=Math.max(2,brush), r2=rad*rad;
    const x0=Math.max(0,cx-rad),x1=Math.min(W-1,cx+rad);
    const y0=Math.max(0,cy-rad),y1=Math.min(H-1,cy+rad);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=x-cx,dy=y-cy,dd=dx*dx+dy*dy; if(dd>r2) continue;
      const i=y*W+x, f=1-Math.sqrt(dd)/(rad+0.001);
      if(sign>0) temp[i]=Math.min(1500, temp[i]+36*f);
      else temp[i]=Math.max(-50, temp[i]-32*f);
    }
  }
  function paintDisc(cx,cy,mat){
    if(mat===FIREWORK){ if(fireworkCooldown<=0){ launchRocket(cx,cy); fireworkCooldown=6; } return; }
    if(mat===SPARK){ paintSpark(cx,cy); return; }
    if(mat===HEAT){ paintTemp(cx,cy,1); return; }
    if(mat===COOL){ paintTemp(cx,cy,-1); return; }
    const rad=brush, prob=SPAWN_PROB[mat]??1, r2=rad*rad;
    const x0=Math.max(0,cx-rad),x1=Math.min(W-1,cx+rad);
    const y0=Math.max(0,cy-rad),y1=Math.min(H-1,cy+rad);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=x-cx,dy=y-cy; if(dx*dx+dy*dy>r2) continue;
      const i=y*W+x;
      if(mat===EMPTY){ grid[i]=EMPTY; charge[i]=0; temp[i]=AMBIENT; continue; }
      if(rnd()>prob) continue;
      const cur=grid[i];
      if(cur===EMPTY || TYPE[cur]===GAS || TYPE[mat]===STATIC) spawn(i,mat);
    }
  }
  function paintSpark(cx,cy){
    const rad=Math.max(2,brush*0.6), r2=rad*rad;
    const x0=Math.max(0,cx-rad),x1=Math.min(W-1,cx+rad);
    const y0=Math.max(0,cy-rad),y1=Math.min(H-1,cy+rad);
    let hit=false;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=x-cx,dy=y-cy; if(dx*dx+dy*dy>r2) continue;
      const i=y*W+x, m=grid[i];
      if(CHCOND[m]){ charge[i]=6; hit=true; }
      else if(FLAM[m]){ temp[i]+=120; hit=true; }
    }
    if(!hit){ for(let a=0;a<5;a++){ const ang=rnd()*6.28; addP(cx,cy,Math.cos(ang)*1.2,Math.sin(ang)*1.2,14,180,240,255,KSPARK);} }
  }
  function paintLine(x0,y0,x1,y1,mat){
    const dist=Math.hypot(x1-x0,y1-y0);
    const steps=Math.max(1,Math.floor(dist/Math.max(1,brush*0.4)));
    for(let s=0;s<=steps;s++){ const t=s/steps;
      paintDisc(Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t),mat); }
  }
  const toGrid=(cx,cy)=>[Math.floor(cx/SCALE),Math.floor(cy/SCALE)];

  /* ============================ Attract mode ===================== */
  let attract=true, attractT=0;
  function runAttract(){
    if(!attract) return;
    attractT+=0.018;
    const cx=(W*(0.5+0.32*Math.sin(attractT)))|0;
    for(let k=0;k<3;k++){
      const x=cx+((rnd()*6-3)|0);
      if(x>0&&x<W){ const i=2*W+x; if(grid[i]===EMPTY)
        spawn(i, rnd()<0.72?SAND:(rnd()<0.5?WATER:RAINBOW)); }
    }
    if(rnd()<0.012) launchRocket((W*(0.5+0.3*Math.sin(attractT*1.3)))|0, H-4);
  }
  function stopAttract(){ if(!attract) return; attract=false; document.getElementById("hint").classList.add("hide"); }

  /* ============================ Snapshot / save =================== */
  function toast(msg){
    let el=document.getElementById("toast");
    if(!el){ el=document.createElement("div"); el.id="toast"; document.body.appendChild(el);
      Object.assign(el.style,{position:"fixed",left:"50%",top:"76px",transform:"translateX(-50%)",
        zIndex:50,padding:"8px 16px",borderRadius:"999px",font:"600 12px Inter,sans-serif",
        color:"#eef0f7",background:"rgba(18,18,28,0.7)",border:"1px solid rgba(255,255,255,0.1)",
        backdropFilter:"blur(16px)",transition:"opacity .4s ease",pointerEvents:"none"}); }
    el.textContent=msg; el.style.opacity="1";
    clearTimeout(el._t); el._t=setTimeout(()=>{el.style.opacity="0";},1400);
  }
  function snapshot(){
    const ex=document.createElement("canvas"); ex.width=W*SCALE; ex.height=H*SCALE;
    const c=ex.getContext("2d"); c.imageSmoothingEnabled=false;
    c.fillStyle="#07070d"; c.fillRect(0,0,ex.width,ex.height);
    c.drawImage(sim,0,0,ex.width,ex.height);
    c.globalCompositeOperation="lighter"; c.filter="blur("+SCALE+"px) brightness(1.15)";
    c.drawImage(glow,0,0,ex.width,ex.height);
    const a=document.createElement("a");
    a.href=ex.toDataURL("image/png"); a.download="aether-sand.png"; a.click();
    toast("Snapshot saved");
  }
  function b64(arr){ let s="",ch=0x8000; for(let i=0;i<arr.length;i+=ch) s+=String.fromCharCode.apply(null,arr.subarray(i,i+ch)); return btoa(s); }
  function unb64(str){ const bin=atob(str),a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i); return a; }
  function saveScene(){ try{ localStorage.setItem("aether-sand-scene",JSON.stringify({w:W,h:H,g:b64(grid)})); toast("Scene saved"); }catch(e){ toast("Save failed"); } }
  function loadScene(){
    const s=localStorage.getItem("aether-sand-scene"); if(!s){ toast("No saved scene"); return; }
    try{ const o=JSON.parse(s),g=unb64(o.g); grid.fill(EMPTY); charge.fill(0);
      const cw=Math.min(o.w,W),chh=Math.min(o.h,H);
      for(let y=0;y<chh;y++)for(let x=0;x<cw;x++){ const i=y*W+x,m=g[y*o.w+x];
        grid[i]=m; shade[i]=r255(); temp[i]=BASET[m]; life[i]=defaultLife(m); }
      stopAttract(); toast("Scene loaded");
    }catch(e){ toast("Load failed"); }
  }

  /* ============================ Loop ============================== */
  let paused=false, stepOnce=false, frames=0, fpsT=performance.now(), fpsEl, countEl;
  let acc=0, lastT=performance.now(); const SIMDT=1000/60;
  function loop(now){
    if(fireworkCooldown>0) fireworkCooldown--;
    let dt=now-lastT; lastT=now; if(dt>250) dt=250; acc+=dt;
    let runs=0;
    while(acc>=SIMDT && runs<4){
      if(!paused||stepOnce){ runAttract(); step(); stepOnce=false; }
      acc-=SIMDT; runs++;
      if(paused) break;
    }
    if(painting && lastPx!=null) paintDisc(lastPx,lastPy,eraseBtn?EMPTY:currentMat);
    render(now);
    frames++;
    if(now-fpsT>=500){
      fpsEl.textContent=Math.round((frames*1000)/(now-fpsT)); frames=0; fpsT=now;
      let c=0; for(let i=0;i<N;i++) if(grid[i]!==EMPTY) c++;
      countEl.textContent=(c+pn).toLocaleString();
    }
    requestAnimationFrame(loop);
  }

  /* ============================ UI =============================== */
  function swatchBg(m){
    if(m===EMPTY) return "repeating-linear-gradient(45deg,#2a2a36 0 5px,#1c1c26 5px 10px)";
    if(m===SPARK) return "linear-gradient(160deg,#bfefff,#5db8ff)";
    const a=M[m].c1,b=M[m].c2;
    return "linear-gradient(160deg,rgb("+a[0]+","+a[1]+","+a[2]+"),rgb("+b[0]+","+b[1]+","+b[2]+"))";
  }
  function buildPalette(){
    const wrap=document.getElementById("material-grid");
    PALETTE.forEach((m)=>{
      const el=document.createElement("button");
      el.className="mat"+(m===currentMat?" active":"");
      el.style.setProperty("--swatch", m===EMPTY?"#3a3a48":"rgb("+(M[m].c1[0])+","+(M[m].c1[1])+","+(M[m].c1[2])+")");
      const sw = m===RAINBOW ? '<span class="mat-swatch rainbow"></span>'
                             : '<span class="mat-swatch" style="--swatch-bg:'+swatchBg(m)+'"></span>';
      el.innerHTML=sw+'<span class="mat-name">'+M[m].name+'</span>';
      el.addEventListener("click",()=>{ currentMat=m;
        document.querySelectorAll(".mat").forEach(n=>n.classList.remove("active")); el.classList.add("active"); });
      wrap.appendChild(el);
    });
  }
  function setupUI(){
    fpsEl=document.getElementById("fps"); countEl=document.getElementById("count");
    const playBtn=document.getElementById("btn-play");
    playBtn.addEventListener("click",()=>{ paused=!paused; playBtn.classList.toggle("paused",paused); });
    document.getElementById("btn-step").addEventListener("click",()=>{ stepOnce=true; });
    document.getElementById("btn-clear").addEventListener("click",()=>{ grid.fill(EMPTY); life.fill(0); charge.fill(0); temp.fill(AMBIENT); vel.fill(0); pn=0; });

    const brushEl=document.getElementById("brush"), brushOut=document.getElementById("brush-readout");
    const ring=document.getElementById("cursor-ring");
    const syncBrush=()=>{ brush=+brushEl.value; brushOut.textContent=brush;
      const px=brush*2*SCALE; ring.style.width=px+"px"; ring.style.height=px+"px"; };
    brushEl.addEventListener("input",syncBrush); syncBrush();

    // gravity compass
    document.querySelectorAll(".cmp").forEach(b=>{
      b.addEventListener("click",()=>{ setGravity(+b.dataset.gx,+b.dataset.gy);
        document.querySelectorAll(".cmp").forEach(n=>n.classList.remove("active")); b.classList.add("active"); });
    });
    // wind
    const windEl=document.getElementById("wind"), windOut=document.getElementById("wind-readout");
    windEl.addEventListener("input",()=>{ WIND=(+windEl.value)/100; windOut.textContent=windEl.value; });

    // scene buttons
    const heatBtn=document.getElementById("btn-heat");
    heatBtn.addEventListener("click",()=>{ heatMap=!heatMap; heatBtn.classList.toggle("on",heatMap); });
    document.getElementById("btn-snap").addEventListener("click",snapshot);
    document.getElementById("btn-save").addEventListener("click",saveScene);
    document.getElementById("btn-load").addEventListener("click",loadScene);

    window.addEventListener("keydown",(e)=>{
      if(e.code==="Space"){ e.preventDefault(); playBtn.click(); }
      else if(e.code==="KeyC") document.getElementById("btn-clear").click();
      else if(e.code==="KeyH") heatBtn.click();
      else if(e.code==="KeyL"){ lighting=!lighting; toast(lighting?"Lighting on":"Lighting off"); }
      else if(e.code==="ArrowRight") stepOnce=true;
      else if(e.code==="BracketRight"){ brushEl.value=Math.min(48,brush+2); syncBrush(); }
      else if(e.code==="BracketLeft"){ brushEl.value=Math.max(1,brush-2); syncBrush(); }
      else if(e.key>="1"&&e.key<="9"){ const idx=+e.key-1; const b=document.querySelectorAll(".mat")[idx]; if(b)b.click(); }
    });

    return {ring,syncBrush};
  }
  function setupPointer(ring){
    const updateRing=()=>{ ring.style.left=pointerX+"px"; ring.style.top=pointerY+"px"; ring.style.opacity=pointerInside?"1":"0"; };
    const stage=document.getElementById("stage");
    stage.addEventListener("contextmenu",e=>e.preventDefault());
    stage.addEventListener("pointerdown",(e)=>{
      stopAttract(); painting=true; eraseBtn=(e.button===2||e.shiftKey);
      const [gx,gy]=toGrid(e.clientX,e.clientY); lastPx=gx; lastPy=gy;
      paintDisc(gx,gy,eraseBtn?EMPTY:currentMat);
      try{ stage.setPointerCapture(e.pointerId); }catch(_){}
    });
    stage.addEventListener("pointermove",(e)=>{
      pointerInside=true; pointerX=e.clientX; pointerY=e.clientY; updateRing();
      if(!painting) return;
      const [gx,gy]=toGrid(e.clientX,e.clientY);
      if(lastPx!=null) paintLine(lastPx,lastPy,gx,gy,eraseBtn?EMPTY:currentMat);
      lastPx=gx; lastPy=gy;
    });
    const end=()=>{ painting=false; lastPx=lastPy=null; };
    stage.addEventListener("pointerup",end); stage.addEventListener("pointercancel",end);
    window.addEventListener("pointerup",end); window.addEventListener("blur",end);
    stage.addEventListener("pointerleave",()=>{ pointerInside=false; updateRing(); });
    stage.addEventListener("pointerenter",()=>{ pointerInside=true; updateRing(); });
  }

  /* ============================ Public scripting API ============= */
  const NAME2ID={}; for(let id=0;id<MAXID;id++){ if(M[id]) NAME2ID[M[id].name.toLowerCase()]=id; }
  NAME2ID["eraser"]=EMPTY;
  const ALIAS={ gunpowder:GUNPOWDER, "rainbow sand":RAINBOW, electric:SPARK, electricity:SPARK, rocket:FIREWORK, empty:EMPTY,
                torch:HEAT, warm:HEAT, cool:COOL, cryo:COOL, freeze:COOL, clone:CLONER, sink:VOID };
  function resolveMat(m){ if(typeof m!=="string") return m; const k=m.toLowerCase(); return NAME2ID[k]??ALIAS[k]??SAND; }
  function syncPaletteActive(){
    document.querySelectorAll(".mat").forEach((n,idx)=>n.classList.toggle("active", PALETTE[idx]===currentMat));
  }
  window.AetherSand={
    EMPTY,WALL,SAND,RAINBOW,WATER,ICE,SNOW,SALT,OIL,ACID,LAVA,FIRE,SMOKE,STEAM,
    WOOD,PLANT,GLASS,STONE,METAL,GUNPOWDER,FIREWORK,SPARK,COAL,HEAT,COOL,CLONER,VOID,
    setMaterial(m){ currentMat=resolveMat(m); syncPaletteActive(); return M[currentMat]?.name; },
    setBrush(r){ const b=document.getElementById("brush"); b.value=r; b.dispatchEvent(new Event("input")); },
    paint(x,y,m,r){ if(m!=null) currentMat=resolveMat(m); if(r) brush=r; stopAttract(); paintDisc(x|0,y|0,currentMat); },
    line(x0,y0,x1,y1,m,r){ if(m!=null) currentMat=resolveMat(m); if(r) brush=r; stopAttract(); paintLine(x0|0,y0|0,x1|0,y1|0,currentMat); },
    erase(x,y,r){ if(r) brush=r; paintDisc(x|0,y|0,EMPTY); },
    clear(){ grid.fill(EMPTY); life.fill(0); charge.fill(0); temp.fill(AMBIENT); vel.fill(0); pn=0; },
    gravity(gx,gy){ setGravity(gx,gy); document.querySelectorAll(".cmp").forEach(b=>b.classList.toggle("active", +b.dataset.gx===gx && +b.dataset.gy===gy)); },
    wind(w){ WIND=w; const el=document.getElementById("wind"); if(el){el.value=Math.round(w*100); document.getElementById("wind-readout").textContent=el.value;} },
    firework(x,y){ stopAttract(); launchRocket(x|0,y|0); },
    burst(x,y){ burst(x|0,y|0); },
    pause(p){ paused=(p==null)?!paused:!!p; const b=document.getElementById("btn-play"); if(b)b.classList.toggle("paused",paused); return paused; },
    heatMap(on){ heatMap=on==null?!heatMap:!!on; document.getElementById("btn-heat").classList.toggle("on",heatMap); },
    lights(on){ lighting=on==null?!lighting:!!on; return lighting; },
    snapshot, save:saveScene, load:loadScene, stopAttract,
    info(){ let c=0; for(let i=0;i<N;i++) if(grid[i]!==EMPTY) c++; return {W,H,SCALE,cells:c,particles:pn,gravity:[GX,GY],wind:WIND,heatMap}; },
  };

  /* ============================ Init ============================= */
  function init(){
    resize(); setGravity(0,1);
    buildPalette();
    const {ring,syncBrush}=setupUI();
    setupPointer(ring);
    window.addEventListener("resize",()=>{ resize(); setGravity(GX,GY); syncBrush(); });
    setTimeout(()=>{ const h=document.getElementById("hint"); if(h&&attract) h.classList.add("hide"); },9000);
    requestAnimationFrame(loop);
  }
  init();
})();
