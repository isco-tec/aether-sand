# 🏜️ Aether Sand

<p align="center">
  <a href="https://isco-tec.github.io/aether-sand/">
    <img src="./assets/hero.png" alt="Aether Sand — a glowing lava mound, fireworks, falling snow and water at night" width="100%" />
  </a>
</p>

<p align="center">
  <b>A living particle playground where sand, fire, storms and alchemy obey a handful of simple rules — and surprise you anyway.</b>
</p>

<p align="center">
  <a href="https://isco-tec.github.io/aether-sand/"><b>▶&nbsp; Play the live demo</b></a>
  &nbsp;·&nbsp;
  <a href="https://labs.iscovici.com">Made in Iscovici Labs</a>
</p>

Aether Sand is a physics-rich **falling-sand simulator** written from scratch in pure vanilla JavaScript. No libraries. No framework. No build step. Underneath the glow is a cellular-automata engine with density-based fluid dynamics, a real per-cell **temperature field**, a **pressure** system, **electricity**, emergent chemistry, and a ballistic particle layer for fireworks and explosions — drop a pixel of sand and watch a world react.

> Three files — `index.html` / `style.css` / `script.js` — that paste straight into CodePen's HTML / CSS / JS panels, or deploy as a static site (it ships on GitHub Pages).

## ✨ Features

- **Cellular-automata core.** Typed-array grids with density-based displacement — sand sinks through water, water floats on oil, gases rise — and a bias-free alternating scan order so nothing drifts sideways.
- **Real thermodynamics.** A per-cell heat field with diffusion drives phase changes that *emerge* rather than scripting them: water ⇄ ice ⇄ steam, sand → glass, stone ⇄ lava, metal melting, spontaneous ignition.
- **Blackbody incandescence.** Anything hot enough self-glows — heated metal and stone smoulder red → orange → yellow → white as the temperature climbs.
- **Pressure & shockwaves.** Gases build real pressure and jet through gaps; explosions emit a shockwave that physically shoves loose matter outward and can shatter glass back into sand. Toggle the pressure-map overlay with `P`.
- **Electricity & circuits.** A full kit: **batteries** push steady current down copper **wire**, **switches** you click to open or close, momentary **buttons**, **AND / OR / NOT / XOR logic gates**, and **bulbs** that glow when a live wire reaches them. Charge also runs through metal, gold, water, acid and mercury, and drives **electrolysis** that splits water into hydrogen and oxygen.
- **Weather.** Paint **storm clouds** that drift on the wind, shed rain, and hurl **lightning**; pollute a cloud with smoke and it sours into an **acid-rain cloud**. A dedicated **Lightning** tool calls strikes on demand.
- **50+ materials & tools** across five families — **Natural · Reactive · Alchemy · Circuits · Tools** — including sand, rainbow sand, water, ice, snow, salt, stone, glass, obsidian, metal, rust, wood, plant, wall; oil, acid, aqua regia, mercury, slime, honey, lava, fire, smoke, hydrogen, oxygen, nitro; gold, diamond, crystal, philosopher's stone, sulfur, saltpeter, coal, ash, gunpowder, thermite, fuse; battery, wire, switch, button, AND/OR/NOT/XOR gates, bulb, spark; firework, lightning, storm cloud, acid cloud, heat torch, freeze, **Cloner**, **Void**, **Antimatter** and eraser.
- **Real chemistry & alchemy.** Lava + water → obsidian (+ steam); coal → diamond under furious heat; metal + water → rust; wood chars to charcoal; acid + metal releases hydrogen; spent fuel → ash. Then the alchemy: acid + mercury → gold; **aqua regia** (acid + saltpeter) dissolves gold back to mercury; a **philosopher's stone** catalyses transmutation nearby; crystal grows on water; smoke + sulfur → acid; sulfur + saltpeter + coal → gunpowder — with thermite, fuse and nitro for the pyrotechnics, and antimatter that annihilates matter in a burst of energy.
- **Dynamic lighting.** Every emitter — fire, lava, red-hot metal, sparks, fireworks, bulbs — casts coloured light onto the matter around it, layered over emissive bloom, so a stone wall beside a lava pool actually warms to orange. Tune it with the Light slider (defaults to ~54%) or toggle with `L`.
- **Ballistic particles & screen-shake.** A floating-point particle layer drives fireworks, embers and explosions with smooth motion on top of the grid — and a big blast punches the whole screen.
- **Gravity & wind.** Point gravity in any of 8 directions, flip to zero-G, and blow particles around with adjustable wind, all from a compact compass.
- **Snapshot & save / load.** Export a PNG of your creation, or save and restore whole scenes from local storage.
- **A genuinely good UI.** A **tabbed, searchable material palette** (Natural / Reactive / Alchemy / Tools / All) with full-width readable buttons and a live description of whatever you've selected; live FPS + particle counters; heat-map and pressure-map overlays; and an **Alchemy Book** that reveals recipes as you discover them through play — ingredient swatch-chips, a discovery progress bar, **NEW** badges, and a sandbox "reveal all" toggle. Plus an elegant About panel, full keyboard shortcuts, mouse + touch, and responsive resize that preserves your artwork.

