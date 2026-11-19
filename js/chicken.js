'use strict';
// A single chicken and its state machine.
// Coordinates: (x, y) where y is the terrain row directly beneath the chicken's feet.
// The chicken's body occupies rows y-10 .. y-1.

const SPLAT_HEIGHT = 62;   // falls longer than this are fatal (unless flapping)
const FLOAT_AFTER = 16;    // flappers open their wings after falling this far
const STEP_UP = 6;         // max height a walker can step up
const STEP_DOWN = 3;       // max height a walker can step down without falling
const FUSE_TICKS = 83;     // ~5 seconds
const BRICKS_PER_BUILD = 12;

const ACTIVE_STATES = new Set(['walking', 'falling', 'floating', 'climbing', 'building', 'bashing',
  'mining', 'digging', 'blocking', 'shrugging', 'ohno']);
const TASK_STATES = new Set(['walking', 'shrugging', 'building', 'bashing', 'mining', 'digging']);

class Chicken {
  constructor(x, y) {
    this.id = Chicken.nextId++;
    this.x = x; this.y = y;
    this.dir = 1;
    this.state = 'falling';
    this.fall = 0;
    this.anim = 0;
    this.timer = 0;
    this.climber = false;
    this.floater = false;
    this.fuse = -1;
    this.bricks = 0;
    this.dead = false;
  }

  get active() { return ACTIVE_STATES.has(this.state); }

  set(state) {
    this.state = state;
    this.timer = 0;
    if (state === 'falling') this.fall = 0;
  }

  // Walk-off handling: step down a little or start falling.
  settle(T) {
    if (T.solid(this.x, this.y)) return true;
    for (let d = 1; d <= STEP_DOWN; d++) {
      if (T.solid(this.x, this.y + d)) { this.y += d; return true; }
    }
    this.set('falling');
    return false;
  }

  update(g) {
    const T = g.terrain;
    this.anim++;
    this.timer++;

    if (this.fuse > 0 && this.active) {
      this.fuse--;
      if (this.fuse === 0) {
        if (this.state === 'falling' || this.state === 'floating' || this.state === 'climbing') {
          g.explode(this); return;
        }
        this.set('ohno');
        Sfx.play('ohno');
      }
    }

    switch (this.state) {
      case 'walking': this.walk(g, T); break;
      case 'falling': this.doFall(g, T); break;
      case 'floating': this.doFloat(T); break;
      case 'climbing': this.climb(T); break;
      case 'building': this.build(T); break;
      case 'bashing': this.bash(T); break;
      case 'mining': this.mine(T); break;
      case 'digging': this.dig(T); break;
      case 'blocking':
        if (!T.solid(this.x, this.y)) this.set('falling');
        break;
      case 'shrugging':
        if (!T.solid(this.x, this.y)) this.set('falling');
        else if (this.timer >= 12) this.set('walking');
        break;
      case 'ohno':
        if (!T.solid(this.x, this.y)) this.y += 2;
        if (this.timer >= 16) { g.explode(this); return; }
        break;
      case 'splatting': if (this.timer >= 16) g.lose(this); return;
      case 'drowning': if (this.timer >= 24) g.lose(this); return;
      case 'exiting': if (this.timer >= 10) g.save(this); return;
    }
    if (this.dead) return;

    if (this.active && g.inWater(this.x, this.y)) {
      this.set('drowning'); this.fuse = -1; Sfx.play('drown');
    } else if (this.active && this.state !== 'blocking' && this.state !== 'climbing' && g.atExit(this.x, this.y)) {
      this.set('exiting'); this.fuse = -1; Sfx.play('exit');
    } else if (this.y > T.h + 12) {
      g.lose(this);
    }
  }

  walk(g, T) {
    const nx = this.x + this.dir;
    if (g.blockedBy(this, nx)) { this.dir = -this.dir; return; }
    if (T.solid(nx, this.y - 1)) {
      let h = 0;
      while (h <= STEP_UP && T.solid(nx, this.y - 1 - h)) h++;
      if (h > STEP_UP) {
        if (this.climber) this.set('climbing');
        else this.dir = -this.dir;
        return;
      }
      this.x = nx;
      this.y -= h;
    } else {
      this.x = nx;
      this.settle(T);
    }
  }

  doFall(g, T) {
    for (let i = 0; i < 3; i++) {
      if (T.solid(this.x, this.y)) {
        if (this.fall > SPLAT_HEIGHT) { this.set('splatting'); g.splat(this); }
        else this.set('walking');
        return;
      }
      this.y++;
      this.fall++;
      if (this.floater && this.fall > FLOAT_AFTER) { this.set('floating'); return; }
    }
  }

