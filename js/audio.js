'use strict';
// Tiny synthesised sound effects (no audio files needed).
const Sfx = (() => {
  let ac = null, master = null, muted = false;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.3;
      master.connect(ac.destination);
    } catch (e) { ac = null; }
  }

  function tone(type, f0, f1, dur, vol = 0.4, delay = 0) {
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, freq, delay = 0) {
    const t = ac.currentTime + delay;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  const cluck = (p = 1, d = 0) => {
    tone('square', 620 * p, 300 * p, 0.06, 0.18, d);
    tone('square', 820 * p, 380 * p, 0.05, 0.14, d + 0.08);
  };

  const sounds = {
    select: () => tone('square', 1100, 1300, 0.04, 0.08),
    assign: () => cluck(1),
    hatch: () => { tone('sawtooth', 140, 70, 0.45, 0.12); noise(0.3, 0.15, 500); },
    letsgo: () => { cluck(1.2); cluck(1.5, 0.18); tone('square', 900, 1500, 0.25, 0.12, 0.36); },
    pop: () => { noise(0.45, 0.7, 1600); tone('sine', 200, 40, 0.35, 0.5); },
    splat: () => { noise(0.18, 0.5, 500); tone('sine', 140, 50, 0.18, 0.35); },
    drown: () => { for (let i = 0; i < 4; i++) tone('sine', 700 - i * 90, 250, 0.08, 0.15, i * 0.07); },
    exit: () => { tone('square', 700, 1500, 0.12, 0.12); tone('square', 1000, 2000, 0.1, 0.1, 0.1); },
    tick: () => tone('square', 2200, 2200, 0.025, 0.08),
    ohno: () => { tone('triangle', 1100, 400, 0.35, 0.22); },
    clink: () => tone('triangle', 2000, 1700, 0.08, 0.2),
    nuke: () => { cluck(0.8); cluck(0.7, 0.15); cluck(0.6, 0.3); },
    win: () => [0, 0.12, 0.24, 0.4].forEach((d, i) => tone('square', [523, 659, 784, 1046][i], [523, 659, 784, 1046][i], 0.18, 0.12, d)),
    lose: () => [0, 0.2, 0.4].forEach((d, i) => tone('triangle', [392, 330, 262][i], [392, 330, 220][i], 0.3, 0.15, d)),
  };

  return {
    init,
    play(name) {
      if (!ac || muted || !sounds[name]) return;
      try { sounds[name](); } catch (e) { /* ignore */ }
    },
    toggleMute() { muted = !muted; return muted; },
  };
})();
