# 🏜️ Aether Sand

A from-scratch, physics-rich **falling-sand simulator** built in pure vanilla JavaScript — no libraries, no build step. A cellular-automata engine with density-based fluid dynamics, a real **heat/temperature field**, emergent material reactions, emissive bloom rendering, and a ballistic particle layer for fireworks and explosions.

> Three files (`index.html` / `style.css` / `script.js`) that drop straight into CodePen's HTML / CSS / JS panels.

## ✨ Features

- **Cellular-automata core** on typed-array grids with density-based displacement (sand sinks through water, water floats on oil, gases rise) and bias-free alternating scan order.
- **Real thermodynamics** — a per-cell temperature field with heat diffusion drives emergent phase changes (water ⇄ ice ⇄ steam, sand → glass, stone ⇄ lava, metal melting, ignition).
- **20+ materials** with distinct behaviour: sand, rainbow sand, water, ice, snow, salt, oil, acid, lava, fire, coal, gunpowder, fireworks, electric spark, wood, plant, metal, stone, glass, smoke, wall.
- **Ballistic particle system** for fireworks, explosions and embers — buttery floating-point motion layered on top of the grid.
- **Gravity & wind controls** — point gravity in any direction (or zero-G) and blow particles around with adjustable wind.
- **Emissive bloom** — fire, lava, sparks and fireworks cast real light via a blurred screen-blended glow pass.
- **Snapshot & save/load** — export a PNG of your creation or save/restore scenes.
- **World-class UI** — glassmorphism panels, live FPS + particle counters, an optional heat-map overlay, full keyboard shortcuts, mouse + touch support, and responsive resize that preserves your artwork.

## 🎮 Controls

| Action | Control |
| --- | --- |
| Draw | Click + drag |
| Erase | Right-click / Shift + drag |
| Pause / play | `Space` |
| Step one frame | `→` |
| Clear | `C` |
| Brush size | `[` / `]` or the slider |
| Pick material | `1`–`9` or the palette |

## 🚀 Run it

It's fully static — just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or paste each file into the matching panel on [CodePen](https://codepen.io).

## 🧰 Scripting API

The simulator exposes a small `window.AetherSand` API so you can script, automate, or embed it (all coordinates are in grid cells):

```js
const A = window.AetherSand;
A.setMaterial("lava");        // by name (or A.LAVA)
A.paint(x, y, "water", 6);    // paint a disc (material + brush optional)
A.line(x0, y0, x1, y1, "metal", 2);
A.firework(x, y);             // launch a firework rocket
A.gravity(0, -1);             // flip gravity up (8-way + 0,0 for zero-G)
A.wind(0.8);                  // -1..1
A.heatMap(true);              // toggle the temperature overlay
A.clear(); A.save(); A.load(); A.snapshot();
A.info();                     // { cells, particles, gravity, wind, ... }
```

## 🧪 How it works

The world is a grid of cells; each frame every cell runs simple local rules (fall, flow, rise, react). Complex, lifelike behaviour **emerges** from these rules plus the shared temperature field. The renderer writes the grid into an `ImageData` buffer scaled up with crisp pixels, while emissive materials also paint into a separate glow canvas that is blurred and screen-blended for bloom. A lightweight particle layer adds true ballistic motion for sparks and fireworks.

## 📄 License

[MIT](./LICENSE)