  doFloat(T) {
    const speed = (this.anim & 1) ? 2 : 1;
    for (let i = 0; i < speed; i++) {
      if (T.solid(this.x, this.y)) { this.set('walking'); return; }
      this.y++;
    }
  }

  climb(T) {
    // Bumped head on an overhang: let go and fall backwards.
    if (T.solid(this.x, this.y - 11)) {
      this.dir = -this.dir;
      this.x += this.dir;
      this.set('falling');
      return;
    }
    if (this.anim % 3 === 0) return; // climbing is slower than walking
    this.y--;
    if (!T.solid(this.x + this.dir, this.y - 1)) {
      // Reached the top: hop onto it.
      this.x += this.dir;
      this.set('walking');
    }
  }

  build(T) {
    if (!T.solid(this.x, this.y)) { this.set('falling'); return; }
    if (this.timer % 8 !== 4) return;
    for (let i = 0; i < 6; i++) T.addBrick(this.x + this.dir * i, this.y - 1);
    this.bricks--;
    if (this.bricks <= 2) Sfx.play('tick');
    this.y -= 1;
    for (let s = 0; s < 3; s++) {
      if (T.solid(this.x + this.dir, this.y - 1) || T.solid(this.x + this.dir, this.y - 8)) {
        this.dir = -this.dir;
        this.set('walking');
        return;
      }
      this.x += this.dir;
    }
    if (this.bricks <= 0) this.set('shrugging');
  }

  bash(T) {
    const d = this.dir;
    if (T.scan(this.x + d, this.x + d * 5, this.y - 10, this.y - 1).steel) {
      Sfx.play('clink'); this.set('walking'); return;
    }
    T.eraseRect(this.x + d, this.x + d * 5, this.y - 10, this.y - 1);
    if (this.timer % 2 === 0) {
      this.x += d;
      if (!this.settle(T)) return;
    }
    if (this.timer > 8 && !T.scan(this.x + d, this.x + d * 10, this.y - 10, this.y - 1).dirt) {
      this.set('walking');
    }
  }

  mine(T) {
    if (this.timer % 3 !== 0) return;
    const d = this.dir, nx = this.x + d, ny = this.y + 1;
    if (T.scan(nx - d, nx + d * 4, ny - 10, ny - 1).steel || T.get(nx, ny) === MAT_STEEL) {
      Sfx.play('clink'); this.set('walking'); return;
    }
    T.eraseRect(nx - d, nx + d * 4, ny - 10, ny - 1);
    this.x = nx; this.y = ny;
    if (!T.solid(this.x, this.y)) this.set('falling');
  }

  dig(T) {
    if (this.timer % 3 !== 0) return;
    if (T.scan(this.x - 4, this.x + 4, this.y, this.y).steel) {
      Sfx.play('clink'); this.set('walking'); return;
    }
    const n = T.eraseRect(this.x - 4, this.x + 4, this.y, this.y);
    if (n === 0) { this.set('falling'); return; }
    this.y++;
  }

  // Name shown when hovering.
  label() {
    const ability = this.climber && this.floater ? 'Athlete' : this.climber ? 'Climber' : this.floater ? 'Flapper' : null;
    const names = {
      walking: ability || 'Walker', falling: 'Faller', floating: 'Flapper', climbing: 'Climber',
      building: 'Builder', bashing: 'Basher', mining: 'Miner', digging: 'Digger', blocking: 'Blocker',
      shrugging: 'Shrugger', ohno: 'Panicking', splatting: 'Splat', drowning: 'Drowning', exiting: 'Home',
    };
    return names[this.state] || this.state;
  }

  frame() {
    const a = this.anim;
    switch (this.state) {
      case 'walking': return (a >> 1) & 1 ? 'walk2' : 'walk1';
      case 'falling': return (a >> 1) & 1 ? 'fall2' : 'fall1';
      case 'floating': return (a >> 2) & 1 ? 'float2' : 'float1';
      case 'climbing': return (a >> 2) & 1 ? 'climb2' : 'climb1';
      case 'building': return this.timer % 8 < 4 ? 'build1' : 'dig2';
      case 'bashing': return (a >> 1) & 1 ? 'bash2' : 'bash1';
      case 'mining': case 'digging': return (a >> 1) & 1 ? 'dig2' : 'dig1';
      case 'blocking': return (a % 40) < 3 ? 'block2' : 'block1';
      case 'shrugging': return 'fall1';
      case 'ohno': return 'ohno';
      case 'splatting': return 'splat';
      default: return (a >> 1) & 1 ? 'walk2' : 'walk1';
    }
  }
}
Chicken.nextId = 1;
