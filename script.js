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
        SPARK=21, COAL=22, HEAT=23, COOL=24, CLONER=25, VOID=26,
        MERCURY=27, THERMITE=28, FUSE=29,
        GOLD=30, NITRO=31, SULFUR=32, SALTPETER=33,
        CRYSTAL=34, PHILOSOPHER=35, AQUA=36,
        OBSIDIAN=37, DIAMOND=38, HYDROGEN=39, OXYGEN=40, ASH=41,
        RUST=42, CLOUD=43, LIGHTNING=44, ANTIMATTER=45,
        SLIME=46, HONEY=47, ACIDCLOUD=48, BULB=49,
        BATTERY=50, WIRE=51, SWITCH=52, BUTTON=53,
        GATE_AND=54, GATE_OR=55, GATE_NOT=56, GATE_XOR=57;

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
    [BATTERY]:  { name:"Battery", type:STATIC, d:1e4, c1:[110,222,150], c2:[58,140,92], k:0.05, emit:0.22 },
    [WIRE]:     { name:"Wire",    type:STATIC, d:1e4, c1:[206,132,72], c2:[150,88,44], k:0.40, cond:1 },
    [SWITCH]:   { name:"Switch",  type:STATIC, d:1e4, c1:[120,200,120], c2:[80,150,80], k:0.05 },
    [BUTTON]:   { name:"Button",  type:STATIC, d:1e4, c1:[212,150,92], c2:[150,100,60], k:0.05 },
    [GATE_AND]: { name:"AND Gate",type:STATIC, d:1e4, c1:[120,160,255], c2:[64,96,200], k:0.05 },
    [GATE_OR]:  { name:"OR Gate", type:STATIC, d:1e4, c1:[110,214,255], c2:[58,140,200], k:0.05 },
    [GATE_NOT]: { name:"NOT Gate",type:STATIC, d:1e4, c1:[255,140,162], c2:[200,76,110], k:0.05 },
    [GATE_XOR]: { name:"XOR Gate",type:STATIC, d:1e4, c1:[198,150,255], c2:[136,86,210], k:0.05 },
  };

  // fast lookup arrays
  const MAXID = 58;
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
  WINDF[THERMITE]=0.06; WINDF[MERCURY]=0.04; WINDF[NITRO]=0.2;
  WINDF[SULFUR]=0.07; WINDF[SALTPETER]=0.07; WINDF[GOLD]=0.04;
  WINDF[AQUA]=0.22;
  WINDF[HYDROGEN]=1.3; WINDF[OXYGEN]=1; WINDF[ASH]=0.5; WINDF[RUST]=0.08;
  WINDF[SLIME]=0.04; WINDF[HONEY]=0.02;
  CHCOND[METAL]=1; CHCOND[WATER]=1; CHCOND[ACID]=1; CHCOND[GUNPOWDER]=1; CHCOND[FIREWORK]=1; CHCOND[MERCURY]=1; CHCOND[AQUA]=1;
  CHCOND[GOLD]=1; // gold is an excellent conductor
  CHCOND[WIRE]=1; // copper wire — the circuit-builder's conductor

  // palette — grouped for UI; flat list for shortcuts
  const MAT_GROUPS = [
    { label:"Natural", icon:"🌍", mats:[SAND,RAINBOW,WATER,ICE,SNOW,SALT,STONE,GLASS,OBSIDIAN,METAL,WOOD,PLANT,WALL] },
    { label:"Reactive", icon:"⚗️", mats:[OIL,ACID,AQUA,MERCURY,SLIME,HONEY,LAVA,FIRE,SMOKE,HYDROGEN,OXYGEN,NITRO] },
    { label:"Alchemy", icon:"✦", mats:[GOLD,DIAMOND,CRYSTAL,PHILOSOPHER,SULFUR,SALTPETER,COAL,ASH,RUST,GUNPOWDER,THERMITE,FUSE] },
    { label:"Circuits", icon:"⚡", mats:[BATTERY,WIRE,SWITCH,BUTTON,BULB,GATE_AND,GATE_OR,GATE_NOT,GATE_XOR,SPARK] },
    { label:"Tools", icon:"🛠", mats:[FIREWORK,LIGHTNING,CLOUD,ACIDCLOUD,HEAT,COOL,CLONER,VOID,ANTIMATTER,EMPTY] },
  ];
  const PALETTE = MAT_GROUPS.flatMap(g=>g.mats);

  const MAT_BLURB = {
    [SAND]:"Granular solid. Extreme heat fuses it into glass.",
    [RAINBOW]:"Animated colour sand — purely decorative flow.",
    [WATER]:"Liquid. Freezes to ice, boils to steam.",
    [ICE]:"Frozen water. Melts when warmed.",
    [SNOW]:"Light powder. Melts into water.",
    [SALT]:"Dissolves in water on contact.",
    [STONE]:"Solid rock. Melts to lava when white-hot.",
    [GLASS]:"Brittle solid from molten sand.",
    [OBSIDIAN]:"Volcanic glass — born when lava is quenched in water.",
    [METAL]:"Conductive solid. Melts to lava; amalgamates with mercury.",
    [WOOD]:"Flammable static block.",
    [PLANT]:"Grows into empty cells when touching water.",
    [WALL]:"Immovable barrier.",
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
    [OXYGEN]:"Feeds combustion — makes nearby fire roar hotter.",
    [NITRO]:"Unstable liquid — explodes on impact, heat, or spark.",
    [GOLD]:"Precious heavy powder from transmutation. Conducts electricity.",
    [DIAMOND]:"Hardest crystal — forged from coal under furious heat. Conducts heat superbly.",
    [ASH]:"Light grey remnant of spent fuel. Drifts on the wind.",
    [RUST]:"Flaky iron oxide — metal left too long in water.",
    [CRYSTAL]:"Prismatic solid that grows by consuming water.",
    [PHILOSOPHER]:"Catalyst — accelerates nearby transmutations.",
    [SULFUR]:"Yellow powder. Key gunpowder ingredient.",
    [SALTPETER]:"White oxidizer. Mix with sulfur + coal for gunpowder.",
    [COAL]:"Slow-burning fuel and gunpowder ingredient.",
    [GUNPOWDER]:"Explosive powder — heat, fire, or fuse detonates it.",
    [THERMITE]:"White-hot incendiary — melts metal and stone.",
    [FUSE]:"Slow cord — carries flame to explosives.",
    [FIREWORK]:"Rocket powder — launches sky bursts.",
    [SPARK]:"Electric brush — energizes conductors.",
    [LIGHTNING]:"Calls down a lightning bolt that scorches and electrifies.",
    [BULB]:"Light bulb — glows warm when a charged wire reaches it.",
    [BATTERY]:"Power source — feeds steady current into any wire it touches.",
    [WIRE]:"Copper wire — carries current and never melts. The circuit-builder's friend.",
    [SWITCH]:"Click to open or close it — closed wire conducts, open blocks the current.",
    [BUTTON]:"Click to fire a momentary pulse of current down the wire.",
    [GATE_AND]:"AND gate — outputs current only when 2+ neighbours are charged.",
    [GATE_OR]:"OR gate — outputs current when any neighbour is charged.",
    [GATE_NOT]:"NOT gate — outputs when NO neighbour is charged (an inverter / clock).",
    [GATE_XOR]:"XOR gate — outputs when exactly one neighbour is charged.",
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
    { id:"aqua_brew", cat:"Crafting", name:"Aqua regia", in:[ACID,SALTPETER], out:[AQUA], note:"Acid and an oxidizer brew a stronger royal acid.", hint:"An acid and a white oxidizer…" },
    { id:"aqua_dissolve", cat:"Transmutation", name:"Royal dissolution", in:[AQUA,GOLD], out:[MERCURY], note:"Royal water dissolves gold straight back into mercury.", hint:"Royal water meets treasure…" },
    { id:"philosopher_gold", cat:"Transmutation", name:"Catalysed gold", in:[PHILOSOPHER,MERCURY], out:[GOLD], note:"The stone accelerates mercury into gold.", hint:"A pink catalyst and quicksilver…" },
    { id:"philosopher_mercury", cat:"Transmutation", name:"Catalysed amalgam", in:[PHILOSOPHER,METAL], out:[MERCURY], note:"Steel becomes quicksilver far faster.", hint:"Catalyst beside metal…" },
    { id:"philosopher_sand", cat:"Transmutation", name:"Grit to gold", in:[PHILOSOPHER,SAND], out:[GOLD], note:"Rare — common sand transmuted to gold.", hint:"Catalyst and common grit…" },
    { id:"diamond", cat:"Transmutation", name:"Diamond synthesis", in:[COAL], out:[DIAMOND], note:"Carbon crystallises into diamond under furious heat (thermite or lava).", hint:"Coal, fiercely heated…" },
    { id:"smoke_acid", cat:"Crafting", name:"Sulfurous acid", in:[SMOKE,SULFUR], out:[ACID], note:"Gas and yellow powder brew a corrosive liquid.", hint:"Smoke meets yellow powder…" },
    { id:"electrolysis", cat:"Crafting", name:"Electrolysis", in:[WATER,SPARK], out:[HYDROGEN,OXYGEN], note:"A current splits water into hydrogen and oxygen gas.", hint:"Charge run through water…" },
    { id:"bulb_light", cat:"Circuits", name:"Light bulb", in:[SPARK,BULB], out:[BULB], note:"Spark a conductive wire beside a bulb and it glows warm.", hint:"Charge reaching glass and filament…" },
    { id:"battery_power", cat:"Circuits", name:"Powered circuit", in:[BATTERY,WIRE], out:[BULB], note:"A battery feeds steady current down wire — wire it to bulbs.", hint:"A source and a conductor…" },
    { id:"switch_toggle", cat:"Circuits", name:"Switch", in:[SWITCH], out:[WIRE], note:"Click a switch to open or close the circuit it sits in.", hint:"A gap you can open and close…" },
    { id:"button_press", cat:"Circuits", name:"Push button", in:[BUTTON], out:[SPARK], note:"Click a button to send a momentary pulse of current.", hint:"Press for a pulse…" },
    { id:"logic_gates", cat:"Circuits", name:"Logic gates", in:[GATE_AND,GATE_OR], out:[GATE_NOT], note:"AND, OR, NOT and XOR gates react to their charged neighbours.", hint:"Reason with current…" },
    { id:"acid_metal", cat:"Crafting", name:"Acid corrosion", in:[ACID,METAL], out:[HYDROGEN], note:"Acid eating metal releases flammable hydrogen.", hint:"Acid eats steel…" },
    { id:"charcoal", cat:"Crafting", name:"Charcoal", in:[WOOD], out:[COAL], note:"Wood heated slowly chars into charcoal instead of burning away.", hint:"Wood, heated gently…" },
    { id:"crystal_grow", cat:"Growth", name:"Crystal garden", in:[CRYSTAL,WATER], out:[CRYSTAL], note:"Crystals drink water to spread.", hint:"A prism beside water…" },
    { id:"plant_grow", cat:"Growth", name:"Verdant spread", in:[PLANT,WATER], out:[PLANT], note:"Plants drink water to grow into open space.", hint:"Life needs water…" },
    { id:"obsidian", cat:"Phase", name:"Obsidian quench", in:[LAVA,WATER], out:[OBSIDIAN], note:"Molten rock quenched in water freezes into volcanic glass.", hint:"Fire-rock meets water…" },
    { id:"rust", cat:"Phase", name:"Oxidation", in:[METAL,WATER], out:[RUST], note:"Iron left in water slowly oxidises to flaky rust.", hint:"Metal left wet too long…" },
    { id:"ash", cat:"Phase", name:"Ashes to ashes", in:[COAL], out:[ASH], note:"Spent fuel crumbles into light grey ash.", hint:"What remains when fuel dies…" },
    { id:"salt_melt", cat:"Phase", name:"Brine dissolve", in:[SALT,WATER], out:[WATER], note:"Salt vanishes into the water it touches.", hint:"Crystal and liquid…" },
    { id:"lava_stone", cat:"Phase", name:"Igneous cooling", in:[LAVA], out:[STONE], note:"Cooling molten rock solidifies to stone.", hint:"Molten rock cooling…" },
    { id:"sand_glass", cat:"Phase", name:"Vitric fusion", in:[SAND], out:[GLASS], note:"Fierce heat fuses sand grains into glass.", hint:"Sand under fierce heat…" },
    { id:"glass_shatter", cat:"Phase", name:"Shatter", in:[GLASS], out:[SAND], note:"A blast's pressure wave shatters glass back into sand.", hint:"Glass under sudden pressure…" },
    { id:"thermite_slag", cat:"Pyrotechnics", name:"Thermite slag", in:[THERMITE,METAL], out:[LAVA], note:"White-hot thermite melts straight through metal and stone.", hint:"Incendiary beside steel…" },
    { id:"hydrogen_boom", cat:"Pyrotechnics", name:"Knallgas", in:[HYDROGEN,FIRE], out:[FIRE], note:"Hydrogen ignites violently — far fiercer beside oxygen.", hint:"The lightest gas meets flame…" },
    { id:"oxy_fire", cat:"Pyrotechnics", name:"Oxygen feed", in:[OXYGEN,FIRE], out:[FIRE], note:"Oxygen makes flames burn hotter and longer.", hint:"Fire that can breathe…" },
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
  let revealAll = localStorage.getItem("aether-reveal-all")==="1";
  let discoveries = new Set(JSON.parse(localStorage.getItem("aether-discoveries")||"[]"));
  ALCHEMY_RECIPES.filter(r=>r.starter).forEach(r=>discoveries.add(r.id));
  // recipes the player has already viewed in the book — drives the "NEW" badge
  let seenRecipes = new Set(JSON.parse(localStorage.getItem("aether-seen")||"[]"));

  function isRecipeKnown(id){ return revealAll || RECIPE_BY_ID[id]?.starter || discoveries.has(id); }
  function discoverRecipe(id){
    if(!RECIPE_BY_ID[id] || discoveries.has(id)) return;
    discoveries.add(id);
    try{ localStorage.setItem("aether-discoveries", JSON.stringify([...discoveries])); }catch(_){}
    renderBooklet();
    toast("📖 Discovered: "+RECIPE_BY_ID[id].name);
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
    [BATTERY]:1,[WIRE]:1,[SWITCH]:1,[BUTTON]:1,
    [GATE_AND]:1,[GATE_OR]:1,[GATE_NOT]:1,[GATE_XOR]:1,
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
    grid=new Uint8Array(N); shade=new Uint8Array(N); life=new Int16Array(N);
    vel=new Float32Array(N); charge=new Int8Array(N); moved=new Uint8Array(N);
    temp=new Float32Array(N).fill(AMBIENT); tempB=new Float32Array(N);
    pres=new Float32Array(N); presB=new Float32Array(N);
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
      case HYDROGEN: return 150+(rnd()*120|0);
      case OXYGEN: return 220+(rnd()*180|0);
      case SWITCH: return 1;  // switches start closed (on)
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
        convert(i,r.to);
        if(m===LAVA&&r.to===STONE) discoverRecipe("lava_stone");
        if(m===SAND&&r.to===GLASS) discoverRecipe("sand_glass");
        if(m===WOOD&&r.to===COAL) discoverRecipe("charcoal");
        return true;
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
    shakeScreen(power*1.1);
  }

  /* ============================ Screen shake ====================== */
  let shakeAmt=0, stageEl=null;
  function shakeScreen(a){ if(a>shakeAmt) shakeAmt=a>16?16:a; }
  function applyShake(){
    if(!stageEl) stageEl=document.getElementById("stage");
    if(!stageEl) return;
    if(shakeAmt>0.15){
      const dx=(rnd()-0.5)*shakeAmt, dy=(rnd()-0.5)*shakeAmt;
      stageEl.style.transform="translate("+dx.toFixed(2)+"px,"+dy.toFixed(2)+"px)";
      shakeAmt*=0.86;
    } else if(shakeAmt!==0){ stageEl.style.transform=""; shakeAmt=0; }
  }

  /* ============================ Per-material ====================== */
  function upFire(x,y,i){
    applySrc(i,650,0.5); heatN(i,18);
    if(--life[i]<=0){ if(rnd()<0.5) convert(i,SMOKE); else grid[i]=EMPTY; return; }
    if(applyPressure(x,y,i,FIRE)) return;
    moveGas(x,y,i,FIRE); applyWind(x,i,FIRE);
  }
  function upLava(x,y,i){
    applySrc(i,1100,0.55); heatN(i,22);
    // quench — lava meeting water flashes to obsidian and boils off steam
    let quenched=false;
    forN8(x,i,(ni,nm)=>{
      if(nm===WATER && rnd()<0.16){ convert(ni,STEAM); convert(i,OBSIDIAN); temp[i]=340; quenched=true; discoverRecipe("obsidian"); return true; }
      return false;
    });
    if(quenched) return;
    if(rnd()<0.6) moveLiquid(x,y,i,LAVA,1);
  }
  function upWater(x,y,i){
    forN8(x,i,(ni,nm)=>{
      if(nm===SALT && rnd()<0.02){ grid[ni]=EMPTY; }
      else if(nm===METAL && temp[ni]<120 && rnd()<0.0006){ convert(ni,RUST); discoverRecipe("rust"); }
      return false;
    });
    moveLiquid(x,y,i,WATER,M[WATER].disp); applyWind(x,i,WATER);
  }
  function upSteam(x,y,i){
    if(--life[i]<=0){ convert(i, rnd()<0.4?WATER:EMPTY); return; }
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
      if(nm!==EMPTY&&nm!==ACID&&nm!==WALL&&nm!==GLASS&&nm!==GOLD&&nm!==AQUA&&TYPE[nm]!==GAS && rnd()<0.05){
        grid[ni]=EMPTY;
        if(rnd()<0.4){ grid[i]=EMPTY; gone=true; return true; }
      }
      return false;
    });
    if(gone) return;
    moveLiquid(x,y,i,ACID,M[ACID].disp); applyWind(x,i,ACID);
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
    forCard(i,(ni)=>{ if(grid[ni]===WATER && rnd()<0.012){ grid[i]=EMPTY; discoverRecipe("salt_melt"); d=true; } });
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
      convert(tgt,PLANT); temp[tgt]=temp[i]; grid[water]=EMPTY; discoverRecipe("plant_grow");
    }
  }
  function upGunpowder(x,y,i){
    if(temp[i]>=200){ explode(x,y,6); grid[i]=EMPTY; discoverRecipe("gunpowder_boom"); return; }
    let lit=false;
    forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA){ lit=true; return true;} return false; });
    if(lit){ explode(x,y,6); grid[i]=EMPTY; discoverRecipe("gunpowder_boom"); return; }
    moveFalling(x,y,i,GUNPOWDER);
  }
  function upCoal(x,y,i){
    if(tryCraftGunpowder(x,i)) return;
    // furious heat crystallises carbon into diamond
    if(temp[i]>1400 && rnd()<0.004){ convert(i,DIAMOND); discoverRecipe("diamond"); return; }
    if(temp[i]>320){
      applySrc(i,640,0.18); heatN(i,12);
      if(rnd()<0.05){ const e=emptyNeighbor(x,i); if(e>=0) convert(e,FIRE); }
      if(--life[i]<=0){
        const r=rnd();
        convert(i, r<0.4?ASH:(r<0.7?SMOKE:EMPTY));
        if(grid[i]===ASH) discoverRecipe("ash");
        return;
      }
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
    if(src>0 && rnd()<0.5){ const e=emptyNeighbor(x,i); if(e>=0){ spawn(e,src); discoverRecipe("cloner_copy"); } }
  }
  function upVoid(x,y,i){
    forN8(x,i,(ni,nm)=>{
      if(nm!==EMPTY&&nm!==VOID&&nm!==WALL&&nm!==CLONER){ grid[ni]=EMPTY; charge[ni]=0; vel[ni]=0; discoverRecipe("void_hunger"); }
      return false;
    });
  }
  function upMercury(x,y,i){
    let phil=false;
    forN8(x,i,(ni,nm)=>{ if(nm===PHILOSOPHER) phil=true; return false; });
    // amalgamation — quicksilver slowly transmutes touching metal into more mercury
    forN8(x,i,(ni,nm)=>{
      if(nm===ACID && rnd()<(phil?0.035:0.01)){ convert(i,GOLD); discoverRecipe("acid_gold"); return true; }
      if(nm===METAL && rnd()<(phil?0.012:0.0035)){ convert(ni,MERCURY); temp[ni]=temp[i]; discoverRecipe("mercury_amalgam"); }
      return false;
    });
    moveLiquid(x,y,i,MERCURY,M[MERCURY].disp); applyWind(x,i,MERCURY);
  }
  function upNitro(x,y,i){
    if(charge[i]>0 || temp[i]>85){
      explode(x,y,8); grid[i]=EMPTY; discoverRecipe("nitro_blast"); return;
    }
    let boom=false;
    forN8(x,i,(ni,nm)=>{ if(nm===FIRE||nm===LAVA||(charge[ni]>0&&CHCOND[nm])){ boom=true; return true; } return false; });
    if(boom){ explode(x,y,8); grid[i]=EMPTY; discoverRecipe("nitro_blast"); return; }
    const v=vel[i];
    const hit=!moveLiquid(x,y,i,NITRO,M[NITRO].disp);
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
    forN8(x,i,(ni,nm)=>{ if(nm===WATER && rnd()<0.04){ grid[ni]=EMPTY; } return false; });
    if(rnd()<0.09){ const e=emptyNeighbor(x,i); if(e>=0){ convert(e,CRYSTAL); discoverRecipe("crystal_grow"); } }
  }
  function upPhilosopher(x,y,i){
    forN8(x,i,(ni,nm)=>{
      if(nm===MERCURY && rnd()<0.025){ convert(ni,GOLD); temp[ni]=temp[i]+40; discoverRecipe("philosopher_gold"); }
      else if(nm===METAL && rnd()<0.01){ convert(ni,MERCURY); temp[ni]=temp[i]; discoverRecipe("philosopher_mercury"); }
      else if(nm===SAND && rnd()<0.004){ convert(ni,GOLD); discoverRecipe("philosopher_sand"); }
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
    moveLiquid(x,y,i,AQUA,M[AQUA].disp); applyWind(x,i,AQUA);
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
    // shed rain into open air below
    if(rnd()<0.010){
      for(let dy=1;dy<=3;dy++){ const ny=y+dy; if(ny>=H) break; const bi=ny*W+x;
        if(grid[bi]===EMPTY){ spawn(bi,rainMat); discoverRecipe(rainMat===ACID?"acid_rain":"rain"); break; } }
    }
    // a brooding storm occasionally hurls a bolt
    if(rnd()<0.0010) strikeLightning(x,y);
    // smoke pollution turns a storm cloud sour — it becomes an acid cloud
    if(m===CLOUD){
      let smog=false;
      forN8(x,i,(ni,nm)=>{ if(nm===SMOKE||nm===ACIDCLOUD){ smog=true; return true; } return false; });
      if(smog && rnd()<0.02){ convert(i,ACIDCLOUD); discoverRecipe("acid_rain"); return; }
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
  /* ---- electricity components ---- */
  // push a charge into idle conductors (and closed switches) around a cell
  function energize(i,val){
    let fed=false;
    forCard(i,(ni)=>{
      if(charge[ni]===0 && (CHCOND[grid[ni]] || (grid[ni]===SWITCH && life[ni]>0))){ charge[ni]=val; fed=true; }
    });
    return fed;
  }
  function chargedCount(i){ let c=0; forCard(i,(ni)=>{ if(charge[ni]>0) c++; }); return c; }
  function upBattery(i){ if(energize(i,6)) discoverRecipe("battery_power"); }     // steady source
  function upButton(i){ if(life[i]>0){ energize(i,6); life[i]--; } }              // momentary pulse
  function upGate(i,kind){                                                        // 0=AND 1=OR 2=NOT 3=XOR
    const c=chargedCount(i);
    const out = kind===0 ? c>=2 : kind===1 ? c>=1 : kind===2 ? c===0 : c===1;
    if(out){ energize(i,6); life[i]=4; discoverRecipe("logic_gates"); }
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
  function strikeLightning(cx,cy){
    let x=clamp(cx|0,0,W-1), y=clamp(cy|0,0,H-1), steps=0;
    while(y<H-1 && steps<H){
      const i=y*W+x;
      temp[i]=Math.max(temp[i],420);
      if(CHCOND[grid[i]]) charge[i]=6;
      if(FLAM[grid[i]]) temp[i]+=180;
      addP(x+0.5,y+0.5,(rnd()-0.5)*0.8,0.6+rnd()*1.4,8+rnd()*8,200,228,255,KSPARK);
      if(rnd()<0.45) x += rnd()<0.5?-1:1;
      if(x<0)x=0; else if(x>=W)x=W-1;
      y++; steps++;
      const gi=y*W+x, gm=grid[gi];
      if(gm!==EMPTY && TYPE[gm]!==GAS){
        temp[gi]=Math.max(temp[gi],640);
        if(FLAM[gm]) temp[gi]+=320;
        if(CHCOND[gm]) charge[gi]=6;
        for(let a=0;a<14;a++){ const ang=rnd()*6.2832, sp=0.6+rnd()*2.4;
          addP(x+0.5,y+0.5,Math.cos(ang)*sp,Math.sin(ang)*sp,12+rnd()*16,210,232,255,KSPARK); }
        break;
      }
    }
    shakeScreen(6);
    discoverRecipe("lightning");
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
      forCard(i,(ni)=>{ if(charge[ni]===0 && (CHCOND[grid[ni]] || (grid[ni]===SWITCH && life[ni]>0))) charge[ni]=4; });
      const nc=c-1;
      charge[i]= nc>0 ? nc : -3;
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
          if(cell===SLIME){ PVY[k]=-PVY[k]*0.6; PVX[k]*=0.55; PX[k]+=PVX[k]; PY[k]+=PVY[k]; }
          else {
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

  /* ============================ Pressure ========================== */
  // A coarse pressure field: gases generate pressure, open space bleeds it,
  // and it diffuses into gradients so confined gas jets out through any gap.
  function pressureStep(){
    for(let y=0;y<H;y++){
      const row=y*W;
      for(let x=0;x<W;x++){
        const i=row+x, m=grid[i];
        let sum=0,cnt=0;
        if(y>0){sum+=pres[i-W];cnt++;}
        if(y<H-1){sum+=pres[i+W];cnt++;}
        if(x>0){sum+=pres[i-1];cnt++;}
        if(x<W-1){sum+=pres[i+1];cnt++;}
        let np = pres[i] + (sum/cnt - pres[i])*0.28;
        if(m===EMPTY) np*=0.84;            // open space relieves pressure
        else if(TYPE[m]===GAS) np+=0.9;     // gases push outward
        else np*=0.97;                      // solids/liquids hold, then decay
        presB[i] = np<-40?-40: np>600?600: np;
        // a strong pressure wave (a blast, or an over-pressured vessel) shatters glass back to sand
        if(m===GLASS && np>90 && rnd()<0.06){ grid[i]=SAND; shade[i]=r255(); discoverRecipe("glass_shatter"); }
      }
    }
    const tmp=pres; pres=presB; presB=tmp;
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
          case MERCURY: upMercury(x,y,i); break;
          case THERMITE: upThermite(x,y,i); break;
          case FUSE: upFuse(x,y,i); break;
          case GOLD: moveFalling(x,y,i,GOLD); break;
          case NITRO: upNitro(x,y,i); break;
          case SULFUR: upSulfur(x,y,i); break;
          case SALTPETER: upSaltpeter(x,y,i); break;
          case CRYSTAL: upCrystal(x,y,i); break;
          case PHILOSOPHER: upPhilosopher(x,y,i); break;
          case AQUA: upAqua(x,y,i); break;
          case HYDROGEN: upHydrogen(x,y,i); break;
          case OXYGEN: upOxygen(x,y,i); break;
          case ASH: moveFalling(x,y,i,ASH); applyWind(x,i,ASH); break;
          case RUST: moveFalling(x,y,i,RUST); applyWind(x,i,RUST); break;
          case CLOUD: cloudBehavior(x,y,i,CLOUD,WATER); break;
          case ACIDCLOUD: cloudBehavior(x,y,i,ACIDCLOUD,ACID); break;
          case ANTIMATTER: upAntimatter(x,y,i); break;
          case SLIME: upSlime(x,y,i); break;
          case HONEY: upHoney(x,y,i); break;
          case BULB: upBulb(x,y,i); break;
          case BATTERY: upBattery(i); break;
          case BUTTON: upButton(i); break;
          case GATE_AND: upGate(i,0); break;
          case GATE_OR: upGate(i,1); break;
          case GATE_NOT: upGate(i,2); break;
          case GATE_XOR: upGate(i,3); break;
          // WOOD, GLASS, STONE, METAL, OBSIDIAN, DIAMOND, WIRE, SWITCH: thermal/conduction only
        }
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
  const PRES_STOPS=[[-30,[30,60,200]],[0,[10,14,26]],[40,[60,180,130]],
    [120,[255,205,60]],[300,[255,90,40]],[600,[255,250,235]]];
  function presRGB(p){
    if(p<=PRES_STOPS[0][0]) return PRES_STOPS[0][1];
    for(let k=1;k<PRES_STOPS.length;k++){
      if(p<=PRES_STOPS[k][0]){
        const a=PRES_STOPS[k-1],b=PRES_STOPS[k],f=(p-a[0])/(b[0]-a[0]);
        return [lerp(a[1][0],b[1][0],f),lerp(a[1][1],b[1][1],f),lerp(a[1][2],b[1][2],f)];
      }
    }
    return PRES_STOPS[PRES_STOPS.length-1][1];
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
    const GAIN=0.62*lightLevel;
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

  let heatMap=false, pressureMap=false;
  function scaleGlow(ge,lf){
    if(!ge||lf>=0.999) return ge;
    if(lf<=0) return 0;
    return (((ge>>>24)*lf|0)<<24)|(ge&0xffffff);
  }
  function render(now){
    const t=now*0.012;
    const lf=lightFX();
    const lit = lf>0.01 && !heatMap && !pressureMap;
    if(lit){ lightR.fill(0); lightG.fill(0); lightB.fill(0); }
    for(let i=0;i<N;i++){
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
      } else if(m===SWITCH){
        if(life[i]>0){ r=92; g=226; b=122; } else { r=132; g=72; b=74; }   // closed=green, open=dim red
      } else if(m===BUTTON){
        if(life[i]>0){ r=255; g=206; b=132; }
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
        if(EMIT[m]){ const gw=EMIT[m]; ge=(255<<24)|(((b*gw)|0)<<16)|(((g*gw)|0)<<8)|((r*gw)|0); }
        else if(temp[i]>560){ const gi=clamp((temp[i]-560)/640,0,1); ge=((gi*235|0)<<24)|(b<<16)|(g<<8)|r; }
        else if(charge[i]>0){ const u=(clamp(charge[i]/8,0,1)*255)|0; ge=(u<<24)|(255<<16)|(235<<8)|120; }
        else if(m===ACID){ ge=(120<<24)|(40<<16)|(220<<8)|110; }
        else if(m===AQUA){ ge=(130<<24)|(180<<16)|(120<<8)|255; }
        else if(m===GOLD){ ge=(70<<24)|(50<<16)|(170<<8)|255; }
        else if(m===CRYSTAL){ ge=(100<<24)|(b<<16)|(g<<8)|r; }
        else if(m===PHILOSOPHER){ ge=(150<<24)|(120<<16)|(200<<8)|255; }
        else if(m===BULB && life[i]>0){ const u=clamp(life[i]/24,0,1); ge=((u*230|0)<<24)|((b|0)<<16)|((g|0)<<8)|(r|0); }
        else if(m===BUTTON && life[i]>0){ ge=(200<<24)|(132<<16)|(206<<8)|255; }
        else if(m>=GATE_AND && m<=GATE_XOR && life[i]>0){ ge=(190<<24)|((b|0)<<16)|((g|0)<<8)|(r|0); }
        else if(m===NITRO && vel[i]>4){ const u=clamp((vel[i]-4)/5,0,1); ge=((u*170|0)<<24)|(50<<16)|(220<<8)|160; }
        ge=scaleGlow(ge,lf);
      }
      glow32[i]=ge;
      if(lit && ge){
        const a=(ge>>>24)*0.00392*lightLevel, li=((((i/W)|0)/LS|0)*LW)+(((i%W)/LS)|0);
        lightR[li]+=(ge&255)*a; lightG[li]+=((ge>>8)&255)*a; lightB[li]+=((ge>>16)&255)*a;
      }
    }
    if(lit){
      for(let k=0;k<pn;k++){
        const lx=(PX[k]/LS)|0, ly=(PY[k]/LS)|0;
        if(lx<0||lx>=LW||ly<0||ly>=LH) continue;
        const li=ly*LW+lx, a=clamp(PL[k]/PM[k],0,1)*0.6*lightLevel;
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
    const lf=lightFX();
    if(lf>0) gctx.save(), gctx.globalCompositeOperation="lighter";
    for(let k=0;k<pn;k++){
      const a=clamp(PL[k]/PM[k],0,1), r=PR[k],g=PG[k],b=PB[k];
      const sz=PK[k]===KROCKET?1.7:1.2;
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
  let fireworkCooldown=0, lightningCooldown=0;

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
    if(mat===LIGHTNING){ if(lightningCooldown<=0){ strikeLightning(cx,cy); lightningCooldown=10; } return; }
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

  // flood the connected blob of one material, applying fn to each cell
  function floodComponent(start,mat,fn){
    const stack=[start], seen=new Set();
    while(stack.length){
      const c=stack.pop(); if(seen.has(c)) continue; seen.add(c);
      if(grid[c]!==mat) continue;
      fn(c);
      const x=c%W;
      if(c-W>=0)stack.push(c-W); if(c+W<N)stack.push(c+W);
      if(x>0)stack.push(c-1); if(x<W-1)stack.push(c+1);
    }
  }
  // clicking a switch toggles the whole switch; clicking a button pulses it
  function interactAt(gx,gy){
    if(gx<0||gx>=W||gy<0||gy>=H) return false;
    const i=gy*W+gx, m=grid[i];
    if(m===SWITCH){
      const on=life[i]>0?0:1;
      floodComponent(i,SWITCH,(c)=>{ life[c]=on; });
      toast(on?"Switch closed":"Switch open"); discoverRecipe("switch_toggle"); return true;
    }
    if(m===BUTTON){ floodComponent(i,BUTTON,(c)=>{ life[c]=10; }); discoverRecipe("button_press"); return true; }
    return false;
  }

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
    if(lightningCooldown>0) lightningCooldown--;
    let dt=now-lastT; lastT=now; if(dt>250) dt=250; acc+=dt;
    let runs=0;
    while(acc>=SIMDT && runs<4){
      if(!paused||stepOnce){ runAttract(); step(); stepOnce=false; }
      acc-=SIMDT; runs++;
      if(paused) break;
    }
    if(painting && lastPx!=null) paintDisc(lastPx,lastPy,eraseBtn?EMPTY:currentMat);
    render(now);
    applyShake();
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
  function setMatDesc(m){
    const box=document.getElementById("mat-desc"); if(!box) return;
    box.querySelector(".mat-desc-name").textContent=M[m]?M[m].name:"";
    box.querySelector(".mat-desc-text").textContent=MAT_BLURB[m]||"";
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
    el.addEventListener("click",()=>{ currentMat=m; setMatDesc(m); syncPaletteActive(); });
    return el;
  }
  function renderMatGrid(){
    const wrap=document.getElementById("material-grid-wrap"); if(!wrap) return;
    wrap.innerHTML="";
    const mats=matsForView();
    if(mats.length===0){ wrap.innerHTML='<div class="mat-empty">No materials match “'+matSearch+'”.</div>'; return; }
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
  function setupUI(){
    fpsEl=document.getElementById("fps"); countEl=document.getElementById("count");
    const playBtn=document.getElementById("btn-play");
    playBtn.addEventListener("click",()=>{ paused=!paused; playBtn.classList.toggle("paused",paused); });
    document.getElementById("btn-step").addEventListener("click",()=>{ stepOnce=true; });
    document.getElementById("btn-clear").addEventListener("click",()=>{ grid.fill(EMPTY); life.fill(0); charge.fill(0); temp.fill(AMBIENT); vel.fill(0); pres.fill(0); pn=0; });

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
    const lightEl=document.getElementById("light"), lightOut=document.getElementById("light-readout");
    lightEl.addEventListener("input",()=>{ lightLevel=(+lightEl.value)/100; syncLightUI(); });
    syncLightUI();
    document.getElementById("btn-snap").addEventListener("click",snapshot);
    document.getElementById("btn-save").addEventListener("click",saveScene);
    document.getElementById("btn-load").addEventListener("click",loadScene);

    window.addEventListener("keydown",(e)=>{
      const tag=e.target&&e.target.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"){ if(e.code==="Escape") e.target.blur(); return; }
      if(e.code==="Space"){ e.preventDefault(); playBtn.click(); }
      else if(e.code==="KeyC") document.getElementById("btn-clear").click();
      else if(e.code==="KeyH") heatBtn.click();
      else if(e.code==="KeyL"){ lighting=!lighting; syncLightUI(); toast(lighting?"Lighting on":"Lighting off"); }
      else if(e.code==="KeyB"){ const b=document.getElementById("booklet"); if(b&&b.classList.contains("hidden")) openBooklet(); else closeBooklet(); }
      else if(e.code==="Escape"){ closeBooklet(); closeAbout(); }
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
      stopAttract(); eraseBtn=(e.button===2||e.shiftKey);
      const [gx,gy]=toGrid(e.clientX,e.clientY);
      if(!eraseBtn && interactAt(gx,gy)) return;   // clicked a switch/button — interact, don't paint
      painting=true; lastPx=gx; lastPy=gy;
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
                copper:WIRE, cable:WIRE, cell:BATTERY, power:BATTERY, toggle:SWITCH, push:BUTTON,
                and:GATE_AND, or:GATE_OR, not:GATE_NOT, xor:GATE_XOR, inverter:GATE_NOT,
                "and gate":GATE_AND, "or gate":GATE_OR, "not gate":GATE_NOT, "xor gate":GATE_XOR };
  function resolveMat(m){ if(typeof m!=="string") return m; const k=m.toLowerCase(); return NAME2ID[k]??ALIAS[k]??SAND; }
  function syncPaletteActive(){
    document.querySelectorAll(".mat").forEach(n=>n.classList.toggle("active", +n.dataset.mat===currentMat));
  }
  window.AetherSand={
    EMPTY,WALL,SAND,RAINBOW,WATER,ICE,SNOW,SALT,OIL,ACID,LAVA,FIRE,SMOKE,STEAM,
    WOOD,PLANT,GLASS,STONE,METAL,GUNPOWDER,FIREWORK,SPARK,COAL,HEAT,COOL,CLONER,VOID,
    MERCURY,THERMITE,FUSE,GOLD,NITRO,SULFUR,SALTPETER,CRYSTAL,PHILOSOPHER,AQUA,
    OBSIDIAN,DIAMOND,HYDROGEN,OXYGEN,ASH,RUST,CLOUD,LIGHTNING,ANTIMATTER,
    SLIME,HONEY,ACIDCLOUD,BULB,BATTERY,WIRE,SWITCH,BUTTON,
    GATE_AND,GATE_OR,GATE_NOT,GATE_XOR,
    setMaterial(m){ currentMat=resolveMat(m); syncPaletteActive(); return M[currentMat]?.name; },
    setBrush(r){ const b=document.getElementById("brush"); b.value=r; b.dispatchEvent(new Event("input")); },
    paint(x,y,m,r){ if(m!=null) currentMat=resolveMat(m); if(r) brush=r; stopAttract(); paintDisc(x|0,y|0,currentMat); },
    line(x0,y0,x1,y1,m,r){ if(m!=null) currentMat=resolveMat(m); if(r) brush=r; stopAttract(); paintLine(x0|0,y0|0,x1|0,y1|0,currentMat); },
    erase(x,y,r){ if(r) brush=r; paintDisc(x|0,y|0,EMPTY); },
    clear(){ grid.fill(EMPTY); life.fill(0); charge.fill(0); temp.fill(AMBIENT); vel.fill(0); pres.fill(0); pn=0; },
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
    info(){ let c=0; for(let i=0;i<N;i++) if(grid[i]!==EMPTY) c++; return {W,H,SCALE,cells:c,particles:pn,gravity:[GX,GY],wind:WIND,heatMap}; },
    probe(x,y){ const i=(y|0)*W+(x|0); if(i<0||i>=N) return null; return {mat:M[grid[i]]?M[grid[i]].name:null, id:grid[i], charge:charge[i], life:life[i], temp:Math.round(temp[i]), pres:Math.round(pres[i])}; },
  };

  /* ============================ Init ============================= */
  function init(){
    resize(); setGravity(0,1);
    buildPalette();
    setupBooklet();
    setupAbout();
    const {ring,syncBrush}=setupUI();
    setupPointer(ring);
    window.addEventListener("resize",()=>{ resize(); setGravity(GX,GY); syncBrush(); });
    setTimeout(()=>{ const h=document.getElementById("hint"); if(h&&attract) h.classList.add("hide"); },9000);
    requestAnimationFrame(loop);
  }
  init();
})();
