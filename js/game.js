'use strict';
// Main game: simulation, rendering, input and UI.
(() => {
  const VW = 320, VH = 160;      // viewport in world pixels
  const TICK_MS = 60;            // ~17 simulation ticks per second
  const FAST_MULT = 4;

  const SKILLS = [
    { id: 'climber', name: 'Climber', icon: 'climb1' },
    { id: 'floater', name: 'Flapper', icon: 'float1' },
    { id: 'bomber', name: 'Exploder', icon: 'ohno' },
    { id: 'blocker', name: 'Blocker', icon: 'block1' },
    { id: 'builder', name: 'Builder', icon: 'build1' },
    { id: 'basher', name: 'Basher', icon: 'bash2' },
    { id: 'miner', name: 'Miner', icon: 'dig1' },
    { id: 'digger', name: 'Digger', icon: 'dig2' },
  ];

  const $ = (id) => document.getElementById(id);
  const canvas = $('view'), ctx = canvas.getContext('2d');
  const mini = $('minimap'), mctx = mini.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ------------------------------------------------------------------ background
  const THEMES = {
    dusk:   { sky: ['#121838', '#33295a', '#7a4566'], stars: 160, orb: '#f7efc8', orbY: 26, hills: ['#2c2550', '#211c3e'], trees: '#1a1631' },
    dawn:   { sky: ['#2b3a6b', '#b8738c', '#f2bf88'], stars: 25, orb: '#fff1c4', orbY: 70, hills: ['#5a4a78', '#43395e'], trees: '#3a3152' },
    day:    { sky: ['#3f86d4', '#86c0ee', '#d4ecf9'], stars: 0, orb: '#fff6c8', orbY: 22, hills: ['#7fa8c8', '#6a93b3'], trees: '#5a829f', clouds: true },
    sunset: { sky: ['#3a1f4a', '#b84d3a', '#f2a541'], stars: 10, orb: '#ffd36b', orbY: 82, hills: ['#6b2f3f', '#4e2232'], trees: '#3b1a27' },
    night:  { sky: ['#04060d', '#0d1530', '#1e2b52'], stars: 260, orb: '#e8eefc', orbY: 20, hills: ['#151d38', '#0e1429'], trees: '#0a0f20' },
    cave:   { cave: true },
  };

  function makeBackground(W, H, seed, themeName) {
    const th = THEMES[themeName] || THEMES.dusk;
    const rng = mulberry32(seed);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    if (th.cave) {
      // Dark rocky cave wall.
      const img = x.createImageData(W, H);
      const px = new Uint32Array(img.data.buffer);
      for (let yy = 0; yy < H; yy++)
        for (let xx = 0; xx < W; xx++) {
          const n = valueNoise(xx / 9, yy / 6, seed) * 0.7 + valueNoise(xx / 3, yy / 3, seed + 5) * 0.3;
          const v = 14 + n * 26;
          px[yy * W + xx] = rgba(Math.round(v * 1.25), Math.round(v), Math.round(v * 0.8));
        }
      x.putImageData(img, 0, 0);
      for (let i = 0; i < W / 25; i++) { // glowing crystals
        x.fillStyle = rng() < 0.5 ? 'rgba(120,200,255,0.5)' : 'rgba(200,140,255,0.45)';
        x.fillRect(Math.floor(rng() * W), Math.floor(rng() * H), 1, 2);
      }
      return c;
    }
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(0.5, th.sky[1]);
    g.addColorStop(1, th.sky[2]);
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < th.stars * W / 960; i++) {
      x.fillStyle = `rgba(255,255,230,${0.3 + rng() * 0.7})`;
      x.fillRect(Math.floor(rng() * W), Math.floor(rng() * H * 0.55), 1, 1);
    }
    // sun / moon
    const ox = Math.round(W * 0.62);
    x.fillStyle = th.orb;
    x.beginPath(); x.arc(ox, th.orbY, 9, 0, Math.PI * 2); x.fill();
    if (th.stars > 100) {
      x.fillStyle = 'rgba(0,0,0,0.1)';
      x.fillRect(ox - 3, th.orbY - 3, 3, 2);
      x.fillRect(ox + 2, th.orbY + 3, 2, 2);
    }
    if (th.clouds) {
      x.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < W / 120; i++) {
        const cx = rng() * W, cy = 15 + rng() * 40;
        for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx + k * 5, cy + Math.sin(k * 2) * 2, 4 + rng() * 3, 0, Math.PI * 2); x.fill(); }
      }
    }
    // distant hills
    [[th.hills[0], 0.48, 9], [th.hills[1], 0.62, 6]].forEach(([col, base, amp]) => {
      x.fillStyle = col;
      const off = rng() * 100;
      for (let px = 0; px < W; px++) {
        const top = H * base + Math.sin(px * 0.013 + off) * amp + Math.sin(px * 0.041 + off * 2) * amp * 0.4;
        x.fillRect(px, Math.round(top), 1, H);
      }
    });
    // little silhouetted trees on the far hills
    x.fillStyle = th.trees;
    for (let i = 0; i < W / 70; i++) {
      const tx = Math.floor(rng() * W), ty = Math.floor(H * 0.6 + rng() * 6);
      x.fillRect(tx, ty - 6, 1, 6);
      x.beginPath(); x.arc(tx + 0.5, ty - 8, 3 + rng() * 2, 0, Math.PI * 2); x.fill();
    }
    return c;
  }

  // ------------------------------------------------------------------ game state
  class Game {
    constructor(levelIndex) {
      const def = LEVELS[levelIndex];
      this.levelIndex = levelIndex;
      this.def = def;
      this.W = def.width; this.H = def.height;
      this.terrain = new Terrain(this.W, this.H);
      def.paint(this.terrain);
      this.terrain.colorize(def.seed, def.theme !== 'cave');
      this.bg = makeBackground(this.W, this.H, def.seed, def.theme);
      this.entrances = def.entrances || [def.entrance];
      this.water = def.water || [];
      this.fire = def.fire || [];
      this.chickens = [];
      this.particles = [];
      this.skills = { ...def.skills };
      this.selected = 'climber';
      this.minRate = def.releaseRate;
      this.releaseRate = def.releaseRate;
      this.released = 0; this.saved = 0; this.lost = 0;
      this.tick = 0;
      this.timeLeft = Math.round(def.timeLimit * 1000 / TICK_MS);
      this.hatch = 0;              // 0 closed .. 1 fully open
      this.releaseIn = 0;
      this.nuking = false;
      this.paused = false;
      this.fast = false;
      this.running = false;
      this.finished = false;
      this.endDelay = -1;
      this.camX = Math.max(0, Math.min(this.W - VW, this.entrances[0].x - 60));
      Chicken.nextId = 1;
    }

    releaseInterval() { return Math.floor((100 - this.releaseRate) / 2) + 4; }

    step() {
      if (this.finished) return;
      this.tick++;

      // Hatch opens, then chickens are released at the release rate.
      if (this.tick === 12) Sfx.play('hatch');
      if (this.tick >= 12 && this.hatch < 1) {
        this.hatch = Math.min(1, (this.tick - 12) / 14);
        if (this.hatch >= 1) Sfx.play('letsgo');
      }
      if (this.hatch >= 1 && !this.nuking && this.released < this.def.total) {
        if (--this.releaseIn <= 0) {
          const e = this.entrances[this.released % this.entrances.length];
          const c = new Chicken(e.x, e.y);
          c.dir = e.dir || 1;
          this.chickens.push(c);
          this.released++;
          this.releaseIn = this.releaseInterval();
        }
      }

      // Nuke: light one fuse per tick.
      if (this.nuking) {
        const c = this.chickens.find((k) => k.active && k.fuse < 0);
        if (c) c.fuse = FUSE_TICKS;
      }

      for (const c of this.chickens) if (!c.dead) c.update(this);
      this.chickens = this.chickens.filter((c) => !c.dead);

      for (const c of this.chickens) {
        if (c.state === 'burning' && Math.random() < 0.7) this.burst(c.x, c.y - 6, 1, ['#ff9b2e', '#ffd45e', '#555'], 0.8);
      }
      for (const f of this.fire) {
        if (Math.random() < f.w / 60) this.particles.push({ x: f.x + Math.random() * f.w, y: f.y - f.h, vx: 0, vy: -0.6, life: 14, color: '#ffb340', ember: true });
      }
      for (const p of this.particles) {
        if (p.ember) { p.y += p.vy; p.x += Math.sin(p.life) * 0.3; p.life--; continue; }
        p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.life--;
        if (this.terrain.solid(p.x, p.y)) { p.vx *= -0.3; p.vy *= -0.3; p.y -= 1; }
      }
      this.particles = this.particles.filter((p) => p.life > 0);

      if (this.hatch >= 1 && --this.timeLeft <= 0) { this.timeLeft = 0; this.finish(); return; }

      const allOut = this.released >= this.def.total || this.nuking;
      if (allOut && this.chickens.length === 0 && this.endDelay < 0) this.endDelay = 25;
      if (this.endDelay > 0 && --this.endDelay === 0) this.finish();
    }

    // ---- interactions used by Chicken ----
    blockedBy(c, nx) {
      for (const b of this.chickens) {
        if (b === c || b.state !== 'blocking' || Math.abs(b.y - c.y) > 6) continue;
        const dx = b.x - nx;
        if (c.dir > 0 ? (dx >= 0 && dx <= 4) : (dx <= 0 && dx >= -4)) return true;
      }
      return false;
    }
    hazardAt(x, y) {
      if (this.water.some((w) => x >= w.x && x < w.x + w.w && y >= w.y + 3)) return 'water';
      if (this.fire.some((f) => x >= f.x && x < f.x + f.w && y > f.y - f.h && y <= f.y + 2)) return 'fire';
      return null;
    }
    atExit(x, y) {
      const e = this.def.exit;
      return Math.abs(x - e.x) <= 2 && y >= e.y - 6 && y <= e.y + 2;
    }
    lose(c) { c.dead = true; this.lost++; }
    save(c) { c.dead = true; this.saved++; }
    splat(c) {
      Sfx.play('splat');
      this.burst(c.x, c.y - 3, 8, ['#fbf7ec', '#cdbfa6', '#e0352b'], 1.2);
    }
    explode(c) {
      Sfx.play('pop');
      this.terrain.eraseCircle(c.x, c.y - 5, 10);
      this.burst(c.x, c.y - 5, 30, ['#fbf7ec', '#fbf7ec', '#cdbfa6', '#e0352b', '#f5a524'], 2.6);
      this.burst(c.x, c.y - 5, 14, ['#8b5a2b', '#5e3a1c', '#7ccf4e'], 2.0);
      this.lose(c);
    }
    burst(x, y, n, colors, speed) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
        this.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2,
          life: 30 + Math.floor(Math.random() * 25), color: colors[i % colors.length],
        });
      }
    }

    // ---- player actions ----
    canAssign(c, skill) {
      if (!c.active || c.state === 'ohno') return false;
      switch (skill) {
        case 'climber': return !c.climber;
        case 'floater': return !c.floater;
        case 'bomber': return c.fuse < 0;
        case 'blocker': return TASK_STATES.has(c.state);
        case 'builder': return TASK_STATES.has(c.state) && c.state !== 'building';
        case 'basher': return TASK_STATES.has(c.state) && c.state !== 'bashing';
        case 'miner': return TASK_STATES.has(c.state) && c.state !== 'mining';
        case 'digger': return TASK_STATES.has(c.state) && c.state !== 'digging';
      }
      return false;
    }
    assign(c, skill) {
      if (this.skills[skill] <= 0 || !this.canAssign(c, skill)) return false;
      switch (skill) {
        case 'climber': c.climber = true; break;
        case 'floater': c.floater = true; break;
        case 'bomber': c.fuse = FUSE_TICKS; break;
        case 'blocker': c.set('blocking'); break;
        case 'builder': c.set('building'); c.bricks = BRICKS_PER_BUILD; break;
        case 'basher': c.set('bashing'); break;
        case 'miner': c.set('mining'); break;
        case 'digger': c.set('digging'); break;
      }
      this.skills[skill]--;
      Sfx.play('assign');
      return true;
    }
    chickenAt(wx, wy, skill) {
      let best = null, bestScore = Infinity, count = 0;
      for (const c of this.chickens) {
        if (!c.active) continue;
        if (Math.abs(c.x - wx) > 5 || wy < c.y - 13 || wy > c.y + 2) continue;
        count++;
        let score = Math.abs(c.x - wx) + Math.abs(c.y - 5 - wy) * 0.5;
        if (!this.canAssign(c, skill)) score += 100;
        if (score < bestScore) { bestScore = score; best = c; }
      }
      return { chicken: best, count };
    }
    nuke() {
      if (this.nuking || this.finished) return;
      this.nuking = true;
      Sfx.play('nuke');
    }

    finish() {
      if (this.finished) return;
      this.finished = true;
      this.lost += this.chickens.length;
      showResults(this);
    }
  }

  // ------------------------------------------------------------------ rendering
  function drawEntrance(x, y, open, t) {
    // A wooden coop box hanging from the sky; its trapdoor swings open underneath.
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = '#4b2e17'; ctx.fillRect(x - 14, y - 16, 28, 16);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x - 13, y - 15, 26, 14);
    ctx.fillStyle = '#a8743c';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 13, y - 14 + i * 4, 26, 2);
    // roof
    ctx.fillStyle = '#b8322a';
    for (let i = 0; i < 7; i++) ctx.fillRect(x - 16 + i, y - 17 - i, 32 - i * 2, 1);
    ctx.fillStyle = '#7a1f19'; ctx.fillRect(x - 16, y - 17, 32, 1);
    // round window with a chicken peeking
    ctx.fillStyle = '#1b1208'; ctx.fillRect(x - 3, y - 13, 6, 5);
    if (open < 1 || (t >> 4) % 3) { ctx.fillStyle = '#fbf7ec'; ctx.fillRect(x - 1, y - 12, 3, 3); ctx.fillStyle = '#e0352b'; ctx.fillRect(x, y - 13, 1, 1); }
    // trapdoor
    const gap = Math.round(open * 7);
    ctx.fillStyle = '#1b1208'; ctx.fillRect(x - 7, y - 1, 14, 1);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(x - 7 - 0, y - 1 + 0, 7 - gap, 1);
    ctx.fillRect(x + gap, y - 1, 7 - gap, 1);
    if (gap > 0) { ctx.fillRect(x - 7, y, 1, gap); ctx.fillRect(x + 6, y, 1, gap); }
  }

  function drawExit(x, y, t) {
    // A little red barn; chickens walk in through the open door.
    x = Math.round(x); y = Math.round(y);
    const L = x - 17;
    ctx.fillStyle = '#5e1512'; ctx.fillRect(L - 1, y - 23, 36, 23);
    ctx.fillStyle = '#b8322a'; ctx.fillRect(L, y - 22, 34, 22);
    ctx.fillStyle = '#9c2a23';
    for (let i = 0; i < 34; i += 3) ctx.fillRect(L + i, y - 22, 1, 22);
    // roof
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i === 0 ? '#2b2b33' : '#4a4a55';
      ctx.fillRect(L - 3 + i * 2, y - 23 - i, 40 - i * 4, 1);
    }
    // hay loft
    ctx.fillStyle = '#fbf7ec'; ctx.fillRect(x - 4, y - 21, 8, 6);
    ctx.fillStyle = '#e2b84e'; ctx.fillRect(x - 3, y - 20, 6, 4);
    // door frame (white trim, X braces on the open doors)
    ctx.fillStyle = '#fbf7ec';
    ctx.fillRect(x - 7, y - 13, 14, 13);
    ctx.fillStyle = '#1e0f08'; ctx.fillRect(x - 6, y - 12, 12, 12);
    ctx.fillStyle = '#e2b84e'; ctx.fillRect(x - 6, y - 2, 12, 2); // straw on the floor
    for (const side of [-1, 1]) {
      const dx = side < 0 ? x - 13 : x + 7;
      ctx.fillStyle = '#b8322a'; ctx.fillRect(dx, y - 12, 6, 12);
      ctx.fillStyle = '#fbf7ec';
      ctx.fillRect(dx, y - 12, 6, 1); ctx.fillRect(dx, y - 1, 6, 1);
      ctx.fillRect(dx, y - 12, 1, 12); ctx.fillRect(dx + 5, y - 12, 1, 12);
      for (let i = 0; i < 6; i++) { ctx.fillRect(dx + i, y - 12 + i * 2, 1, 1); ctx.fillRect(dx + 5 - i, y - 12 + i * 2, 1, 1); }
    }
    // flickering lantern
    const flick = (t >> 3) % 5 === 0 ? 0.5 : 1;
    ctx.fillStyle = `rgba(255, 210, 90, ${0.25 * flick})`;
    ctx.fillRect(x - 4, y - 19, 8, 6);
    ctx.fillStyle = flick > 0.6 ? '#ffd45e' : '#c99a2e';
    ctx.fillRect(x - 1, y - 17, 2, 2);
    // weather-vane chicken on the roof
    ctx.fillStyle = '#2b2b33'; ctx.fillRect(x, y - 38, 1, 6);
    ctx.fillRect(x - 2, y - 40, 4, 2); ctx.fillRect(x + 1, y - 42, 2, 2);
  }

  function drawWater(w, t, camX) {
    const x0 = w.x - camX;
    for (let i = 0; i < w.w; i++) {
      const wave = Math.round(Math.sin((w.x + i) * 0.5 + t * 0.004) * 1.2);
      const top = w.y + wave;
      ctx.fillStyle = 'rgba(40, 110, 200, 0.82)';
      ctx.fillRect(x0 + i, top, 1, w.y + w.h - top);
      ctx.fillStyle = 'rgba(160, 220, 255, 0.9)';
      ctx.fillRect(x0 + i, top, 1, 1);
      if (((w.x + i) * 7 + Math.floor(t / 200)) % 11 === 0) {
        ctx.fillStyle = 'rgba(200, 240, 255, 0.5)';
        ctx.fillRect(x0 + i, top + 3 + ((i * 5) % 7), 1, 1);
      }
    }
  }

  function drawFire(f, t, camX) {
    const x0 = f.x - camX;
    if (x0 > VW || x0 + f.w < 0) return;
    for (let i = 0; i < f.w; i++) {
      const n = Math.sin((f.x + i) * 1.7 + t * 0.012) + Math.sin((f.x + i) * 0.9 - t * 0.017);
      const h = Math.max(2, Math.round(f.h * (0.6 + n * 0.2) + ((i * 7 + (t >> 6)) % 3)));
      ctx.fillStyle = '#c4281c'; ctx.fillRect(x0 + i, f.y - h, 1, h);
      ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x0 + i, f.y - Math.round(h * 0.7), 1, Math.round(h * 0.7));
      ctx.fillStyle = '#ffd94a'; ctx.fillRect(x0 + i, f.y - Math.round(h * 0.35), 1, Math.round(h * 0.35));
    }
    // logs
    ctx.fillStyle = '#4b2e17';
    for (let i = 0; i < f.w; i += 7) ctx.fillRect(x0 + i, f.y - 2, 5, 2);
  }

  function render(g, now) {
    const camX = Math.round(g.camX);
    ctx.drawImage(g.bg, camX, 0, VW, VH, 0, 0, VW, VH);
    g.terrain.flush();
    ctx.drawImage(g.terrain.canvas, camX, 0, VW, VH, 0, 0, VW, VH);

    drawExit(g.def.exit.x - camX, g.def.exit.y, g.tick);
    for (const e of g.entrances) drawEntrance(e.x - camX, e.y, g.hatch, g.tick);
    for (const f of g.fire) drawFire(f, now, camX);

    for (const c of g.chickens) {
      const sx = c.x - camX;
      if (sx < -12 || sx > VW + 12) continue;
      let y = c.y, x = sx;
      if (c.state === 'drowning') y += Math.min(10, c.timer >> 1);
      if (c.state === 'ohno') x += (c.anim & 1) ? 1 : -1;
      if (c.state === 'exiting') ctx.globalAlpha = Math.max(0, 1 - c.timer / 10);
      if (c.state === 'burning') { ctx.globalAlpha = (c.timer & 2) ? 0.4 : 1; y -= Math.min(4, c.timer >> 2); }
      Sprites.draw(ctx, c.frame(), c.dir, x, y);
      ctx.globalAlpha = 1;
      if (c.fuse > 0 && c.active) drawDigit(ctx, Math.ceil(c.fuse * TICK_MS / 1000), sx - 1, c.y - 18);
    }

    for (const w of g.water) drawWater(w, now, camX);

    for (const p of g.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), 1, 1);
    }

    // cursor
    if (mouse.inside) {
      const h = hover.chicken;
      if (h) {
        const bx = h.x - camX - 6, by = h.y - 13, bw = 13, bh = 15;
        ctx.fillStyle = '#ffe14d';
        for (const [cx, cy] of [[bx, by], [bx + bw - 3, by], [bx, by + bh - 1], [bx + bw - 3, by + bh - 1]]) ctx.fillRect(cx, cy, 3, 1);
        for (const [cx, cy] of [[bx, by], [bx + bw - 1, by], [bx, by + bh - 3], [bx + bw - 1, by + bh - 3]]) ctx.fillRect(cx, cy, 1, 3);
      } else {
        const mx = Math.floor(mouse.x), my = Math.floor(mouse.y);
        ctx.fillStyle = '#000';
        ctx.fillRect(mx - 4, my - 1, 9, 3); ctx.fillRect(mx - 1, my - 4, 3, 9);
        ctx.fillStyle = '#fff';
        ctx.fillRect(mx - 3, my, 7, 1); ctx.fillRect(mx, my - 3, 1, 7);
      }
    }

    if (g.paused && !g.finished) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#fff';
      ctx.fillRect(VW / 2 - 6, VH / 2 - 8, 4, 16);
      ctx.fillRect(VW / 2 + 2, VH / 2 - 8, 4, 16);
    }
  }

  function renderMinimap(g) {
    const mw = mini.width, mh = mini.height;
    const sx = mw / g.W, sy = mh / g.H;
    mctx.imageSmoothingEnabled = true;
    mctx.fillStyle = '#10132a';
    mctx.fillRect(0, 0, mw, mh);
    mctx.drawImage(g.terrain.canvas, 0, 0, g.W, g.H, 0, 0, mw, mh);
    mctx.fillStyle = 'rgba(40,110,200,0.9)';
    for (const w of g.water) mctx.fillRect(w.x * sx, w.y * sy, w.w * sx, w.h * sy);
    mctx.fillStyle = 'rgba(255,120,30,0.95)';
    for (const f of g.fire) mctx.fillRect(f.x * sx, (f.y - f.h) * sy, f.w * sx, f.h * sy);
    mctx.fillStyle = '#e0352b';
    mctx.fillRect(g.def.exit.x * sx - 2, g.def.exit.y * sy - 4, 4, 4);
    mctx.fillStyle = '#ffe14d';
    for (const c of g.chickens) mctx.fillRect(Math.round(c.x * sx), Math.round(c.y * sy) - 2, 1, 2);
    mctx.strokeStyle = '#fff';
    mctx.lineWidth = 1;
    mctx.strokeRect(Math.round(g.camX * sx) + 0.5, 0.5, Math.round(VW * sx) - 1, mh - 1);
  }

  // ------------------------------------------------------------------ UI
  const ui = {};
  function setText(el, text) { if (el.textContent !== text) el.textContent = text; }

  function makeButton(cls, html, onClick, title) {
    const b = document.createElement('button');
    if (cls) b.className = cls;
    b.innerHTML = html;
    b.title = title || '';
    b.addEventListener('mousedown', (e) => { e.preventDefault(); Sfx.init(); onClick(e); });
    $('panel').appendChild(b);
    return b;
  }

  function holdRepeat(btn, fn) {
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };
    btn.addEventListener('mousedown', () => { stop(); timer = setInterval(fn, 70); });
    window.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
  }

  function buildPanel() {
    const panel = $('panel');
    panel.innerHTML = '';
    ui.rrMinus = makeButton('', '<span class="num" id="rr-min">50</span><span class="glyph">−</span><span class="lbl">Rate</span>', () => changeRate(-1), 'Decrease release rate (-)');
    ui.rrPlus = makeButton('', '<span class="num" id="rr-cur">50</span><span class="glyph">+</span><span class="lbl">Rate</span>', () => changeRate(1), 'Increase release rate (+)');
    holdRepeat(ui.rrMinus, () => changeRate(-1));
    holdRepeat(ui.rrPlus, () => changeRate(1));
    ui.skillButtons = {};
    SKILLS.forEach((s, i) => {
      const b = makeButton('', `<span class="num"></span><canvas width="14" height="12"></canvas><span class="lbl">${s.name}</span>`,
        () => selectSkill(s.id), `${s.name} (${i + 1})`);
      Sprites.icon(b.querySelector('canvas'), s.icon);
      ui.skillButtons[s.id] = b;
    });
    ui.pause = makeButton('', '<span class="num">&nbsp;</span><span class="glyph">⏸</span><span class="lbl">Pause</span>', togglePause, 'Pause (P)');
    ui.nuke = makeButton('', '<span class="num">&nbsp;</span><span class="glyph">💥</span><span class="lbl">Nuke</span>', pressNuke, 'Nuke: click twice (N N)');
    ui.ff = makeButton('', '<span class="num">&nbsp;</span><span class="glyph">⏩</span><span class="lbl">Fast</span>', toggleFast, 'Fast forward (F)');
  }

  function updateUI(g) {
    setText($('rr-min'), String(g.minRate));
    setText($('rr-cur'), String(g.releaseRate));
    for (const s of SKILLS) {
      const b = ui.skillButtons[s.id];
      const n = g.skills[s.id];
      setText(b.querySelector('.num'), n > 0 ? String(n) : '');
      b.classList.toggle('selected', g.selected === s.id);
      b.classList.toggle('empty', n <= 0);
    }
    ui.pause.classList.toggle('active', g.paused);
    ui.ff.classList.toggle('active', g.fast);
    ui.nuke.classList.toggle('armed', nukeArmedUntil > performance.now() || g.nuking);
    setText($('out'), String(g.chickens.length));
    setText($('in'), Math.floor(g.saved * 100 / g.def.total) + '%');
    const secs = Math.ceil(g.timeLeft * TICK_MS / 1000);
    setText($('time'), `${Math.floor(secs / 60)}-${String(secs % 60).padStart(2, '0')}`);
    const h = hover.chicken;
    setText($('hover'), h ? `${h.label()} ${hover.count}` : g.paused ? 'Paused' : ' ');
  }

  function showOverlay(title, bodyHtml, buttonText, onClick) {
    $('ov-title').textContent = title;
    $('ov-body').innerHTML = bodyHtml;
    const btn = $('ov-button');
    btn.textContent = buttonText;
    btn.onclick = () => { Sfx.init(); $('overlay').classList.add('hidden'); onClick(); };
    $('overlay').classList.remove('hidden');
  }

  // Unlocked levels are remembered in this browser (if storage is available).
  const Progress = {
    session: 0,
    get() {
      let v = 0;
      try { v = parseInt(localStorage.getItem('flockoff.unlocked') || '0', 10) || 0; } catch (e) { /* no storage */ }
      return Math.min(LEVELS.length - 1, Math.max(v, this.session));
    },
    unlock(i) {
      i = Math.min(LEVELS.length - 1, i);
      this.session = Math.max(this.session, i);
      try { if (i > (parseInt(localStorage.getItem('flockoff.unlocked') || '0', 10) || 0)) localStorage.setItem('flockoff.unlocked', String(i)); } catch (e) { /* ignore */ }
    },
  };

  function showIntro(g) {
    const d = g.def;
    const unlocked = Progress.get();
    const i = g.levelIndex;
    const nav = (dir, ok) => `<button class="nav" data-go="${i + dir}" ${ok ? '' : 'disabled'}>${dir < 0 ? '\u25C0' : '\u25B6'}</button>`;
    showOverlay(`Level ${i + 1} of ${LEVELS.length}`, `
      <div class="levelnav">${nav(-1, i > 0)}<b>${d.name}</b>${nav(1, i < unlocked)}</div>
      <p>Number of chickens: <b>${d.total}</b></p>
      <p>Save at least <b>${d.required}</b> (${Math.round(d.required * 100 / d.total)}%)</p>
      <p>Release rate <b>${d.releaseRate}</b> &middot; Time <b>${fmtTime(d.timeLimit)}</b></p>
      <p style="opacity:.75;font-size:14px;margin-top:10px">${d.hint}</p>`,
    'Let\u2019s cluck!', () => { g.running = true; });
    for (const b of document.querySelectorAll('#ov-body .nav')) {
      b.onclick = () => { Sfx.init(); Sfx.play('select'); startLevel(+b.dataset.go); };
    }
  }

  function fmtTime(secs) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} minute${m === 1 ? '' : 's'}`;
  }

  function showResults(g) {
    const pct = Math.floor(g.saved * 100 / g.def.total);
    const need = Math.round(g.def.required * 100 / g.def.total);
    const won = g.saved >= g.def.required;
    Sfx.play(won ? 'win' : 'lose');
    const msg = won
      ? (g.saved === g.def.total ? 'Every single chicken made it home. Egg-cellent!' : 'Enough chickens made it home to roost. Well done!')
      : (g.saved === 0 ? 'Not a single chicken made it. That’s fowl.' : 'Not enough chickens made it home. Try again!');
    const hasNext = g.levelIndex + 1 < LEVELS.length;
    if (won) Progress.unlock(g.levelIndex + 1);
    setTimeout(() => showOverlay(won ? 'Level complete!' : 'Out of chickens', `
      <p>You rescued <b>${pct}%</b> (${g.saved} of ${g.def.total}).</p>
      <p>You needed <b>${need}%</b>.</p>
      <p style="margin-top:8px">${msg}</p>
      ${won && !hasNext ? '<p style="opacity:.75;font-size:14px">That was the final level. The whole flock salutes you!</p>' : ''}`,
    won && hasNext ? 'Next level' : 'Play again',
    () => startLevel(won && hasNext ? g.levelIndex + 1 : g.levelIndex)), 400);
  }

  // ------------------------------------------------------------------ input
  const mouse = { x: 0, y: 0, inside: false };
  let hover = { chicken: null, count: 0 };
  let nukeArmedUntil = 0;
  const keys = {};
  let game = null;

  function changeRate(d) {
    if (!game || game.finished) return;
    game.releaseRate = Math.max(game.minRate, Math.min(99, game.releaseRate + d));
  }
  function selectSkill(id) {
    if (!game) return;
    if (game.selected !== id) Sfx.play('select');
    game.selected = id;
  }
  function togglePause() { if (game && game.running && !game.finished) game.paused = !game.paused; }
  function toggleFast() { if (game) game.fast = !game.fast; }
  function pressNuke() {
    if (!game || !game.running || game.finished || game.nuking) return;
    const now = performance.now();
    if (nukeArmedUntil > now) { nukeArmedUntil = 0; game.nuke(); }
    else nukeArmedUntil = now + 1200;
  }

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    const bw = 3; // border width
    return {
      x: (e.clientX - r.left - bw) / (r.width - bw * 2) * VW,
      y: (e.clientY - r.top - bw) / (r.height - bw * 2) * VH,
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => { mouse.inside = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    Sfx.init();
    if (!game || !game.running || game.finished || e.button !== 0) return;
    const p = canvasPos(e);
    const { chicken } = game.chickenAt(p.x + game.camX, p.y, game.selected);
    if (chicken) game.assign(chicken, game.selected);
  });

  let draggingMini = false;
  function miniJump(e) {
    if (!game) return;
    const r = mini.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * game.W;
    game.camX = Math.max(0, Math.min(game.W - VW, wx - VW / 2));
  }
  mini.addEventListener('mousedown', (e) => { draggingMini = true; miniJump(e); });
  window.addEventListener('mousemove', (e) => { if (draggingMini) miniJump(e); });
  window.addEventListener('mouseup', () => { draggingMini = false; });

  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (!game) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '8') selectSkill(SKILLS[+k - 1].id);
    else if (k === 'p' || k === ' ') { togglePause(); e.preventDefault(); }
    else if (k === 'f') toggleFast();
    else if (k === 'n') pressNuke();
    else if (k === 'm') Sfx.toggleMute();
    else if (k === 'r' && game.running) { $('overlay').classList.add('hidden'); startLevel(game.levelIndex); }
    else if (k === '-' || k === '_') changeRate(-5);
    else if (k === '=' || k === '+') changeRate(5);
    if (e.key.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  function scroll(g, dt) {
    let dx = 0;
    if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
    if (keys.ArrowRight || keys.d || keys.D) dx += 1;
    if (mouse.inside && !draggingMini) {
      if (mouse.x < 8) dx -= 1;
      else if (mouse.x > VW - 8) dx += 1;
    }
    if (dx) g.camX = Math.max(0, Math.min(g.W - VW, g.camX + dx * dt * 0.18));
  }

  // ------------------------------------------------------------------ layout & loop
  function resize() {
    const avail = Math.min(window.innerWidth - 30, (window.innerHeight - 190) * 2);
    const scale = Math.max(2, Math.floor(avail / VW));
    canvas.style.width = VW * scale + 'px';
    canvas.style.height = VH * scale + 'px';
    $('game').style.width = (VW * scale + 6) + 'px';
  }
  window.addEventListener('resize', resize);

  function startLevel(i) {
    game = new Game(i);
    window.__game = game; // handy for debugging in the console
    hover = { chicken: null, count: 0 };
    nukeArmedUntil = 0;
    acc = 0;
    showIntro(game);
  }

  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(250, now - last);
    last = now;
    const g = game;
    if (g) {
      if (g.running && !g.paused && !g.finished) {
        acc += dt;
        while (acc >= TICK_MS) {
          acc -= TICK_MS;
          for (let i = 0; i < (g.fast ? FAST_MULT : 1) && !g.finished; i++) g.step();
        }
      } else acc = 0;
      scroll(g, dt);
      hover = mouse.inside ? g.chickenAt(mouse.x + g.camX, mouse.y, g.selected) : { chicken: null, count: 0 };
      render(g, now);
      renderMinimap(g);
      updateUI(g);
    }
    requestAnimationFrame(frame);
  }

  buildPanel();
  resize();
  const param = parseInt(new URLSearchParams(location.search).get('level') || '', 10);
  if (param >= 1 && param <= LEVELS.length) { Progress.session = param - 1; startLevel(param - 1); }
  else startLevel(Progress.get());
  requestAnimationFrame(frame);

  // Exposed for automated tests.
  window.FlockOff = { Game, VW, VH, TICK_MS, startLevel, get game() { return game; } };
})();
