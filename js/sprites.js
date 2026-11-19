'use strict';
// Pixel-art chicken frames. Each frame faces right; left-facing copies are mirrored.
// '.' = transparent. "anchor" is the column that sits on the chicken's x position;
// the bottom row is drawn just above the chicken's ground row.
const PALETTE = {
  W: '#fbf7ec', // feathers
  G: '#cdbfa6', // feather shading
  R: '#e0352b', // comb / wattle
  O: '#f5a524', // beak / legs
  K: '#1d1d1d', // eye
  Y: '#ecc35a', // straw
};

const FRAMES = {
  walk1: { anchor: 4, rows: [
    '....RR..',
    '....WWW.',
    '....WKWO',
    '....WWRO',
    'W..WWWW.',
    'WWWWWWW.',
    'WGGWWWW.',
    '.WGGWW..',
    '..O..O..',
    '.OO.OO..'] },
  walk2: { anchor: 4, rows: [
    '....RR..',
    '....WWW.',
    '....WKWO',
    '....WWRO',
    'W..WWWW.',
    'WWWWWWW.',
    'WGGWWWW.',
    '.WGGWW..',
    '...OO...',
    '..OOO...'] },
  fall1: { anchor: 4, rows: [
    '....RR..',
    '.W..WWW.',
    'WW..WKWO',
    'WG..WWRO',
    'WGWWWWW.',
    '.WWWWWW.',
    '..WWWWW.',
    '..WWWW..',
    '..O..O..',
    '..O..O..'] },
  fall2: { anchor: 4, rows: [
    '....RR..',
    '....WWW.',
    '....WKWO',
    '....WWRO',
    '..WWWWW.',
    'GWWWWWW.',
    'GW.WWWW.',
    '...WWW..',
    '..O..O..',
    '..O..O..'] },
  float1: { anchor: 6, rows: [
    '.....RR.....',
    '.....WW.....',
    '....WKKW....',
    '.....OO.....',
    'WW..WWWW..WW',
    'GWWWWWWWWWWG',
    '..GWWWWWWG..',
    '....WWWW....',
    '....O..O....',
    '....O..O....'] },
  float2: { anchor: 6, rows: [
    '.....RR.....',
    '.....WW.....',
    '....WKKW....',
    '.....OO.....',
    '....WWWW....',
    '..WWWWWWWW..',
    'GWWWWWWWWWWG',
    'GG..WWWW..GG',
    '....O..O....',
    '....O..O....'] },
  block1: { anchor: 5, rows: [
    '....RR....',
    '....WW....',
    '...WKKW...',
    '....OO....',
    'W..WRRW..W',
    'WWWWWWWWWW',
    'G.WWWWWW.G',
    '...WWWW...',
    '...O..O...',
    '..OO..OO..'] },
  block2: { anchor: 5, rows: [
    '....RR....',
    '....WW....',
    '...WGGW...',
    '....OO....',
    'W..WRRW..W',
    'WWWWWWWWWW',
    'G.WWWWWW.G',
    '...WWWW...',
    '...O..O...',
    '..OO..OO..'] },
  ohno: { anchor: 5, rows: [
    'W...RR...W',
    'W...WW...W',
    'WW.WKKW.WW',
    '.W..OO..W.',
    '.WWWWWWWW.',
    '..WWWWWW..',
    '..WWWWWW..',
    '...WWWW...',
    '...O..O...',
    '..OO..OO..'] },
  dig1: { anchor: 4, rows: [
    '........',
    '........',
    'W.......',
    'WWWWWW..',
    'WGWWWWW.',
    '.WGGWWRR',
    '..WWWWKW',
    '...O.WWO',
    '..O..O.O',
    '.OO.OO..'] },
  dig2: { anchor: 4, rows: [
    '........',
    'W.......',
    'WW..RR..',
    'WWWWWWW.',
    'WGWWWKWO',
    '.WGGWWRO',
    '..WWWW..',
    '...WW...',
    '..O..O..',
    '.OO.OO..'] },
  bash1: { anchor: 4, rows: [
    '.....RR..',
    '.....WWW.',
    '.....WKWO',
    'W...WWWRO',
    'WWWWWWW..',
    'WGGWWWW..',
    '.WGGWW...',
    '..WWW....',
    '..O..O...',
    '.OO.OO...'] },
  bash2: { anchor: 4, rows: [
    '..........',
    '......RR..',
    'W.....WWW.',
    'WWWWWWWKWO',
    'WGGWWWWWRO',
    '.WGGWWW...',
    '..WWWW....',
    '...WW.....',
    '..O..O....',
    '.OO.OO....'] },
  build1: { anchor: 4, rows: [
    '....RR...',
    '....WWW..',
    '....WKWOY',
    '....WWRY.',
    'W..WWWW..',
    'WWWWWWW..',
    'WGGWWWW..',
    '.WGGWW...',
    '..O..O...',
    '.OO.OO...'] },
  climb1: { anchor: 6, rows: [
    '......R.',
    '.....RW.',
    '....WWKO',
    '...WWWWO',
    '..WWWWW.',
    '.WGWWWW.',
    '.WGGWWW.',
    '..WWWWO.',
    '...WWOO.',
    '....O...'] },
  climb2: { anchor: 6, rows: [
    '......R.',
    '.....RW.',
    '....WWKO',
    '...WWWWO',
    '..WWWWWO',
    '.WGWWWWO',
    '.WGGWWW.',
    '..WWWW..',
    '...WW.O.',
    '....OO..'] },
  splat: { anchor: 5, rows: [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '...W..W...',
    '.W.WWRW.W.',
    'WWGWWWWGWW',
    'GWWWWWWWWG'] },
};

const Sprites = (() => {
  const cache = {};

  function render(rows, mirror) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let r = 0; r < h; r++) {
      for (let col = 0; col < w; col++) {
        const ch = rows[r][col];
        if (ch === '.' || !PALETTE[ch]) continue;
        x.fillStyle = PALETTE[ch];
        x.fillRect(mirror ? w - 1 - col : col, r, 1, 1);
      }
    }
    return c;
  }

  for (const [name, f] of Object.entries(FRAMES)) {
    const w = f.rows[0].length;
    cache[name] = {
      w, h: f.rows.length,
      right: render(f.rows, false), left: render(f.rows, true),
      ar: f.anchor, al: w - 1 - f.anchor,
    };
  }

  return {
    // Draw frame so its bottom row sits just above ground row `y`.
    draw(ctx, name, dir, x, y) {
      const f = cache[name];
      if (!f) return;
      const img = dir >= 0 ? f.right : f.left;
      const ax = dir >= 0 ? f.ar : f.al;
      ctx.drawImage(img, Math.round(x - ax), Math.round(y - f.h));
    },
    // Draw a frame centred inside a small icon canvas.
    icon(canvas, name) {
      const f = cache[name];
      const x = canvas.getContext('2d');
      x.clearRect(0, 0, canvas.width, canvas.height);
      x.drawImage(f.right, Math.floor((canvas.width - f.w) / 2), Math.floor((canvas.height - f.h) / 2));
    },
  };
})();

// 3x5 digits for the exploder countdown.
const DIGITS = [
  '111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111',
];
function drawDigit(ctx, d, x, y) {
  const bits = DIGITS[d] || DIGITS[0];
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 1, y - 1, 5, 7);
  ctx.fillStyle = '#ffe14d';
  for (let i = 0; i < 15; i++) if (bits[i] === '1') ctx.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1);
}