## 🖼️ Gallery

| World-class interface | Live heat-map overlay |
| --- | --- |
| ![Glassmorphism UI with material palette, force controls and live counters](./assets/interface.png) | ![Temperature field showing white-hot lava, burning fire and frozen ice](./assets/heatmap.png) |

## 🎮 Controls

| Action | Control |
| --- | --- |
| Draw | Click + drag |
| Erase | Right-click / `Shift` + drag |
| Pause / play | `Space` |
| Step one frame | `→` |
| Clear | `C` |
| Heat-map overlay | `H` |
| Pressure-map overlay | `P` |
| Toggle dynamic lighting | `L` |
| Open alchemy book | `B` |
| About panel | Click the title |
| Brush size | `[` / `]` or the slider |
| Pick material | `1`–`9` or the palette |

## 🚀 Run it

Play it instantly at **[isco-tec.github.io/aether-sand](https://isco-tec.github.io/aether-sand/)**.

It's fully static, so you can also just open `index.html` — or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or paste each file into the matching panel on [CodePen](https://codepen.io). That's the whole setup.

## 🧰 Scripting API

Aether Sand exposes a small `window.AetherSand` API so you can script, automate, or embed it. All coordinates are in grid cells:

```js
const A = window.AetherSand;

A.setMaterial("lava");          // select by name (or A.LAVA)
A.paint(x, y, "water", 6);      // paint a disc (material + brush optional)
A.paint(x, y, "heat", 8);       // torch — paint temperature (or "freeze")
A.line(x0, y0, x1, y1, "metal", 2);

A.paint(x, y, "cloner");        // duplicates whatever it touches ("void" devours)
A.paint(x, y, "mercury", 5);    // dense shimmering liquid that amalgamates metal
A.paint(x, y, "philosopher");   // catalyst — accelerates nearby transmutations
A.paint(x, y, "aqua", 4);       // aqua regia — dissolves gold back into mercury
A.paint(x, y, "crystal", 3);    // grows by consuming adjacent water
A.paint(x, y, "sulfur", 3);     // sulfur + saltpeter + coal → gunpowder
A.paint(x, y, "thermite", 4);   // ignite it to burn through metal
A.line(x0, y0, x1, y1, "fuse"); // slow-burning cord to a gunpowder cache
A.paint(x, y, "bulb", 1);       // lights up when a charged wire reaches it
A.paint(x, y, "hydrogen", 5);   // splits from water by electrolysis; detonates near flame
A.paint(x, y, "cloud", 5);      // storm cloud — drifts on the wind, rains, and strikes
A.paint(x, y, "antimatter");    // annihilates any matter it touches (contain with walls)

A.firework(x, y);               // launch a firework rocket
A.lightning(x, y);              // call down a lightning bolt
A.gravity(0, -1);               // flip gravity up (8-way, plus 0,0 for zero-G)
A.wind(0.8);                    // -1..1

A.heatMap(true);                // toggle the temperature overlay
A.lights(false);                // toggle dynamic lighting
A.lightLevel(0.4);              // dim bloom + coloured light (0..1 or 0..100)

A.clear(); A.save(); A.load(); A.snapshot();
A.info();                       // { cells, particles, gravity, wind, ... }
```

## 🧪 How it works

The world is a grid of cells. Each frame, every cell runs a few simple local rules — fall, flow, rise, react — and complex, lifelike behaviour **emerges** from those rules plus a shared temperature field and pressure field. Nothing is choreographed; it's just neighbours talking to neighbours.

The renderer writes the grid into an `ImageData` buffer scaled up with crisp pixels. Emissive materials also paint into a separate glow canvas that's blurred and screen-blended for bloom, and those same emitters splat into a low-res light buffer that's blurred and added back onto nearby matter for true coloured illumination. A lightweight floating-point particle layer rides on top for sparks, embers and fireworks.

## 👤 About the author

Built by **Ori Iscovici**. More experiments live at **[labs.iscovici.com](https://labs.iscovici.com)** — and the source for this one is on [GitHub](https://github.com/isco-tec/aether-sand).

## 📄 License

[MIT](./LICENSE)
