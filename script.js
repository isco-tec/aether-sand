/* =====================================================================
   AETHER SAND — a high-fidelity falling-sand simulator
   Pure vanilla JS. Cellular-automata engine + emissive bloom rendering.
   ===================================================================== */

(() => {
  "use strict";

  /* ----------------------------- Materials --------------------------- */
  const EMPTY = 0, SAND = 1, WATER = 2, STONE = 3, WOOD = 4, PLANT = 5,
        SALT = 6, OIL = 7, ACID = 8, LAVA = 9, FIRE = 10, SMOKE = 11,
        STEAM = 12, GLASS = 13;

  // type: 0 static · 1 powder · 2 liquid · 3 gas
  const M = {
    [EMPTY]: { name: "Eraser", type: -1 },
    [SAND]:  { name: "Sand",  type: 1, density: 150, c1: [233,196,106], c2: [199,158,74],  a: 255 },
    [WATER]: { name: "Water", type: 2, density: 60,  disp: 6, c1: [56,140,224], c2: [40,108,196], a: 205, emissive: false },
    [STONE]: { name: "Stone", type: 0, density: 999, c1: [128,132,142], c2: [92,96,108],  a: 255 },
    [WOOD]:  { name: "Wood",  type: 0, density: 999, c1: [120,79,46],  c2: [92,58,32],   a: 255, flammable: 0.04 },
    [PLANT]: { name: "Plant", type: 0, density: 999, c1: [86,176,74],  c2: [54,128,52],  a: 255, flammable: 0.08 },
    [SALT]:  { name: "Salt",  type: 1, density: 140, c1: [240,240,246],c2: [206,210,222],a: 255 },
    [OIL]:   { name: "Oil",   type: 2, density: 50,  disp: 4, c1: [86,72,58],   c2: [58,48,40],   a: 235, flammable: 0.14 },
    [ACID]:  { name: "Acid",  type: 2, density: 62,  disp: 4, c1: [150,240,80], c2: [110,200,40], a: 220, emissive: true, glow: 0.35 },
    [LAVA]:  { name: "Lava",  type: 2, density: 95,  disp: 1, c1: [255,140,40], c2: [196,52,16],  a: 255, emissive: true, glow: 1 },
    [FIRE]:  { name: "Fire",  type: 3, density: 1,   c1: [255,230,150],c2: [255,80,24],  a: 255, emissive: true, glow: 1 },
    [SMOKE]: { name: "Smoke", type: 3, density: 2,   c1: [54,54,62],   c2: [28,28,34],   a: 150 },
    [STEAM]: { name: "Steam", type: 3, density: 3,   c1: [210,218,230],c2: [170,180,196],a: 120 },
    [GLASS]: { name: "Glass", type: 0, density: 999, c1: [180,220,235],c2: [150,196,214],a: 110 },
  };

  const isFlammable = (m) => M[m] && M[m].flammable > 0;
  const isDissolvable = (m) => m === SAND || m === STONE || m === WOOD || m === PLANT || m === SALT;
  const density = (m) => (M[m] && M[m].density != null ? M[m].density : 0);

  // Palette shown in the UI (order matters)
  const PALETTE = [SAND, WATER, STONE, WOOD, PLANT, SALT, OIL, ACID, LAVA, FIRE, SMOKE, EMPTY];

  // how densely the brush deposits a material (natural pour vs solid build)
  const SPAWN_PROB = {
    [SAND]: 0.8, [WATER]: 0.85, [SALT]: 0.8, [OIL]: 0.85, [ACID]: 0.8,
    [LAVA]: 0.9, [FIRE]: 0.55, [SMOKE]: 0.4, [STONE]: 1, [WOOD]: 1,
    [PLANT]: 1, [GLASS]: 1, [EMPTY]: 1,
  };

  /* ------------------------------ Setup ------------------------------ */
  const sim = document.getElementById("sim");
  const glow = document.getElementById("glow");
  const sctx = sim.getContext("2d");
  const gctx = glow.getContext("2d");
  sctx.imageSmoothingEnabled = false;
  gctx.imageSmoothingEnabled = false;

  let SCALE, W, H, N;
  let grid, shade, life, moved;
  let simImg, sim32, glowImg, glow32;

  function allocate(w, h) {
    const old = grid ? { grid, shade, life, W, H } : null;
    W = w; H = h; N = W * H;
    grid = new Uint8Array(N);
    shade = new Uint8Array(N);
    life = new Int16Array(N);
    moved = new Uint8Array(N);

    sim.width = W; sim.height = H;
    glow.width = W; glow.height = H;
    simImg = sctx.createImageData(W, H);
    glowImg = gctx.createImageData(W, H);
    sim32 = new Uint32Array(simImg.data.buffer);
    glow32 = new Uint32Array(glowImg.data.buffer);

    if (old) { // preserve existing artwork on resize
      const cw = Math.min(old.W, W), ch = Math.min(old.H, H);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const a = y * W + x, b = y * old.W + x;
          grid[a] = old.grid[b]; shade[a] = old.shade[b]; life[a] = old.life[b];
        }
      }
    }
  }

  function resize() {
    SCALE = Math.max(3, Math.ceil(window.innerWidth / 520));
    const w = Math.ceil(window.innerWidth / SCALE);
    const h = Math.ceil(window.innerHeight / SCALE);
    allocate(w, h);
  }

  /* --------------------------- Cell helpers -------------------------- */
  const rnd = Math.random;
  const r255 = () => (rnd() * 256) | 0;

  function defaultLife(m) {
    switch (m) {
      case FIRE:  return 60 + (rnd() * 70 | 0);
      case SMOKE: return 120 + (rnd() * 160 | 0);
      case STEAM: return 160 + (rnd() * 160 | 0);
      default:    return 0;
    }
  }

  function setCell(i, m) {
    grid[i] = m;
    shade[i] = r255();
    life[i] = defaultLife(m);
    moved[i] = 1;
  }

  function swap(a, b) {
    const gm = grid[a]; grid[a] = grid[b]; grid[b] = gm;
    const sh = shade[a]; shade[a] = shade[b]; shade[b] = sh;
    const lf = life[a]; life[a] = life[b]; life[b] = lf;
    moved[a] = 1; moved[b] = 1;
  }

  // can material at `src` push into cell `dst` (by index)?
  function canDisplace(srcM, dstIdx) {
    const dm = grid[dstIdx];
    if (dm === EMPTY) return true;
    if (M[dm].type === 0) return false;        // static blocks everything
    return density(dm) < density(srcM);        // sink through lighter fluid/gas
  }

  /* --------------------------- Movement ------------------------------ */
  function movePowder(x, y, i, m) {
    if (y >= H - 1) return false;
    const below = i + W;
    if (canDisplace(m, below)) { swap(i, below); return true; }
    const dir = rnd() < 0.5 ? 1 : -1;
    for (const d of [dir, -dir]) {
      const nx = x + d;
      if (nx < 0 || nx >= W) continue;
      const ni = below + d;
      if (canDisplace(m, ni)) { swap(i, ni); return true; }
    }
    return false;
  }

  function moveLiquid(x, y, i, m, disp) {
    if (y < H - 1) {
      const below = i + W;
      if (canDisplace(m, below)) { swap(i, below); return true; }
      const dir = rnd() < 0.5 ? 1 : -1;
      for (const d of [dir, -dir]) {
        const nx = x + d;
        if (nx >= 0 && nx < W && canDisplace(m, below + d)) { swap(i, below + d); return true; }
      }
    }
    // horizontal flow — slide to the farthest reachable cell
    const dir = rnd() < 0.5 ? 1 : -1;
    for (const d of [dir, -dir]) {
      let target = i, tx = x;
      for (let k = 1; k <= disp; k++) {
        const cx = x + d * k;
        if (cx < 0 || cx >= W) break;
        const ci = i + d * k;
        if (canDisplace(m, ci)) { target = ci; tx = cx; } else break;
      }
      if (target !== i) { swap(i, target); return true; }
    }
    return false;
  }

  function moveGas(x, y, i, m) {
    // rise, with lateral wander
    if (y > 0) {
      const above = i - W;
      const dir = rnd() < 0.5 ? 1 : -1;
      const opts = [above, x + dir < W && x + dir >= 0 ? above + dir : -1,
                            x - dir < W && x - dir >= 0 ? above - dir : -1];
      for (const ni of opts) {
        if (ni >= 0 && canDisplace(m, ni)) { swap(i, ni); return true; }
      }
    }
    if (rnd() < 0.6) {
      const d = rnd() < 0.5 ? 1 : -1;
      const nx = x + d;
      if (nx >= 0 && nx < W && canDisplace(m, i + d)) { swap(i, i + d); return true; }
    }
    return false;
  }

  /* --------------------------- Reactions ----------------------------- */
  // 8-neighbour offsets
  const NB = [];
  function buildNB() {
    NB.length = 0;
    NB.push(-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1);
  }

  function forNeighbors(x, y, i, fn) {
    for (let k = 0; k < 8; k++) {
      const o = NB[k];
      const ni = i + o;
      if (ni < 0 || ni >= N) continue;
      // guard horizontal wrap
      const nx = x + (o === -W - 1 || o === -1 || o === W - 1 ? -1 :
                      o === -W + 1 || o === 1 || o === W + 1 ? 1 : 0);
      if (nx < 0 || nx >= W) continue;
      if (fn(ni, grid[ni])) return true;
    }
    return false;
  }

  function updateFire(x, y, i) {
    if (--life[i] <= 0) { setCell(i, rnd() < 0.55 ? SMOKE : EMPTY); return; }
    let died = false;
    forNeighbors(x, y, i, (ni, nm) => {
      if (nm === WATER) { setCell(i, SMOKE); died = true; return true; }
      if (isFlammable(nm) && rnd() < M[nm].flammable * 4) setCell(ni, FIRE);
      else if (nm === OIL && rnd() < 0.25) setCell(ni, FIRE);
      return false;
    });
    if (died) return;
    moveGas(x, y, i);
  }

  function updateLava(x, y, i) {
    let reacted = false;
    forNeighbors(x, y, i, (ni, nm) => {
      if (nm === WATER) { setCell(ni, STEAM); setCell(i, STONE); reacted = true; return true; }
      if (isFlammable(nm) && rnd() < 0.22) setCell(ni, FIRE);
      else if (nm === SAND && rnd() < 0.03) setCell(ni, GLASS);
      return false;
    });
    if (reacted) return;
    if (rnd() < 0.55) moveLiquid(x, y, i, LAVA, 1);
  }

  function updateWater(x, y, i) {
    let gone = false;
    forNeighbors(x, y, i, (ni, nm) => {
      if (nm === FIRE) { setCell(ni, STEAM); if (rnd() < 0.5) { setCell(i, EMPTY); gone = true; return true; } }
      else if (nm === LAVA) { setCell(ni, STONE); setCell(i, STEAM); gone = true; return true; }
      else if (nm === SALT && rnd() < 0.02) setCell(ni, EMPTY);
      return false;
    });
    if (gone) return;
    moveLiquid(x, y, i, WATER, M[WATER].disp);
  }

  function updateAcid(x, y, i) {
    let consumed = false;
    forNeighbors(x, y, i, (ni, nm) => {
      if (isDissolvable(nm) && rnd() < 0.07) {
        setCell(ni, EMPTY);
        if (rnd() < 0.45) { setCell(i, EMPTY); consumed = true; return true; }
      }
      return false;
    });
    if (consumed) return;
    moveLiquid(x, y, i, ACID, M[ACID].disp);
  }

  function updateSmoke(x, y, i) {
    if (--life[i] <= 0 || (y === 0 && rnd() < 0.1)) { setCell(i, EMPTY); return; }
    moveGas(x, y, i);
  }

  function updateSteam(x, y, i) {
    if (--life[i] <= 0 || (y === 0 && rnd() < 0.08)) {
      setCell(i, rnd() < 0.35 ? WATER : EMPTY); return;
    }
    moveGas(x, y, i);
  }

  function updateSalt(x, y, i) {
    let dissolved = false;
    forNeighbors(x, y, i, (ni, nm) => {
      if (nm === WATER && rnd() < 0.012) { setCell(i, EMPTY); dissolved = true; return true; }
      return false;
    });
    if (dissolved) return;
    movePowder(x, y, i, SALT);
  }

  function updatePlant(x, y, i) {
    // grow into empty space when fed by adjacent water
    let water = -1, empties = [];
    for (let k = 0; k < 8; k++) {
      const o = NB[k], ni = i + o;
      if (ni < 0 || ni >= N) continue;
      const col = (i % W) + (o === -W - 1 || o === -1 || o === W - 1 ? -1 :
                             o === -W + 1 || o === 1 || o === W + 1 ? 1 : 0);
      if (col < 0 || col >= W) continue;
      const nm = grid[ni];
      if (nm === WATER) water = ni;
      else if (nm === EMPTY) empties.push(ni);
    }
    if (water >= 0 && empties.length && rnd() < 0.1) {
      // bias growth upward; always consume the water so growth is self-limiting
      empties.sort((a, b) => a - b);
      const target = rnd() < 0.7 ? empties[0] : empties[(rnd() * empties.length) | 0];
      setCell(target, PLANT);
      setCell(water, EMPTY);
    }
  }

  /* ----------------------------- Step -------------------------------- */
  function step() {
    moved.fill(0);
    const ltr = rnd() < 0.5; // alternate scan direction to remove bias
    for (let y = H - 1; y >= 0; y--) {
      const rowStart = y * W;
      for (let n = 0; n < W; n++) {
        const x = ltr ? n : W - 1 - n;
        const i = rowStart + x;
        const m = grid[i];
        if (m === EMPTY || moved[i]) continue;
        switch (m) {
          case SAND:  movePowder(x, y, i, SAND); break;
          case SALT:  updateSalt(x, y, i); break;
          case WATER: updateWater(x, y, i); break;
          case OIL:   moveLiquid(x, y, i, OIL, M[OIL].disp); break;
          case ACID:  updateAcid(x, y, i); break;
          case LAVA:  updateLava(x, y, i); break;
          case FIRE:  updateFire(x, y, i); break;
          case SMOKE: updateSmoke(x, y, i); break;
          case STEAM: updateSteam(x, y, i); break;
          case PLANT: updatePlant(x, y, i); break;
          // STONE, WOOD, GLASS are static
        }
      }
    }
  }

  /* ---------------------------- Rendering ---------------------------- */
  const lerp = (a, b, t) => (a + (b - a) * t) | 0;

  function render() {
    const t = performance.now() * 0.012;
    for (let i = 0; i < N; i++) {
      const m = grid[i];
      if (m === EMPTY) { sim32[i] = 0; glow32[i] = 0; continue; }
      const mat = M[m];
      const sh = shade[i] / 255;
      let r, g, b, a = mat.a;

      if (m === FIRE) {
        const lt = Math.max(0, Math.min(1, life[i] / 110));
        const fl = 0.85 + 0.15 * Math.sin(t * 3 + i);
        r = (255 * fl) | 0;
        g = lerp(50, 235, lt) * fl | 0;
        b = lerp(8, 130, lt * lt) | 0;
      } else if (m === LAVA) {
        const fl = 0.78 + 0.22 * Math.sin(t + i * 0.7) * 0.5 + sh * 0.18;
        r = Math.min(255, lerp(mat.c2[0], mat.c1[0], sh) * (0.9 + fl * 0.2)) | 0;
        g = Math.min(255, lerp(mat.c2[1], mat.c1[1], sh) * (0.7 + fl * 0.4)) | 0;
        b = lerp(mat.c2[2], mat.c1[2], sh) | 0;
      } else {
        r = lerp(mat.c1[0], mat.c2[0], sh);
        g = lerp(mat.c1[1], mat.c2[1], sh);
        b = lerp(mat.c1[2], mat.c2[2], sh);
      }

      sim32[i] = (a << 24) | (b << 16) | (g << 8) | r;

      if (mat.emissive) {
        const gw = mat.glow;
        glow32[i] = (255 << 24) | ((b * gw | 0) << 16) | ((g * gw | 0) << 8) | (r * gw | 0);
      } else {
        glow32[i] = 0;
      }
    }
    sctx.putImageData(simImg, 0, 0);
    gctx.putImageData(glowImg, 0, 0);
  }

  /* ----------------------------- Painting ---------------------------- */
  let currentMat = SAND;
  let brush = 9;
  let painting = false, eraseBtn = false;
  let lastPx = null, lastPy = null;
  let pointerInside = false, pointerX = 0, pointerY = 0;

  function paintDisc(cx, cy, mat) {
    const rad = brush;
    const prob = SPAWN_PROB[mat] ?? 1;
    const x0 = Math.max(0, cx - rad), x1 = Math.min(W - 1, cx + rad);
    const y0 = Math.max(0, cy - rad), y1 = Math.min(H - 1, cy + rad);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > rad * rad) continue;
        const i = y * W + x;
        if (mat === EMPTY) { grid[i] = EMPTY; continue; }
        // don't overwrite static structures unless erasing
        if (rnd() > prob) continue;
        if (grid[i] === EMPTY || M[grid[i]].type !== 0 || mat === STONE || mat === WOOD || mat === PLANT) {
          setCell(i, mat);
        }
      }
    }
  }

  function paintLine(x0, y0, x1, y1, mat) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.floor(dist / Math.max(1, brush * 0.4)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      paintDisc(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), mat);
    }
  }

  function toGrid(clientX, clientY) {
    return [Math.floor(clientX / SCALE), Math.floor(clientY / SCALE)];
  }

  /* --------------------------- Attract mode -------------------------- */
  let attract = true;
  let attractT = 0;
  function runAttract() {
    if (!attract) return;
    attractT += 0.018;
    const cx = (W * (0.5 + 0.32 * Math.sin(attractT))) | 0;
    for (let k = 0; k < 3; k++) {
      const x = cx + ((rnd() * 6 - 3) | 0);
      if (x > 0 && x < W) {
        const mat = rnd() < 0.78 ? SAND : (rnd() < 0.5 ? WATER : SALT);
        const i = 2 * W + x;
        if (grid[i] === EMPTY) setCell(i, mat);
      }
    }
    // occasional ember accent
    if (rnd() < 0.04) {
      const x = (W * (0.5 + 0.32 * Math.sin(attractT + 2))) | 0;
      const i = 2 * W + x;
      if (grid[i] === EMPTY) setCell(i, LAVA);
    }
  }
  function stopAttract() {
    if (!attract) return;
    attract = false;
    document.getElementById("hint").classList.add("hide");
  }

  /* ------------------------------ Loop ------------------------------- */
  let paused = false;
  let stepOnce = false;
  let frames = 0, fpsT = performance.now(), fpsEl, countEl;

  function loop() {
    if (!paused || stepOnce) {
      runAttract();
      step();
      stepOnce = false;
    }
    // continuous painting while holding
    if (painting && lastPx != null) paintDisc(lastPx, lastPy, eraseBtn ? EMPTY : currentMat);

    render();

    // stats
    frames++;
    const now = performance.now();
    if (now - fpsT >= 500) {
      fpsEl.textContent = Math.round((frames * 1000) / (now - fpsT));
      frames = 0; fpsT = now;
      let c = 0;
      for (let i = 0; i < N; i++) if (grid[i] !== EMPTY) c++;
      countEl.textContent = c.toLocaleString();
    }
    requestAnimationFrame(loop);
  }

  /* --------------------------- UI wiring ----------------------------- */
  function texFor(m) {
    // tiny inline noise texture for swatches
    return "radial-gradient(circle at 30% 25%, rgba(255,255,255,.35), transparent 40%)";
  }

  function swatchCss(m) {
    if (m === EMPTY) return "repeating-linear-gradient(45deg,#2a2a36 0 6px,#1c1c26 6px 12px)";
    const a = M[m].c1, b = M[m].c2;
    return `linear-gradient(160deg, rgb(${a[0]},${a[1]},${a[2]}), rgb(${b[0]},${b[1]},${b[2]}))`;
  }

  function buildPalette() {
    const wrap = document.getElementById("material-grid");
    PALETTE.forEach((m) => {
      const el = document.createElement("button");
      el.className = "mat" + (m === currentMat ? " active" : "");
      el.style.setProperty("--swatch", m === EMPTY ? "#3a3a48" : `rgb(${M[m].c1[0]},${M[m].c1[1]},${M[m].c1[2]})`);
      el.style.setProperty("--swatch-tex", texFor(m));
      el.innerHTML = `<span class="mat-swatch" style="background:${swatchCss(m)}"></span>
                      <span class="mat-name">${M[m].name}</span>`;
      el.addEventListener("click", () => {
        currentMat = m;
        document.querySelectorAll(".mat").forEach((n) => n.classList.remove("active"));
        el.classList.add("active");
      });
      wrap.appendChild(el);
    });
  }

  function setupControls() {
    fpsEl = document.getElementById("fps");
    countEl = document.getElementById("count");

    const playBtn = document.getElementById("btn-play");
    playBtn.addEventListener("click", () => {
      paused = !paused;
      playBtn.classList.toggle("paused", paused);
    });
    document.getElementById("btn-step").addEventListener("click", () => { stepOnce = true; });
    document.getElementById("btn-clear").addEventListener("click", () => {
      grid.fill(EMPTY); life.fill(0);
    });

    const brushEl = document.getElementById("brush");
    const brushOut = document.getElementById("brush-readout");
    const ring = document.getElementById("cursor-ring");
    const syncBrush = () => {
      brush = +brushEl.value;
      brushOut.textContent = brush;
      const px = brush * 2 * SCALE;
      ring.style.width = px + "px";
      ring.style.height = px + "px";
    };
    brushEl.addEventListener("input", syncBrush);
    syncBrush();

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") { e.preventDefault(); playBtn.click(); }
      else if (e.code === "KeyC") document.getElementById("btn-clear").click();
      else if (e.code === "ArrowRight") { stepOnce = true; }
      else if (e.code === "BracketRight") { brushEl.value = Math.min(40, brush + 2); syncBrush(); }
      else if (e.code === "BracketLeft") { brushEl.value = Math.max(1, brush - 2); syncBrush(); }
      else if (e.key >= "1" && e.key <= "9") {
        const idx = +e.key - 1;
        if (PALETTE[idx] != null) document.querySelectorAll(".mat")[idx].click();
      }
    });

    return { ring, syncBrush };
  }

  function setupPointer(ring) {
    const updateRing = () => {
      ring.style.left = pointerX + "px";
      ring.style.top = pointerY + "px";
      ring.style.opacity = pointerInside ? "1" : "0";
    };

    sim.addEventListener("contextmenu", (e) => e.preventDefault());

    const stage = document.getElementById("stage");
    stage.addEventListener("pointerdown", (e) => {
      stopAttract();
      painting = true;
      eraseBtn = e.button === 2 || e.shiftKey;
      const [gx, gy] = toGrid(e.clientX, e.clientY);
      lastPx = gx; lastPy = gy;
      paintDisc(gx, gy, eraseBtn ? EMPTY : currentMat);
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      pointerInside = true;
      pointerX = e.clientX; pointerY = e.clientY;
      updateRing();
      if (!painting) return;
      const [gx, gy] = toGrid(e.clientX, e.clientY);
      if (lastPx != null) paintLine(lastPx, lastPy, gx, gy, eraseBtn ? EMPTY : currentMat);
      lastPx = gx; lastPy = gy;
    });
    const end = () => { painting = false; lastPx = lastPy = null; };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    window.addEventListener("pointerup", end);
    window.addEventListener("blur", end);
    stage.addEventListener("pointerleave", () => { pointerInside = false; updateRing(); });
    stage.addEventListener("pointerenter", () => { pointerInside = true; updateRing(); });
  }

  /* ------------------------------ Init ------------------------------- */
  function init() {
    resize();
    buildNB();
    buildPalette();
    const { ring, syncBrush } = setupControls();
    setupPointer(ring);

    window.addEventListener("resize", () => {
      resize();
      buildNB();
      syncBrush();
    });

    // auto-dismiss hint after a while even if untouched
    setTimeout(() => {
      const h = document.getElementById("hint");
      if (h && attract) h.classList.add("hide");
    }, 9000);

    requestAnimationFrame(loop);
  }

  init();
})();
