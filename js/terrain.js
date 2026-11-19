'use strict';
// Destructible pixel terrain: one material byte + one colour per pixel.
const MAT_EMPTY = 0, MAT_DIRT = 1, MAT_STEEL = 2;

function rgba(r, g, b, a = 255) { return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; }
function hexColor(h) { const n = parseInt(h.slice(1), 16); return rgba(n >> 16, (n >> 8) & 255, n & 255); }

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const u = s(xf), v = s(yf);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

const BRICK_COLORS = [hexColor('#f0cd68'), hexColor('#e2b84e'), hexColor('#d6a840')];

class Terrain {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.mat = new Uint8Array(w * h);
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.image = this.ctx.createImageData(w, h);
    this.px = new Uint32Array(this.image.data.buffer);
    this.dirty = true;
    this.brickCount = 0;
  }

  // Off the left/right edges counts as steel; above the top / below the bottom is air.
  get(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || x >= this.w) return MAT_STEEL;
    if (y < 0 || y >= this.h) return MAT_EMPTY;
    return this.mat[y * this.w + x];
  }
  solid(x, y) { return this.get(x, y) !== MAT_EMPTY; }

  // ---- level painting helpers ----
  fill(x0, y0, w, h, m = MAT_DIRT) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y0 + h); y++)
      for (let x = Math.max(0, x0); x < Math.min(this.w, x0 + w); x++) this.mat[y * this.w + x] = m;
  }
  fillEllipse(cx, cy, rx, ry, m = MAT_DIRT) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      if (y < 0 || y >= this.h) continue;
      const dy = (y - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const half = rx * Math.sqrt(1 - dy * dy);
      for (let x = Math.ceil(cx - half); x <= cx + half; x++)
        if (x >= 0 && x < this.w) this.mat[y * this.w + x] = m;
    }
  }
  // Fill each column x in [x0,x1) from topFn(x) down to `bottom`.
  fillSurface(x0, x1, topFn, bottom, m = MAT_DIRT) {
    for (let x = x0; x < x1; x++) {
      const top = Math.round(topFn(x));
      for (let y = Math.max(0, top); y < Math.min(this.h, bottom); y++) this.mat[y * this.w + x] = m;
    }
  }
  carve(x0, y0, w, h) { this.fill(x0, y0, w, h, MAT_EMPTY); }

  // Give every pixel its colour: grassy tops, textured soil, riveted steel plates.
  colorize(seed) {
    const { w, h, mat, px } = this;
    const grass = [hexColor('#7ccf4e'), hexColor('#62b43c'), hexColor('#4c9a30'), hexColor('#3b7d27')];
    const soilA = [0x8b, 0x5a, 0x2b], soilB = [0x5e, 0x3a, 0x1c];
    const pebble = hexColor('#b08a5e'), dark = hexColor('#3e2512');
    for (let x = 0; x < w; x++) {
      let run = 0;
      for (let y = 0; y < h; y++) {
        const i = y * w + x;
        const m = mat[i];
        if (m === MAT_EMPTY) { run = 0; px[i] = 0; continue; }
        run++;
        if (m === MAT_STEEL) { px[i] = this.steelColor(x, y); continue; }
        if (run <= 4) {
          const jitter = hash2(x, y, seed) < 0.3 ? 1 : 0;
          px[i] = grass[Math.min(3, run - 1 + jitter)];
          continue;
        }
        const r = hash2(x, y, seed + 7);
        if (r < 0.025) { px[i] = pebble; continue; }
        if (r < 0.05) { px[i] = dark; continue; }
        let t = valueNoise(x / 7, y / 5, seed) * 0.7 + valueNoise(x / 2.5, y / 2.5, seed + 3) * 0.3;
        t += Math.sin(y * 0.35 + valueNoise(x / 20, 0, seed) * 6) * 0.08; // strata
        t = Math.max(0, Math.min(1, t));
        px[i] = rgba(
          Math.round(soilA[0] * t + soilB[0] * (1 - t)),
          Math.round(soilA[1] * t + soilB[1] * (1 - t)),
          Math.round(soilA[2] * t + soilB[2] * (1 - t)));
      }
    }
    this.dirty = true;
  }

  steelColor(x, y) {
    const lx = ((x % 12) + 12) % 12, ly = ((y % 8) + 8) % 8;
    if (lx === 0 || ly === 0) return hexColor('#c3cad6');
    if (lx === 11 || ly === 7) return hexColor('#4d5462');
    if ((lx === 2 || lx === 9) && (ly === 2 || ly === 5)) return hexColor('#e6ebf2');
    return (lx + ly) % 7 === 0 ? hexColor('#8790a0') : hexColor('#7b8494');
  }

  // ---- runtime modification ----
  addBrick(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = y * this.w + x;
    if (this.mat[i] !== MAT_EMPTY) return;
    this.mat[i] = MAT_DIRT;
    const c = ((x % 6) + 6) % 6 === 0 ? 2 : (y & 1);
    this.px[i] = BRICK_COLORS[c];
    this.dirty = true;
  }

  erase(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return false;
    const i = y * this.w + x;
    if (this.mat[i] !== MAT_DIRT) return false;
    this.mat[i] = MAT_EMPTY;
    this.px[i] = 0;
    this.dirty = true;
    return true;
  }

  // Inclusive rectangle [x0..x1] x [y0..y1] (x0 may be greater than x1).
  scan(x0, x1, y0, y1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    let dirt = false, steel = false;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const m = this.get(x, y);
        if (m === MAT_DIRT) dirt = true; else if (m === MAT_STEEL && y >= 0 && y < this.h) steel = true;
      }
    return { dirt, steel };
  }
  eraseRect(x0, x1, y0, y1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.erase(x, y)) n++;
    return n;
  }
  eraseCircle(cx, cy, r) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.erase(x, y);
  }

  flush() {
    if (!this.dirty) return;
    this.ctx.putImageData(this.image, 0, 0);
    this.dirty = false;
  }
}
