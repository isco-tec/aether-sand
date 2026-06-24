/* =====================================================================
   AETHER SAND  —  a high-fidelity falling-sand simulator
   Vanilla JS · cellular-automata + real heat field + ballistic particles

   © 2026 Ori Iscovici (isco-tec) · https://labs.iscovici.com
   Live:    https://isco-tec.github.io/aether-sand/
   License: code is MIT; the work as a whole is CC BY 4.0.
            Free to use & remix — just credit Ori Iscovici / labs.iscovici.com.
   ===================================================================== */

(() => {
  "use strict";
  try { console.log("%cAether Sand%c — by Ori Iscovici · labs.iscovici.com",
    "font-weight:700;color:#ffb454", "color:#9aa0b5"); } catch(_) {}

  /* ============================ Material IDs ======================== */
  const EMPTY=0, WALL=1, SAND=2, RAINBOW=3, WATER=4, ICE=5, SNOW=6, SALT=7,
        OIL=8, ACID=9, LAVA=10, FIRE=11, SMOKE=12, STEAM=13, WOOD=14,
        PLANT=15, GLASS=16, STONE=17, METAL=18, GUNPOWDER=19, FIREWORK=20,
        SPARK=21, COAL=22, HEAT=23, COOL=24, CLONER=25, VOID=26,
        MERCURY=27, THERMITE=28, FUSE=29,
        GOLD=30, NITRO=31, SULFUR=32, SALTPETER=33,
        CRYSTAL=34, PHILOSOPHER=35, AQUA=36,
        OBSIDIAN=37, DIAMOND=38, HYDROGEN=39, OXYGEN=40, ASH=41,
        RUST=42, CLOUD=43, LIGHTNING=44, ANTIMATTER=45,
        SLIME=46, HONEY=47, ACIDCLOUD=48, BULB=49,
        VINE=58, MOLD=59, BRINE=60, CINNABAR=61,
        LIMESTONE=62, QUICKLIME=63, SLAKEDLIME=64, CO2=65, SEED=66,
        NIGREDO=67, ALBEDO=68, CITRINITAS=69,   // the Magnum Opus stages (rubedo = PHILOSOPHER)
        SAPLING=70,
        SODIUM=71, CHLORINE=72, MAGNESIUM=73,   // reactive chemistry: alkali metal, halogen gas, the unquenchable flame
        MOLTEN_METAL=74,                         // shared molten liquid; life[] remembers which solid it freezes back to
        COPPER=75, PATINA=76, CUPRITE=77,        // copper + its two oxides (green verdigris / brown cuprite)
        TIN=78, TINPEST=79, BRONZE=80,           // tin, its cold-rot allotrope, and the Cu+Sn alloy
        STEEL=81, SILVER=82, TARNISH=83,         // carburised iron, silver + its black sulfide
        ALUMINUM=84,                             // light metal — thermite's reducer
        URANIUM=85, PLUTONIUM=86, NEUTRON=87,    // nuclear fuel, its hungrier cousin, and the chain carrier
        FALLOUT=88, CONTROL_ROD=89;              // spent fission rubble, and the boron rod that drinks neutrons
  // (ids 50–57 retired with the old "Circuits" engineering kit — electricity is
  //  kept as a physical phenomenon only: sparks, lightning, charge, glowing bulbs)

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
                  trans:[{c:1,t:255,to:COAL,p:0.05},{c:1,t:250,to:FIRE,p:0.4}] },
    [PLANT]:    { name:"Plant",  type:STATIC, d:1e4, c1:[86,176,74], c2:[54,128,52], k:0.03, flam:1,
                  trans:[{c:1,t:180,to:FIRE,p:0.4}] },
    [GLASS]:    { name:"Glass",  type:STATIC, d:1e4, c1:[180,220,235], c2:[150,196,214], a:120, k:0.05,
                  trans:[{c:1,t:1450,to:LAVA,p:0.04}] },
    [STONE]:    { name:"Stone",  type:STATIC, d:1e4, c1:[128,132,142], c2:[92,96,108], k:0.06,
                  trans:[{c:1,t:1300,to:LAVA,p:0.12}] },   // only thermite-level heat remelts rock; lava just flows over it
    [METAL]:    { name:"Metal",  type:STATIC, d:1e4, c1:[150,158,176], c2:[104,112,130], k:0.45, cond:1 },   // melts via upMetalMelt → molten iron (NOT lava), preserving identity for casting
    [GUNPOWDER]:{ name:"Powder", type:POWDER, d:180, c1:[70,72,80], c2:[42,44,52], k:0.05, flam:1 },
    [FIREWORK]: { name:"Firework",type:POWDER,d:150, c1:[230,90,120], c2:[120,120,200], k:0.05 },
    [SPARK]:    { name:"Spark",  type:TOOL,   d:0,   c1:[180,240,255], c2:[120,210,255] },
    [COAL]:     { name:"Coal",   type:POWDER, d:210, c1:[58,58,64], c2:[30,30,34], k:0.06, flam:1 },
    [HEAT]:     { name:"Heat",   type:TOOL,   d:0,   c1:[255,150,60], c2:[255,80,30] },
    [COOL]:     { name:"Freeze", type:TOOL,   d:0,   c1:[160,224,255], c2:[96,174,255] },
    [CLONER]:   { name:"Cloner", type:STATIC, d:1e4, c1:[120,232,200], c2:[64,168,150], k:0.05 },
    [VOID]:     { name:"Void",   type:STATIC, d:1e5, c1:[70,34,104], c2:[26,12,46], k:0.02 },
    [MERCURY]:  { name:"Mercury",type:LIQUID, d:230, disp:6, c1:[210,216,228], c2:[150,160,180], a:255, k:0.30, cond:1,
                  trans:[{c:1,t:360,to:SMOKE,p:0.05}] },
    [THERMITE]: { name:"Thermite",type:POWDER,d:215, c1:[150,116,88], c2:[100,78,60], k:0.05 },
    [FUSE]:     { name:"Fuse",   type:STATIC, d:1e4, c1:[122,98,62], c2:[86,66,42], k:0.03, flam:1 },
    [GOLD]:     { name:"Gold",   type:POWDER, d:240, c1:[255,212,64], c2:[196,148,20], k:0.25 },
    [NITRO]:    { name:"Nitro",  type:LIQUID, d:95,  disp:3, c1:[180,255,90], c2:[120,210,50], a:220, k:0.04, flam:1 },
    [SULFUR]:   { name:"Sulfur", type:POWDER, d:180, c1:[255,228,48], c2:[210,178,24], k:0.05, flam:1 },
    [SALTPETER]:{ name:"Saltpeter",type:POWDER,d:170, c1:[248,248,255], c2:[210,208,228], k:0.05 },
    [CRYSTAL]:  { name:"Crystal", type:STATIC, d:1e4, c1:[190,150,255], c2:[130,96,220], a:215, k:0.08, emit:0.18 },
    [PHILOSOPHER]:{ name:"Philosopher",type:STATIC,d:1e4,c1:[255,130,210],c2:[180,70,255],k:0.06,emit:0.45 },
    [AQUA]:     { name:"Aqua Regia",type:LIQUID,d:108,disp:4,c1:[255,205,255],c2:[205,125,255],a:215,k:0.06,emit:0.38 },
    [OBSIDIAN]: { name:"Obsidian",type:STATIC, d:1e4, c1:[46,42,60], c2:[20,18,30], a:255, k:0.05,
                  trans:[{c:1,t:1200,to:LAVA,p:0.05}] },
    [DIAMOND]:  { name:"Diamond", type:STATIC, d:1e4, c1:[206,242,255], c2:[150,200,238], a:170, k:0.55, emit:0.12 },
    [HYDROGEN]: { name:"Hydrogen",type:GAS,    d:0.5, c1:[232,242,255], c2:[182,202,240], a:80,  k:0.06, flam:1 },
    [OXYGEN]:   { name:"Oxygen",  type:GAS,    d:0.8, c1:[150,200,255], c2:[110,170,240], a:64,  k:0.06 },
    [ASH]:      { name:"Ash",     type:POWDER, d:42,  c1:[112,110,120], c2:[78,76,86], k:0.04 },
    [RUST]:     { name:"Rust",    type:POWDER, d:150, c1:[156,86,46], c2:[112,56,30], k:0.06 },
    [CLOUD]:    { name:"Cloud",   type:GAS,    d:1,   c1:[126,130,148], c2:[80,84,100], a:180, k:0.04 },
    [LIGHTNING]:{ name:"Lightning",type:TOOL,  d:0,   c1:[210,230,255], c2:[150,190,255] },
    [ANTIMATTER]:{name:"Antimatter",type:STATIC,d:1e5,c1:[255,96,212], c2:[150,30,160], a:255, k:0.02, emit:0.55 },
    [SLIME]:    { name:"Slime",   type:LIQUID, d:130, disp:1, c1:[126,222,96], c2:[78,168,58], a:235, k:0.05 },
    [HONEY]:    { name:"Honey",   type:LIQUID, d:148, disp:1, c1:[236,176,52], c2:[182,120,22], a:242, k:0.04, flam:1,
                  trans:[{c:1,t:210,to:FIRE,p:0.3}] },
    [ACIDCLOUD]:{ name:"Acid Cloud",type:GAS,  d:1,   c1:[156,176,82], c2:[104,124,52], a:185, k:0.04, emit:0.12 },
    [BULB]:     { name:"Bulb",    type:STATIC, d:1e4, c1:[206,206,184], c2:[150,150,128], a:205, k:0.08 },
    [VINE]:     { name:"Vine",    type:STATIC, d:1e4, c1:[82,166,68], c2:[48,118,46], k:0.03, flam:1,
                  trans:[{c:1,t:200,to:FIRE,p:0.4}] },
    [MOLD]:     { name:"Mold",    type:STATIC, d:1e4, c1:[124,150,98], c2:[78,108,70], k:0.04, flam:1,
                  trans:[{c:1,t:165,to:FIRE,p:0.35}] },
    [BRINE]:    { name:"Brine",   type:LIQUID, d:103, disp:6, c1:[72,150,168], c2:[48,116,150], a:205, k:0.12,
                  trans:[{c:-1,t:-12,to:ICE,p:0.18}] },
    [CINNABAR]: { name:"Cinnabar",type:POWDER, d:216, c1:[202,42,46], c2:[150,24,30], k:0.06 },
    [LIMESTONE]:{ name:"Limestone",type:STATIC,d:1e4, c1:[216,212,198], c2:[178,174,160], k:0.05 },
    [QUICKLIME]:{ name:"Quicklime",type:POWDER, d:200, c1:[240,238,230], c2:[208,206,196], k:0.06 },
    [SLAKEDLIME]:{name:"Slaked Lime",type:POWDER,d:190, c1:[228,230,226], c2:[196,198,194], k:0.06 },
    [CO2]:      { name:"Carbon Dioxide",type:GAS,d:5, c1:[108,108,116], c2:[74,74,82], a:80, k:0.05 },
    [SEED]:     { name:"Seed",    type:POWDER, d:120, c1:[150,112,62], c2:[106,78,44], k:0.04, flam:1,
                  trans:[{c:1,t:220,to:FIRE,p:0.3}] },
    [NIGREDO]:  { name:"Nigredo", type:POWDER, d:214, c1:[36,33,40], c2:[18,16,22], k:0.05 },
    [ALBEDO]:   { name:"Albedo",  type:POWDER, d:214, c1:[238,240,246], c2:[202,206,216], k:0.05 },
    [CITRINITAS]:{name:"Citrinitas",type:POWDER,d:214, c1:[242,206,74], c2:[206,168,40], k:0.05, emit:0.25 },
    [SAPLING]:  { name:"Sapling", type:STATIC, d:1e4, c1:[120,184,86], c2:[92,150,64], k:0.04, flam:1,
                  trans:[{c:1,t:200,to:FIRE,p:0.35}] },
    [SODIUM]:   { name:"Sodium",  type:POWDER, d:95,  c1:[208,210,218], c2:[150,152,166], k:0.09 },   // soft alkali metal, just lighter than water
    [CHLORINE]: { name:"Chlorine",type:GAS,    d:1.4, c1:[196,224,96],  c2:[150,182,64],  a:165, k:0.04 },   // toxic halogen gas, heavier than air
    [MAGNESIUM]:{ name:"Magnesium",type:POWDER, d:122, c1:[212,214,220], c2:[156,158,168], k:0.1, flam:1 },
    // — Forge & foundry: a shared molten liquid (remembers its metal via life[]) and the metals that melt into it —
    [MOLTEN_METAL]:{ name:"Molten Metal",type:LIQUID, d:235, disp:1, c1:[255,170,80], c2:[150,120,140], k:0.30, base:1600, emit:0.9, a:255 },
    [COPPER]:   { name:"Copper", type:STATIC, d:1e4, c1:[201,110,66], c2:[150,74,44], k:0.50, cond:1 },
    [PATINA]:   { name:"Patina", type:STATIC, d:1e4, c1:[86,176,150], c2:[58,140,120], k:0.30 },
    [CUPRITE]:  { name:"Cuprite",type:STATIC, d:1e4, c1:[150,60,42], c2:[104,40,28], k:0.30 },
    [TIN]:      { name:"Tin",    type:STATIC, d:1e4, c1:[222,226,232], c2:[168,174,188], k:0.46, cond:1 },
    [TINPEST]:  { name:"Tin Pest",type:POWDER, d:150, c1:[150,156,168], c2:[110,116,130], k:0.40,
                  trans:[{c:1,t:13,to:TIN,p:0.01}] },   // warming back above 13°C re-anneals it to solid tin
    [BRONZE]:   { name:"Bronze", type:STATIC, d:1e4, c1:[205,127,50], c2:[156,90,34], k:0.32, cond:1 },
    [STEEL]:    { name:"Steel",  type:STATIC, d:1e4, c1:[188,196,210], c2:[120,130,150], k:0.44, cond:1 },
    [SILVER]:   { name:"Silver", type:STATIC, d:1e4, c1:[232,236,242], c2:[176,184,198], k:0.50, cond:1 },
    [TARNISH]:  { name:"Tarnish",type:STATIC, d:1e4, c1:[44,42,50], c2:[26,24,30], k:0.30,
                  trans:[{c:1,t:700,to:SILVER,p:0.05}] },   // roasting above 700°C drives off the sulfur, restoring silver
    [ALUMINUM]: { name:"Aluminum",type:POWDER, d:135, c1:[206,212,224], c2:[146,154,168], k:0.50, cond:1 },
    // — Nuclear & energy: a provably-bounded fission kit (each fission consumes one fuel cell) —
    [URANIUM]:  { name:"Uranium", type:STATIC, d:1e4, c1:[86,148,92], c2:[54,104,64], k:0.20, emit:0.10 },        // radioluminescent green; fissions only when struck by a neutron
    [PLUTONIUM]:{ name:"Plutonium",type:STATIC, d:1e4, c1:[150,120,96], c2:[104,80,64], k:0.22, emit:0.18, base:120 },  // self-warm, more fissile
    [NEUTRON]:  { name:"Neutron", type:GAS,    d:0.3, c1:[214,226,255], c2:[150,176,230], a:90, k:0.04 },         // the invisible chain carrier (finite ballistic life)
    [FALLOUT]:  { name:"Fallout", type:POWDER, d:170, c1:[120,150,110], c2:[86,112,80], k:0.06, emit:0.06, base:60 },  // fission rubble; decays to ash
    [CONTROL_ROD]:{ name:"Control Rod",type:STATIC, d:1e4, c1:[40,44,54], c2:[24,26,32], k:0.40 },                // boron — drinks neutrons, scrams the pile
  };

  // fast lookup arrays
  const MAXID = Math.max(...Object.keys(M).map(Number)) + 1;   // derived from the table — no manual bump when ids are added
  const MAX_SCENE_DIM = 1024;       // reject share/save scenes larger than this (covers every real world; blocks OOM payloads)
  const SCENE_VERSION = 1;          // share/save payload format version — bump if the byte layout or id meanings change
  // flat per-material lookup arrays, derived once from M — the hot loop never touches the M dictionary
  const TYPE=new Int8Array(MAXID), DENS=new Float32Array(MAXID), COND=new Float32Array(MAXID),
        EMIT=new Float32Array(MAXID), FLAM=new Uint8Array(MAXID), BASET=new Float32Array(MAXID),
        WINDF=new Float32Array(MAXID), CHCOND=new Uint8Array(MAXID),
        DISP=new Float32Array(MAXID), HASTRANS=new Uint8Array(MAXID);
  const TRANS=new Array(MAXID);     // phase-transition rule list per id (or undefined)
  for (let id=0; id<MAXID; id++){
    const m=M[id]; if(!m) continue;
    TYPE[id]=m.type; DENS[id]=m.d||0; COND[id]=m.k!=null?m.k:0.05;
    EMIT[id]=m.emit||0; FLAM[id]=m.flam?1:0; BASET[id]=m.base!=null?m.base:AMBIENT;
    DISP[id]=m.disp||0; if(m.trans){ TRANS[id]=m.trans; HASTRANS[id]=1; }
  }
  EMIT[FIRE]=1; EMIT[LAVA]=1;
  COND[EMPTY]=0.04;
  WINDF[SMOKE]=1; WINDF[STEAM]=1; WINDF[FIRE]=1; WINDF[SNOW]=0.7;
  WINDF[WATER]=0.25; WINDF[OIL]=0.25; WINDF[ACID]=0.25;
  WINDF[SAND]=0.08; WINDF[SALT]=0.08; WINDF[GUNPOWDER]=0.08; WINDF[RAINBOW]=0.08; WINDF[COAL]=0.06;
  WINDF[THERMITE]=0.06; WINDF[MERCURY]=0.04; WINDF[NITRO]=0.2;
  WINDF[SULFUR]=0.07; WINDF[SALTPETER]=0.07; WINDF[GOLD]=0.04;
  WINDF[AQUA]=0.22;
  WINDF[HYDROGEN]=1.3; WINDF[OXYGEN]=1; WINDF[ASH]=0.5; WINDF[RUST]=0.08;
  WINDF[SLIME]=0.04; WINDF[HONEY]=0.02; WINDF[BRINE]=0.25; WINDF[CINNABAR]=0.04;
  WINDF[QUICKLIME]=0.07; WINDF[SLAKEDLIME]=0.07; WINDF[CO2]=0.8; WINDF[SEED]=0.1;
  WINDF[NIGREDO]=0.04; WINDF[ALBEDO]=0.04; WINDF[CITRINITAS]=0.04; WINDF[SAPLING]=0;
  WINDF[CHLORINE]=0.8; WINDF[SODIUM]=0.06; WINDF[MAGNESIUM]=0.05;
  CHCOND[METAL]=1; CHCOND[WATER]=1; CHCOND[ACID]=1; CHCOND[GUNPOWDER]=1; CHCOND[FIREWORK]=1; CHCOND[MERCURY]=1; CHCOND[AQUA]=1;
  CHCOND[GOLD]=1; CHCOND[BRINE]=1;   // gold is an excellent conductor; salt water conducts too (enables chlor-alkali electrolysis)
  CHCOND[MOLTEN_METAL]=1; CHCOND[COPPER]=1; CHCOND[TIN]=1; CHCOND[BRONZE]=1; CHCOND[STEEL]=1; CHCOND[SILVER]=1; CHCOND[TINPEST]=1; CHCOND[ALUMINUM]=1;
  WINDF[TINPEST]=0.06; WINDF[ALUMINUM]=0.045;
  // Forge & foundry lookups: each solid metal's melting point, the temperature a fresh melt is seeded at,
  // and the recipe ids fired when it melts / casts. Casting back is keyed by life[] (the remembered metal).
  const MELT_PT   = {[METAL]:1538,[GOLD]:1064,[COPPER]:1085,[TIN]:232,[BRONZE]:950,[STEEL]:1390,[SILVER]:962,[ALUMINUM]:660};
  const MELT_SEED = {[METAL]:1600,[GOLD]:1200,[COPPER]:1200,[TIN]:300,[BRONZE]:1100,[STEEL]:1450,[SILVER]:1100,[ALUMINUM]:760};
  const MELT_RECIPE = {[METAL]:"iron_melt",[GOLD]:"gold_melt",[COPPER]:"copper_melt",[TIN]:"tin_melt",[BRONZE]:"bronze_melt",[STEEL]:"steel_melt",[SILVER]:"silver_melt",[ALUMINUM]:"aluminum_melt"};
  const CAST_RECIPE = {[METAL]:"cast_iron",[GOLD]:"cast_gold"};   // only iron/gold showcase a cast-back recipe; the rest just resolidify
  WINDF[FALLOUT]=0.06;   // contaminated dust settles slowly (neutrons/fuel/rods ignore wind)
  // Fission tuning. Boundedness rests on the invariants (each fission consumes one fuel cell), NOT these numbers —
  // they only shift the critical mass: a small bare lump leaks neutrons and fizzles, a big dense block chains.
  const CAPTURE_U=0.62, CAPTURE_PU=0.85, ABSORB=0.10, SPON_U=0.00005, SPON_PU=0.0005;

  // palette — grouped for UI; flat list for shortcuts
  const MAT_GROUPS = [
    { label:"Natural", icon:"🌍", mats:[SAND,RAINBOW,WATER,ICE,SNOW,SALT,STONE,LIMESTONE,GLASS,OBSIDIAN,METAL,COPPER,TIN,BRONZE,STEEL,SILVER,PATINA,CUPRITE,TINPEST,TARNISH,WOOD,SEED,SAPLING,PLANT,VINE,MOLD,WALL] },
    { label:"Reactive", icon:"⚗️", mats:[OIL,ACID,AQUA,MERCURY,BRINE,SLIME,HONEY,LAVA,FIRE,SMOKE,CO2,HYDROGEN,OXYGEN,NITRO,SODIUM,CHLORINE,MAGNESIUM,ALUMINUM,URANIUM,PLUTONIUM,NEUTRON,FALLOUT,CONTROL_ROD] },
    { label:"Alchemy", icon:"✦", mats:[GOLD,DIAMOND,CINNABAR,QUICKLIME,SLAKEDLIME,CRYSTAL,PHILOSOPHER,SULFUR,SALTPETER,COAL,ASH,RUST,GUNPOWDER,THERMITE,FUSE] },
    { label:"Tools", icon:"🛠", mats:[FIREWORK,SPARK,LIGHTNING,BULB,CLOUD,ACIDCLOUD,HEAT,COOL,CLONER,VOID,ANTIMATTER,EMPTY] },
  ];
  const PALETTE = MAT_GROUPS.flatMap(g=>g.mats);

  const MAT_BLURB = {
    [SAND]:"Granular solid. Extreme heat fuses it into glass.",
    [RAINBOW]:"Animated colour sand — purely decorative flow.",
    [WATER]:"Liquid. Freezes to ice, boils to steam.",
    [ICE]:"Frozen water. Melts when warmed.",
    [SNOW]:"Light powder. Melts into water.",
    [SALT]:"Dissolves in water into brine; crystallises back when the brine boils away.",
    [BRINE]:"Salt water — denser than fresh water, freezes harder, and leaves salt behind when it evaporates.",
    [CINNABAR]:"Vermilion ore — mercury married to sulfur. Roast it and the quicksilver returns.",
    [LIMESTONE]:"Soft pale rock. Roast it fiercely and it calcines into quicklime.",
    [QUICKLIME]:"Caustic white powder — splash it with water and it slakes, hissing out heat and steam.",
    [SLAKEDLIME]:"A mild base — pour acid on it and the two neutralise into salt and water.",
    [STONE]:"Solid rock. Melts to lava when white-hot.",
    [GLASS]:"Brittle solid from molten sand.",
    [OBSIDIAN]:"Volcanic glass — born when lava is quenched in water.",
    [METAL]:"Conductive solid. Melts to lava; amalgamates with mercury.",
    [WOOD]:"Flammable static block.",
    [PLANT]:"Drinks water and climbs toward the light; buried in the dark, it withers to ash.",
    [SEED]:"Drop it on damp soil and it sprouts — a sapling that climbs into a tree.",
    [SAPLING]:"A young tree. It climbs a wooden trunk toward the light, then bursts into a leafy crown.",
    [NIGREDO]:"The blackened prima materia — the first stage of the Great Work. Wash it with water.",
    [ALBEDO]:"The whitened matter — purified. Now give it to the fire.",
    [CITRINITAS]:"The yellowing — the dawning solar light. Perfect it with gold to birth the Stone.",
    [SODIUM]:"A soft alkali metal. Drop it in water and it erupts — hydrogen and fire. Burn it with chlorine to make salt.",
    [CHLORINE]:"A heavy, toxic yellow-green gas. It sinks, withers life, and dissolves into acid. Electrolyse brine to make it.",
    [MAGNESIUM]:"Light metal that burns blinding white — and can't be put out: it burns straight through water and CO₂.",
    [COPPER]:"A soft red conductor. Salt water or acid greens it with verdigris; clean water just browns it to cuprite. Melt and pour it, or alloy it with tin.",
    [PATINA]:"Green verdigris — the protective skin copper grows in salt or acid. Inert and stable.",
    [CUPRITE]:"Brown cuprite — the first oxide copper grows in clean air and water. Inert.",
    [TIN]:"A soft silvery metal that melts at a candle's breath. Alloy it with copper for bronze — but leave it in the cold and tin pest crumbles it to dust.",
    [TINPEST]:"Grey alpha-tin — the crumbly rot tin falls to when frozen. Warm it and it re-anneals to solid tin.",
    [BRONZE]:"Copper married to tin — harder than either, lower-melting, and it shrugs off the water and acid that gnaw iron. The metal that named an age.",
    [STEEL]:"Iron drunk on carbon and forge-fire — tougher than plain metal, and it laughs at fresh water (though salt and acid still bite). Quench it red-hot to harden it.",
    [SILVER]:"The brightest electrical conductor of all. Air and water leave it gleaming; a breath of sulfur turns it black. Roast the tarnish and the shine returns.",
    [TARNISH]:"Black silver sulfide — the tarnish sulfur grows on silver. Roast it fiercely and the bright metal comes back.",
    [ALUMINUM]:"A light silver metal sealed in its own oxide skin — it shrugs off water, but pack it against rust and you have thermite. Strong acid still eats it.",
    [URANIUM]:"Heavy green metal that hums with quiet radiation. Stack enough of it and a stray neutron starts something that won't stop — heat, blast, and fallout.",
    [PLUTONIUM]:"Uranium's warmer, hungrier cousin — it glows with its own heat and goes critical in a far smaller lump.",
    [NEUTRON]:"An invisible bullet hunting for a nucleus to split. It darts a few cells, splits fuel on touch, and winks out — boron drinks it, empty space loses it.",
    [FALLOUT]:"Glowing rubble where a reactor used to be — fierce, short-lived, and soon just ash.",
    [CONTROL_ROD]:"Boron-cadmium safety rod — the hush in the heart of a reactor. It drinks neutrons without splitting, dropping a roaring pile below critical.",
    [WALL]:"Immovable barrier.",
    [VINE]:"Climbing plant — creeps up surfaces and across open space. Flammable.",
    [MOLD]:"Creeping rot — spreads over wood, plant and damp stone, then crumbles to ash.",
    [OIL]:"Flammable liquid lighter than water.",
    [SLIME]:"Bouncy viscous goo — oozes slowly and springs back particles.",
    [HONEY]:"Thick amber syrup — barely flows, and burns when heated.",
    [ACID]:"Corrosive liquid. Transmutes mercury into gold.",
    [AQUA]:"Royal water — brew with acid + saltpeter. Dissolves gold to mercury.",
    [MERCURY]:"Dense liquid metal. Spreads into metal; reacts with acid.",
    [LAVA]:"Molten rock. Cools into stone.",
    [FIRE]:"Hot gas. Ignites flammables and heats surroundings.",
    [SMOKE]:"Rising gas. Sulfur smoke can become acid.",
    [HYDROGEN]:"Lightest gas — rises fast and detonates near flame; fiercer with oxygen.",
    [OXYGEN]:"Feeds combustion — makes nearby fire roar hotter, burning to carbon dioxide.",
    [CO2]:"A heavy, breathless gas — it sinks, pools low, and smothers any flame it settles on.",
    [NITRO]:"Unstable liquid — explodes on impact, heat, or spark.",
    [GOLD]:"Precious heavy powder from transmutation. Conducts electricity.",
    [DIAMOND]:"Hardest crystal — forged from coal under furious heat. Conducts heat superbly.",
    [ASH]:"Light grey remnant of spent fuel. Drifts on the wind.",
    [RUST]:"Flaky iron oxide — metal left too long in water.",
    [CRYSTAL]:"Prismatic solid that grows by consuming water.",
    [PHILOSOPHER]:"The Great Work made solid. It speeds every transmutation nearby and projects base matter — stone, rust, coal — into gold.",
    [SULFUR]:"Yellow powder. Key gunpowder ingredient.",
    [SALTPETER]:"White oxidiser. Mix with sulfur + coal for gunpowder.",
    [COAL]:"Slow-burning fuel and gunpowder ingredient.",
    [GUNPOWDER]:"Explosive powder — heat, fire, or fuse detonates it.",
    [THERMITE]:"White-hot incendiary — melts metal and stone.",
    [FUSE]:"Slow cord — carries flame to explosives.",
    [FIREWORK]:"Rocket powder — launches sky bursts.",
    [SPARK]:"Electric brush — energises conductors.",
    [LIGHTNING]:"Calls down a lightning bolt that scorches and electrifies.",
    [BULB]:"Light bulb — glows warm when charge reaches it through metal, water or a lightning strike.",
    [CLOUD]:"Storm cloud — drifts on the wind, rains water, and strikes lightning.",
    [ACIDCLOUD]:"Acid-rain cloud — born of pollution; rains corrosive acid below.",
    [HEAT]:"Torch tool — paints heat onto matter.",
    [COOL]:"Cryo tool — flash-freezes an area.",
    [CLONER]:"Copies whatever material touches it.",
    [VOID]:"Devours adjacent matter.",
    [ANTIMATTER]:"Annihilates any matter it touches in a burst of energy. Contain it with walls.",
    [EMPTY]:"Eraser.",
  };

  // in/out are material-ID arrays rendered as swatch chips in the book.
  const ALCHEMY_RECIPES = [
    { id:"gunpowder", cat:"Crafting", name:"Black powder", in:[SULFUR,SALTPETER,COAL], out:[GUNPOWDER], note:"Pile all three together and they fuse into explosive powder.", starter:true },
    { id:"acid_gold", cat:"Transmutation", name:"Golden precipitation", in:[ACID,MERCURY], out:[GOLD], note:"The classic philosopher's dream — acid drips gold from quicksilver.", starter:true },
    { id:"mercury_amalgam", cat:"Transmutation", name:"Amalgamation", in:[MERCURY,METAL], out:[MERCURY], note:"Quicksilver slowly consumes steel into more of itself.", starter:true },
    { id:"aqua_brew", cat:"Crafting", name:"Aqua regia", in:[ACID,SALTPETER], out:[AQUA], note:"Acid and an oxidiser brew a stronger royal acid.", hint:"An acid and a white oxidiser…" },
    { id:"aqua_dissolve", cat:"Transmutation", name:"Royal dissolution", in:[AQUA,GOLD], out:[MERCURY], note:"Royal water dissolves gold straight back into mercury.", hint:"Royal water meets treasure…" },
    { id:"philosopher_gold", cat:"Transmutation", name:"Catalysed gold", in:[PHILOSOPHER,MERCURY], out:[GOLD], note:"The stone accelerates mercury into gold.", hint:"A pink catalyst and quicksilver…" },
    { id:"philosopher_mercury", cat:"Transmutation", name:"Catalysed amalgam", in:[PHILOSOPHER,METAL], out:[MERCURY], note:"Steel becomes quicksilver far faster.", hint:"Catalyst beside metal…" },
    { id:"philosopher_sand", cat:"Transmutation", name:"Grit to gold", in:[PHILOSOPHER,SAND], out:[GOLD], note:"Rare — common sand transmuted to gold.", hint:"Catalyst and common grit…" },
    { id:"projection", cat:"Transmutation", name:"Projection", in:[PHILOSOPHER,STONE], out:[GOLD], note:"The Stone's great power — it perfects base matter (stone, rust, coal, limestone) into gold.", hint:"Lay the Stone against base rock…" },
    { id:"diamond", cat:"Transmutation", name:"Diamond synthesis", in:[COAL], out:[DIAMOND], note:"Carbon crystallises into diamond under furious heat (thermite or lava).", hint:"Coal, fiercely heated…" },
    { id:"cinnabar", cat:"Transmutation", name:"Vermilion", in:[MERCURY,SULFUR], out:[CINNABAR], note:"Mercury weds sulfur into cinnabar, the alchemist's blood-red ore.", hint:"Quicksilver meets brimstone…" },
    { id:"cinnabar_roast", cat:"Transmutation", name:"Roasting", in:[CINNABAR], out:[MERCURY], note:"Roast cinnabar fiercely and the quicksilver comes back out.", hint:"Heat the red ore…" },
    { id:"nigredo", cat:"Magnum Opus", name:"I · Nigredo", in:[MERCURY,SULFUR,SALT], out:[NIGREDO], note:"The Great Work begins: the tria prima — mercury, sulfur and salt — put to the fire and blackened into the prima materia.", hint:"Heat the three first principles together…" },
    { id:"albedo", cat:"Magnum Opus", name:"II · Albedo", in:[NIGREDO,WATER], out:[ALBEDO], note:"Ablution — wash the black matter until it whitens.", hint:"Wash the blackened matter…" },
    { id:"citrinitas", cat:"Magnum Opus", name:"III · Citrinitas", in:[ALBEDO,FIRE], out:[CITRINITAS], note:"Solar fire ripens the white matter to gold-yellow.", hint:"Give the white matter to the fire…" },
    { id:"rubedo", cat:"Magnum Opus", name:"IV · Rubedo", in:[CITRINITAS,GOLD], out:[PHILOSOPHER], note:"The reddening — perfected with gold, the matter is reborn as the Philosopher's Stone.", hint:"Perfect the yellow matter with gold…" },
    { id:"calcine", cat:"Phase", name:"Calcination", in:[LIMESTONE], out:[QUICKLIME], note:"Fierce heat drives the breath (CO₂) from limestone, leaving caustic quicklime.", hint:"Roast the soft pale rock…" },
    { id:"slake", cat:"Phase", name:"Slaking", in:[QUICKLIME,WATER], out:[SLAKEDLIME], note:"Quicklime meets water and reacts hard — heat, hiss, and slaked lime.", hint:"Splash the white powder…" },
    { id:"neutralise", cat:"Phase", name:"Neutralisation", in:[ACID,SLAKEDLIME], out:[SALT], note:"Acid meets a base and the two cancel into salt and water.", hint:"Acid against a mild base…" },
    { id:"smoke_acid", cat:"Crafting", name:"Sulfurous acid", in:[SMOKE,SULFUR], out:[ACID], note:"Gas and yellow powder brew a corrosive liquid.", hint:"Smoke meets yellow powder…" },
    { id:"electrolysis", cat:"Crafting", name:"Electrolysis", in:[WATER,SPARK], out:[HYDROGEN,OXYGEN], note:"A current splits water into hydrogen and oxygen gas.", hint:"Charge run through water…" },
    { id:"bulb_light", cat:"Electric", name:"Filament glow", in:[SPARK,BULB], out:[BULB], note:"Charge reaching a bulb — through metal, water, or a lightning strike — lights its filament.", hint:"Spark a conductor beside glass…" },
    { id:"fulgurite", cat:"Electric", name:"Fulgurite", in:[LIGHTNING,SAND], out:[GLASS], note:"Lightning striking sand fuses it into glass in a heartbeat.", hint:"When the bolt finds the dunes…" },
    { id:"acid_metal", cat:"Crafting", name:"Acid corrosion", in:[ACID,METAL], out:[HYDROGEN], note:"Acid eating metal releases flammable hydrogen.", hint:"Acid eats steel…" },
    { id:"charcoal", cat:"Crafting", name:"Charcoal", in:[WOOD], out:[COAL], note:"Wood heated slowly chars into charcoal instead of burning away.", hint:"Wood, heated gently…" },
    { id:"crystal_grow", cat:"Growth", name:"Crystal garden", in:[CRYSTAL,WATER], out:[CRYSTAL], note:"Crystals drink water to spread.", hint:"A prism beside water…" },
    { id:"plant_grow", cat:"Growth", name:"Verdant spread", in:[PLANT,WATER], out:[PLANT], note:"Plants drink water to climb toward the light.", hint:"Life needs water…" },
    { id:"germinate", cat:"Growth", name:"Germination", in:[SEED,WATER], out:[SAPLING], note:"A seed on damp soil sprouts into a sapling.", hint:"A seed, soil, and water…" },
    { id:"tree", cat:"Growth", name:"The Tree", in:[SAPLING], out:[WOOD], note:"A sapling climbs a wooden trunk toward the light, then crowns itself with leaves.", hint:"Let a sapling reach for the sky…" },
    { id:"wilt", cat:"Growth", name:"Withering", in:[PLANT], out:[ASH], note:"Sealed away from air and light, a plant withers to ash.", hint:"Bury a plant in the dark…" },
    { id:"vine_grow", cat:"Growth", name:"Climbing vines", in:[VINE], out:[VINE], note:"Vines creep up surfaces and reach across open space.", hint:"Tendrils seeking a wall…" },
    { id:"mold_spread", cat:"Growth", name:"Creeping rot", in:[MOLD,WOOD], out:[MOLD], note:"Mold spreads over wood, plant and damp stone, then crumbles to ash.", hint:"Decay finds the damp…" },
    { id:"wildfire", cat:"Growth", name:"Wildfire", in:[FIRE,WOOD], out:[FIRE], note:"Flame races through connected forests of wood, plant and vine.", hint:"One spark in a dry forest…" },
    { id:"obsidian", cat:"Phase", name:"Obsidian quench", in:[LAVA,WATER], out:[OBSIDIAN], note:"Molten rock quenched in water freezes into volcanic glass.", hint:"Fire-rock meets water…" },
    { id:"rust", cat:"Phase", name:"Oxidation", in:[METAL,WATER], out:[RUST], note:"Iron left in water slowly oxidises to flaky rust.", hint:"Metal left wet too long…" },
    { id:"ash", cat:"Phase", name:"Ashes to ashes", in:[COAL], out:[ASH], note:"Spent fuel crumbles into light grey ash.", hint:"What remains when fuel dies…" },
    { id:"brine_dissolve", cat:"Phase", name:"Dissolution", in:[SALT,WATER], out:[BRINE], note:"Salt dissolves into the water it touches, making brine.", hint:"Crystal melts into liquid…" },
    { id:"brine_evap", cat:"Phase", name:"Crystallisation", in:[BRINE], out:[SALT], note:"Boil brine dry and the salt crystallises back out as steam escapes.", hint:"Boil the salt water away…" },
    { id:"salt_melt", cat:"Phase", name:"De-icing", in:[SALT,ICE], out:[BRINE], note:"Salt depresses water's freezing point — sprinkled on ice or snow it melts them into brine.", hint:"Why the roads are gritted…" },
    { id:"sodium_water", cat:"Pyrotechnics", name:"Alkali eruption", in:[SODIUM,WATER], out:[HYDROGEN], note:"Sodium tears hydrogen out of water and the heat ignites it — a violent eruption.", hint:"Soft metal, meet water…" },
    { id:"salt_synthesis", cat:"Phase", name:"Salt synthesis", in:[SODIUM,CHLORINE], out:[SALT], note:"Sodium burns in chlorine to make ordinary table salt — straight from its elements.", hint:"A metal and a poison gas make a seasoning…" },
    { id:"chlor_alkali", cat:"Crafting", name:"Chlor-alkali", in:[BRINE,SPARK], out:[CHLORINE], note:"Run a current through salt water and it splits into hydrogen and chlorine gas.", hint:"Electrolyse the brine…" },
    { id:"chlorine_acid", cat:"Phase", name:"Chlorine water", in:[CHLORINE,WATER], out:[ACID], note:"Chlorine dissolves into water to make a corrosive acid.", hint:"The green gas meets the sea…" },
    { id:"chlorine_kill", cat:"Growth", name:"Chemical blight", in:[CHLORINE,PLANT], out:[ASH], note:"Toxic chlorine gas withers anything living it touches.", hint:"Poison gas over a garden…" },
    { id:"magnesium_burn", cat:"Pyrotechnics", name:"White fire", in:[MAGNESIUM,FIRE], out:[ASH], note:"Magnesium burns a blinding white — and you can't put it out: it burns through water and CO₂ alike.", hint:"A flare you cannot drown…" },
    { id:"freeze", cat:"Phase", name:"Frost spread", in:[ICE,WATER], out:[ICE], note:"Ice chills the water around it until a frost rim creeps outward.", hint:"Cold begets cold…" },
    { id:"condense", cat:"Phase", name:"Condensation", in:[STEAM], out:[WATER], note:"Vapour cools on cold surfaces into dew, and gathers high in the sky into rain clouds — the water cycle.", hint:"Where vapour gathers and cools…" },
    { id:"douse", cat:"Phase", name:"Doused", in:[FIRE,WATER], out:[STEAM], note:"Water smothers a flame outright, flashing to steam as it goes.", hint:"The oldest way to fight fire…" },
    { id:"lava_stone", cat:"Phase", name:"Igneous cooling", in:[LAVA], out:[STONE], note:"Cooling molten rock solidifies to stone.", hint:"Molten rock cooling…" },
    { id:"sand_glass", cat:"Phase", name:"Vitric fusion", in:[SAND], out:[GLASS], note:"Fierce heat fuses sand grains into glass.", hint:"Sand under fierce heat…" },
    { id:"glass_shatter", cat:"Phase", name:"Shatter", in:[GLASS], out:[SAND], note:"A blast's pressure wave shatters glass back into sand.", hint:"Glass under sudden pressure…" },
    { id:"thermite_slag", cat:"Pyrotechnics", name:"Thermite slag", in:[THERMITE,METAL], out:[LAVA], note:"White-hot thermite melts straight through metal and stone.", hint:"Incendiary beside steel…" },
    // — Forge & foundry: melting, casting, and the metals —
    { id:"iron_melt", cat:"Phase", name:"Iron melt", in:[METAL], out:[MOLTEN_METAL], note:"Heat iron past 1538° (thermite, lava, sustained fire) and it melts into a glowing pool that remembers it is iron — and casts back to iron, never to rock.", hint:"Iron, white-hot…" },
    { id:"gold_melt", cat:"Phase", name:"Gold melt", in:[GOLD], out:[MOLTEN_METAL], note:"Gold melts at a far lower 1064° into a liquid that casts back to pure gold.", hint:"The royal metal, molten…" },
    { id:"copper_melt", cat:"Phase", name:"Copper founding", in:[COPPER], out:[MOLTEN_METAL], note:"Heat copper past 1085° and it melts to a bright liquid you can cast.", hint:"The red metal, white-hot…" },
    { id:"tin_melt", cat:"Phase", name:"Tin melt", in:[TIN], out:[MOLTEN_METAL], note:"Tin melts at a mere 232° — a candle nearly does it — pouring like silver water, the lowest melt of any common metal.", hint:"A candle nearly melts it…" },
    { id:"bronze_melt", cat:"Phase", name:"Bronze melt", in:[BRONZE], out:[MOLTEN_METAL], note:"Bronze remelts at just 950° — below copper itself — and pours into a sound, castable solid.", hint:"The age-old alloy, white-hot…" },
    { id:"steel_melt", cat:"Phase", name:"Steel melt", in:[STEEL], out:[MOLTEN_METAL], note:"Carbon makes steel melt just below pure iron, at ~1390° — barely within a forge torch.", hint:"Steel at the edge of melting…" },
    { id:"silver_melt", cat:"Phase", name:"Silver melt", in:[SILVER], out:[MOLTEN_METAL], note:"Silver melts at 962°, far below iron, into a bright liquid that casts back to pure silver.", hint:"The bright metal, molten…" },
    { id:"aluminum_melt", cat:"Phase", name:"Aluminium melt", in:[ALUMINUM], out:[MOLTEN_METAL], note:"Aluminium melts at just 660° into a bright liquid that casts back to solid metal.", hint:"The light metal, molten…" },
    { id:"cast_iron", cat:"Phase", name:"Casting", in:[MOLTEN_METAL], out:[METAL], note:"Let a melt cool below its freezing point and it solidifies back into the very same metal it was.", hint:"Molten metal, cooling…" },
    { id:"cast_gold", cat:"Phase", name:"Gold casting", in:[MOLTEN_METAL], out:[GOLD], note:"Molten gold cools back into solid gold.", hint:"The royal melt, cooling…" },
    { id:"quench_cast", cat:"Phase", name:"Quench casting", in:[MOLTEN_METAL,WATER], out:[STEAM], note:"Plunge molten metal into water and it freezes instantly, flashing the water to steam.", hint:"Molten metal meets water…" },
    { id:"patina", cat:"Phase", name:"Verdigris", in:[COPPER,BRINE], out:[PATINA], note:"Copper attacked by salt water or acid greens over with verdigris — a protective skin.", hint:"Copper, salt and damp…" },
    { id:"cuprite", cat:"Phase", name:"Cuprite", in:[COPPER,WATER], out:[CUPRITE], note:"Copper left in clean water slowly browns to cuprite, its first oxide.", hint:"Copper left damp…" },
    { id:"bronze", cat:"Crafting", name:"Bronze", in:[TIN,COPPER], out:[BRONZE], note:"Wed soft tin to warm copper and you forge bronze — harder than either parent. The alloy that named an age.", hint:"Tin against copper, warmed…" },
    { id:"tin_pest", cat:"Phase", name:"Tin pest", in:[TIN], out:[TINPEST], note:"Leave tin in deep cold and a grey rot creeps through it, crumbling the metal to dull powder. Warm it back and it re-anneals.", hint:"Metal left in the deep cold…" },
    { id:"steel", cat:"Crafting", name:"Carburization", in:[METAL,COAL], out:[STEEL], note:"Hold red-hot iron against charcoal at forge heat (800°+, from lava/thermite/fire) and it drinks in carbon, hardening into steel.", hint:"Hot iron against charcoal…" },
    { id:"quench", cat:"Phase", name:"Quench-hardening", in:[STEEL,WATER], out:[STEAM], note:"Plunge white-hot steel (above 727°) into water — it flashes to steam and the steel hardens instantly.", hint:"White-hot steel, then water…" },
    { id:"steel_corrode", cat:"Phase", name:"Salt corrosion", in:[STEEL,BRINE], out:[RUST], note:"Steel shrugs off fresh water, but salt water still eats it — slowly. Acid dissolves it outright.", hint:"The sea is patient…" },
    { id:"silver_tarnish", cat:"Phase", name:"Tarnishing", in:[SILVER,SULFUR], out:[TARNISH], note:"Lay sulfur against silver and it blackens to silver sulfide — silver tarnishes with sulfur, not water or clean air.", hint:"Bright silver meets brimstone…" },
    { id:"silver_roast", cat:"Transmutation", name:"Argentite roast", in:[TARNISH], out:[SILVER], note:"Roast silver sulfide fiercely (700°+) and the bright metal returns — closing the tarnish loop.", hint:"Heat the black ore…" },
    { id:"silver_acid", cat:"Transmutation", name:"Silver dissolution", in:[SILVER,AQUA], out:[EMPTY], note:"Royal water eats silver clean away — it simply dissolves.", hint:"Royal water meets the bright metal…" },
    { id:"thermite_mix", cat:"Pyrotechnics", name:"Thermite mix", in:[ALUMINUM,RUST], out:[MOLTEN_METAL], note:"Aluminium packed against rust IS thermite — ignite it (flame, lava, or a spark) and it reduces the iron oxide to a pool of molten iron in a white-hot flash.", hint:"Silver powder against rust…" },
    { id:"aluminum_acid", cat:"Crafting", name:"Aluminium in acid", in:[ALUMINUM,ACID], out:[HYDROGEN], note:"Strong acid breaks aluminium's oxide skin and dissolves it, fizzing off hydrogen — it resists water, but not acid.", hint:"The light metal meets strong acid…" },
    // — Nuclear & energy: spontaneous decay seeds a chain; a neutron splits fuel into heat, blast, fallout, and more neutrons —
    { id:"spontaneous", cat:"Nuclear", name:"Spontaneous decay", in:[URANIUM], out:[NEUTRON], starter:true, note:"Heavy nuclei rarely split on their own, coughing out the first free neutron that can start a chain.", hint:"Stack the green metal and wait…" },
    { id:"u_fission", cat:"Nuclear", name:"Fission", in:[NEUTRON,URANIUM], out:[FALLOUT], note:"A free neutron splits a uranium nucleus — heat, a blast, fresh neutrons, and radioactive fallout. Enough uranium together and it cascades.", hint:"A neutron, and enough uranium to catch it…" },
    { id:"pu_fission", cat:"Nuclear", name:"Plutonium fission", in:[NEUTRON,PLUTONIUM], out:[FALLOUT], note:"Plutonium splits more readily and throws an extra neutron — it goes critical in a far smaller lump.", hint:"Less of the warm grey metal is needed…" },
    { id:"breeding", cat:"Nuclear", name:"Breeding", in:[URANIUM,NEUTRON], out:[PLUTONIUM], note:"Uranium that absorbs a neutron without splitting can transmute into plutonium — one neutron spent, no matter made.", hint:"Bombard uranium that won't split…" },
    { id:"reactor_steam", cat:"Nuclear", name:"Reactor steam", in:[URANIUM,WATER], out:[STEAM], note:"Fission heat flashes coolant water to steam — a reactor is just a very dangerous kettle.", hint:"Cool a running pile with water…" },
    { id:"fallout_decay", cat:"Nuclear", name:"Fallout decay", in:[FALLOUT], out:[ASH], note:"Radioactive rubble is fierce but fleeting — it soon cools into harmless grey ash. The chain ends here.", hint:"What a spent reactor leaves behind…" },
    { id:"control_rod", cat:"Nuclear", name:"Control rod", in:[NEUTRON,CONTROL_ROD], out:[EMPTY], note:"A boron rod drinks the neutron flux, starving the chain. Slide it in to scram a pile; pull it out to wake it hungry.", hint:"Quench the storm of neutrons…" },
    { id:"hydrogen_boom", cat:"Pyrotechnics", name:"Knallgas", in:[HYDROGEN,FIRE], out:[FIRE], note:"Hydrogen ignites violently — far fiercer beside oxygen.", hint:"The lightest gas meets flame…" },
    { id:"oxy_fire", cat:"Pyrotechnics", name:"Oxygen feed", in:[OXYGEN,FIRE], out:[FIRE], note:"Oxygen makes flames burn hotter and longer.", hint:"Fire that can breathe…" },
    { id:"combust_o2", cat:"Pyrotechnics", name:"Combustion", in:[FIRE,OXYGEN], out:[CO2], note:"Oxygen-fed fire burns to carbon dioxide.", hint:"What fire breathes out…" },
    { id:"carbonate_acid", cat:"Phase", name:"Effervescence", in:[ACID,LIMESTONE], out:[CO2], note:"Acid on carbonate rock fizzes — it dissolves away, releasing carbon dioxide.", hint:"Vinegar on chalk…" },
    { id:"photosynthesis", cat:"Growth", name:"Photosynthesis", in:[PLANT,CO2], out:[OXYGEN], note:"A lit, watered leaf breathes carbon dioxide in and oxygen out.", hint:"What a green leaf gives back…" },
    { id:"smother", cat:"Pyrotechnics", name:"Smothered", in:[CO2,FIRE], out:[SMOKE], note:"Heavy carbon dioxide settles over a flame and snuffs it. Seal a fire with no air and it suffocates too.", hint:"Starve the flame of air…" },
    { id:"nitro_blast", cat:"Pyrotechnics", name:"Nitro shock", in:[NITRO], out:[FIRE], note:"Agitated nitro detonates on impact, heat, or spark.", hint:"Unstable liquid, sudden stop…" },
    { id:"fuse_chain", cat:"Pyrotechnics", name:"Fuse chain", in:[FUSE], out:[FIRE], note:"Flame crawls the cord to whatever it feeds.", hint:"A slow burning cord…" },
    { id:"gunpowder_boom", cat:"Pyrotechnics", name:"Powder keg", in:[GUNPOWDER,FIRE], out:[FIRE], note:"Fire or heat detonates a powder cache.", hint:"Powder meets flame…" },
    { id:"rain", cat:"Weather", name:"Rainfall", in:[CLOUD], out:[WATER], note:"Storm clouds drift and shed rain below.", hint:"Grey clouds gather…" },
    { id:"acid_rain", cat:"Weather", name:"Acid rain", in:[CLOUD,SMOKE], out:[ACIDCLOUD], note:"Smoke pollutes a cloud until it rains corrosive acid.", hint:"Smoke poisons the clouds…" },
    { id:"lightning", cat:"Weather", name:"Lightning strike", in:[CLOUD], out:[LIGHTNING], note:"A charged cloud — or the lightning tool — hurls a scorching bolt.", hint:"When the storm builds…" },
    { id:"cloner_copy", cat:"Special", name:"Replication", in:[CLONER], out:[CLONER], note:"Duplicates whatever material touches it.", hint:"A mirror block…" },
    { id:"void_hunger", cat:"Special", name:"The void", in:[VOID], out:[EMPTY], note:"Annihilates every neighbour it can reach.", hint:"Purple hunger…" },
    { id:"antimatter", cat:"Special", name:"Annihilation", in:[ANTIMATTER], out:[FIRE], note:"Antimatter meeting any matter releases a burst of raw energy.", hint:"Forbidden pink matter…" },
  ];
  const RECIPE_BY_ID = Object.fromEntries(ALCHEMY_RECIPES.map(r=>[r.id,r]));
  // never let a corrupt / tampered localStorage value throw and brick startup
  const safeParseArray = (key)=>{ try{ const a=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(a)?a:[]; }catch(_){ return []; } };
  let revealAll = localStorage.getItem("aether-reveal-all")==="1";
  let discoveries = new Set(safeParseArray("aether-discoveries"));
  ALCHEMY_RECIPES.filter(r=>r.starter).forEach(r=>discoveries.add(r.id));
  // recipes the player has already viewed in the book — drives the "NEW" badge
  let seenRecipes = new Set(safeParseArray("aether-seen"));

  /* ============================ Challenges ======================== */
  // Each test receives a live snapshot of the world: { cells, litBulbs, minTemp,
  // maxTemp, maxPres, count(id), disc(recipeSet) }.
  const CHALLENGES = [
    { id:"first_pour", icon:"🪣", title:"First Pour", desc:"Place your very first material.", test:s=>s.cells>0 },
    { id:"glass", icon:"🔷", title:"Glassblower", desc:"Fuse sand into glass with fierce heat.", test:s=>s.disc.has("sand_glass")||s.count(GLASS)>=20 },
    { id:"gold", icon:"🪙", title:"Transmuter", desc:"Turn mercury into gold.", test:s=>s.disc.has("acid_gold")||s.disc.has("philosopher_gold")||s.count(GOLD)>=8 },
    { id:"diamond", icon:"💎", title:"Diamond Hands", desc:"Forge a diamond from coal under furious heat.", test:s=>s.disc.has("diamond")||s.count(DIAMOND)>=1 },
    { id:"obsidian", icon:"🪨", title:"Quenched", desc:"Quench lava in water to make obsidian.", test:s=>s.disc.has("obsidian")||s.count(OBSIDIAN)>=10 },
    { id:"saltearth", icon:"🧂", title:"Salt of the Earth", desc:"Boil brine dry to crystallise its salt back out.", test:s=>s.disc.has("brine_evap") },
    { id:"vermilion", icon:"🔴", title:"Vermilion", desc:"Wed mercury and sulfur into cinnabar.", test:s=>s.disc.has("cinnabar") },
    { id:"slaked", icon:"🌋", title:"Slaked", desc:"Slake quicklime with water — heat and steam.", test:s=>s.disc.has("slake") },
    { id:"snuffed", icon:"🚭", title:"Snuffed Out", desc:"Smother a flame with carbon dioxide.", test:s=>s.disc.has("smother") },
    { id:"lights", icon:"💡", title:"Let There Be Light", desc:"Light up 5 bulbs at once with a spark or a strike.", test:s=>s.litBulbs>=5 },
    { id:"fulgurite", icon:"⚡", title:"Fulgurite", desc:"Fuse glass by striking sand with lightning.", test:s=>s.disc.has("fulgurite") },
    { id:"storm", icon:"⛈️", title:"Storm Chaser", desc:"Summon a lightning strike.", test:s=>s.disc.has("lightning") },
    { id:"acidrain", icon:"☣️", title:"Acid Rain", desc:"Pollute a cloud until it rains acid.", test:s=>s.disc.has("acid_rain") },
    { id:"boom", icon:"💥", title:"Demolitions", desc:"Set off a proper explosion.", test:s=>s.disc.has("nitro_blast")||s.disc.has("gunpowder_boom") },
    { id:"pressure", icon:"🎈", title:"Pressure Cooker", desc:"Build up serious pressure (200+).", test:s=>s.maxPres>=200 },
    { id:"freeze", icon:"❄️", title:"Deep Freeze", desc:"Chill the world below −20°.", test:s=>s.minTemp<=-20 },
    { id:"inferno", icon:"🔥", title:"Inferno", desc:"Heat something past 1500°.", test:s=>s.maxTemp>=1500 },
    { id:"antimatter", icon:"🌀", title:"Annihilation", desc:"Witness an antimatter reaction.", test:s=>s.disc.has("antimatter") },
    { id:"garden", icon:"🌿", title:"Green Thumb", desc:"Grow a sprawling vine.", test:s=>s.disc.has("vine_grow")||s.count(VINE)>=45 },
    { id:"germinate", icon:"🌱", title:"From a Seed", desc:"Sprout a sapling from a seed on damp soil.", test:s=>s.disc.has("germinate") },
    { id:"tree", icon:"🌳", title:"Mighty Oak", desc:"Grow a sapling into a full tree with a leafy crown.", test:s=>s.disc.has("tree") },
    { id:"magnum_opus", icon:"🜍", title:"The Great Work", desc:"Complete the Magnum Opus: nigredo → albedo → citrinitas → the Stone.", test:s=>s.disc.has("nigredo")&&s.disc.has("albedo")&&s.disc.has("citrinitas")&&s.disc.has("rubedo") },
    { id:"projection", icon:"👑", title:"Projection", desc:"Use the Philosopher's Stone to project base matter into gold.", test:s=>s.disc.has("projection") },
    { id:"wildfire", icon:"🌲", title:"Wildfire", desc:"Burn a forest of wood, plant or vine.", test:s=>s.disc.has("wildfire") },
  ];
  let challengesDone = new Set(safeParseArray("aether-challenges"));
  let challengesUnseen = false;  // a challenge completed since the panel was last opened

  function isRecipeKnown(id){ return revealAll || RECIPE_BY_ID[id]?.starter || discoveries.has(id); }
  function discoverRecipe(id){
    if(!RECIPE_BY_ID[id] || discoveries.has(id)) return;
    discoveries.add(id);
    try{ localStorage.setItem("aether-discoveries", JSON.stringify([...discoveries])); }catch(_){}
    renderBooklet();
    toast("📖 Discovered: "+RECIPE_BY_ID[id].name);
    Snd.chime();
  }

  const SPAWN_PROB = {
    [SAND]:0.85,[RAINBOW]:0.85,[WATER]:0.9,[SNOW]:0.7,[SALT]:0.8,[OIL]:0.9,
    [ACID]:0.8,[LAVA]:0.95,[FIRE]:0.5,[SMOKE]:0.4,[GUNPOWDER]:0.85,[COAL]:0.9,
    [ICE]:1,[WOOD]:1,[PLANT]:1,[METAL]:1,[STONE]:1,[GLASS]:1,[WALL]:1,
    [FIREWORK]:0.5,[EMPTY]:1,[MERCURY]:0.95,[THERMITE]:0.9,[FUSE]:1,
    [GOLD]:0.9,[NITRO]:0.85,[SULFUR]:0.88,[SALTPETER]:0.88,
    [CRYSTAL]:1,[PHILOSOPHER]:1,[AQUA]:0.88,
    [OBSIDIAN]:1,[DIAMOND]:1,[HYDROGEN]:0.85,[OXYGEN]:0.85,[ASH]:0.85,
    [RUST]:0.9,[CLOUD]:0.55,[ANTIMATTER]:1,
    [SLIME]:0.92,[HONEY]:0.95,[ACIDCLOUD]:0.55,[BULB]:1,
    [VINE]:1,[MOLD]:1,[BRINE]:0.9,[CINNABAR]:0.88,
    [LIMESTONE]:1,[QUICKLIME]:0.9,[SLAKEDLIME]:0.9,[CO2]:0.6,[SEED]:0.9,
    [NIGREDO]:0.92,[ALBEDO]:0.92,[CITRINITAS]:0.92,[SAPLING]:1,
    [COPPER]:1,[PATINA]:1,[CUPRITE]:1,[TIN]:1,[TINPEST]:0.9,[BRONZE]:1,[STEEL]:1,[SILVER]:1,[TARNISH]:1,[ALUMINUM]:0.9,
    [URANIUM]:1,[PLUTONIUM]:1,[NEUTRON]:0.7,[FALLOUT]:0.9,[CONTROL_ROD]:1,
  };

  /* ============================ Canvas / state ===================== */
  const sim=document.getElementById("sim"), glow=document.getElementById("glow");
  const sctx=sim.getContext("2d"), gctx=glow.getContext("2d");
  sctx.imageSmoothingEnabled=false; gctx.imageSmoothingEnabled=false;

  let SCALE,W,H,N;
  let grid,shade,life,vel,charge,moved,temp,tempB,pres,presB;
  let simImg,sim32,glowImg,glow32;
  let LS,LW,LH,LN,lightR,lightG,lightB,lightT;
  let lighting=true, lightLevel=0.54;
  function lightFX(){ return lighting ? lightLevel : 0; }
  function syncLightUI(){
    const fx=lightFX(), out=document.getElementById("light-readout");
    if(out) out.textContent=Math.round(lightLevel*100);
    glow.style.opacity=String(fx*0.92);
    glow.style.filter="blur("+(1.5+fx*3.5)+"px) brightness("+(0.82+fx*0.42)+")";
    const btn=document.getElementById("btn-light");
    if(btn){
      btn.classList.toggle("on",lighting);
      const lbl=btn.querySelector("span");
      if(lbl) lbl.textContent=lighting?"Light on":"Light off";
    }
  }

  function allocate(w,h){
    const old = grid ? {grid,temp,W,H} : null;
    W=w; H=h; N=W*H;
    N8OFF=[-W-1,-W,-W+1,-1,1,W-1,W,W+1];   // 8-neighbour linear offsets for this width (see forN8)
    CARD_OFF=[-W,W,-1,1];                   // 4-cardinal linear offsets for this width (see emptyNeighbor)
    grid=new Uint8Array(N); shade=new Uint8Array(N); life=new Int16Array(N);
    vel=new Float32Array(N); charge=new Int8Array(N); moved=new Uint8Array(N);
    temp=new Float32Array(N).fill(AMBIENT); tempB=new Float32Array(N);
    pres=new Float32Array(N); presB=new Float32Array(N);
    sim.width=W; sim.height=H; glow.width=W; glow.height=H;
    simImg=sctx.createImageData(W,H); glowImg=gctx.createImageData(W,H);
    sim32=new Uint32Array(simImg.data.buffer); glow32=new Uint32Array(glowImg.data.buffer);
    LS=3; LW=Math.ceil(W/LS); LH=Math.ceil(H/LS); LN=LW*LH;   // LS = light supersample: the colour-light buffer is 1/LS the grid resolution
    lightR=new Float32Array(LN); lightG=new Float32Array(LN);
    lightB=new Float32Array(LN); lightT=new Float32Array(LN);
    if(old){
      const cw=Math.min(old.W,W),ch=Math.min(old.H,H);
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
        const a=y*W+x,b=y*old.W+x, m=old.grid[b];
        grid[a]=m; temp[a]=old.temp[b]; shade[a]=r255(); life[a]=defaultLife(m);  // re-init shade/life so cells render & behave
      }
    }
    // reset active-region tracking for the new grid dimensions (full rebuild next step)
    bx0=0; by0=0; bx1=W-1; by1=H-1; boxFull=true;
    nbx0=0; nby0=0; nbx1=W-1; nby1=H-1; boxTick=BOX_REBUILD;
  }
  // world size: bigger index → smaller cells → more cells → a larger, finer world
  let worldSize = clampInt(+(localStorage.getItem("aether-world")||1), 0, 2);
  // Target cell-counts across the viewport, per size. Fixed (not derived from a
  // screen-dependent divisor that collapsed on wide screens), so Cozy / Balanced
  // / Grand are always visibly distinct: chunky pixels ⇄ fine detail.
  const WORLD_W=[240,420,660];
  function clampInt(v,a,b){ v=v|0; return v<a?a:v>b?b:v; }
  function resize(){
    const tw=WORLD_W[clampInt(worldSize,0,2)];
    SCALE=window.innerWidth/tw;                       // display scale (may be fractional)
    allocate(Math.round(tw), Math.max(1,Math.round(window.innerHeight/SCALE)));
    markRenderFull();
  }
  function setWorldSize(n){
    n=clampInt(n,0,2);
    if(n===worldSize) return;                         // already this size — do nothing (no glitchy realloc)
    worldSize=n;
    try{ localStorage.setItem("aether-world", String(worldSize)); }catch(_){}
    const og=grid, oW=W, oH=H;                        // keep the current scene before the grid is reallocated
    resize();                                          // changes SCALE / W / H / grid
    if(og && oW>0 && oH>0 && (oW!==W||oH!==H)){
      // rescale (nearest-neighbour) the whole scene into the new world instead of cropping it
      grid.fill(EMPTY); charge.fill(0); life.fill(0); pres.fill(0); temp.fill(AMBIENT); vel.fill(0);
      for(let y=0;y<H;y++){ const srow=((y*oH/H)|0)*oW, drow=y*W;
        for(let x=0;x<W;x++){ const m=og[srow+((x*oW/W)|0)]; if(m===EMPTY) continue;
          const i=drow+x; grid[i]=m; shade[i]=r255(); temp[i]=BASET[m]; life[i]=defaultLife(m); } }
    }
    setGravity(GX,GY); markRenderFull();
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
      case HYDROGEN: return 150+(rnd()*120|0);
      case OXYGEN: return 220+(rnd()*180|0);
      case CO2: return 240+(rnd()*200|0);
      case VINE: return 24+(rnd()*18|0);  // growth energy
      case SAPLING: return 11+(rnd()*16|0);  // trunk height the tree will climb before crowning
      case CLOUD: case ACIDCLOUD: return 6+(rnd()*9|0);  // how many times the cloud can rain before it sheds out and clears
      case CHLORINE: return 200+(rnd()*180|0);   // the toxic gas disperses over time
      case MAGNESIUM: return 90+(rnd()*70|0);     // burn budget once it ignites
      case NEUTRON: return 6+(rnd()*7|0);         // ballistic budget — a neutron travels ~6-12 cells then expires (the keystone life bound)
      case FALLOUT: return 600+(rnd()*400|0);     // fission rubble decays to plain ash after a while
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
  // 8-neighbour scan. The offset/delta arrays are module-level constants (rebuilt on resize) rather than
  // re-allocated on every call — forN8 is the single hottest function in the engine.
  const N8DX=[-1,0,1,-1,1,-1,0,1];   // x-deltas, for the row-edge (wrap-around) guard
  let N8OFF=[-1,0,1,-1,1,-1,0,1];    // linear offsets [-W-1,-W,...]; rebuilt for the live W in allocate()
  const CARD_DX=[0,0,-1,1];          // up/down/left/right x-deltas (for emptyNeighbor)
  let CARD_OFF=[-1,1,-1,1];          // matching linear offsets [-W,W,-1,1]; rebuilt in allocate()
  function forN8(x,i,fn){
    for(let k=0;k<8;k++){
      const ni=i+N8OFF[k]; if(ni<0||ni>=N) continue;
      const nx=x+N8DX[k]; if(nx<0||nx>=W) continue;
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
  const LAVA_SOLIDUS=520, LAVA_COOL=2.5;   // lava crystallises to stone below the solidus, shedding ~this much heat/step
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
    const dl=FALL.dias, flip=rnd()<0.5;   // try the two diagonals in random order — without allocating an array per fall
    for(let q=0;q<2;q++){
      const d=dl[flip?1-q:q];
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
    if(!HASTRANS[m]) return false; const tr=TRANS[m];   // flat-array gate — no M[m] dictionary hit per cell
    const t=temp[i];
    for(let k=0;k<tr.length;k++){
      const r=tr[k];
      if((r.c>0 ? t>=r.t : t<=r.t) && (r.p==null || rnd()<r.p)){
        convert(i,r.to);
        if(m===LAVA&&r.to===STONE) discoverRecipe("lava_stone");
        if(m===SAND&&r.to===GLASS) discoverRecipe("sand_glass");
        if(m===WOOD&&r.to===COAL) discoverRecipe("charcoal");
        if(m===TARNISH&&r.to===SILVER) discoverRecipe("silver_roast");
        return true;
      }
    }
    return false;
  }

  /* ============================ Explosions ======================== */
  function explode(cx,cy,power){
    Snd.boom();
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
    // pressure shockwave — spike the field, then physically shove loose matter outward
    for(let dy=-r;dy<=r;dy++){ const ny=cy+dy; if(ny<0||ny>=H)continue;
      for(let dx=-r;dx<=r;dx++){ const nx=cx+dx; if(nx<0||nx>=W)continue;
        const dd=dx*dx+dy*dy; if(dd>r2)continue;
        pres[ny*W+nx]+=power*7*(1-dd/r2);
      } }
    for(let dy=-r;dy<=r;dy++){ const ny=cy+dy; if(ny<1||ny>=H-1)continue;
      for(let dx=-r;dx<=r;dx++){ const nx=cx+dx; if(nx<1||nx>=W-1)continue;
        const dd=dx*dx+dy*dy; if(dd>r2||dd<1)continue;
        const i=ny*W+nx, mm=grid[i];
        if(mm===EMPTY||mm===WALL||TYPE[mm]===STATIC) continue;
        const sx=dx>0?1:(dx<0?-1:0), sy=dy>0?1:(dy<0?-1:0), ti=i+sy*W+sx;
        if(ti>=0&&ti<N && canDisplace(mm,ti)) swap(i,ti);
      } }
    shakeScreen(power*0.55);
    expandActive(cx-r-1,cy-r-1,cx+r+1,cy+r+1);   // the blast (cells + pressure) needs simulating/redrawing
  }

  /* ============================ Screen shake ====================== */
  let shakeAmt=0, stageEl=null;
  function shakeScreen(a){ if(a>shakeAmt) shakeAmt=a>6?6:a; }   // capped low — a hint of impact, not a jolt
  function applyShake(){
    if(!stageEl) stageEl=document.getElementById("stage");
    if(!stageEl) return;
    if(shakeAmt>0.15){
      const dx=(rnd()-0.5)*shakeAmt*0.4, dy=(rnd()-0.5)*shakeAmt*0.4;
      stageEl.style.transform="translate("+dx.toFixed(2)+"px,"+dy.toFixed(2)+"px)";
      shakeAmt*=0.86;
    } else if(shakeAmt!==0){ stageEl.style.transform=""; shakeAmt=0; }
  }
  // the vignette becomes a mood ring — warm with fire, cold with ice, sickly with acid
  let vigEl=null;
  function updateMood(warm, cold, tox){
    if(!vigEl){ vigEl=document.getElementById("vignette"); if(!vigEl) return; }
    let col=null, str=0;
    if(warm>=cold && warm>=tox && warm>40){ col="255,118,44"; str=Math.min(0.5, warm/520); }
    else if(cold>warm && cold>40){ col="118,178,255"; str=Math.min(0.46, cold/640); }
    else if(tox>26){ col="150,205,80"; str=Math.min(0.42, tox/280); }
    vigEl.style.boxShadow = col ? ("inset 0 0 "+Math.round(60+200*str)+"px rgba("+col+","+str.toFixed(2)+")") : "none";
  }
  // a soft full-screen colour bloom that fades out — for big "wow" moments
  let opusCooldown=0, flashEl=null;
  function flash(r,g,b,a){
    if(!flashEl){ flashEl=document.createElement("div"); flashEl.id="screen-flash";
      Object.assign(flashEl.style,{position:"fixed",inset:"0",zIndex:35,pointerEvents:"none",opacity:"0",mixBlendMode:"screen"});
      document.body.appendChild(flashEl); }
    flashEl.style.background="radial-gradient(circle at 50% 42%, rgb("+r+","+g+","+b+") 0%, rgba("+r+","+g+","+b+",0) 68%)";
    flashEl.style.transition="none"; flashEl.style.opacity=String(a);
    void flashEl.offsetWidth;                                  // reflow so the fade actually animates
    flashEl.style.transition="opacity .7s ease"; flashEl.style.opacity="0";
  }
  // the climax of the alchemy — celebrate the birth of the Philosopher's Stone (grandest on the first ever)
  function magnumOpusCeremony(x,y){
    for(let a=0;a<30;a++){ const ang=rnd()*6.2832, sp=0.8+rnd()*3.2;
      addP(x+0.5,y+0.5,Math.cos(ang)*sp,Math.sin(ang)*sp,22+rnd()*26,255,212,128,KSPARK); }
    shakeScreen(7); flash(255,205,120,0.5);
    let first=false; try{ first=!localStorage.getItem("aether-first-stone"); if(first) localStorage.setItem("aether-first-stone","1"); }catch(_){}
    if(first){ flash(255,228,150,0.82); for(let k=0;k<5;k++){ burst((W*(0.3+rnd()*0.4))|0,(H*0.3)|0); }
      toast("✨ The Great Work is complete — the Philosopher's Stone is born"); Snd.chime(true); }
    else toast("The Stone reddens — rubedo");
  }

  /* ===================== Procedural audio (Web Audio API) ====================
     All synthesised — no assets. Ambient noise voices (fire/water/lava) track
     the world; one-shots fire on events. Starts on the first user gesture
     (autoplay policy) and remembers a mute preference. */
  const Snd = (() => {
    let ctx=null, master=null, comp=null, started=false, noiseBuf=null;
    let muted=false; try{ muted=localStorage.getItem("aether-mute")==="1"; }catch(_){}
    const V={};                       // ambient voices
    const last=Object.create(null);   // per-sound throttle clocks (ms) so rapid events never stack into a wall
    const MASTER=0.5;
    function buildNoise(){ const n=ctx.sampleRate*2, b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
      for(let i=0;i<n;i++) d[i]=Math.random()*2-1; return b; }
    function voice(type){
      const src=ctx.createBufferSource(); src.buffer=noiseBuf; src.loop=true;
      const f=ctx.createBiquadFilter(), g=ctx.createGain(); g.gain.value=0;
      if(type==="fire"){ f.type="bandpass"; f.frequency.value=1000; f.Q.value=0.7; }
      else if(type==="water"){ f.type="lowpass"; f.frequency.value=460; }
      else { f.type="lowpass"; f.frequency.value=100; }   // lava rumble
      src.connect(f); f.connect(g); g.connect(master); src.start();
      return g;
    }
    function ensure(){
      if(ctx) return; const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      try{ ctx=new AC(); }catch(_){ return; }
      // a gentle limiter on the bus so a storm of blasts/strikes is tamed instead of clipping into harshness
      comp=ctx.createDynamicsCompressor();
      comp.threshold.value=-20; comp.knee.value=26; comp.ratio.value=5; comp.attack.value=0.003; comp.release.value=0.2;
      comp.connect(ctx.destination);
      master=ctx.createGain(); master.gain.value=0; master.connect(comp);
      noiseBuf=buildNoise(); V.fire=voice("fire"); V.water=voice("water"); V.lava=voice("lava");
    }
    function start(){ ensure(); if(!ctx) return; if(ctx.state==="suspended") ctx.resume();
      if(!started){ started=true; master.gain.setTargetAtTime(muted?0:MASTER, ctx.currentTime, 0.2); } }
    function on(){ return ctx && started && !muted; }
    function gate(key,ms){ const t=ctx.currentTime*1000; if(last[key] && t-last[key]<ms) return false; last[key]=t; return true; }
    function tone(freq,dur,type,vol,sweep,atk){
      if(!on()) return; const t=ctx.currentTime;
      const o=ctx.createOscillator(); o.type=type||"sine"; o.frequency.value=freq;
      if(sweep) o.frequency.exponentialRampToValueAtTime(sweep, t+dur);
      const g=ctx.createGain(); g.gain.value=0;
      g.gain.linearRampToValueAtTime(vol, t+(atk||0.008)); g.gain.exponentialRampToValueAtTime(0.0006, t+dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.04);
    }
    function noise(dur,ftype,freq,Q,vol,atk){
      if(!on()) return; const t=ctx.currentTime;
      const s=ctx.createBufferSource(); s.buffer=noiseBuf;
      const f=ctx.createBiquadFilter(); f.type=ftype||"lowpass"; f.frequency.value=freq; if(Q) f.Q.value=Q;
      const g=ctx.createGain(); g.gain.value=0;
      g.gain.linearRampToValueAtTime(vol, t+(atk||0.005)); g.gain.exponentialRampToValueAtTime(0.0005, t+dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+dur+0.04);
    }
    return {
      start,
      state:()=>({hasCtx:!!ctx, running:ctx?ctx.state:null, started, muted}),
      isMuted:()=>muted,
      setMuted(m){ muted=m; try{ localStorage.setItem("aether-mute", m?"1":"0"); }catch(_){}
        if(master&&ctx) master.gain.setTargetAtTime(m?0:MASTER, ctx.currentTime, 0.06); },
      ambient(fN,wN,lN){ if(!ctx||!started) return; const t=ctx.currentTime;
        V.fire.gain.setTargetAtTime(Math.min(0.14, fN*0.0008), t, 0.3);
        V.water.gain.setTargetAtTime(Math.min(0.10, wN*0.00032), t, 0.5);
        V.lava.gain.setTargetAtTime(Math.min(0.2, lN*0.0013), t, 0.5); },
      // a deep, soft detonation — low body + a low-passed rumble, no piercing highs
      boom(){ if(!on()||!gate("boom",100)) return;
        tone(82,0.62,"sine",0.4,34,0.014);
        noise(0.42,"lowpass",380,1,0.26,0.01);
        tone(150,0.16,"sine",0.10,66,0.005); },
      // a band-limited crack and a rolling thunder tail — sharp, but never a piercing hiss
      zap(){ if(!on()||!gate("zap",240)) return;
        noise(0.05,"bandpass",1400,0.7,0.13,0.001);
        tone(420,0.045,"sawtooth",0.03,150,0.001);
        tone(160,0.48,"sine",0.16,50,0.01);
        noise(0.32,"lowpass",230,1,0.1,0.014); },
      // new alchemy — a warm bell (grand = the Stone, a fuller rising chord)
      chime(grand){ if(!on()||!gate("chime",70)) return;
        tone(880,0.55,"triangle",0.17,0,0.01); setTimeout(()=>tone(1318,0.6,"sine",0.12,0,0.01),80);
        if(grand) setTimeout(()=>tone(1760,0.75,"sine",0.1,0,0.012),170); },
      // firework — a soft, airy blip
      pop(){ if(!on()||!gate("pop",45)) return; tone(520,0.16,"sine",0.12,210,0.004); },
    };
  })();

  /* ============================ Per-material ====================== */
  function upFire(x,y,i){
    applySrc(i,650,0.5); heatN(i,18);
    // wildfire contagion + combustion air-check, in one neighbour scan
    let air=false, oxy=-1, co2=false, doused=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===WATER){ convert(ni,STEAM); doused=true; return false; }   // water douses the flame and flashes to steam
      if(FLAM[nm] && TYPE[nm]===STATIC){
        temp[ni]+=42;
        if(temp[ni]>140 && rnd()<0.07){ convert(ni,FIRE); discoverRecipe("wildfire"); }
      }
      if(nm===CO2) co2=true;
      else if(nm===OXYGEN) oxy=ni;
      else if(nm===EMPTY || TYPE[nm]===GAS) air=true;   // somewhere to draw breath / vent
      return false;
    });
    if(doused){ convert(i, rnd()<0.5?SMOKE:EMPTY); discoverRecipe("douse"); return; }   // quenched by water
    if(oxy>=0){ applySrc(i,950,0.25); if(rnd()<0.3){ convert(oxy,CO2); discoverRecipe("combust_o2"); } air=true; }
    // CO2 smothers; sealed (no air) suffocates; oxygen sustains; otherwise normal burn
    life[i] -= co2 ? 6 : (!air ? 4 : (oxy>=0 ? 0 : 1));
    if(life[i]<=0){ const r=rnd(); if(r<0.42) convert(i,SMOKE); else if(r<0.6) convert(i,ASH); else grid[i]=EMPTY; return; }  // embers leave a little ash — it drifts down and enriches the soil
    if(applyPressure(x,y,i,FIRE)) return;
    moveGas(x,y,i,FIRE); applyWind(x,i,FIRE);
  }
  function upCO2(x,y,i){
    if(--life[i]<=0){ grid[i]=EMPTY; return; }
    forN8(x,i,(ni,nm)=>{ if(nm===FIRE && life[ni]>2){ life[ni]=2; discoverRecipe("smother"); } return false; });  // snuff flames
    // a heavy gas: sinks and pools low, spreading sideways, only rarely drifting up
    if(rnd()<0.7 && y<H-1 && canDisplace(CO2,i+W)){ swap(i,i+W); return; }
    const dir=rnd()<0.5?1:-1, nx=x+dir;
    if(nx>=0&&nx<W && canDisplace(CO2,i+dir)){ swap(i,i+dir); return; }
    if(rnd()<0.08 && i-W>=0 && grid[i-W]===EMPTY){ swap(i,i-W); return; }
    applyWind(x,i,CO2);
  }
  function upLava(x,y,i){
    // heat spreads to neighbours by DIFFUSION (which caps at the lava's own temperature) rather than an
    // additive injection — so lava can't drive the rock it sits on past its melt point and eat its container
    // quench — lava meeting water flashes to obsidian (volcanic glass) and boils off steam
    let quenched=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===WATER && rnd()<0.16){ convert(ni,STEAM); convert(i,OBSIDIAN); temp[i]=340; quenched=true; discoverRecipe("obsidian"); return true; }
      if(FLAM[nm] && rnd()<0.22){ if(TYPE[nm]===STATIC){ convert(ni,FIRE); discoverRecipe("wildfire"); } else temp[ni]+=140; }   // molten rock sets flammables alight on contact
      return false;
    });
    if(quenched) return;
    // it gives up its heat (here + via diffusion to cold neighbours) and CRYSTALLISES to stone once it cools
    // past the solidus — slow cooling → stone, a fast water-quench → obsidian (real igneous petrology)
    if(temp[i]>LAVA_SOLIDUS){ temp[i]-=LAVA_COOL; if(rnd()<0.6) moveLiquid(x,y,i,LAVA,1); }
    else { convert(i,STONE); discoverRecipe("lava_stone"); }
  }
  function upWater(x,y,i){
    let gone=false, metalCell=-1, oxy=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===SALT && rnd()<0.025){ convert(i,BRINE); grid[ni]=EMPTY; discoverRecipe("brine_dissolve"); gone=true; return true; }  // dissolve salt → brine
      else if(nm===METAL && temp[ni]<120) metalCell=ni;
      else if(nm===OXYGEN) oxy=true;
      return false;
    });
    if(gone) return;
    // oxidation — iron rusts in water, and a good deal FASTER when dissolved oxygen is present
    if(metalCell>=0 && rnd()<(oxy?0.005:0.0008)){ convert(metalCell,RUST); discoverRecipe("rust"); }
    moveLiquid(x,y,i,WATER,DISP[WATER]); applyWind(x,i,WATER);
  }
  function upSteam(x,y,i){
    if(--life[i]<=0){ convert(i, rnd()<0.4?WATER:EMPTY); return; }
    // the water cycle: vapour touching something cold condenses back to droplets; vapour gathered high & cool gathers into a cloud
    let cold=false, vapour=0;
    forN8(x,i,(ni,nm)=>{ if(nm===ICE||nm===SNOW||temp[ni]<6) cold=true; if(nm===STEAM||nm===CLOUD) vapour++; return false; });
    if(cold && rnd()<0.14){ convert(i,WATER); discoverRecipe("condense"); return; }
    if(y<(H*0.32) && vapour>=4 && rnd()<0.03){ convert(i,CLOUD); life[i]=2+(rnd()*3|0); discoverRecipe("condense"); return; }   // gathered vapour condenses into a LIGHT cloud (sheds a drop or two — so the cycle conserves, never snowballs)
    if(applyPressure(x,y,i,STEAM)) return;
    moveGas(x,y,i,STEAM); applyWind(x,i,STEAM);
  }
  function upSmoke(x,y,i){
    if(--life[i]<=0 || (y===0&&rnd()<0.08)){ grid[i]=EMPTY; return; }
    forN8(x,i,(ni,nm)=>{ if(nm===SULFUR && rnd()<0.007){ convert(ni,ACID); discoverRecipe("smoke_acid"); } return false; });
    if(applyPressure(x,y,i,SMOKE)) return;
    moveGas(x,y,i,SMOKE); applyWind(x,i,SMOKE);
  }
  function upAcid(x,y,i){
    let gone=false, phil=false;
    forN8(x,i,(ni,nm)=>{ if(nm===PHILOSOPHER) phil=true; return false; });
    forN8(x,i,(ni,nm)=>{
      // philosopher's transmutation — acid + mercury precipitates gold
      if(nm===MERCURY && rnd()<(phil?0.04:0.015)){ convert(ni,GOLD); temp[ni]=temp[i]; grid[i]=EMPTY; gone=true; discoverRecipe("acid_gold"); return true; }
      // nitric path — acid + saltpeter brews aqua regia
      if(nm===SALTPETER && rnd()<0.012){ convert(i,AQUA); grid[ni]=EMPTY; gone=true; discoverRecipe("aqua_brew"); return true; }
      // diluted by water — the acid is neutralised into it rather than devouring it
      if(nm===WATER){ if(rnd()<0.02){ grid[i]=EMPTY; gone=true; return true; } return false; }
      // carbonate rock fizzes — acid + limestone → meltwater + a puff of CO2 (vinegar on chalk)
      if(nm===LIMESTONE && rnd()<0.04){ grid[ni]=EMPTY; const e=emptyNeighbor(x,i); if(e>=0) spawn(e,CO2); convert(i,WATER); gone=true; discoverRecipe("carbonate_acid"); return true; }
      if(nm!==EMPTY&&nm!==ACID&&nm!==WALL&&nm!==GLASS&&nm!==GOLD&&nm!==AQUA&&nm!==WATER&&nm!==BRONZE&&nm!==PATINA&&nm!==CUPRITE&&TYPE[nm]!==GAS && rnd()<0.05){
        grid[ni]=EMPTY;
        if(rnd()<0.4){ grid[i]=EMPTY; gone=true; return true; }
      }
      return false;
    });
    if(gone) return;
    moveLiquid(x,y,i,ACID,DISP[ACID]); applyWind(x,i,ACID);
  }
  function tryCraftGunpowder(x,i){
    let s=-1,n=-1,c=-1;
    forN8(x,i,(ni,nm)=>{
      if(nm===SULFUR) s=ni; else if(nm===SALTPETER) n=ni; else if(nm===COAL) c=ni;
      return false;
    });
    if(s>=0&&n>=0&&c>=0 && rnd()<0.14){
      convert(i,GUNPOWDER);
      grid[s]=EMPTY; grid[n]=EMPTY; grid[c]=EMPTY;
      discoverRecipe("gunpowder");
      return true;
    }
    return false;
  }
  function upSulfur(x,y,i){
    if(tryCraftGunpowder(x,i)) return;
    moveFalling(x,y,i,SULFUR);
  }
  function upSaltpeter(x,y,i){
    if(tryCraftGunpowder(x,i)) return;
    moveFalling(x,y,i,SALTPETER);
  }
  function upSalt(x,y,i){
    let d=false;
    forCard(i,(ni)=>{ const nm=grid[ni];
      if(nm===WATER && rnd()<0.03){ convert(ni,BRINE); grid[i]=EMPTY; discoverRecipe("brine_dissolve"); d=true; }    // dissolves into brine
      else if((nm===ICE||nm===SNOW) && rnd()<0.05){ convert(ni,BRINE); grid[i]=EMPTY; discoverRecipe("salt_melt"); d=true; }  // freezing-point depression — salt melts ice/snow into brine
    });
    if(!d) moveFalling(x,y,i,SALT);
  }
  function upBrine(x,y,i){
    if(temp[i]>=104 && rnd()<0.05){     // boils dry (slightly above 100° — boiling-point elevation); salt crystallises, water leaves as steam
      const e=emptyNeighbor(x,i);
      convert(i,SALT); if(e>=0) spawn(e,STEAM);
      discoverRecipe("brine_evap"); return;
    }
    // salt water is brutal on iron — it corrodes adjacent metal far faster than fresh water does
    forN8(x,i,(ni,nm)=>{ if(nm===METAL && temp[ni]<120 && rnd()<0.004){ convert(ni,RUST); discoverRecipe("rust"); }
      else if(nm===STEEL && temp[ni]<120 && rnd()<0.0006){ convert(ni,RUST); discoverRecipe("steel_corrode"); }   // steel resists fresh water but salt still bites — slowly
      return false; });
    moveLiquid(x,y,i,BRINE,DISP[BRINE]); applyWind(x,i,BRINE);
  }
  function upSodium(x,y,i){
    let reacted=false;
    forN8(x,i,(ni,nm)=>{
      // alkali metal + water: violently exothermic — strips hydrogen and ignites it (an explosion)
      if(nm===WATER||nm===BRINE||nm===ICE){
        convert(ni,HYDROGEN); temp[ni]+=420; temp[i]+=600; heatN(i,44);
        convert(i, rnd()<0.55?FIRE:EMPTY);                 // the sodium is consumed in the reaction
        reacted=true; discoverRecipe("sodium_water"); return true;
      }
      if(nm===CHLORINE){ convert(i,SALT); convert(ni,SALT); reacted=true; discoverRecipe("salt_synthesis"); return true; }   // Na + Cl₂ → table salt
      return false;
    });
    if(reacted) return;
    moveFalling(x,y,i,SODIUM);
  }
  function upChlorine(x,y,i){
    if(--life[i]<=0){ grid[i]=EMPTY; return; }   // the gas disperses over time
    let gone=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===SODIUM){ convert(i,SALT); convert(ni,SALT); gone=true; discoverRecipe("salt_synthesis"); return true; }
      if(nm===WATER && rnd()<0.02){ convert(ni,ACID); grid[i]=EMPTY; gone=true; discoverRecipe("chlorine_acid"); return true; }   // dissolves into chlorine water / acid
      if((nm===PLANT||nm===VINE||nm===SAPLING||nm===SEED) && rnd()<0.05){ convert(ni,ASH); discoverRecipe("chlorine_kill"); }       // toxic to living things
      return false;
    });
    if(gone) return;
    // a heavy toxic gas — sinks and pools low, spreading sideways (denser than air)
    if(rnd()<0.7 && y<H-1 && canDisplace(CHLORINE,i+W)){ swap(i,i+W); return; }
    const dir=rnd()<0.5?1:-1, nx=x+dir;
    if(nx>=0&&nx<W && canDisplace(CHLORINE,i+dir)){ swap(i,i+dir); return; }
    applyWind(x,i,CHLORINE);
  }
  function upMagnesium(x,y,i){
    // ignites from moderate heat or flame, then burns BLINDING white — and it cannot be smothered: it
    // burns straight through water and CO₂ (real magnesium-fire behaviour), leaving white-hot oxide ash
    let lit = temp[i]>430;
    if(!lit) forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA||nm===THERMITE){ lit=true; return true; } return false; });
    if(lit){
      applySrc(i,1700,0.4); heatN(i,34);                 // ferocious, blinding heat
      forN8(x,i,(ni,nm)=>{                                // the very things that would quench a fire only FEED it
        if(nm===OXYGEN) convert(ni,EMPTY);
        else if(nm===CO2) convert(ni,SMOKE);             // Mg + CO₂ → MgO + C (still burns)
        else if(nm===WATER||nm===BRINE) convert(ni,HYDROGEN);   // Mg + H₂O → MgO + H₂ (still burns underwater)
        return false;
      });
      if(--life[i]<=0){ convert(i, rnd()<0.6?ASH:SMOKE); discoverRecipe("magnesium_burn"); return; }   // → white magnesia ash
    }
    moveFalling(x,y,i,MAGNESIUM);
  }

  /* ===================== Forge & foundry: melting & casting ===================== */
  // Every solid metal melts the same way: above its melting point it becomes the shared MOLTEN_METAL and tags
  // life[] with its own id, so it freezes back into exactly what it was (cast iron stays iron, never rock).
  function meltCheck(i,m){
    if(temp[i]>=MELT_PT[m] && rnd()<0.06){
      convert(i,MOLTEN_METAL); life[i]=m;            // life MUST be set AFTER convert() (convert resets it)
      temp[i]=Math.max(temp[i],MELT_SEED[m]);
      discoverRecipe(MELT_RECIPE[m]);
      return true;
    }
    return false;
  }
  // Molten metal flows like lava, flash-casts in water, and freezes back to its remembered solid once it cools.
  function upMolten(x,y,i){
    const dst=life[i]||METAL, fp=MELT_PT[dst];
    let quenched=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===WATER && rnd()<0.16){                  // plunged into water → flash to steam + cast instantly
        convert(ni,STEAM); temp[ni]=110;
        convert(i,dst); temp[i]=Math.max(temp[i]-200,AMBIENT);
        quenched=true; discoverRecipe("quench_cast"); return true;
      }
      if(FLAM[nm] && rnd()<0.22){ if(TYPE[nm]===STATIC) convert(ni,FIRE); else temp[ni]+=140; }   // white-hot metal lights fuels
      return false;
    });
    if(quenched) return;                             // CRITICAL: never run the mover on a cell that just solidified
    if(temp[i] < fp-40){                             // cooled below freezing → cast back into the remembered metal
      if(rnd()<0.5) heatN(i,2);                      // a whisper of latent heat of fusion to neighbours
      convert(i,dst); const cr=CAST_RECIPE[dst]; if(cr) discoverRecipe(cr);
      return;
    }
    temp[i]-=0.6;                                    // slowly sheds heat as it sits
    moveLiquid(x,y,i,MOLTEN_METAL,1);
  }
  function upMetalMelt(x,y,i,m){ meltCheck(i,m); }   // iron is STATIC — it only needs the melt check
  function upGold(x,y,i,m){ if(meltCheck(i,m)) return; moveFalling(x,y,i,GOLD); }
  // Copper: salt water or acid greens it to verdigris (patina); clean water slowly browns it to cuprite.
  function upCopper(x,y,i,m){
    if(meltCheck(i,m)) return;
    if(temp[i]<120){
      let wet=-1,brine=-1,acidN=-1;
      forN8(x,i,(ni,nm)=>{ if(nm===WATER)wet=ni; else if(nm===BRINE)brine=ni; else if(nm===ACID)acidN=ni; return false; });
      if(brine>=0 && rnd()<0.006){ convert(i,PATINA); discoverRecipe("patina"); return; }
      if(acidN>=0 && rnd()<0.02){ convert(i,PATINA); discoverRecipe("patina"); return; }
      if(wet>=0 && rnd()<0.0008){ convert(i,CUPRITE); discoverRecipe("cuprite"); return; }
    }
  }
  // Tin: lowest melt of any metal. Wedded to copper it forges bronze; left in deep cold it crumbles to tin pest.
  function upTin(x,y,i,m){
    // Alloying takes precedence over melting: warm tin (180°+) touching copper forges bronze BEFORE it can melt,
    // so heating tin against copper with any flame (which would otherwise just melt the tin) makes bronze.
    let alloyed=false;
    forN8(x,i,(ni,nm)=>{ if(nm===COPPER && temp[i]>=180 && rnd()<0.05){ convert(ni,BRONZE); convert(i,BRONZE); alloyed=true; discoverRecipe("bronze"); return true; } return false; });
    if(alloyed) return;
    if(meltCheck(i,m)) return;
    if(temp[i]<13){                                  // tin pest: below 13°C white tin rots to grey powder (autocatalytic)
      let seeded=false;
      forN8(x,i,(ni,nm)=>{ if(nm===TINPEST){ seeded=true; return true; } return false; });
      if(rnd()<(seeded?0.03:0.0016)){ convert(i,TINPEST); discoverRecipe("tin_pest"); }
    }
  }
  const upTinPest=(x,y,i)=>moveFalling(x,y,i,TINPEST);   // the warm re-anneal back to tin is the trans rule
  function upBronze(x,y,i,m){ meltCheck(i,m); }          // STATIC; corrosion resistance is by omission + the upAcid guard
  // Steel: carburised iron (forged in upCoal). Here it melts (just below iron) and quench-hardens in water.
  function upSteel(x,y,i,m){
    if(meltCheck(i,m)) return;
    if(temp[i]>=727 && life[i]<=0){                  // red-hot steel quenched in water hardens — once
      let hit=false;
      forN8(x,i,(ni,nm)=>{ if(nm===WATER){ convert(ni,STEAM); temp[ni]=110; hit=true; return true; } return false; });
      if(hit){ life[i]=1; applySrc(i,AMBIENT,0.6); discoverRecipe("quench"); }
    }
  }
  // Silver: the best electrical conductor. Sulfur blackens it to tarnish; aqua regia / acid dissolve it away.
  function upSilver(x,y,i,m){
    if(meltCheck(i,m)) return;
    forN8(x,i,(ni,nm)=>{
      if(nm===AQUA && rnd()<0.06){ grid[i]=EMPTY; discoverRecipe("silver_acid"); return true; }
      if(nm===ACID && rnd()<0.02){ grid[i]=EMPTY; return true; }
      if(nm===SULFUR){ const p=temp[i]>120?0.02:0.006; if(rnd()<p){ grid[ni]=EMPTY; convert(i,TARNISH); discoverRecipe("silver_tarnish"); return true; } }
      return false;
    });
  }
  // Aluminum: light, oxide-sealed (shrugs off water). Packed against rust it IS thermite. Strong acid dissolves it → H₂.
  function upAluminum(x,y,i,m){
    if(meltCheck(i,m)) return;
    let ignite = charge[i]>0;
    if(!ignite) forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA||nm===MOLTEN_METAL){ ignite=true; return true; } return false; });
    if(ignite || temp[i]>=900){
      let rustCell=-1;
      forN8(x,i,(ni,nm)=>{ if(nm===RUST){ rustCell=ni; return true; } return false; });
      if(rustCell>=0){                               // 2Al + Fe₂O₃ → 2Fe + Al₂O₃, white-hot: rust reduced to MOLTEN IRON
        applySrc(i,2200,0.5); heatN(i,40);
        convert(rustCell,MOLTEN_METAL); life[rustCell]=METAL; temp[rustCell]=1600;
        convert(i, rnd()<0.5?MOLTEN_METAL:EMPTY); if(grid[i]===MOLTEN_METAL) life[i]=METAL;
        if(rnd()<0.6) addP(x+0.5,y+0.5,(rnd()-0.5)*1.3,-(0.4+rnd()*1.7),16+rnd()*18,255,236,150,KSPARK);
        discoverRecipe("thermite_mix"); return;
      }
    }
    let acidGone=false;
    forN8(x,i,(ni,nm)=>{ if(nm===ACID && rnd()<0.01){ grid[i]=EMPTY; const e=emptyNeighbor(x,i); if(e>=0) spawn(e,HYDROGEN); acidGone=true; discoverRecipe("aluminum_acid"); return true; } return false; });
    if(acidGone) return;
    moveFalling(x,y,i,ALUMINUM); applyWind(x,i,ALUMINUM);
  }

  /* ===================== Nuclear: a provably-bounded fission chain ===================== */
  // Fuel (uranium/plutonium) is STATIC and NEVER fissions from heat — only a NEUTRON strike splits it. It hums with
  // faint self-heat and, very rarely, coughs out a spontaneous neutron that can seed a chain. Bounded: emits at most
  // one neutron per cell per step into EMPTY space, consumes no fuel, and the neutron itself has a finite life.
  function upFuel(x,y,i,m){
    const isPu=(m===PLUTONIUM);
    applySrc(i, isPu?160:60, 0.02);                              // bounded radiogenic self-heat (converges to a low target)
    if(temp[i]>200) forN8(x,i,(ni,nm)=>{ if(nm===WATER||nm===STEAM){ discoverRecipe("reactor_steam"); return true; } return false; });   // a running pile boils its coolant
    if(rnd() < (isPu?SPON_PU:SPON_U)){ const e=emptyNeighbor(x,i); if(e>=0){ spawn(e,NEUTRON); discoverRecipe("spontaneous"); } }
  }
  // The neutron: the whole chain rides on this one function. Order is load-bearing (expire → absorb → fission → drift).
  // Boundedness: every fission converts one fuel cell to FALLOUT (1:1, irreversible) and emits ≤3 neutrons into EMPTY
  // cells only; neutrons always expire (finite life), are drunk by control rods/matter, or are consumed on impact.
  function upNeutron(x,y,i){
    if(--life[i]<=0){ grid[i]=EMPTY; return; }                  // ALWAYS expires — no immortal carrier
    // absorption first: control rods drink it, uranium occasionally breeds to plutonium, ordinary matter parasitically captures it
    let absorbed=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===CONTROL_ROD && rnd()<0.95){ grid[i]=EMPTY; absorbed=true; return true; }
      if(nm===URANIUM && rnd()<0.012){ convert(ni,PLUTONIUM); grid[i]=EMPTY; absorbed=true; discoverRecipe("breeding"); return true; }   // U-238 + n → Pu-239
      if(nm!==EMPTY && TYPE[nm]!==GAS && nm!==NEUTRON && rnd()<ABSORB){ grid[i]=EMPTY; absorbed=true; return true; }   // parasitic loss / shielding
      return false;
    });
    if(absorbed) return;
    // fission scan: the first fuel neighbour it captures splits
    let struck=-1, isPu=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===URANIUM && rnd()<CAPTURE_U){ struck=ni; isPu=false; return true; }
      if(nm===PLUTONIUM && rnd()<CAPTURE_PU){ struck=ni; isPu=true; return true; }
      return false;
    });
    if(struck>=0){
      const sx=struck%W, sy=(struck/W)|0;
      convert(struck,FALLOUT); applySrc(struck,2200,0.6); heatN(struck,80);   // PAY one fuel cell; dump heat (clamped to 2200)
      let placed=0, nu=isPu?3:2;
      forN8(sx,struck,(ni,nm)=>{ if(placed>=nu) return true; if(nm===EMPTY){ spawn(ni,NEUTRON); placed++; } return false; });   // ≤nu prompt neutrons into EMPTY only
      explode(sx,sy,2);                                          // load-bearing: the blast clears pockets so neutrons can propagate through packed fuel (also the visible yield). LAST, so it can't clobber the fresh neutrons
      if(rnd()<0.12) convert(struck,FALLOUT);                    // re-settle a LITTLE rubble after the blast — leaves visible fallout without choking the reaction cavity (the chain is very sensitive to obstruction)
      grid[i]=EMPTY;                                             // the incident neutron is consumed
      discoverRecipe(isPu?"pu_fission":"u_fission");
      return;
    }
    moveGas(x,y,i,NEUTRON);                                      // no fuel found — drift on, ticking down
  }
  function upFallout(x,y,i){
    applySrc(i,90,0.01);                                         // faint bounded decay heat
    let wet=false;
    forN8(x,i,(ni,nm)=>{ if(nm===WATER||nm===ICE||nm===SNOW){ wet=true; return true; } return false; });
    if(wet) life[i]-=2;                                          // rain wash-out: settles faster (life only ever decreases)
    if(--life[i]<=0){ convert(i,ASH); discoverRecipe("fallout_decay"); return; }   // → inert ash; the chain ends here
    moveFalling(x,y,i,FALLOUT); applyWind(x,i,FALLOUT);
  }
  // Control rod: a pure neutron SINK — it only ever DELETES adjacent neutrons, never spawns anything. Sliding rods
  // into a pile lowers k below critical (the SCRAM); it cannot make a bounded chain unbounded.
  function upControlRod(x,y,i){
    forN8(x,i,(ni,nm)=>{ if(nm===NEUTRON && rnd()<0.92){ grid[ni]=EMPTY; life[ni]=0; vel[ni]=0; if(temp[i]<900) temp[i]+=3; discoverRecipe("control_rod"); } return false; });
  }
  function upCinnabar(x,y,i){
    if(temp[i]>580 && rnd()<0.05){      // roasting decomposes it back to quicksilver + sulfur
      const e=emptyNeighbor(x,i);
      convert(i,MERCURY); if(e>=0) spawn(e,SULFUR);
      discoverRecipe("cinnabar_roast"); return;
    }
    moveFalling(x,y,i,CINNABAR);
  }
  function upLimestone(x,y,i){
    // calcination — fierce heat drives off CO2 (as smoke), leaving quicklime
    if(temp[i]>760 && rnd()<0.05){
      convert(i,QUICKLIME);
      const e=emptyNeighbor(x,i); if(e>=0 && rnd()<0.6) spawn(e,SMOKE);
      discoverRecipe("calcine");
    }
  }
  function upQuicklime(x,y,i){
    // slaking — quicklime + water reacts VIOLENTLY (strongly exothermic): it hisses and flash-boils ALL the
    // water around it to steam at once, not just one cell, then sets to slaked lime
    let slaked=false;
    forN8(x,i,(ni,nm)=>{ if(nm===WATER||nm===BRINE){ convert(ni,STEAM); slaked=true; } return false; });
    if(slaked){ convert(i,SLAKEDLIME); temp[i]+=320; heatN(i,40); discoverRecipe("slake"); return; }
    moveFalling(x,y,i,QUICKLIME);
  }
  function upSlakedlime(x,y,i){
    // neutralisation — a base meeting acid makes salt + water, with a little heat
    let reacted=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===ACID||nm===AQUA){
        convert(ni,SALT); convert(i,WATER); temp[i]+=36;
        reacted=true; discoverRecipe("neutralise"); return true;
      }
      return false;
    });
    if(reacted) return;
    moveFalling(x,y,i,SLAKEDLIME);
  }
  function upSnow(x,y,i){
    applySrc(i,-3,0.2);
    forCard(i,(ni)=>{ const nm=grid[ni]; if(nm===SALT && rnd()<0.05){ convert(i,BRINE); grid[ni]=EMPTY; discoverRecipe("salt_melt"); } });  // salt melts it too
    if(rnd()<0.6) moveFalling(x,y,i,SNOW);
    applyWind(x,i,SNOW);
  }
  function upIce(i){ applySrc(i,-12,0.3);
    forCard(i,(ni)=>{ const nm=grid[ni];
      if(nm===WATER && temp[ni]<1 && rnd()<0.05){ convert(ni,ICE); discoverRecipe("freeze"); }   // a frost rim grows into genuinely-cold water
      else if(nm===SALT && rnd()<0.05){ convert(i,WATER); grid[ni]=EMPTY; discoverRecipe("salt_melt"); }   // salt melts ice
    });
  }
  function upPlant(x,y,i){
    let water=-1; let lit=false, co2=-1, kin=0; const empties=[];
    forN8(x,i,(ni,nm)=>{
      if(nm===WATER){ water=ni; lit=true; }
      else if(nm===EMPTY){ empties.push(ni); lit=true; }
      else if(nm===CO2) co2=ni;
      else {
        if(nm===PLANT||nm===WOOD||nm===VINE||nm===SAPLING) kin++;   // neighbouring foliage = shade
        // alive if it can reach air, light (through liquids/ice/glass), or its own kind — only opaque burial wilts it
        if(TYPE[nm]===GAS||TYPE[nm]===LIQUID||nm===PLANT||nm===VINE||nm===SEED||nm===ICE||nm===GLASS) lit=true;
      }
      return false;
    });
    // photosynthesis — a plant sealed in the dark (buried, no air/light, no kin) withers to ash
    if(!lit){ if(rnd()<0.004){ convert(i,ASH); discoverRecipe("wilt"); } return; }
    // a lit, watered leaf breathes CO2 in and oxygen out (the carbon/oxygen cycle)
    if(co2>=0 && water>=0 && rnd()<0.05){ convert(co2,OXYGEN); discoverRecipe("photosynthesis"); }
    // grow SLOWLY toward the light, only when watered and NOT already crowded by a thicket (light-limited),
    // and only into a cell that leans on something solid — so foliage stays a rooted, supported mass
    // instead of shooting tendrils up through the falling rain to fill the whole sky
    if(water>=0 && empties.length && kin<5 && rnd()<0.04){
      empties.sort((a,b)=>a-b);
      const tgt = rnd()<0.7?empties[0]:empties[(rnd()*empties.length)|0];
      const tx=tgt%W; let support=0;
      forN8(tx,tgt,(nj,nmj)=>{ if(nmj===PLANT||nmj===WOOD||nmj===VINE||nmj===STONE||nmj===SAND||nmj===SLAKEDLIME||nmj===LIMESTONE||nmj===ASH) support++; return false; });
      if(support>=2){ convert(tgt,PLANT); temp[tgt]=temp[i]; grid[water]=EMPTY; discoverRecipe("plant_grow"); }
    }
  }
  function upSeed(x,y,i){
    // germinate on damp soil — sprout a sapling that will climb into a tree
    let soil=false;
    if(i+W<N){ const b=grid[i+W]; if(b===SAND||b===LIMESTONE||b===STONE||b===PLANT||b===SLAKEDLIME||b===ASH) soil=true; }
    if(soil){
      let water=false, rich=false;
      forN8(x,i,(ni,nm)=>{ if(nm===WATER||nm===BRINE) water=true; if(nm===ASH) rich=true; return false; });
      if(water && rnd()<(rich?0.12:0.07)){ convert(i,SAPLING); discoverRecipe("germinate"); return; }  // ash-rich soil sprouts faster
    }
    moveFalling(x,y,i,SEED);
  }
  // a sapling climbs a wooden trunk toward the light, then bursts into a leafy crown
  function upSapling(x,y,i){
    const up=i-W;
    const above=(y>0)? grid[up] : WALL;
    if(above===SAPLING || above===WOOD){ convert(i,WOOD); return; }   // a lower trunk segment — just harden
    const clear = (above===EMPTY || above===WATER || above===BRINE);   // it can push up through air or water
    if(life[i]<=0 || y<=2 || !clear){ growCanopy(x,y,i); return; }   // the tip: budget spent, sky reached, or blocked → crown
    // climb: leave trunk behind, advance the tip upward (capture the budget BEFORE convert resets life[i])
    const budget=life[i]-1, t=temp[i];
    convert(i,WOOD);
    grid[up]=SAPLING; shade[up]=r255(); life[up]=budget; temp[up]=t; vel[up]=0; moved[up]=1;
    expandActive(x-2,y-3,x+2,y+1);
  }
  function growCanopy(x,y,i){
    convert(i,PLANT);                                        // the growing tip becomes the first leaf
    const r=4+(rnd()*4|0);
    for(let dy=-r;dy<=2;dy++){ const ny=y+dy; if(ny<0||ny>=H) continue;
      for(let dx=-r;dx<=r;dx++){ const nx=x+dx; if(nx<0||nx>=W) continue;
        if(dx*dx+dy*dy>r*r) continue;
        const j=ny*W+nx;
        if(grid[j]===EMPTY && rnd()<0.6){ grid[j]=PLANT; shade[j]=r255(); life[j]=0; temp[j]=temp[i]; vel[j]=0; moved[j]=1; } } }
    expandActive(x-r,y-r,x+r,y+2);
    discoverRecipe("tree");
  }
  // an empty cell can host a vine if it clings to any solid/powder/vine surface
  function touchesSurface(x,y){
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy) continue;
      const nx=x+dx, ny=y+dy; if(nx<0||nx>=W||ny<0||ny>=H) continue;
      const m=grid[ny*W+nx];
      if(m!==EMPTY && TYPE[m]!==GAS && TYPE[m]!==LIQUID) return true;
    }
    return false;
  }
  function upVine(x,y,i){
    if(life[i]<=0) return;                       // tendril spent — it just clings
    if(rnd()>0.06) return;
    const dirs=[[0,-1],[-1,-1],[1,-1],[-1,0],[1,0]];   // climb up & sideways
    const cands=[];
    for(const d of dirs){
      const nx=x+d[0], ny=y+d[1]; if(nx<0||nx>=W||ny<0||ny>=H) continue;
      const ni=ny*W+nx; if(grid[ni]!==EMPTY) continue;
      if(touchesSurface(nx,ny)) cands.push(ni);
    }
    if(!cands.length) return;
    const tgt=cands[(rnd()*cands.length)|0];
    convert(tgt,VINE); life[tgt]=life[i]-1; temp[tgt]=temp[i];
    life[i]-=2;
    discoverRecipe("vine_grow");
  }
  function upMold(x,y,i){
    let damp=false;
    forN8(x,i,(ni,nm)=>{ if(nm===WATER||nm===BRINE||nm===ICE||nm===SNOW) damp=true; return false; });
    forN8(x,i,(ni,nm)=>{
      // creeps readily over organic matter (which it consumes → finite); over STONE only when DAMP, so it
      // can't blanket an inexhaustible stone substrate dry
      if((nm===WOOD||nm===PLANT||nm===VINE) && rnd()<0.014){ convert(ni,MOLD); temp[ni]=temp[i]; discoverRecipe("mold_spread"); }
      else if(nm===STONE && damp && rnd()<0.01){ convert(ni,MOLD); temp[ni]=temp[i]; discoverRecipe("mold_spread"); }
      return false;
    });
    if(temp[i]>120 && rnd()<0.25){ grid[i]=EMPTY; return; }   // dries / burns off when warm
    if(rnd()<0.0016){ convert(i, rnd()<0.5?ASH:EMPTY); }      // eventually crumbles to ash
  }
  function upGunpowder(x,y,i){
    if(temp[i]>=200){ explode(x,y,6); grid[i]=EMPTY; discoverRecipe("gunpowder_boom"); return; }
    let lit=false;
    forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA){ lit=true; return true;} return false; });
    if(lit){ explode(x,y,6); grid[i]=EMPTY; discoverRecipe("gunpowder_boom"); return; }
    moveFalling(x,y,i,GUNPOWDER);
  }
  function upCoal(x,y,i){
    // CARBURIZATION: red-hot iron held against charcoal at forge heat (800+, from lava/thermite/fire) drinks
    // in carbon and hardens to STEEL. Hoisted ABOVE the burn/gunpowder paths so coal carburizes before it ashes.
    if(temp[i]>=800){
      let made=false;
      forN8(x,i,(ni,nm)=>{ if(nm===METAL && temp[ni]>=800 && rnd()<0.04){ convert(ni,STEEL); temp[ni]=temp[i]; grid[i]=EMPTY; made=true; discoverRecipe("steel"); return true; } return false; });
      if(made) return;   // this lump of coal was spent carburizing one iron cell
    }
    if(tryCraftGunpowder(x,i)) return;
    // furious heat crystallises carbon into diamond
    if(temp[i]>1400 && rnd()<0.004){ convert(i,DIAMOND); discoverRecipe("diamond"); return; }
    if(temp[i]>320){
      // combustion needs oxygen: sealed away from air the embers just smoulder and die (snuff coals by
      // cutting off air); a pure-oxygen feed makes them blaze hotter and burn to CO2
      let air=false, oxy=-1;
      forN8(x,i,(ni,nm)=>{ if(nm===OXYGEN) oxy=ni; else if(nm===EMPTY||TYPE[nm]===GAS) air=true; return false; });
      if(oxy>=0) air=true;
      if(air){
        applySrc(i, oxy>=0?780:640, 0.18); heatN(i, oxy>=0?16:12);
        if(oxy>=0 && rnd()<0.2){ convert(oxy,CO2); discoverRecipe("combust_o2"); }
        if(rnd()<0.05){ const e=emptyNeighbor(x,i); if(e>=0) convert(e,FIRE); }
        if(--life[i]<=0){
          const r=rnd();
          convert(i, r<0.4?ASH:(r<0.7?SMOKE:EMPTY));
          if(grid[i]===ASH) discoverRecipe("ash");
          return;
        }
      }
      // sealed (no air): no applySrc, so it cools and the smoulder goes out
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
        // duplicates whatever touches it — but refuses self-amplifying matter (clouds/fire) so it can't be
        // turned into a runaway weather/wildfire engine while the player is elsewhere
        if(nm!==EMPTY&&nm!==CLONER&&nm!==VOID&&nm!==WALL&&nm!==CLOUD&&nm!==ACIDCLOUD&&nm!==FIRE&&TYPE[nm]!==TOOL){ src=nm; return true; }
        return false;
      });
      if(src>0) life[i]=src;
    }
    if(src>0 && rnd()<0.5){ const e=emptyNeighbor(x,i); if(e>=0){ spawn(e,src); discoverRecipe("cloner_copy"); } }
  }
  function upVoid(x,y,i){
    forN8(x,i,(ni,nm)=>{
      if(nm!==EMPTY&&nm!==VOID&&nm!==WALL&&nm!==CLONER){ grid[ni]=EMPTY; charge[ni]=0; vel[ni]=0; discoverRecipe("void_hunger"); }
      return false;
    });
  }
  function upMercury(x,y,i){
    let phil=false, sul=-1, sal=-1;
    forN8(x,i,(ni,nm)=>{ if(nm===PHILOSOPHER) phil=true; else if(nm===SULFUR) sul=ni; else if(nm===SALT) sal=ni; return false; });
    // Magnum Opus, stage I — the tria prima (mercury + sulfur + salt), put to the fire, blacken into the prima materia
    if(sul>=0 && sal>=0 && temp[i]>110 && rnd()<0.06){
      convert(i,NIGREDO); grid[sul]=EMPTY; discoverRecipe("nigredo"); return;   // sulfur is consumed; salt persists as the fixed medium that keeps the Work pure
    }
    // amalgamation — quicksilver slowly transmutes touching metal into more mercury
    forN8(x,i,(ni,nm)=>{
      if(nm===ACID && rnd()<(phil?0.035:0.01)){ convert(i,GOLD); discoverRecipe("acid_gold"); return true; }
      if(nm===SULFUR && sal<0 && rnd()<0.02){ convert(i,CINNABAR); grid[ni]=EMPTY; discoverRecipe("cinnabar"); return true; }   // Hg + S → cinnabar (but salt present means the Great Work — leave it for nigredo)
      if(nm===METAL && rnd()<(phil?0.012:0.0035)){ convert(ni,MERCURY); temp[ni]=temp[i]; discoverRecipe("mercury_amalgam"); }
      return false;
    });
    moveLiquid(x,y,i,MERCURY,DISP[MERCURY]); applyWind(x,i,MERCURY);
  }
  // Magnum Opus, stages II–IV — black → white → yellow → the red Stone (rubedo = Philosopher's Stone)
  function upNigredo(x,y,i){
    let washed=false, merc=-1, sulf=-1, cinn=-1;
    forN8(x,i,(ni,nm)=>{
      if(nm===WATER||nm===BRINE){ convert(i,ALBEDO); grid[ni]=EMPTY; washed=true; discoverRecipe("albedo"); return true; }
      if(nm===MERCURY) merc=ni; else if(nm===SULFUR) sulf=ni; else if(nm===CINNABAR) cinn=ni;
      return false;
    });
    if(washed) return;
    // the putrefaction spreads: it blackens neighbouring quicksilver (eating sulfur) and reclaims any premature cinnabar
    if(merc>=0 && sulf>=0 && rnd()<0.09){ convert(merc,NIGREDO); grid[sulf]=EMPTY; discoverRecipe("nigredo"); return; }
    if(cinn>=0 && rnd()<0.08){ convert(cinn,NIGREDO); return; }
    moveFalling(x,y,i,NIGREDO);
  }
  function upAlbedo(x,y,i){
    let fire=false;
    forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA) fire=true; return false; });
    if((fire||temp[i]>260) && rnd()<0.06){ convert(i,CITRINITAS); discoverRecipe("citrinitas"); return; }
    moveFalling(x,y,i,ALBEDO);
  }
  function upCitrinitas(x,y,i){
    let gold=-1;
    forN8(x,i,(ni,nm)=>{ if(nm===GOLD) gold=ni; return false; });
    if(gold>=0 && rnd()<0.05){            // perfected with gold — the matter reddens into the Stone
      convert(i,PHILOSOPHER); discoverRecipe("rubedo");
      for(let a=0;a<12;a++){ const ang=rnd()*6.2832, sp=0.5+rnd()*2.2;
        addP(x+0.5,y+0.5,Math.cos(ang)*sp,Math.sin(ang)*sp,16+rnd()*18,255,210,120,KSPARK); }
      if(opusCooldown<=0){ magnumOpusCeremony(x,y); opusCooldown=150; }   // one ceremony per birth, not per cell
      return;
    }
    moveFalling(x,y,i,CITRINITAS);
  }
  function upNitro(x,y,i){
    if(charge[i]>0 || temp[i]>85){
      explode(x,y,8); grid[i]=EMPTY; discoverRecipe("nitro_blast"); return;
    }
    let boom=false;
    forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA||(charge[ni]>0&&CHCOND[nm])){ boom=true; return true; } return false; });
    if(boom){ explode(x,y,8); grid[i]=EMPTY; discoverRecipe("nitro_blast"); return; }
    const v=vel[i];
    const hit=!moveLiquid(x,y,i,NITRO,DISP[NITRO]);
    if(hit && v>5){ explode(x,y,7); grid[i]=EMPTY; discoverRecipe("nitro_blast"); return; }
    applyWind(x,i,NITRO);
  }
  function upThermite(x,y,i){
    if(life[i]>0){
      // burning — ferociously hot, melts metal/stone/glass/sand into molten slag
      applySrc(i,2200,0.5); heatN(i,40);
      forN8(x,i,(ni,nm)=>{
        if(nm===METAL||nm===STONE||nm===GLASS||nm===SAND){ temp[ni]+=120; if(rnd()<0.06){ convert(ni,LAVA); discoverRecipe("thermite_slag"); } }
        else if(nm===THERMITE && life[ni]<=0 && rnd()<0.5){ life[ni]=46+(rnd()*30|0); }
        else if(FLAM[nm]) temp[ni]+=70;
        return false;
      });
      if(rnd()<0.6) addP(x+0.5,y+0.5,(rnd()-0.5)*1.3,-(0.4+rnd()*1.7),16+rnd()*18,255,236,150,KSPARK);
      if(--life[i]<=0) convert(i,LAVA);
      return;
    }
    let ignite = temp[i]>=800 || charge[i]>0;
    if(!ignite) forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA||(nm===THERMITE&&life[ni]>0)){ ignite=true; return true; } return false; });
    if(ignite){ life[i]=50+(rnd()*30|0); discoverRecipe("thermite_slag"); return; }
    moveFalling(x,y,i,THERMITE);
  }
  function upFuse(x,y,i){
    if(life[i]>0){
      applySrc(i,680,0.4); heatN(i,8);
      if(rnd()<0.4) addP(x+0.5,y+0.5,(rnd()-0.5)*0.6,-(0.4+rnd()*0.9),10+rnd()*10,255,196,96,KSPARK);
      if(life[i]===1){
        forN8(x,i,(ni,nm)=>{
          if(nm===FUSE && life[ni]<=0) life[ni]=18+(rnd()*8|0);
          else if(nm===GUNPOWDER||nm===THERMITE||nm===NITRO||FLAM[nm]) temp[ni]+=220;
          return false;
        });
        discoverRecipe("fuse_chain");
        convert(i, rnd()<0.5?SMOKE:EMPTY);
        return;
      }
      life[i]--; return;
    }
    let ignite = temp[i]>=160 || charge[i]>0;
    if(!ignite) forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA||(nm===FUSE&&life[ni]>0)){ ignite=true; return true; } return false; });
    if(ignite) life[i]=18+(rnd()*8|0);
  }
  function upCrystal(x,y,i){
    // crystals drink water to spread — growth is gated on (and consumes) a water cell, so one water in
    // makes one crystal out (mass-conserving; can't tile the world from a single seed in dry air)
    let drank=-1;
    forN8(x,i,(ni,nm)=>{ if(nm===WATER && rnd()<0.05){ drank=ni; return true; } return false; });
    if(drank>=0){ convert(drank,CRYSTAL); discoverRecipe("crystal_grow"); }
  }
  function upPhilosopher(x,y,i){
    forN8(x,i,(ni,nm)=>{
      if(nm===MERCURY && rnd()<0.03){ convert(ni,GOLD); temp[ni]=temp[i]+40; discoverRecipe("philosopher_gold"); }
      else if(nm===METAL && rnd()<0.012){ convert(ni,MERCURY); temp[ni]=temp[i]; discoverRecipe("philosopher_mercury"); }
      else if(nm===SAND && rnd()<0.005){ convert(ni,GOLD); discoverRecipe("philosopher_sand"); }
      // projection — the Stone's true power: it perfects common base matter into gold
      else if((nm===STONE||nm===RUST||nm===COAL||nm===LIMESTONE) && rnd()<0.0045){ convert(ni,GOLD); discoverRecipe("projection"); }
      return false;
    });
  }
  function upAqua(x,y,i){
    let gone=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===GOLD && rnd()<0.09){ convert(ni,MERCURY); temp[ni]=temp[i]; discoverRecipe("aqua_dissolve"); }
      else if(nm===METAL && rnd()<0.07){ grid[ni]=EMPTY; }
      else if(nm!==EMPTY&&nm!==AQUA&&nm!==WALL&&nm!==GLASS&&TYPE[nm]!==GAS && rnd()<0.08){
        grid[ni]=EMPTY;
        if(rnd()<0.35){ grid[i]=EMPTY; gone=true; return true; }
      }
      return false;
    });
    if(gone) return;
    moveLiquid(x,y,i,AQUA,DISP[AQUA]); applyWind(x,i,AQUA);
  }
  function upHydrogen(x,y,i){
    if(--life[i]<=0){ grid[i]=EMPTY; return; }
    let ignite = temp[i]>180 || charge[i]>0, oxy=-1;
    forN8(x,i,(ni,nm)=>{
      if(nm===FIRE||nm===LAVA||(charge[ni]>0&&CHCOND[nm])) ignite=true;
      if(nm===OXYGEN) oxy=ni;
      return false;
    });
    if(ignite){
      discoverRecipe("hydrogen_boom");
      if(oxy>=0){ explode(x,y,4); if(grid[oxy]===OXYGEN) convert(oxy,STEAM); } // oxy-hydrogen detonation → water vapor
      else { convert(i,FIRE); temp[i]=Math.max(temp[i],460); }
      return;
    }
    if(applyPressure(x,y,i,HYDROGEN)) return;
    moveGas(x,y,i,HYDROGEN); applyWind(x,i,HYDROGEN);
  }
  function upOxygen(x,y,i){
    if(--life[i]<=0){ grid[i]=EMPTY; return; }
    forN8(x,i,(ni,nm)=>{
      if(nm===FIRE){ if(life[ni]<90) life[ni]+=4; temp[ni]+=6; discoverRecipe("oxy_fire"); }
      else if(FLAM[nm] && temp[ni]>120 && rnd()<0.04){ temp[ni]+=60; }
      return false;
    });
    if(applyPressure(x,y,i,OXYGEN)) return;
    moveGas(x,y,i,OXYGEN); applyWind(x,i,OXYGEN);
  }
  function cloudBehavior(x,y,i,m,rainMat){
    // shed rain into open air below — each drop SPENDS the cloud's water; when it runs dry the cloud clears
    // (a finite cloud, like in nature — not an infinite faucet)
    if(rnd()<0.010){
      for(let dy=1;dy<=3;dy++){ const ny=y+dy; if(ny>=H) break; const bi=ny*W+x;
        if(grid[bi]===EMPTY){ spawn(bi,rainMat); discoverRecipe(rainMat===ACID?"acid_rain":"rain");
          if(--life[i]<=0){ grid[i]=EMPTY; return; }   // rained out → the cloud thins away
          break; } }
    }
    // add this cell to a uniform reservoir of the whole cloud — the storm trigger in step() will
    // strike from a random one of these, so bolts come from anywhere across the cloud, one at a time
    stormCount++; if(rnd()*stormCount<1){ stormPX=x; stormPY=y; }   // uniform reservoir → a strike point anywhere in the cloud
    stormQ+=STORM_CHARGE_RATE;                                       // every cloud cell separates a little more charge each step
    // heavy smoke pollution can slowly sour a storm cloud into an acid cloud.
    // Only real smoke counts (no acid-cloud chain reaction), and it needs a proper
    // plume around it, so it stays a deliberate, rare event rather than a sweep.
    if(m===CLOUD){
      let smoke=0;
      forN8(x,i,(ni,nm)=>{ if(nm===SMOKE) smoke++; return false; });
      if(smoke>=3 && rnd()<0.004){ convert(i,ACIDCLOUD); discoverRecipe("acid_rain"); return; }
    }
    // drift with the wind (or a gentle wander when still)
    const dir = WIND>0?1:(WIND<0?-1:(rnd()<0.5?1:-1));
    if(rnd()<0.35){ const nx=x+dir; if(nx>0&&nx<W-1 && grid[i+dir]===EMPTY){ swap(i,i+dir); return; } }
    // buoyancy — settle into an upper band of the sky
    const band=(H*0.22)|0;
    if(y>band && rnd()<0.05){ if(i-W>=0 && grid[i-W]===EMPTY) swap(i,i-W); }
    else if(y<band-2 && rnd()<0.03){ if(i+W<N && grid[i+W]===EMPTY) swap(i,i+W); }
  }
  function moveViscous(x,y,i,m,p,disp){ if(rnd()>p) return false; return moveLiquid(x,y,i,m,disp); }
  function upSlime(x,y,i){ moveViscous(x,y,i,SLIME,0.5,1); applyWind(x,i,SLIME); }
  function upHoney(x,y,i){ moveViscous(x,y,i,HONEY,0.16,1); }
  function upBulb(x,y,i){
    let powered = charge[i]>0;
    if(!powered) forCard(i,(ni)=>{ if(charge[ni]>0) powered=true; });
    if(powered){ life[i]=24; discoverRecipe("bulb_light"); }
    else if(life[i]>0) life[i]--;
  }
  function upAntimatter(x,y,i){
    let reacted=false;
    forN8(x,i,(ni,nm)=>{
      if(nm!==EMPTY&&nm!==ANTIMATTER&&nm!==WALL){ grid[ni]=EMPTY; charge[ni]=0; vel[ni]=0; reacted=true; return true; }
      return false;
    });
    if(reacted){ explode(x,y,5); grid[i]=EMPTY; shakeScreen(5); discoverRecipe("antimatter"); }
  }
  // fulgurite — fuse a little blob of sand into glass (real lightning makes glass tubes)
  function fuseSand(cx,cy,r){
    let made=false;
    forDisc(cx,cy,r,(i)=>{ if(grid[i]===SAND){ convert(i,GLASS); shade[i]=r255(); made=true; } });
    if(made) discoverRecipe("fulgurite");
    return made;
  }
  function strikeLightning(cx,cy,silent){
    if(!silent) Snd.zap();
    let x=clamp(cx|0,0,W-1), y=clamp(cy|0,0,H-1), steps=0;
    let bminx=x,bmaxx=x,bminy=y;
    while(y<H-1 && steps<H){
      const i=y*W+x;
      temp[i]=Math.max(temp[i],420);
      if(CHCOND[grid[i]] && grid[i]!==WATER && grid[i]!==BRINE){ charge[i]=6; chargeDirty=true; }   // energise wires/metal, but don't electrolyse whole lakes
      if(FLAM[grid[i]]) temp[i]+=180;
      if(grid[i]===SAND) fuseSand(x,y,2);   // passing through sand fuses it
      addP(x+0.5,y+0.5,(rnd()-0.5)*0.8,0.6+rnd()*1.4,8+rnd()*8,200,228,255,KSPARK);
      if(x<bminx)bminx=x; if(x>bmaxx)bmaxx=x;
      if(rnd()<0.28) x += rnd()<0.5?-1:1;   // a straighter, more aimable bolt
      if(x<0)x=0; else if(x>=W)x=W-1;
      y++; steps++;
      const gi=y*W+x, gm=grid[gi];
      if(gm!==EMPTY && TYPE[gm]!==GAS){
        temp[gi]=Math.max(temp[gi],700);
        if(FLAM[gm]) temp[gi]+=320;
        if(CHCOND[gm] && gm!==WATER && gm!==BRINE){ charge[gi]=6; chargeDirty=true; }
        fuseSand(x,y,3);                     // a glass blob where the bolt lands (incl. nearby sand)
        for(let a=0;a<14;a++){ const ang=rnd()*6.2832, sp=0.6+rnd()*2.4;
          addP(x+0.5,y+0.5,Math.cos(ang)*sp,Math.sin(ang)*sp,12+rnd()*16,210,232,255,KSPARK); }
        break;
      }
    }
    expandActive(bminx-2, bminy-2, bmaxx+2, y+2);   // the bolt's scorched path
    discoverRecipe("lightning");
  }
  function emptyNeighbor(x,i){
    const s=rnd()*4|0;
    for(let k=0;k<4;k++){
      const j=(s+k)&3, nx=x+CARD_DX[j];
      if(nx<0||nx>=W) continue; const ni=i+CARD_OFF[j];
      if(ni>=0&&ni<N&&grid[ni]===EMPTY) return ni;
    }
    return -1;
  }

  /* ============================ Charge (electricity) ============== */
  // Electricity travels as a constant-strength pulse leaving a brief
  // refractory trail (charge<0) so a current can run the full length of a wire.
  let chargeDirty=false;   // true while any charge/refractory cell exists — lets us skip the full-grid scan when idle
  function propagateCharge(){
    if(!chargeDirty) return;          // the common case: nothing is energised, so don't scan N cells
    let any=false;
    for(let i=0;i<N;i++){
      const c=charge[i];
      if(c===0) continue;
      any=true;
      if(c<0){ charge[i]=c+1; continue; }
      const m=grid[i];
      applySrc(i,140,0.5);
      if(m===GUNPOWDER){ const x=i%W; explode(x,(i/W)|0,6); grid[i]=EMPTY; charge[i]=0; continue; }
      if(m===NITRO){ const x=i%W; explode(x,(i/W)|0,8); grid[i]=EMPTY; charge[i]=0; continue; }
      if(m===FIREWORK){ life[i]=0; }
      if(FLAM[m]){ heatN(i,26); temp[i]+=16; }
      if(m===WATER && rnd()<0.06){
        // electrolysis — current splits water into hydrogen (here) and oxygen (a neighbour)
        convert(i,HYDROGEN); charge[i]=0;
        const e=emptyNeighbor(i%W,i); if(e>=0) spawn(e,OXYGEN);
        discoverRecipe("electrolysis");
        continue;
      }
      if(m===BRINE && rnd()<0.06){
        // the chlor-alkali process — electrolysing SALT water gives hydrogen + chlorine (not oxygen)
        convert(i,HYDROGEN); charge[i]=0;
        const e=emptyNeighbor(i%W,i); if(e>=0) spawn(e,CHLORINE);
        discoverRecipe("chlor_alkali");
        continue;
      }
      forCard(i,(ni)=>{ if(charge[ni]===0 && CHCOND[grid[ni]]) charge[ni]=4; });
      const nc=c-1;
      charge[i]= nc>0 ? nc : -3;
    }
    chargeDirty=any;   // once all charge has dissipated, the scan switches itself off until re-energised
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
    Snd.pop();
    const rainbow=rnd()<0.45, baseH=rnd()*360, count=70+(rnd()*60|0);
    for(let a=0;a<count;a++){
      const ang=rnd()*6.2832, spd=0.5+rnd()*2.6;
      const h=(rainbow?rnd()*360:baseH+(rnd()-0.5)*46)/360;
      const c=hsl(h,1,0.62);
      addP(x,y,Math.cos(ang)*spd,Math.sin(ang)*spd,28+rnd()*42,c[0],c[1],c[2],KSPARK);
    }
    const gi=((y|0)*W+(x|0)); if(gi>=0&&gi<N){ temp[gi]+=60; expandActive((x|0)-2,(y|0)-2,(x|0)+2,(y|0)+2); }
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
          if(cell===SLIME){ PVY[k]=-PVY[k]*0.6; PVX[k]*=0.55; PX[k]+=PVX[k]; PY[k]+=PVY[k]; }
          else {
            if(FLAM[cell] || TYPE[cell]===STATIC || TYPE[cell]===POWDER) expandActive(gx-1,gy-1,gx+1,gy+1);   // a heating ember must wake its cell
            if(FLAM[cell]) temp[ci]+=34;
            if(TYPE[cell]===STATIC || TYPE[cell]===POWDER){ temp[ci]+=8; killP(k); continue; }
          }
        }
      }
      if(PL[k]<=0){ killP(k); continue; }
      k++;
    }
  }

  /* ============================ Heat diffusion ==================== */
  // ---- incremental active-region tracking ---------------------------
  // The region that needs the heavy passes is tracked as a bounding box,
  // grown each frame as a BY-PRODUCT of the diffuse pass (which already visits
  // every box cell) plus explicit hooks at the few points activity enters from
  // outside (painting, explosions, lightning, particles, attract). No full-grid
  // scan per frame. A rare full rebuild (every BOX_REBUILD frames) is the safety
  // net against any missed hook, so nothing can stay frozen.
  let bx0=0,by0=0,bx1=0,by1=0,boxFull=true;      // current frame's active box
  let nbx0=0,nby0=0,nbx1=-1,nby1=-1, boxTick=0;  // accumulator → next frame's box
  const BOX_MARGIN=10, TEMP_EPS=0.6, PRES_EPS=0.6, BOX_REBUILD=180;
  // grow the accumulator (and, for current-frame effects, the live box) to a rect
  function expandActive(x0,y0,x1,y1){
    if(x0<0)x0=0; if(y0<0)y0=0; if(x1>W-1)x1=W-1; if(y1>H-1)y1=H-1;
    if(x1<x0||y1<y0) return;
    if(bx1<bx0||by1<by0){ bx0=x0;by0=y0;bx1=x1;by1=y1; }
    else { if(x0<bx0)bx0=x0; if(y0<by0)by0=y0; if(x1>bx1)bx1=x1; if(y1>by1)by1=y1; }
    if(nbx1<nbx0||nby1<nby0){ nbx0=x0;nby0=y0;nbx1=x1;nby1=y1; }
    else { if(x0<nbx0)nbx0=x0; if(y0<nby0)nby0=y0; if(x1>nbx1)nbx1=x1; if(y1>nby1)nby1=y1; }
  }
  // single-cell accumulate, used by the diffuse by-product (accumulator only)
  function accumCell(x,y){
    if(x<nbx0)nbx0=x; if(x>nbx1)nbx1=x; if(y<nby0)nby0=y; if(y>nby1)nby1=y;
  }
  // turn the accumulator into this frame's box (called at the top of step)
  function finalizeBox(){
    if(--boxTick<=0){                              // periodic safety rebuild
      bx0=0;by0=0;bx1=W-1;by1=H-1; boxFull=true; boxTick=BOX_REBUILD;
    } else if(nbx1<nbx0||nby1<nby0){               // nothing active
      bx0=0;by0=0;bx1=-1;by1=-1; boxFull=false;
    } else {
      bx0=nbx0-BOX_MARGIN; if(bx0<0)bx0=0;
      by0=nby0-BOX_MARGIN; if(by0<0)by0=0;
      bx1=nbx1+BOX_MARGIN; if(bx1>W-1)bx1=W-1;
      by1=nby1+BOX_MARGIN; if(by1>H-1)by1=H-1;
      boxFull = ((bx1-bx0+1)*(by1-by0+1)) > N*0.72;
    }
    nbx0=W;nby0=H;nbx1=-1;nby1=-1;                  // reset accumulator for this frame
  }
  function diffuseCell(x,y,i){
    const t=temp[i]; let sum=0,cnt=0;
    if(y>0){sum+=temp[i-W];cnt++;}
    if(y<H-1){sum+=temp[i+W];cnt++;}
    if(x>0){sum+=temp[i-1];cnt++;}
    if(x<W-1){sum+=temp[i+1];cnt++;}
    let nt=t+(sum/cnt-t)*COND[grid[i]];
    if(grid[i]===EMPTY) nt+=(AMBIENT-nt)*0.02;
    if(nt!==nt) return AMBIENT;                       // NaN-safe: one bad value must not poison the whole field
    return nt<-60?-60: nt>2200?2200: nt;
  }
  function diffuse(){
    const lo=AMBIENT-TEMP_EPS, hi=AMBIENT+TEMP_EPS;
    if(boxFull){
      for(let y=0;y<H;y++){ const row=y*W;
        for(let x=0;x<W;x++){ const i=row+x; const nt=tempB[i]=diffuseCell(x,y,i);
          if(grid[i]!==EMPTY||nt>hi||nt<lo||pres[i]>PRES_EPS||pres[i]<-PRES_EPS) accumCell(x,y); } }
      const tmp=temp; temp=tempB; tempB=tmp;
      return;
    }
    if(bx1<bx0) return;                       // nothing active
    for(let y=by0;y<=by1;y++){ const row=y*W;
      for(let x=bx0;x<=bx1;x++){ const i=row+x; const nt=tempB[i]=diffuseCell(x,y,i);
        if(grid[i]!==EMPTY||nt>hi||nt<lo||pres[i]>PRES_EPS||pres[i]<-PRES_EPS) accumCell(x,y); } }
    for(let y=by0;y<=by1;y++){ const row=y*W;   // copy back only the box (rest is ambient, untouched)
      for(let x=bx0;x<=bx1;x++){ const i=row+x; temp[i]=tempB[i]; } }
  }

  /* ============================ Pressure ========================== */
  // A coarse pressure field: gases generate pressure, open space bleeds it,
  // and it diffuses into gradients so confined gas jets out through any gap.
  function pressureCell(x,y,i){
    const m=grid[i];
    let sum=0,cnt=0;
    if(y>0){sum+=pres[i-W];cnt++;}
    if(y<H-1){sum+=pres[i+W];cnt++;}
    if(x>0){sum+=pres[i-1];cnt++;}
    if(x<W-1){sum+=pres[i+1];cnt++;}
    let np = pres[i] + (sum/cnt - pres[i])*0.28;
    if(m===EMPTY) np*=0.84;            // open space relieves pressure
    else if(TYPE[m]===GAS) np+=0.9;     // gases push outward
    else np*=0.97;                      // solids/liquids hold, then decay
    np = (np!==np) ? 0 : (np<-40?-40: np>600?600: np);   // NaN-safe
    // a strong pressure wave (a blast, or an over-pressured vessel) shatters glass back to sand
    if(m===GLASS && np>90 && rnd()<0.06){ grid[i]=SAND; shade[i]=r255(); discoverRecipe("glass_shatter"); }
    return np;
  }
  function pressureStep(){
    if(boxFull){
      for(let y=0;y<H;y++){ const row=y*W;
        for(let x=0;x<W;x++){ const i=row+x; presB[i]=pressureCell(x,y,i); } }
      const tmp=pres; pres=presB; presB=tmp;
      return;
    }
    if(bx1<bx0) return;
    for(let y=by0;y<=by1;y++){ const row=y*W;
      for(let x=bx0;x<=bx1;x++){ const i=row+x; presB[i]=pressureCell(x,y,i); } }
    for(let y=by0;y<=by1;y++){ const row=y*W;
      for(let x=bx0;x<=bx1;x++){ const i=row+x; pres[i]=presB[i]; } }
  }
  function applyPressure(x,y,i,m){
    const p=pres[i];
    if(p<10) return false;
    let best=-1,bestP=p;
    if(i-W>=0 && canDisplace(m,i-W) && pres[i-W]<bestP){ bestP=pres[i-W]; best=i-W; }
    if(i+W<N  && canDisplace(m,i+W) && pres[i+W]<bestP){ bestP=pres[i+W]; best=i+W; }
    if(x>0    && canDisplace(m,i-1) && pres[i-1]<bestP){ bestP=pres[i-1]; best=i-1; }
    if(x<W-1  && canDisplace(m,i+1) && pres[i+1]<bestP){ bestP=pres[i+1]; best=i+1; }
    if(best>=0 && (p-bestP)>5){ swap(i,best); return true; }
    return false;
  }

  /* ============================ Simulation step =================== */
  // Per-material dispatch table (indexed by id) — replaces a giant switch. A new material registers its
  // behaviour here and nowhere else in the step. Movement-only materials get a tiny wrapper; materials with
  // no entry (WOOD/GLASS/STONE/METAL/OBSIDIAN/DIAMOND) are inert except for thermal/conduction.
  const upFall =(x,y,i,m)=>moveFalling(x,y,i,m);
  const upDrift=(x,y,i,m)=>{ moveFalling(x,y,i,m); applyWind(x,i,m); };
  const upOil  =(x,y,i)=>{ const onWater=(y<H-1 && grid[i+W]===WATER);   // oil floats and spreads into a thin slick on a water surface
    moveLiquid(x,y,i,OIL, onWater?3:DISP[OIL]); applyWind(x,i,OIL); };
  const upCloudRain    =(x,y,i)=>cloudBehavior(x,y,i,CLOUD,WATER);
  const upAcidCloudRain=(x,y,i)=>cloudBehavior(x,y,i,ACIDCLOUD,ACID);
  const upIceCell=(x,y,i)=>upIce(i);
  const UPDATE=new Array(MAXID);
  const reg=(fn,...ids)=>ids.forEach(id=>{ UPDATE[id]=fn; });
  reg(upFall, SAND, RAINBOW);
  reg(upDrift, ASH, RUST);
  reg(upOil, OIL); reg(upSalt, SALT); reg(upSnow, SNOW); reg(upWater, WATER); reg(upAcid, ACID);
  reg(upLava, LAVA); reg(upFire, FIRE); reg(upSmoke, SMOKE); reg(upSteam, STEAM); reg(upPlant, PLANT);
  reg(upIceCell, ICE); reg(upGunpowder, GUNPOWDER); reg(upCoal, COAL); reg(upFirework, FIREWORK);
  reg(upCloner, CLONER); reg(upVoid, VOID); reg(upMercury, MERCURY); reg(upThermite, THERMITE);
  reg(upFuse, FUSE); reg(upNitro, NITRO); reg(upSulfur, SULFUR); reg(upSaltpeter, SALTPETER);
  reg(upCrystal, CRYSTAL); reg(upPhilosopher, PHILOSOPHER); reg(upAqua, AQUA); reg(upHydrogen, HYDROGEN);
  reg(upOxygen, OXYGEN); reg(upCloudRain, CLOUD); reg(upAcidCloudRain, ACIDCLOUD); reg(upAntimatter, ANTIMATTER);
  reg(upSlime, SLIME); reg(upHoney, HONEY); reg(upBulb, BULB); reg(upVine, VINE); reg(upMold, MOLD);
  reg(upBrine, BRINE); reg(upCinnabar, CINNABAR); reg(upLimestone, LIMESTONE); reg(upQuicklime, QUICKLIME);
  reg(upSlakedlime, SLAKEDLIME); reg(upCO2, CO2); reg(upSeed, SEED); reg(upSapling, SAPLING);
  reg(upNigredo, NIGREDO); reg(upAlbedo, ALBEDO); reg(upCitrinitas, CITRINITAS);
  reg(upSodium, SODIUM); reg(upChlorine, CHLORINE); reg(upMagnesium, MAGNESIUM);
  reg(upMolten, MOLTEN_METAL); reg(upMetalMelt, METAL); reg(upGold, GOLD);
  reg(upCopper, COPPER); reg(upTin, TIN); reg(upTinPest, TINPEST); reg(upBronze, BRONZE);
  reg(upSteel, STEEL); reg(upSilver, SILVER); reg(upAluminum, ALUMINUM);
  reg(upFuel, URANIUM, PLUTONIUM); reg(upNeutron, NEUTRON); reg(upFallout, FALLOUT); reg(upControlRod, CONTROL_ROD);
  // integrity check — turn the material system's SILENT failures (a material with no dispatch, no blurb, or
  // missing from the palette; a recipe/group pointing at a non-existent id) into a LOUD boot-time warning
  (function validateMaterials(){
    const inGroup=new Set(MAT_GROUPS.flatMap(g=>g.mats));
    const inert=new Set([WALL,WOOD,GLASS,STONE,METAL,OBSIDIAN,DIAMOND,PATINA,CUPRITE]);   // intentionally simulated by thermal/conduction only
    const internal=new Set([STEAM,NIGREDO,ALBEDO,CITRINITAS,MOLTEN_METAL]);               // produced by reactions, intentionally not paintable
    const warn=[];
    for(let id=0; id<MAXID; id++){ const m=M[id]; if(!m||id===EMPTY) continue;
      if(!UPDATE[id] && !HASTRANS[id] && !inert.has(id) && TYPE[id]!==TOOL) warn.push(m.name+" #"+id+": no update or transition (inert by accident?)");
      if(!MAT_BLURB[id] && !internal.has(id)) warn.push(m.name+" #"+id+": no blurb");
      if(!inGroup.has(id) && id!==WALL && !internal.has(id)) warn.push(m.name+" #"+id+": not in any palette group (invisible)");
    }
    ALCHEMY_RECIPES.forEach(r=>[...(r.in||[]),...(r.out||[])].forEach(id=>{ if(id!==EMPTY && !M[id]) warn.push("recipe '"+r.id+"' references unknown id "+id); }));
    MAT_GROUPS.forEach(g=>g.mats.forEach(id=>{ if(id!==EMPTY && !M[id]) warn.push("palette '"+g.label+"' has unknown id "+id); }));
    if(warn.length) try{ console.warn("[Aether Sand] material integrity:\n  "+warn.join("\n  ")); }catch(_){}
  })();
  function step(){
    // CHARGE-DRIVEN STORM (physics-faithful): each step the cloud accrued charge proportional to its size
    // (in cloudBehavior); the storm DISCHARGES only once that charge crosses the breakdown field, then drops
    // and recharges. So strike frequency emerges from the storm's vigour — a vast storm crackles, a wisp
    // barely sparks — with a real build-and-release rhythm. Timers tick on the SIM step, so it's fps-independent.
    if(stormCooldown>0) stormCooldown--;
    if(stormThunderCD>0) stormThunderCD--;
    finalizeBox();
    moved.fill(0);
    if(stormCount===0 && stormQ>0) stormQ*=0.96;                  // no cloud → the charge slowly leaks away
    else if(stormCount>0) stormQ+=STORM_BASE;                     // a size-independent floor so even a wisp eventually sparks
    if(stormQ>=STORM_BREAKDOWN && stormCooldown<=0 && stormCount>0){
      const loud = stormThunderCD<=0;
      strikeLightning(stormPX, stormPY, !loud);                  // strike from a random cell of the charged cloud
      if(loud) stormThunderCD=90+(rnd()*100|0);                  // thunder kept on its own slow cadence (sound never piles up)
      stormQ-=STORM_DISCHARGE; if(stormQ<0) stormQ=0;            // the discharge releases the built-up charge → recharge
      stormCooldown=6;                                           // a short hard floor so an enormous storm can't strike every frame
    }
    stormCount=0;                                                // begin a fresh reservoir for this step
    const ltr = rnd()<0.5;
    const yLo = boxFull?0:by0, yHi = boxFull?H-1:by1;
    const xLo = boxFull?0:bx0, xHi = boxFull?W-1:bx1;
    for(let y=yHi;y>=yLo;y--){
      const row=y*W;
      const w=xHi-xLo+1;
      for(let n=0;n<w;n++){
        const x=ltr?xLo+n:xHi-n;
        const i=row+x, m=grid[i];
        if(m===EMPTY||m===WALL||moved[i]) continue;
        if(tryThermal(i,m)) continue;
        const fn=UPDATE[m]; if(fn) fn(x,y,i,m);
      }
    }
    propagateCharge();
    diffuse();
    pressureStep();
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
  // sample a piecewise-linear colour gradient (an array of [value, [r,g,b]] stops) at v
  function sampleGradient(stops, v){
    if(v<=stops[0][0]) return stops[0][1];
    for(let k=1;k<stops.length;k++){
      if(v<=stops[k][0]){
        const a=stops[k-1],b=stops[k],f=(v-a[0])/(b[0]-a[0]);
        return [lerp(a[1][0],b[1][0],f),lerp(a[1][1],b[1][1],f),lerp(a[1][2],b[1][2],f)];
      }
    }
    return stops[stops.length-1][1];
  }
  const HEAT_STOPS=[[-40,[40,90,255]],[0,[0,200,255]],[20,[10,16,34]],
    [120,[70,230,120]],[320,[255,210,50]],[640,[255,90,20]],[1100,[255,245,210]]];
  const PRES_STOPS=[[-30,[30,60,200]],[0,[10,14,26]],[40,[60,180,130]],
    [120,[255,205,60]],[300,[255,90,40]],[600,[255,250,235]]];
  const heatRGB=(t)=>sampleGradient(HEAT_STOPS,t);
  const presRGB=(p)=>sampleGradient(PRES_STOPS,p);

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
  // soft coloured light = a few box-blur passes over the 3×-downsampled light buffer. 2 passes reads
  // visually the same as 4 on this low-res grid but halves the per-frame lighting cost (it runs every frame
  // the lights are on, regardless of how many emitters exist).
  const LIGHT_BLUR_PASSES=2;
  function blurLight(){
    for(let p=0;p<LIGHT_BLUR_PASSES;p++){ blurChan(lightR,lightT,2); blurChan(lightG,lightT,2); blurChan(lightB,lightT,2); }
  }
  function applyLight(x0,y0,x1,y1){
    const GAIN=0.62*lightLevel;
    for(let y=y0;y<=y1;y++){ const row=y*W;
      for(let x=x0;x<=x1;x++){ const i=row+x;
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
  }

  let heatMap=false, pressureMap=false;
  // render-region tracking: only the active box (plus the particle cloud) is
  // recomputed and re-uploaded each frame; the rest of the canvas is untouched.
  let renderFull=true, _pHeat=false,_pPres=false,_pLit=false,_pLL=-1;
  let ppx0=0,ppy0=0,ppx1=-1,ppy1=-1;   // previous frame's particle bounding box
  function markRenderFull(){ renderFull=true; }
  // wipe every field to its empty/ambient default (the canonical "blank canvas" — one source of truth)
  function clearWorld(){ grid.fill(EMPTY); life.fill(0); charge.fill(0); temp.fill(AMBIENT); vel.fill(0); pres.fill(0); pn=0; markRenderFull(); }
  function scaleGlow(ge,lf){
    if(!ge||lf>=0.999) return ge;
    if(lf<=0) return 0;
    return (((ge>>>24)*lf|0)<<24)|(ge&0xffffff);
  }
  function render(now){
    const t=now*0.012;
    const shimmer=0.72+0.28*Math.sin(now*0.0047);   // slow magical pulse for the alchemy stages
    const lf=lightFX();
    const lit = lf>0.01 && !heatMap && !pressureMap;
    // any global mode flip repaints the whole canvas once
    if(heatMap!==_pHeat||pressureMap!==_pPres||lit!==_pLit||lightLevel!==_pLL) renderFull=true;
    _pHeat=heatMap; _pPres=pressureMap; _pLit=lit; _pLL=lightLevel;
    let rx0,ry0,rx1,ry1;
    if(renderFull||boxFull||bx1<bx0){ rx0=0;ry0=0;rx1=W-1;ry1=H-1; }
    else { rx0=bx0;ry0=by0;rx1=bx1;ry1=by1; }
    if(lit){ lightR.fill(0); lightG.fill(0); lightB.fill(0); }
    for(let yy=ry0;yy<=ry1;yy++){
     const rrow=yy*W;
     for(let xx=rx0;xx<=rx1;xx++){
      const i=rrow+xx;
      const m=grid[i];
      if(m===EMPTY){
        if(pressureMap){
          const p=pres[i], mag=clamp(Math.abs(p)/120,0,1);
          if(mag>0.03){ const c=presRGB(p); sim32[i]=((mag*150|0)<<24)|(c[2]<<16)|(c[1]<<8)|c[0]; }
          else sim32[i]=0;
        } else if(heatMap){
          const d=temp[i]-AMBIENT, mag=clamp(Math.abs(d)/60,0,1);
          if(mag>0.02){ const c=heatRGB(temp[i]); sim32[i]=((mag*150|0)<<24)|(c[2]<<16)|(c[1]<<8)|c[0]; }
          else sim32[i]=0;
        } else sim32[i]=0;
        glow32[i]=0; continue;
      }
      const mat=M[m], sh=shade[i]/255;
      let r,g,b,a=mat.a||255;

      if(pressureMap){
        const c=presRGB(pres[i]); r=c[0];g=c[1];b=c[2];
      } else if(heatMap){
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
      } else if(m===MERCURY){
        const sp=(0.5+0.5*Math.sin(t*2.2+i*0.45))*34|0;
        r=Math.min(255,lerp(mat.c2[0],mat.c1[0],sh)+sp);
        g=Math.min(255,lerp(mat.c2[1],mat.c1[1],sh)+sp);
        b=Math.min(255,lerp(mat.c2[2],mat.c1[2],sh)+sp+4);
      } else if(m===GOLD){
        const sp=(0.5+0.5*Math.sin(t*1.6+i*0.35))*32|0;
        r=Math.min(255,lerp(mat.c2[0],mat.c1[0],sh)+sp);
        g=Math.min(255,lerp(mat.c2[1],mat.c1[1],sh)+sp*0.75);
        b=Math.max(0,lerp(mat.c2[2],mat.c1[2],sh)-sp*0.4);
      } else if(m===NITRO){
        const pulse=0.88+0.12*Math.sin(t*4.5+i*0.6);
        r=(lerp(mat.c2[0],mat.c1[0],sh)*pulse)|0;
        g=(lerp(mat.c2[1],mat.c1[1],sh)*pulse)|0;
        b=(lerp(mat.c2[2],mat.c1[2],sh)*pulse)|0;
      } else if(m===CRYSTAL){
        const h=((shade[i]*2+t*25+i*0.12)%360)/360;
        const c=hsl(h,0.78,0.64); r=c[0];g=c[1];b=c[2];
      } else if(m===PHILOSOPHER){
        const pulse=0.72+0.28*Math.sin(t*2.4+i*0.55);
        r=(lerp(mat.c2[0],mat.c1[0],sh)*pulse)|0;
        g=(lerp(mat.c2[1],mat.c1[1],sh)*pulse)|0;
        b=(lerp(mat.c2[2],mat.c1[2],sh)*pulse)|0;
      } else if(m===AQUA){
        const pulse=0.9+0.1*Math.sin(t*3.2+i*0.4);
        r=(lerp(mat.c2[0],mat.c1[0],sh)*pulse)|0;
        g=(lerp(mat.c2[1],mat.c1[1],sh)*pulse)|0;
        b=(lerp(mat.c2[2],mat.c1[2],sh)*pulse)|0;
      } else if(m===DIAMOND){
        const sp=(0.5+0.5*Math.sin(t*4+i*0.9))*64|0;
        r=Math.min(255,lerp(mat.c2[0],mat.c1[0],sh)+sp);
        g=Math.min(255,lerp(mat.c2[1],mat.c1[1],sh)+sp);
        b=Math.min(255,lerp(mat.c2[2],mat.c1[2],sh)+sp);
      } else if(m===ANTIMATTER){
        const pulse=0.6+0.4*Math.sin(t*6+i*0.5);
        r=Math.min(255,(lerp(mat.c2[0],mat.c1[0],sh)*pulse)|0);
        g=(lerp(mat.c2[1],mat.c1[1],sh)*pulse)|0;
        b=Math.min(255,(lerp(mat.c2[2],mat.c1[2],sh)*pulse)|0);
      } else if(m===BULB){
        if(life[i]>0){ const u=clamp(life[i]/24,0,1); r=255; g=lerp(208,246,u); b=lerp(118,196,u); }
        else { r=lerp(mat.c1[0],mat.c2[0],sh); g=lerp(mat.c1[1],mat.c2[1],sh); b=lerp(mat.c1[2],mat.c2[2],sh); }
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
      if(!heatMap && !pressureMap){
        if(EMIT[m]){ let gw=EMIT[m]; if(m===CITRINITAS) gw*=shimmer; ge=(255<<24)|(((b*gw)|0)<<16)|(((g*gw)|0)<<8)|((r*gw)|0); }
        else if(temp[i]>560){ const gi=clamp((temp[i]-560)/640,0,1); ge=((gi*235|0)<<24)|(b<<16)|(g<<8)|r; }
        else if(charge[i]>0){ const u=(clamp(charge[i]/8,0,1)*255)|0; ge=(u<<24)|(255<<16)|(235<<8)|120; }
        else if(m===ACID){ ge=(120<<24)|(40<<16)|(220<<8)|110; }
        else if(m===AQUA){ ge=(130<<24)|(180<<16)|(120<<8)|255; }
        else if(m===GOLD){ ge=(70<<24)|(50<<16)|(170<<8)|255; }
        else if(m===CRYSTAL){ ge=(100<<24)|(b<<16)|(g<<8)|r; }
        else if(m===PHILOSOPHER){ ge=(((150*shimmer)|0)<<24)|(120<<16)|(200<<8)|255; }
        else if(m===BULB && life[i]>0){ const u=clamp(life[i]/24,0,1); ge=((u*230|0)<<24)|((b|0)<<16)|((g|0)<<8)|(r|0); }
        else if(m===NITRO && vel[i]>4){ const u=clamp((vel[i]-4)/5,0,1); ge=((u*170|0)<<24)|(50<<16)|(220<<8)|160; }
        ge=scaleGlow(ge,lf);
      }
      glow32[i]=ge;
      if(lit && ge){
        const a=(ge>>>24)*0.00392*lightLevel, li=((((i/W)|0)/LS|0)*LW)+(((i%W)/LS)|0);
        lightR[li]+=(ge&255)*a; lightG[li]+=((ge>>8)&255)*a; lightB[li]+=((ge>>16)&255)*a;
      }
     }
    }
    if(lit){
      for(let k=0;k<pn;k++){
        const lx=(PX[k]/LS)|0, ly=(PY[k]/LS)|0;
        if(lx<0||lx>=LW||ly<0||ly>=LH) continue;
        const li=ly*LW+lx, a=clamp(PL[k]/PM[k],0,1)*0.6*lightLevel;
        lightR[li]+=PR[k]*a; lightG[li]+=PG[k]*a; lightB[li]+=PB[k]*a;
      }
      blurLight(); applyLight(rx0,ry0,rx1,ry1);
    }
    // upload only the dirty rect: render region ∪ this & last frame's particle clouds
    let ux0=rx0,uy0=ry0,ux1=rx1,uy1=ry1;
    let cpx0=W,cpy0=H,cpx1=-1,cpy1=-1;
    for(let k=0;k<pn;k++){ const px=PX[k]|0,py=PY[k]|0;
      if(px<cpx0)cpx0=px; if(px>cpx1)cpx1=px; if(py<cpy0)cpy0=py; if(py>cpy1)cpy1=py; }
    if(cpx1>=cpx0){ if(cpx0-2<ux0)ux0=cpx0-2; if(cpy0-2<uy0)uy0=cpy0-2; if(cpx1+2>ux1)ux1=cpx1+2; if(cpy1+2>uy1)uy1=cpy1+2; }
    if(ppx1>=ppx0){ if(ppx0<ux0)ux0=ppx0; if(ppy0<uy0)uy0=ppy0; if(ppx1>ux1)ux1=ppx1; if(ppy1>uy1)uy1=ppy1; }
    ux0=ux0<0?0:ux0; uy0=uy0<0?0:uy0; ux1=ux1>W-1?W-1:ux1; uy1=uy1>H-1?H-1:uy1;
    const dw=ux1-ux0+1, dh=uy1-uy0+1;
    if(dw>0&&dh>0){ sctx.putImageData(simImg,0,0,ux0,uy0,dw,dh); gctx.putImageData(glowImg,0,0,ux0,uy0,dw,dh); }
    drawParticles();
    if(cpx1>=cpx0){ ppx0=cpx0-2<0?0:cpx0-2; ppy0=cpy0-2<0?0:cpy0-2; ppx1=cpx1+2>W-1?W-1:cpx1+2; ppy1=cpy1+2>H-1?H-1:cpy1+2; }
    else { ppx0=0;ppy0=0;ppx1=-1;ppy1=-1; }
    renderFull=false;
  }
  function drawParticles(){
    if(pn===0) return;
    const lf=lightFX();
    if(lf>0) gctx.save(), gctx.globalCompositeOperation="lighter";
    for(let k=0;k<pn;k++){
      const a=clamp(PL[k]/PM[k],0,1), r=PR[k],g=PG[k],b=PB[k];
      const sz=PK[k]===KROCKET?1.7:1.2;
      const vx=PVX[k], vy=PVY[k], sp=vx*vx+vy*vy;
      // motion trail — a fading streak behind fast particles (long-exposure light)
      if(sp>1){
        const tl=Math.min(3.4, Math.sqrt(sp)*0.95);
        sctx.strokeStyle="rgba("+r+","+g+","+b+","+(a*0.42)+")"; sctx.lineWidth=sz*0.85;
        sctx.beginPath(); sctx.moveTo(PX[k],PY[k]); sctx.lineTo(PX[k]-vx*tl,PY[k]-vy*tl); sctx.stroke();
        if(lf>0){ gctx.strokeStyle="rgba("+r+","+g+","+b+","+(a*0.3*lf)+")"; gctx.lineWidth=sz*1.5;
          gctx.beginPath(); gctx.moveTo(PX[k],PY[k]); gctx.lineTo(PX[k]-vx*tl,PY[k]-vy*tl); gctx.stroke(); }
      }
      sctx.fillStyle="rgba("+r+","+g+","+b+","+a+")";
      sctx.fillRect(PX[k]-sz*0.5,PY[k]-sz*0.5,sz,sz);
      if(lf>0){
        gctx.fillStyle="rgba("+r+","+g+","+b+","+(a*0.85*lf)+")";
        gctx.fillRect(PX[k]-sz,PY[k]-sz,sz*2,sz*2);
      }
    }
    if(lf>0) gctx.restore();
  }

  /* ============================ Painting ========================== */
  let currentMat=SAND, brush=10, painting=false, eraseBtn=false;
  let lastPx=null,lastPy=null;
  let pointerInside=false,pointerX=0,pointerY=0;
  let fireworkCooldown=0, lightningCooldown=0, stormCooldown=0, stormThunderCD=0;
  let stormCount=0, stormPX=0, stormPY=0, stormQ=0;   // stormQ = accumulated storm charge (the field that drives lightning)
  const STORM_CHARGE_RATE=0.008, STORM_BASE=1.5, STORM_BREAKDOWN=1000, STORM_DISCHARGE=750;   // per-cell + per-storm charge/step, breakdown field, charge per bolt

  // iterate the grid cells inside a filled disc of radius rad around (cx,cy), then mark the region active.
  // The callback receives (i, x, y, dd) where dd is the squared distance from the centre. (One brush skeleton.)
  function forDisc(cx,cy,rad,fn){
    const r2=rad*rad;
    const x0=Math.max(0,(cx-rad)|0),x1=Math.min(W-1,(cx+rad)|0);
    const y0=Math.max(0,(cy-rad)|0),y1=Math.min(H-1,(cy+rad)|0);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=x-cx,dy=y-cy,dd=dx*dx+dy*dy; if(dd>r2) continue;
      fn(y*W+x,x,y,dd);
    }
    expandActive(x0,y0,x1,y1);
  }
  function paintTemp(cx,cy,sign){
    const rad=Math.max(2,brush);
    forDisc(cx,cy,rad,(i,x,y,dd)=>{
      const f=1-Math.sqrt(dd)/(rad+0.001);
      if(sign>0) temp[i]=Math.min(1500, temp[i]+36*f);
      else temp[i]=Math.max(-50, temp[i]-32*f);
    });
  }
  function paintDisc(cx,cy,mat){
    if(mat===FIREWORK){ if(fireworkCooldown<=0){ launchRocket(cx,cy); fireworkCooldown=6; } return; }
    if(mat===SPARK){ paintSpark(cx,cy); return; }
    if(mat===LIGHTNING){ if(lightningCooldown<=0){ strikeLightning(cx,cy); lightningCooldown=10; } return; }
    if(mat===HEAT){ paintTemp(cx,cy,1); return; }
    if(mat===COOL){ paintTemp(cx,cy,-1); return; }
    const prob=SPAWN_PROB[mat]??1;
    forDisc(cx,cy,brush,(i)=>{
      if(mat===EMPTY){ grid[i]=EMPTY; charge[i]=0; temp[i]=AMBIENT; return; }
      if(rnd()>prob) return;
      const cur=grid[i];
      if(cur===EMPTY || TYPE[cur]===GAS || TYPE[mat]===STATIC) spawn(i,mat);
    });
  }
  function paintSpark(cx,cy){
    let hit=false;
    forDisc(cx,cy,Math.max(2,brush*0.6),(i)=>{ const m=grid[i];
      if(CHCOND[m]){ charge[i]=6; hit=true; chargeDirty=true; }
      else if(FLAM[m]){ temp[i]+=120; hit=true; }
    });
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
  // First-run "The World Before You": the title forms in diamond, sand pours onto
  // it, an elemental flash dissolves it into water that fills stone basins, life
  // takes root on the banks, fireflies drift and fireworks bloom — a living
  // micro-cosmos that loops until the visitor takes over. (Designed with a
  // creative-director + technical pass: life is grounded, particles have a source.)
  let attract=true, attractT=0, attractStage=0, titleCells=[], dissolveIdx=0;
  let titleBox={x0:0,x1:0,y0:0,y1:0}, terrainTop=null, philoSet=false, fwFlash=false;
  function cineClear(){ clearWorld(); }
  // rasterise text into material cells; return its bounding box (for pouring sand on it)
  function stampText(text,cx,cy,mat,fontPx){
    const oc=document.createElement("canvas"); oc.width=W; oc.height=H;
    const o=oc.getContext("2d");
    o.fillStyle="#fff"; o.textAlign="center"; o.textBaseline="middle";
    o.font="800 "+Math.round(fontPx)+"px Inter, Arial, sans-serif";
    o.fillText(text,cx,cy);
    const d=o.getImageData(0,0,W,H).data;
    let x0=W,x1=0,y0=H,y1=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=y*W+x;
      if(d[i*4+3]>140 && grid[i]===EMPTY){ spawn(i,mat); titleCells.push(i);
        if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
    return {x0,x1,y0,y1};
  }
  // a barren rocky land with two basins that hold real ponds; remembers the soil surface
  function buildTerrain(){
    const baseY=(H*0.78)|0, amp=Math.max(5,(H*0.06)|0), floorY=Math.min(H-1,baseY+amp+12);
    terrainTop=new Int16Array(W);
    for(let x=0;x<W;x++){
      const u=x/W, z1=(u-0.3)*7, z2=(u-0.72)*7;
      const dip=Math.max(Math.exp(-z1*z1),Math.exp(-z2*z2));   // basins sit lower
      const top=baseY+Math.round(amp*dip);
      terrainTop[x]=top;
      for(let y=top;y<=floorY;y++) spawn(y*W+x,STONE);          // solid rock body (holds ponds)
      if(top-1>=0) spawn((top-1)*W+x,SAND);                     // a soil skin
      if(top-2>=0) spawn((top-2)*W+x,SAND);
    }
  }
  // the "Get in your element" invitation that rests over the finished oasis (a UI label, not faux-scenery)
  let ctaEl=null;
  function cineCTA(on){
    if(!ctaEl){ const stage=document.getElementById("stage"); if(!stage) return;
      ctaEl=document.createElement("div"); ctaEl.id="cine-cta";
      ctaEl.innerHTML='<div class="cta-title">Get in your element</div><div class="cta-sub">click anywhere to begin</div>';
      stage.appendChild(ctaEl); }
    ctaEl.style.opacity = on?"1":"0";
  }
  function runAttract(){
    if(!attract) return;
    attractT += 1/60;
    const t=attractT, cx=(W/2)|0, ty=(H*0.3)|0, baseY=(H*0.78)|0;
    // stage 0 → a barren land, then the title materialises out of a soft violet bloom, big and centred
    if(attractStage===0 && t>=0.05){
      cineClear(); titleCells.length=0; dissolveIdx=0;
      philoSet=fwFlash=false;
      buildTerrain();
      flash(184,132,228,0.4);                                  // the void breathes
      titleBox = stampText("Aether Sand", cx, ty, DIAMOND, W*0.086);
      stampText("by Ori Iscovici", cx, (ty+W*0.078)|0, PHILOSOPHER, W*0.032);
      attractStage=1;
    }
    // stage 1 → a heavy stream of sand pours back and forth across the title (like pouring by hand with a fat brush),
    //           burying the glowing letters under sweeping dunes — then the whole thing collapses
    if(attractStage===1){
      if(t>0.8 && t<2.9){
        const span=Math.max(24,titleBox.x1-titleBox.x0), mid=(titleBox.x0+titleBox.x1)*0.5;
        const sx=(mid + Math.sin((t-0.8)*4.2)*span*0.52)|0;    // the pour sweeps left ↔ right ↔ left
        for(let xx=-5;xx<=5;xx++){ const gx=sx+xx;             // a ~10-wide brush, a few cells deep → big amounts
          if(gx>0&&gx<W) for(let gy=2;gy<6;gy++){ if(grid[gy*W+gx]===EMPTY) spawn(gy*W+gx,SAND); } }
        expandActive(titleBox.x0-3,0,titleBox.x1+3,titleBox.y1+3);
      }
      if(t>0.8 && titleCells.length && rnd()<0.4){ const k=titleCells[(rnd()*titleCells.length)|0];
        addP((k%W)+0.5,((k/W)|0)+0.5,(rnd()-0.5)*0.4,-0.25-rnd()*0.35,18+rnd()*16,200,232,255,KSPARK); }
      if(t>=3.1){ flash(200,238,255,0.55); shakeScreen(7); attractStage=2; dissolveIdx=0; }
    }
    // stage 2 → the title dissolves into water that fills the basins; the byline showers down as gold dust
    if(attractStage===2){
      const chunk=Math.ceil(titleCells.length/22);
      for(let n=0;n<chunk && dissolveIdx<titleCells.length;n++,dissolveIdx++){
        const k=titleCells[dissolveIdx];
        if(grid[k]===PHILOSOPHER) convert(k,GOLD);             // the credit becomes treasure
        else if(grid[k]===DIAMOND) convert(k, rnd()<0.72?WATER:SAND);
        addP((k%W)+0.5,((k/W)|0)+0.5,(rnd()-0.5)*0.7,-0.1-rnd()*0.4,16+rnd()*16,200,236,255,KSPARK);
      }
      expandActive(0,0,W-1,H-1);
      if(dissolveIdx>=titleCells.length) attractStage=3;
    }
    // stage 3 → the land has settled → saplings spring up across the banks (reliable + well-spread) and climb fast into trees
    if(attractStage===3 && t>=6.8){
      const TREE_FX=[0.1,0.17,0.24,0.31,0.38,0.45,0.52,0.59,0.66,0.73,0.8,0.87];
      for(let n=0;n<TREE_FX.length;n++){
        const x=clamp((W*TREE_FX[n] + (rnd()-0.5)*0.03*W)|0, 2, W-3);
        let sy=-1; for(let yy=(baseY-24)|0; yy<H; yy++){ const m=grid[yy*W+x]; if(m!==EMPTY && TYPE[m]!==GAS && TYPE[m]!==LIQUID){ sy=yy; break; } }
        if(sy>5){ const top=sy-1;
          for(let c=1;c<=4;c++){ const ai=(top-c)*W+x; if(ai>=0 && TYPE[grid[ai]]!==STATIC && grid[ai]!==WOOD) grid[ai]=EMPTY; }   // a clear column to climb
          spawn(top*W+x, SAPLING); life[top*W+x]=12+(rnd()*15|0);   // varied trunk heights → a natural skyline
          expandActive(x-4, top-28, x+4, top+2);
        }
      }
      attractStage=4;
    }
    // the Stone's quiet pulse gilds a dry bank with a little gold
    if(!philoSet && t>=8){ const x=(W*0.86)|0, top=terrainTop?terrainTop[x]:baseY; spawn((top-3)*W+x,PHILOSOPHER); philoSet=true; }
    // continuous: rain fills the ponds early; a few flakes on the cold left; fireflies drift low over the foliage; fireworks crown it
    if(t>3.6 && t<6.6){ for(let k=0;k<3;k++){ const x=(W*(0.12+rnd()*0.76))|0; if(grid[2*W+x]===EMPTY) spawn(2*W+x,WATER); } expandActive(0,0,W-1,4); }
    if(t>5 && t<8.5 && rnd()<0.16){ const x=(W*(0.02+rnd()*0.09))|0; if(grid[2*W+x]===EMPTY) spawn(2*W+x,SNOW); }
    if(t>7 && rnd()<0.5){ const x=(W*(0.12+rnd()*0.74))|0, y=baseY-4-((rnd()*26)|0);   // low + short life → fireflies, not falling drops
      addP(x+0.5,y+0.5,(rnd()-0.5)*0.22,-0.05-rnd()*0.12,16+rnd()*16,220,255,160,KSPARK); }
    if(t>9 && t<13.5 && rnd()<0.05) launchRocket((W*(0.2+rnd()*0.6))|0, baseY-3);
    if(!fwFlash && t>=10.5){ flash(255,202,110,0.35); shakeScreen(6); fwFlash=true; }
    // the show is done → the oasis simply LIVES (fireflies above keep drifting, the odd firework blooms),
    // and the invitation breathes in. No replay — it rests here until the visitor steps in.
    if(t>=12) cineCTA(true);
    if(t>15 && rnd()<0.0016) launchRocket((W*(0.18+rnd()*0.64))|0, baseY-3);   // a gentle, occasional celebration
  }
  function stopAttract(){ if(!attract) return; attract=false; cineCTA(false); const h=document.getElementById("hint"); if(h) h.classList.add("hide"); }

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
    // a branded "share card": the artwork above a footer with wordmark, URL and live stats
    const aw=W*SCALE, ah=H*SCALE, fh=Math.max(48,Math.round(ah*0.09));
    const ex=document.createElement("canvas"); ex.width=aw; ex.height=ah+fh;
    const c=ex.getContext("2d");
    // --- artwork ---
    c.imageSmoothingEnabled=false;
    c.fillStyle="#07070d"; c.fillRect(0,0,aw,ah);
    c.drawImage(sim,0,0,aw,ah);
    c.save(); c.globalCompositeOperation="lighter"; c.filter="blur("+SCALE+"px) brightness(1.15)";
    c.drawImage(glow,0,0,aw,ah); c.restore();
    // --- footer bar ---
    c.fillStyle="#0b0b14"; c.fillRect(0,ah,aw,fh);
    c.fillStyle="rgba(255,180,84,0.5)"; c.fillRect(0,ah,aw,2);
    const pad=Math.round(fh*0.4), midY=ah+fh/2;
    c.textBaseline="middle";
    c.textAlign="left";
    c.font="700 "+Math.round(fh*0.4)+"px Inter, system-ui, sans-serif"; c.fillStyle="#ffb454";
    c.fillText("Aether Sand", pad, midY-fh*0.14);
    c.font="500 "+Math.round(fh*0.25)+"px Inter, system-ui, sans-serif"; c.fillStyle="#9aa0b5";
    c.fillText("a living particle playground", pad, midY+fh*0.24);
    let cells=0; for(let i=0;i<N;i++) if(grid[i]!==EMPTY) cells++;
    c.textAlign="right";
    c.font="600 "+Math.round(fh*0.3)+"px Inter, system-ui, sans-serif"; c.fillStyle="#cfd3e0";
    c.fillText("isco-tec.github.io/aether-sand", aw-pad, midY-fh*0.14);
    c.font="500 "+Math.round(fh*0.24)+"px Inter, system-ui, sans-serif"; c.fillStyle="#7e84a3";
    c.fillText(cells.toLocaleString()+" cells · "+(pn|0).toLocaleString()+" particles", aw-pad, midY+fh*0.24);
    const a=document.createElement("a");
    a.href=ex.toDataURL("image/png"); a.download="aether-sand.png"; a.click();
    toast("Share card saved 🖼️");
  }
  function b64(arr){ let s="",ch=0x8000; for(let i=0;i<arr.length;i+=ch) s+=String.fromCharCode.apply(null,arr.subarray(i,i+ch)); return btoa(s); }
  function unb64(str){ const bin=atob(str),a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i); return a; }
  function saveScene(){ try{ localStorage.setItem("aether-sand-scene",JSON.stringify({v:SCENE_VERSION,w:W,h:H,g:b64(grid)})); toast("Scene saved"); }catch(e){ toast("Save failed"); } }
  function loadScene(){
    const s=localStorage.getItem("aether-sand-scene"); if(!s){ toast("No saved scene"); return; }
    try{ const o=JSON.parse(s),g=unb64(o.g);
      if(!(o.w>0)||!(o.h>0)) throw new Error("bad save");
      grid.fill(EMPTY); charge.fill(0);
      const cw=Math.min(o.w,W),chh=Math.min(o.h,H);
      for(let y=0;y<chh;y++)for(let x=0;x<cw;x++){ const i=y*W+x,m=g[y*o.w+x];
        if(m>=MAXID || !M[m]){ grid[i]=EMPTY; continue; }   // guard corrupt / foreign-version ids
        grid[i]=m; shade[i]=r255(); temp[i]=BASET[m]; life[i]=defaultLife(m); }
      stopAttract(); markRenderFull(); toast("Scene loaded");
    }catch(e){ toast("Load failed"); }
  }

  /* ============================ Shareable links ================== */
  // sand art is mostly empty, so run-length encoding packs a whole scene tiny.
  function rleEncode(g){
    const out=[]; let i=0;
    while(i<g.length){
      const v=g[i]; let j=i+1;
      while(j<g.length && g[j]===v) j++;
      let count=j-i; out.push(v);
      while(count>=128){ out.push((count&127)|128); count>>>=7; }
      out.push(count); i=j;
    }
    return Uint8Array.from(out);
  }
  function rleDecode(bytes, target){
    let p=0, idx=0;
    while(p<bytes.length && idx<target.length){
      const v=bytes[p++]; let count=0, shift=0, b;
      do{ b=bytes[p++]; count|=(b&127)<<shift; shift+=7; }while(b&128 && p<bytes.length);
      for(let k=0;k<count && idx<target.length;k++) target[idx++]=v;
    }
  }
  // URL-safe base64 = plain base64 with +/= swapped — reuse b64/unb64 rather than re-implement the chunked loop
  function b64url(arr){ return b64(arr).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function unb64url(str){ str=str.replace(/-/g,'+').replace(/_/g,'/'); while(str.length%4) str+='='; return unb64(str); }
  function encodeScene(){
    const rle=rleEncode(grid), all=new Uint8Array(5+rle.length);
    all[0]=SCENE_VERSION;
    all[1]=W&255; all[2]=(W>>8)&255; all[3]=H&255; all[4]=(H>>8)&255;
    all.set(rle,5); return b64url(all);
  }
  function applySceneBytes(all){
    let off, w, h;
    if(all[0]===SCENE_VERSION){ off=5; w=all[1]|(all[2]<<8); h=all[3]|(all[4]<<8); }
    else { off=4; w=all[0]|(all[1]<<8); h=all[2]|(all[3]<<8); }   // legacy (pre-version) payload: 4-byte header
    if(w<=0||h<=0||w>MAX_SCENE_DIM||h>MAX_SCENE_DIM) throw new Error("bad scene");   // reject oversized dims (DoS) before allocating
    const flat=new Uint8Array(w*h); rleDecode(all.subarray(off), flat);
    grid.fill(EMPTY); charge.fill(0); life.fill(0); pres.fill(0); temp.fill(AMBIENT); vel.fill(0); pn=0;
    const cw=Math.min(w,W), chh=Math.min(h,H);
    for(let y=0;y<chh;y++)for(let x=0;x<cw;x++){
      const i=y*W+x, m=flat[y*w+x];
      if(m>=MAXID || !M[m]){ continue; }   // skip unknown / retired ids (the [0,MAXID) range is NOT contiguous)
      grid[i]=m; shade[i]=r255(); temp[i]=BASET[m]; life[i]=defaultLife(m);
    }
    markRenderFull();
  }
  function shareScene(){
    try{
      const code=encodeScene();
      const url=location.origin+location.pathname+"#s="+code;
      try{ history.replaceState(null,"","#s="+code); }catch(_){}
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(()=>toast("🔗 Share link copied!"),()=>toast("Share link is in the address bar"));
      } else toast("Share link is in the address bar");
      if(code.length>24000) toast("Busy scene — the link will be long");
      return url;
    }catch(e){ toast("Couldn't build a link"); return null; }
  }
  function loadFromURL(){
    const m=/[#&]s=([^&]+)/.exec(location.hash||"");
    if(!m) return false;
    try{ applySceneBytes(unb64url(m[1])); stopAttract(); return true; }
    catch(e){ return false; }
  }

  /* ============================ Loop ============================== */
  let paused=false, stepOnce=false, frames=0, fpsT=performance.now(), fpsEl, countEl;
  let acc=0, lastT=performance.now(), subBudget=4; const SIMDT=1000/60;   // subBudget: adaptive max sim steps/frame
  function loop(now){
    if(fireworkCooldown>0) fireworkCooldown--;
    if(lightningCooldown>0) lightningCooldown--;
    if(opusCooldown>0) opusCooldown--;
    let dt=now-lastT; lastT=now; if(dt>250) dt=250; acc+=dt;
    if(acc>SIMDT*subBudget) acc=SIMDT*subBudget;   // never hoard more backlog than we'll run (no death-spiral after a stall)
    let runs=0; const simT0=performance.now();
    try{
      while(acc>=SIMDT && runs<subBudget){
        if(!paused||stepOnce){ runAttract(); step(); stepOnce=false; }
        acc-=SIMDT; runs++;
        if(paused) break;
      }
      // adapt the catch-up budget: if simulating is overrunning the frame, stop trying to do 4 steps (degrade to
      // slow-motion rather than a juddery stall on Grand/mobile); climb back toward 4 when there's headroom
      const simMs=performance.now()-simT0;
      if(simMs>SIMDT*1.4 && subBudget>1) subBudget--;
      else if(simMs<SIMDT*0.7 && subBudget<4) subBudget++;
      if(painting && lastPx!=null) paintDisc(lastPx,lastPy,eraseBtn?EMPTY:currentMat);
      render(now);
    }catch(err){
      // a corrupt scene (e.g. a crafted #s= link) must NEVER brick the loop — wipe it, drop the bad hash, recover
      try{ history.replaceState(null,"",location.pathname); }catch(_){}
      try{ clearWorld(); acc=0; }catch(_){}
      try{ toast("⚠️ That scene was corrupt — cleared it"); }catch(_){}
    }
    applyShake();
    frames++;
    if(now-fpsT>=500){
      fpsEl.textContent=Math.round((frames*1000)/(now-fpsT)); frames=0; fpsT=now;
      let c=0,fN=0,wN=0,lN=0,coldN=0,toxN=0;
      for(let i=0;i<N;i++){ const m=grid[i]; if(m!==EMPTY){ c++;
        if(m===FIRE)fN++; else if(m===WATER||m===BRINE)wN++; else if(m===LAVA)lN++;
        else if(m===ICE||m===SNOW)coldN++; else if(m===ACIDCLOUD||m===ACID)toxN++; } }
      countEl.textContent=(c+pn).toLocaleString();
      Snd.ambient(fN,wN,lN);
      updateMood(fN+lN*2, coldN, toxN);
      checkChallenges();
    }
    requestAnimationFrame(loop);
  }

  /* ============================ UI =============================== */
  function swatchBg(m){
    if(m===EMPTY) return "repeating-linear-gradient(45deg,#2a2a36 0 5px,#1c1c26 5px 10px)";
    if(m===SPARK) return "linear-gradient(160deg,#bfefff,#5db8ff)";
    if(m===CRYSTAL) return "linear-gradient(135deg,#c8a0ff,#8060e8,#b0f0ff)";
    if(m===PHILOSOPHER) return "linear-gradient(160deg,#ffb0e8,#a050ff,#ffd0f0)";
    if(m===AQUA) return "linear-gradient(160deg,#ffd0ff,#c080ff,#ffa0ff)";
    if(m===DIAMOND) return "linear-gradient(135deg,#eaffff,#bfe6ff,#9ccdff)";
    if(m===ANTIMATTER) return "linear-gradient(135deg,#ff8be0,#c030b0,#ff70d0)";
    if(m===LIGHTNING) return "linear-gradient(160deg,#eaf4ff,#7aa8ff)";
    if(m===SLIME) return "linear-gradient(160deg,#9cf06a,#56b84a)";
    if(m===HONEY) return "linear-gradient(160deg,#ffcb52,#b87a16)";
    if(m===ACIDCLOUD) return "linear-gradient(160deg,#bcd07f,#5e7038)";
    if(m===BULB) return "radial-gradient(circle at 38% 32%,#fff3c0,#d2d2b0 58%,#9a9a82)";
    const a=M[m].c1,b=M[m].c2;
    return "linear-gradient(160deg,rgb("+a[0]+","+a[1]+","+a[2]+"),rgb("+b[0]+","+b[1]+","+b[2]+"))";
  }
  const PAL_TABS = MAT_GROUPS.map(g=>g.label).concat("All");
  let activeTab = MAT_GROUPS.length;   // default to "All" so everything is visible
  let matSearch = "";

  function matsForView(){
    if(matSearch){
      const q=matSearch.toLowerCase();
      return PALETTE.filter(m=> M[m].name.toLowerCase().includes(q) || (MAT_BLURB[m]||"").toLowerCase().includes(q));
    }
    const lbl=PAL_TABS[activeTab];
    if(lbl==="All") return PALETTE;
    const g=MAT_GROUPS.find(gr=>gr.label===lbl);
    return g?g.mats:PALETTE;
  }
  function whisperFor(m){   // a teasing hint toward an as-yet-undiscovered recipe that uses this material
    for(const r of ALCHEMY_RECIPES)
      if(r.in && r.in.indexOf(m)>=0 && r.hint && !discoveries.has(r.id)) return r.hint;
    return null;
  }
  function setMatDesc(m){
    const box=document.getElementById("mat-desc"); if(!box) return;
    box.querySelector(".mat-desc-name").textContent=M[m]?M[m].name:"";
    const te=box.querySelector(".mat-desc-text");
    te.textContent=MAT_BLURB[m]||"";
    const w=whisperFor(m);
    if(w){ const s=document.createElement("span"); s.className="mat-whisper"; s.textContent=" "+w; te.appendChild(s); }
  }
  function buildMatButton(m){
    const el=document.createElement("button");
    el.className="mat"+(m===currentMat?" active":"");
    el.dataset.mat=m;
    el.title=(M[m].name)+" — "+(MAT_BLURB[m]||"");
    el.style.setProperty("--swatch", m===EMPTY?"#3a3a48":"rgb("+(M[m].c1[0])+","+(M[m].c1[1])+","+(M[m].c1[2])+")");
    const sw = m===RAINBOW ? '<span class="mat-swatch rainbow"></span>'
                           : '<span class="mat-swatch" style="--swatch-bg:'+swatchBg(m)+'"></span>';
    el.innerHTML=sw+'<span class="mat-name">'+M[m].name+'</span>';
    el.addEventListener("mouseenter",()=>setMatDesc(m));
    el.addEventListener("mouseleave",()=>setMatDesc(currentMat));
    el.addEventListener("click",()=>{ currentMat=m; setMatDesc(m); syncPaletteActive(); });
    return el;
  }
  function renderMatGrid(){
    const wrap=document.getElementById("material-grid-wrap"); if(!wrap) return;
    wrap.innerHTML="";
    const mats=matsForView();
    if(mats.length===0){ const d=document.createElement("div"); d.className="mat-empty";
      d.textContent='No materials match “'+matSearch+'”.'; wrap.replaceChildren(d); return; }   // textContent → the typed query can't inject markup
    const grid=document.createElement("div");
    grid.className="material-grid";
    mats.forEach(m=>grid.appendChild(buildMatButton(m)));
    wrap.appendChild(grid);
    syncPaletteActive();
  }
  function buildPalette(){
    const tabsEl=document.getElementById("palette-tabs");
    if(tabsEl){
      tabsEl.innerHTML="";
      PAL_TABS.forEach((label,idx)=>{
        const b=document.createElement("button");
        b.className="ptab"+(idx===activeTab?" active":"");
        b.textContent=label;
        b.addEventListener("click",()=>{
          activeTab=idx; matSearch="";
          const s=document.getElementById("mat-search"); if(s) s.value="";
          const clr=document.getElementById("mat-search-clear"); if(clr) clr.classList.remove("show");
          document.querySelectorAll(".ptab").forEach((t,j)=>t.classList.toggle("active",j===idx));
          renderMatGrid();
        });
        tabsEl.appendChild(b);
      });
    }
    const searchEl=document.getElementById("mat-search"), clearEl=document.getElementById("mat-search-clear");
    if(searchEl){
      searchEl.addEventListener("input",()=>{
        matSearch=searchEl.value.trim();
        document.querySelectorAll(".ptab").forEach((t,j)=>t.classList.toggle("active", !matSearch && j===activeTab));
        if(clearEl) clearEl.classList.toggle("show", !!matSearch);
        renderMatGrid();
      });
    }
    if(clearEl){
      clearEl.addEventListener("click",()=>{
        matSearch=""; if(searchEl){ searchEl.value=""; searchEl.focus(); }
        clearEl.classList.remove("show");
        document.querySelectorAll(".ptab").forEach((t,j)=>t.classList.toggle("active", j===activeTab));
        renderMatGrid();
      });
    }
    const wrap=document.getElementById("material-grid-wrap");
    if(wrap) wrap.addEventListener("mouseleave",()=>setMatDesc(currentMat));
    renderMatGrid();
    setMatDesc(currentMat);
  }
  function ingChip(m){
    return '<span class="ing"><span class="ing-sw" style="background:'+swatchBg(m)+'"></span>'+M[m].name+'</span>';
  }
  function ingUnknown(){ return '<span class="ing ing-q"><span class="ing-sw ing-sw-q">?</span></span>'; }
  function recipeChips(r,known){
    const ins=r.in||[], outs=r.out||[];
    if(known){
      const inHtml=ins.map(ingChip).join('<span class="ing-op">+</span>');
      const outHtml=(outs.length?outs.map(ingChip):['<span class="ing ing-x">⟂</span>']).join('<span class="ing-op">+</span>');
      return '<div class="recipe-chips">'+inHtml+'<span class="ing-op ing-arrow">→</span>'+outHtml+'</div>';
    }
    let s='<div class="recipe-chips">';
    const n=Math.max(2,ins.length);
    for(let k=0;k<n;k++){ s+=(k?'<span class="ing-op">+</span>':'')+ingUnknown(); }
    s+='<span class="ing-op ing-arrow">→</span>'+ingUnknown()+'</div>';
    return s;
  }
  function markRecipesSeen(){
    let changed=false;
    ALCHEMY_RECIPES.forEach(r=>{ if(isRecipeKnown(r.id) && !seenRecipes.has(r.id)){ seenRecipes.add(r.id); changed=true; } });
    if(changed){ try{ localStorage.setItem("aether-seen", JSON.stringify([...seenRecipes])); }catch(_){ } }
  }
  function renderBooklet(){
    const total=ALCHEMY_RECIPES.length;
    const known=ALCHEMY_RECIPES.filter(r=>isRecipeKnown(r.id)).length;
    const countEl=document.getElementById("discover-count");
    if(countEl) countEl.textContent=(revealAll?"All revealed · ":"")+"Discovered "+known+" / "+total;
    const barEl=document.getElementById("discover-bar");
    if(barEl) barEl.style.width=Math.round(known/total*100)+"%";
    const recipesEl=document.getElementById("booklet-recipes");
    if(recipesEl){
      recipesEl.innerHTML="";
      const cats=[...new Set(ALCHEMY_RECIPES.map(r=>r.cat))];
      cats.forEach(cat=>{
        const list=ALCHEMY_RECIPES.filter(r=>r.cat===cat);
        const kc=list.filter(r=>isRecipeKnown(r.id)).length;
        const group=document.createElement("div");
        group.className="recipe-group";
        group.innerHTML='<div class="recipe-group-title">'+cat+'<span class="recipe-group-count">'+kc+'/'+list.length+'</span></div>';
        list.forEach(r=>{
          const knownR=isRecipeKnown(r.id);
          const isNew=knownR && !seenRecipes.has(r.id);
          const row=document.createElement("div");
          row.className="recipe "+(knownR?(r.starter?"starter unlocked":"unlocked"):"locked")+(isNew?" is-new":"");
          row.innerHTML=
            '<div class="recipe-badge">'+(knownR?"✦":"?")+'</div>'+
            '<div class="recipe-main">'+
              '<div class="recipe-name">'+(knownR?r.name:"<span class=\"locked-name\">??? </span>")+(isNew?'<span class="recipe-new">NEW</span>':'')+'</div>'+
              recipeChips(r,knownR)+
              '<div class="recipe-note'+(knownR?"":" unknown")+'">'+(knownR?r.note:(r.hint||"Experiment to unlock…"))+'</div>'+
            '</div>';
          group.appendChild(row);
        });
        recipesEl.appendChild(group);
      });
    }
    const matsEl=document.getElementById("booklet-materials");
    if(matsEl){
      matsEl.innerHTML="";
      MAT_GROUPS.forEach(grp=>{
        const group=document.createElement("div");
        group.className="recipe-group";
        group.innerHTML='<div class="recipe-group-title">'+grp.label+'</div>';
        grp.mats.forEach(m=>{
          if(m===EMPTY) return;
          const row=document.createElement("div");
          row.className="mat-entry";
          row.innerHTML=
            '<div class="mat-entry-swatch" style="background:'+swatchBg(m)+'"></div>'+
            '<div><div class="mat-entry-name">'+M[m].name+'</div>'+
            '<div class="mat-entry-desc">'+(MAT_BLURB[m]||"")+'</div></div>';
          group.appendChild(row);
        });
        matsEl.appendChild(group);
      });
    }
  }
  function openBooklet(){
    const el=document.getElementById("booklet");
    if(!el) return;
    renderBooklet();
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden","false");
  }
  function closeBooklet(){
    const el=document.getElementById("booklet");
    if(!el) return;
    markRecipesSeen();
    el.classList.add("hidden");
    el.setAttribute("aria-hidden","true");
  }
  function setupBooklet(){
    document.getElementById("btn-book")?.addEventListener("click",openBooklet);
    document.getElementById("btn-book-close")?.addEventListener("click",closeBooklet);
    document.getElementById("booklet-backdrop")?.addEventListener("click",closeBooklet);
    document.querySelectorAll(".btab").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.querySelectorAll(".btab").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        const tab=btn.dataset.tab;
        document.getElementById("booklet-recipes").classList.toggle("hidden",tab!=="recipes");
        document.getElementById("booklet-materials").classList.toggle("hidden",tab!=="materials");
      });
    });
    const revealEl=document.getElementById("reveal-all");
    if(revealEl){
      revealEl.checked=revealAll;
      revealEl.addEventListener("change",()=>{
        revealAll=revealEl.checked;
        try{ localStorage.setItem("aether-reveal-all", revealAll?"1":"0"); }catch(_){}
        renderBooklet();
      });
    }
    renderBooklet();
  }
  function openAbout(){ const el=document.getElementById("about"); if(!el)return; el.classList.remove("hidden"); el.setAttribute("aria-hidden","false"); }
  function closeAbout(){ const el=document.getElementById("about"); if(!el)return; el.classList.add("hidden"); el.setAttribute("aria-hidden","true"); }
  function setupAbout(){
    document.getElementById("brand-btn")?.addEventListener("click",openAbout);
    document.getElementById("about-close")?.addEventListener("click",closeAbout);
    document.getElementById("about-backdrop")?.addEventListener("click",closeAbout);
  }

  /* ---- challenges ---- */
  function challengeStats(){
    const counts=new Int32Array(MAXID);
    let cells=0, litBulbs=0, minT=AMBIENT, maxT=AMBIENT, maxP=0;
    for(let i=0;i<N;i++){
      const m=grid[i];
      if(m!==EMPTY){ cells++; if(m<MAXID)counts[m]++; if(m===BULB&&life[i]>0)litBulbs++; }
      const t=temp[i]; if(t<minT)minT=t; else if(t>maxT)maxT=t;
      const p=pres[i]; if(p>maxP)maxP=p;
    }
    return { cells, litBulbs, minTemp:minT, maxTemp:maxT, maxPres:maxP, count:(id)=>counts[id]||0, disc:discoveries };
  }
  function celebrateChallenge(c){
    toast("🏆 "+c.title+" — complete!");
    for(let k=0;k<3;k++){ const x=(W*(0.28+rnd()*0.44))|0; burst(x,(H*0.32)|0); }
  }
  function checkChallenges(){
    if(challengesDone.size>=CHALLENGES.length) return;
    const s=challengeStats();
    const newly=[];
    for(const c of CHALLENGES){ if(!challengesDone.has(c.id) && c.test(s)){ challengesDone.add(c.id); newly.push(c); } }
    if(newly.length){
      try{ localStorage.setItem("aether-challenges", JSON.stringify([...challengesDone])); }catch(_){}
      const open = !document.getElementById("challenges")?.classList.contains("hidden");
      if(!open) challengesUnseen=true;
      newly.forEach(celebrateChallenge);
      renderChallenges(); updateChallengeBadge();
    }
  }
  function updateChallengeBadge(){
    const el=document.getElementById("challenge-count");
    if(el) el.textContent=challengesDone.size+"/"+CHALLENGES.length;
    const btn=document.getElementById("btn-challenges");
    if(btn) btn.classList.toggle("has-new", challengesUnseen);
    // next-up nudge — always shows one goal to work toward
    const chip=document.getElementById("next-challenge");
    if(chip){
      const next=nextChallenge(), n=challengesDone.size;
      if(next && n>0 && n<CHALLENGES.length){
        chip.style.display="";
        chip.querySelector(".nc-icon").textContent=next.icon;
        chip.querySelector(".nc-title").textContent=next.title;
        chip.title="Next challenge: "+next.title+" — "+next.desc;
      } else chip.style.display="none";
    }
  }
  // a visible mastery ladder so players can see how far the depth goes
  const CHALLENGE_TIERS=[
    {name:"Apprentice", ids:["first_pour","storm","wildfire","germinate","saltearth"]},
    {name:"Adept",      ids:["glass","obsidian","vermilion","slaked","snuffed","freeze","lights","fulgurite","garden"]},
    {name:"Alchemist",  ids:["gold","acidrain","boom","pressure","inferno","tree"]},
    {name:"Grandmaster",ids:["diamond","antimatter","magnum_opus","projection"]},
  ];
  function nextChallenge(){
    for(const tier of CHALLENGE_TIERS) for(const id of tier.ids)
      if(!challengesDone.has(id)){ const c=CHALLENGES.find(x=>x.id===id); if(c) return c; }
    return null;
  }
  function challengeRow(c){
    const ok=challengesDone.has(c.id);
    const row=document.createElement("div");
    row.className="challenge"+(ok?" done":"");
    row.innerHTML='<div class="challenge-icon">'+c.icon+'</div>'+
      '<div class="challenge-main"><div class="challenge-title">'+c.title+'</div>'+
      '<div class="challenge-desc">'+c.desc+'</div></div>'+
      '<div class="challenge-check">'+(ok?"✓":"")+'</div>';
    return row;
  }
  function renderChallenges(){
    const body=document.getElementById("challenge-list"); if(!body) return;
    const done=challengesDone.size, total=CHALLENGES.length;
    const txt=document.getElementById("challenge-progress-text"); if(txt) txt.textContent=done+" / "+total+" complete";
    const bar=document.getElementById("challenge-bar"); if(bar) bar.style.width=Math.round(done/total*100)+"%";
    body.innerHTML="";
    const byId={}; CHALLENGES.forEach(c=>byId[c.id]=c); const placed=new Set();
    for(const tier of CHALLENGE_TIERS){
      const items=tier.ids.map(id=>byId[id]).filter(Boolean);
      if(!items.length) continue;
      const tdone=items.filter(c=>challengesDone.has(c.id)).length;
      const head=document.createElement("div"); head.className="challenge-tier";
      head.innerHTML='<span>'+tier.name+'</span><span class="challenge-tier-count">'+tdone+'/'+items.length+'</span>';
      body.appendChild(head);
      items.forEach(c=>{ placed.add(c.id); body.appendChild(challengeRow(c)); });
    }
    const rest=CHALLENGES.filter(c=>!placed.has(c.id));   // safety net for any untiered challenge
    if(rest.length){ const head=document.createElement("div"); head.className="challenge-tier"; head.innerHTML='<span>More</span>'; body.appendChild(head); rest.forEach(c=>body.appendChild(challengeRow(c))); }
  }
  function openChallenges(){
    const el=document.getElementById("challenges"); if(!el) return;
    checkChallenges(); challengesUnseen=false; renderChallenges(); updateChallengeBadge();
    el.classList.remove("hidden"); el.setAttribute("aria-hidden","false");
  }
  function closeChallenges(){
    const el=document.getElementById("challenges"); if(!el) return;
    el.classList.add("hidden"); el.setAttribute("aria-hidden","true");
  }
  function setupChallenges(){
    document.getElementById("btn-challenges")?.addEventListener("click",openChallenges);
    document.getElementById("next-challenge")?.addEventListener("click",openChallenges);
    document.getElementById("challenges-close")?.addEventListener("click",closeChallenges);
    document.getElementById("challenges-backdrop")?.addEventListener("click",closeChallenges);
    renderChallenges(); updateChallengeBadge();
  }
  function setupUI(){
    fpsEl=document.getElementById("fps"); countEl=document.getElementById("count");
    const playBtn=document.getElementById("btn-play");
    playBtn.addEventListener("click",()=>{ paused=!paused; playBtn.classList.toggle("paused",paused); });
    document.getElementById("btn-step").addEventListener("click",()=>{ stepOnce=true; });
    document.getElementById("btn-clear").addEventListener("click",()=>{ clearWorld(); });

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
    const pressBtn=document.getElementById("btn-pressure");
    heatBtn.addEventListener("click",()=>{ heatMap=!heatMap; if(heatMap) pressureMap=false; heatBtn.classList.toggle("on",heatMap); pressBtn.classList.toggle("on",pressureMap); });
    pressBtn.addEventListener("click",()=>{ pressureMap=!pressureMap; if(pressureMap) heatMap=false; pressBtn.classList.toggle("on",pressureMap); heatBtn.classList.toggle("on",heatMap); });
    const lightBtn=document.getElementById("btn-light");
    lightBtn.addEventListener("click",()=>{ lighting=!lighting; syncLightUI(); toast(lighting?"Lighting on":"Lighting off"); });
    const lightEl=document.getElementById("light");
    lightEl.addEventListener("input",()=>{ lightLevel=(+lightEl.value)/100; syncLightUI(); });
    syncLightUI();

    const worldSeg=document.getElementById("world-seg");
    if(worldSeg){
      const worldBtns=worldSeg.querySelectorAll("button");
      const syncWorld=()=>worldBtns.forEach(b=>b.classList.toggle("active", +b.dataset.world===worldSize));
      worldBtns.forEach(b=>b.addEventListener("click",()=>{
        setWorldSize(+b.dataset.world); syncWorld(); syncBrush();
        toast("World: "+["Cozy","Balanced","Grand"][worldSize]);
      }));
      syncWorld();
    }
    document.getElementById("btn-snap").addEventListener("click",snapshot);
    document.getElementById("btn-share").addEventListener("click",shareScene);
    document.getElementById("btn-save").addEventListener("click",saveScene);
    document.getElementById("btn-load").addEventListener("click",loadScene);
    const soundBtn=document.getElementById("btn-sound");
    const syncSound=()=>{ const m=Snd.isMuted(); soundBtn.classList.toggle("on",!m);
      soundBtn.querySelector("span").innerHTML=m?"Sound&nbsp;off":"Sound&nbsp;on"; };
    soundBtn.addEventListener("click",()=>{ Snd.start(); Snd.setMuted(!Snd.isMuted()); syncSound(); });
    syncSound();

    window.addEventListener("keydown",(e)=>{
      const tag=e.target&&e.target.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"){ if(e.code==="Escape") e.target.blur(); return; }
      Snd.start();
      if(e.code==="Space"){ e.preventDefault(); playBtn.click(); }
      else if(e.code==="KeyM"){ const sb=document.getElementById("btn-sound"); if(sb) sb.click(); }
      else if(e.code==="KeyC") document.getElementById("btn-clear").click();
      else if(e.code==="KeyH") heatBtn.click();
      else if(e.code==="KeyL"){ lighting=!lighting; syncLightUI(); toast(lighting?"Lighting on":"Lighting off"); }
      else if(e.code==="KeyB"){ const b=document.getElementById("booklet"); if(b&&b.classList.contains("hidden")) openBooklet(); else closeBooklet(); }
      else if(e.code==="KeyG"){ const c=document.getElementById("challenges"); if(c&&c.classList.contains("hidden")) openChallenges(); else closeChallenges(); }
      else if(e.code==="Escape"){ closeBooklet(); closeAbout(); closeChallenges(); }
      else if(e.code==="KeyP") pressBtn.click();
      else if(e.code==="ArrowRight") stepOnce=true;
      else if(e.code==="BracketRight"||e.key==="]"){ brushEl.value=Math.min(48,brush+2); syncBrush(); }
      else if(e.code==="BracketLeft"||e.key==="["){ brushEl.value=Math.max(1,brush-2); syncBrush(); }
      else if(e.key>="1"&&e.key<="9"){ const idx=+e.key-1; const b=document.querySelectorAll(".mat")[idx]; if(b)b.click(); }
    });

    return {ring,syncBrush};
  }
  function setupPointer(ring){
    const updateRing=()=>{ ring.style.left=pointerX+"px"; ring.style.top=pointerY+"px"; ring.style.opacity=pointerInside?"1":"0"; };
    const stage=document.getElementById("stage");
    stage.addEventListener("contextmenu",e=>e.preventDefault());
    stage.addEventListener("pointerdown",(e)=>{
      Snd.start();
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
                torch:HEAT, warm:HEAT, cool:COOL, cryo:COOL, freeze:COOL, clone:CLONER, sink:VOID,
                quicksilver:MERCURY, hg:MERCURY, amalgam:MERCURY,
                nitroglycerin:NITRO, tnt:NITRO, niter:SALTPETER, charcoal:COAL,
                "aqua regia":AQUA, aqua:AQUA, catalyst:PHILOSOPHER, philosopher:PHILOSOPHER,
                h2:HYDROGEN, o2:OXYGEN, "volcanic glass":OBSIDIAN, gem:DIAMOND,
                cinder:ASH, oxide:RUST, storm:CLOUD, "storm cloud":CLOUD, bolt:LIGHTNING,
                "anti-matter":ANTIMATTER, antimater:ANTIMATTER,
                goo:SLIME, ooze:SLIME, syrup:HONEY, "acid cloud":ACIDCLOUD, acidcloud:ACIDCLOUD,
                smog:ACIDCLOUD, "acid rain":ACIDCLOUD, lamp:BULB, light:BULB,
                ivy:VINE, creeper:VINE, moss:MOLD, rot:MOLD, fungus:MOLD,
                saltwater:BRINE, "salt water":BRINE, seawater:BRINE, brine:BRINE,
                vermilion:CINNABAR, vermillion:CINNABAR, hgs:CINNABAR,
                limestone:LIMESTONE, chalk:LIMESTONE, quicklime:QUICKLIME, "quick lime":QUICKLIME,
                lime:QUICKLIME, "slaked lime":SLAKEDLIME, slakedlime:SLAKEDLIME,
                co2:CO2, "carbon dioxide":CO2, "dry ice":CO2,
                seed:SEED, seeds:SEED, sprout:SEED, sapling:SAPLING, tree:SAPLING,
                nigredo:NIGREDO, albedo:ALBEDO, citrinitas:CITRINITAS };
  function resolveMat(m){ if(typeof m!=="string") return m; const k=m.toLowerCase(); return NAME2ID[k]??ALIAS[k]??SAND; }
  function ringColor(m){
    if(m===EMPTY) return "232,232,240";
    const c=M[m]&&M[m].c1; if(!c) return "232,232,240";
    return Math.min(255,c[0]+45)+","+Math.min(255,c[1]+45)+","+Math.min(255,c[2]+45);
  }
  function syncPaletteActive(){
    document.querySelectorAll(".mat").forEach(n=>n.classList.toggle("active", +n.dataset.mat===currentMat));
    const ring=document.getElementById("cursor-ring");
    if(ring){ const col=ringColor(currentMat);
      ring.style.borderColor="rgba("+col+",0.95)";
      ring.style.boxShadow="0 0 0 1px rgba(0,0,0,0.5), 0 0 15px rgba("+col+",0.6)"; }
  }
  window.AetherSand={
    EMPTY,WALL,SAND,RAINBOW,WATER,ICE,SNOW,SALT,OIL,ACID,LAVA,FIRE,SMOKE,STEAM,
    WOOD,PLANT,GLASS,STONE,METAL,GUNPOWDER,FIREWORK,SPARK,COAL,HEAT,COOL,CLONER,VOID,
    MERCURY,THERMITE,FUSE,GOLD,NITRO,SULFUR,SALTPETER,CRYSTAL,PHILOSOPHER,AQUA,
    OBSIDIAN,DIAMOND,HYDROGEN,OXYGEN,ASH,RUST,CLOUD,LIGHTNING,ANTIMATTER,
    SLIME,HONEY,ACIDCLOUD,BULB,VINE,MOLD,BRINE,CINNABAR,LIMESTONE,QUICKLIME,SLAKEDLIME,CO2,SEED,
    NIGREDO,ALBEDO,CITRINITAS,SAPLING,SODIUM,CHLORINE,MAGNESIUM,
    MOLTEN_METAL,COPPER,PATINA,CUPRITE,TIN,TINPEST,BRONZE,STEEL,SILVER,TARNISH,ALUMINUM,
    URANIUM,PLUTONIUM,NEUTRON,FALLOUT,CONTROL_ROD,
    setMaterial(m){ currentMat=resolveMat(m); syncPaletteActive(); return M[currentMat]?.name; },
    setBrush(r){ const b=document.getElementById("brush"); b.value=r; b.dispatchEvent(new Event("input")); },
    paint(x,y,m,r){ if(m!=null) currentMat=resolveMat(m); if(r) brush=r; stopAttract(); paintDisc(x|0,y|0,currentMat); },
    line(x0,y0,x1,y1,m,r){ if(m!=null) currentMat=resolveMat(m); if(r) brush=r; stopAttract(); paintLine(x0|0,y0|0,x1|0,y1|0,currentMat); },
    erase(x,y,r){ if(r) brush=r; paintDisc(x|0,y|0,EMPTY); },
    clear(){ clearWorld(); },
    gravity(gx,gy){ setGravity(gx,gy); document.querySelectorAll(".cmp").forEach(b=>b.classList.toggle("active", +b.dataset.gx===gx && +b.dataset.gy===gy)); },
    wind(w){ WIND=w; const el=document.getElementById("wind"); if(el){el.value=Math.round(w*100); document.getElementById("wind-readout").textContent=el.value;} },
    firework(x,y){ stopAttract(); launchRocket(x|0,y|0); },
    lightning(x,y){ stopAttract(); strikeLightning(x|0,y|0); },
    burst(x,y){ burst(x|0,y|0); },
    pause(p){ paused=(p==null)?!paused:!!p; const b=document.getElementById("btn-play"); if(b)b.classList.toggle("paused",paused); return paused; },
    heatMap(on){ heatMap=on==null?!heatMap:!!on; if(heatMap) pressureMap=false; document.getElementById("btn-heat").classList.toggle("on",heatMap); const pb=document.getElementById("btn-pressure"); if(pb)pb.classList.toggle("on",pressureMap); },
    pressureMap(on){ pressureMap=on==null?!pressureMap:!!on; if(pressureMap) heatMap=false; const pb=document.getElementById("btn-pressure"); if(pb)pb.classList.toggle("on",pressureMap); document.getElementById("btn-heat").classList.toggle("on",heatMap); return pressureMap; },
    lights(on){ lighting=on==null?!lighting:!!on; syncLightUI(); return lighting; },
    lightLevel(v){ if(v!=null){ lightLevel=clamp(v>1?v/100:v,0,1); const el=document.getElementById("light"); if(el) el.value=Math.round(lightLevel*100); syncLightUI(); } return lightLevel; },
    snapshot, save:saveScene, load:loadScene, stopAttract,
    share:shareScene, shareCode:encodeScene,
    loadShared(code){ try{ applySceneBytes(unb64url(String(code).replace(/^.*#s=/,''))); stopAttract(); return true; }catch(e){ return false; } },
    info(){ let c=0; for(let i=0;i<N;i++) if(grid[i]!==EMPTY) c++; return {W,H,SCALE,cells:c,particles:pn,gravity:[GX,GY],wind:WIND,heatMap,box:[bx0,by0,bx1,by1],boxFull,boxArea:(bx1>=bx0&&by1>=by0)?(bx1-bx0+1)*(by1-by0+1):0}; },
    audio(){ return Snd.state(); },
    probe(x,y){ const i=(y|0)*W+(x|0); if(i<0||i>=N) return null; return {mat:M[grid[i]]?M[grid[i]].name:null, id:grid[i], charge:charge[i], life:life[i], temp:Math.round(temp[i]), pres:Math.round(pres[i])}; },
  };

  /* ============================ Init ============================= */
  function init(){
    resize(); setGravity(0,1);
    buildPalette();
    setupBooklet();
    setupAbout();
    setupChallenges();
    const {ring,syncBrush}=setupUI();
    setupPointer(ring);
    if(loadFromURL()) setTimeout(()=>toast("Loaded a shared scene"),400);
    window.addEventListener("resize",()=>{ resize(); setGravity(GX,GY); syncBrush(); });
    setTimeout(()=>{ const h=document.getElementById("hint"); if(h&&attract) h.classList.add("hide"); },9000);
    requestAnimationFrame(loop);
  }
  init();
})();
