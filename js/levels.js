'use strict';
// Level definitions. Each level paints its own terrain with the Terrain helpers.
const LEVELS = [
  {
    name: 'Why Did the Chicken Cross the Barnyard?',
    hint: 'Bash the rock, bridge the pit, dig down, then get past the hill and the pond.',
    width: 960,
    height: 160,
    seed: 1337,
    theme: 'dusk',
    total: 20,
    required: 12,
    releaseRate: 50,
    timeLimit: 300, // seconds
    skills: { climber: 2, floater: 2, bomber: 4, blocker: 4, builder: 8, basher: 5, miner: 3, digger: 4 },
    entrance: { x: 48, y: 30 },
    exit: { x: 905, y: 114 },
    water: [
      { x: 262, y: 140, w: 24, h: 20 },
      { x: 740, y: 126, w: 24, h: 34 },
    ],
    paint(t) {
      // Steel walls at both ends of the world.
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(952, 0, 8, 114, MAT_STEEL);

      // Starting meadow: a big earth bank with a gently rolling top.
      t.fillSurface(8, 262, (x) => 60 - (1.2 + Math.sin(x * 0.07) * 1.2 + Math.sin(x * 0.19 + 1) * 0.8), 160);

      // Rock pillar penning the flock in (bash it, or climb it).
      t.fill(180, 22, 16, 40);
      t.fillEllipse(188, 22, 8, 6);

      // Right bank of the pit, with a lip that stops chickens walking back into it.
      t.fill(286, 60, 34, 100);
      t.fill(286, 50, 7, 10);

      // Plateau above the cavern (dig through it).
      t.fill(320, 60, 180, 20);

      // Steel wall at the end of the plateau.
      t.fill(500, 12, 10, 73, MAT_STEEL);

      // Lower ground running all the way to the barn.
      t.fill(320, 114, 632, 46);

      // A big round hill in the way.
      t.fillEllipse(655, 118, 36, 44);

      // The duck pond (chickens can't swim!).
      t.carve(740, 114, 24, 46);

      // A couple of steel plates as decoration / foundations.
      t.fill(880, 114, 50, 6, MAT_STEEL);
    },
  },

  // ---------------------------------------------------------------- 2
  {
    name: 'Mind the Gap',
    hint: 'Nothing pens them in this time. A Blocker can hold the flock while a Builder works, and an Exploder can clear the Blocker afterwards.',
    width: 720, height: 160, seed: 202, theme: 'dawn',
    total: 20, required: 15, releaseRate: 50, timeLimit: 300,
    skills: { climber: 0, floater: 0, bomber: 3, blocker: 3, builder: 4, basher: 1, miner: 0, digger: 0 },
    entrance: { x: 40, y: 50 },
    exit: { x: 650, y: 100 },
    water: [{ x: 200, y: 132, w: 24, h: 28 }, { x: 440, y: 132, w: 24, h: 28 }],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(712, 0, 8, 160, MAT_STEEL);
      const top = (x) => 100 - Math.round(Math.sin(x * 0.05) * 1.2);
      t.fillSurface(8, 200, top, 160);
      t.fillSurface(224, 440, top, 160);
      t.fillSurface(464, 712, top, 160);
      t.fillEllipse(330, 140, 12, 7, MAT_STEEL); // buried boulder
    },
  },

  // ---------------------------------------------------------------- 3
  {
    name: 'Steel Yourself',
    hint: 'Steel cannot be dug, bashed or blown up, but you can always go underneath it.',
    width: 800, height: 160, seed: 303, theme: 'dusk',
    total: 20, required: 15, releaseRate: 50, timeLimit: 300,
    skills: { climber: 1, floater: 1, bomber: 2, blocker: 1, builder: 1, basher: 2, miner: 2, digger: 1 },
    entrance: { x: 80, y: 30 },
    exit: { x: 720, y: 140 },
    water: [],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(792, 0, 8, 160, MAT_STEEL);
      t.fillSurface(8, 400, (x) => (x < 260 ? 60 - Math.round(1 + Math.sin(x * 0.08)) : 60), 160);
      t.fill(400, 85, 12, 75);
      t.fill(400, 20, 12, 65, MAT_STEEL);      // the steel gate
      t.fill(412, 140, 380, 20);               // low ground
      t.fillEllipse(560, 142, 30, 36);         // hill
      t.fill(640, 152, 40, 8, MAT_STEEL);
    },
  },

  // ---------------------------------------------------------------- 4
  {
    name: 'Stairway to Hen-ven',
    hint: 'One staircase isn’t tall enough. Give the same chicken another Builder when it shrugs.',
    width: 760, height: 160, seed: 404, theme: 'day',
    total: 20, required: 16, releaseRate: 55, timeLimit: 270,
    skills: { climber: 2, floater: 1, bomber: 2, blocker: 2, builder: 5, basher: 1, miner: 0, digger: 1 },
    entrance: { x: 60, y: 80 },
    exit: { x: 690, y: 102 },
    water: [{ x: 540, y: 140, w: 26, h: 20 }],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(752, 0, 8, 160, MAT_STEEL);
      t.fillSurface(8, 360, (x) => 130 - Math.round(Math.sin(x * 0.06)), 160);
      t.fill(360, 102, 180, 58);               // the cliff
      t.fill(566, 102, 186, 58);
      t.fill(470, 120, 30, 10, MAT_STEEL);
    },
  },

  // ---------------------------------------------------------------- 5
  {
    name: 'Hot Foot',
    hint: 'Someone left the barbecue on. Bridge high over the first fire and go under the second. A Climber can get ahead of the flock.',
    width: 800, height: 160, seed: 505, theme: 'sunset',
    total: 20, required: 17, releaseRate: 50, timeLimit: 300,
    skills: { climber: 2, floater: 1, bomber: 1, blocker: 1, builder: 3, basher: 1, miner: 0, digger: 1 },
    entrance: { x: 60, y: 60 },
    exit: { x: 600, y: 150 },
    water: [],
    fire: [{ x: 330, y: 110, w: 30, h: 10 }, { x: 560, y: 110, w: 40, h: 10 }],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(792, 0, 8, 160, MAT_STEEL);
      t.fillSurface(8, 480, (x) => (x < 190 ? 110 - Math.round(1 + Math.sin(x * 0.07)) : 110), 160);
      t.fill(200, 70, 14, 40);                 // pen wall
      t.fillEllipse(207, 72, 7, 5);
      t.fill(480, 110, 160, 10);               // thin crust over the cave
      t.fill(480, 150, 312, 10);               // cave floor
      t.fill(640, 110, 152, 40);
    },
  },

  // ---------------------------------------------------------------- 6
  {
    name: 'Tunnel Vision',
    hint: 'Deep underground. When the Basher hits steel, try a different direction.',
    width: 880, height: 160, seed: 606, theme: 'cave',
    total: 20, required: 16, releaseRate: 50, timeLimit: 300,
    skills: { climber: 0, floater: 0, bomber: 2, blocker: 2, builder: 2, basher: 3, miner: 2, digger: 1 },
    entrance: { x: 60, y: 36 },
    exit: { x: 800, y: 140 },
    water: [{ x: 522, y: 146, w: 26, h: 14 }],
    paint(t) {
      t.fill(0, 0, 880, 160);
      t.carve(8, 5, 192, 85);                  // starting chamber
      t.fillEllipse(130, 6, 30, 6);            // stalactite lump
      t.fill(300, 60, 16, 33, MAT_STEEL);      // steel block in the way
      t.carve(322, 100, 200, 40);              // cavern
      t.fill(440, 100, 14, 40);                // rock pillar
      t.carve(522, 100, 26, 60);               // underground pool
      t.carve(548, 100, 324, 40);
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(872, 0, 8, 160, MAT_STEEL);
    },
  },

  // ---------------------------------------------------------------- 7
  {
    name: 'Ka-Bwak!',
    hint: 'The way out is high up and the bottom is all steel. Build up first, then break through.',
    width: 720, height: 160, seed: 707, theme: 'night',
    total: 20, required: 16, releaseRate: 55, timeLimit: 270,
    skills: { climber: 1, floater: 0, bomber: 2, blocker: 1, builder: 4, basher: 1, miner: 0, digger: 1 },
    entrance: { x: 60, y: 50 },
    exit: { x: 650, y: 100 },
    water: [{ x: 520, y: 128, w: 24, h: 32 }],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(712, 0, 8, 160, MAT_STEEL);
      t.fill(8, 100, 704, 60);
      t.fill(8, 100, 292, 8, MAT_STEEL);       // steel floor in the pen
      t.fill(300, 60, 41, 34);                 // dirt block
      t.fill(300, 94, 41, 6, MAT_STEEL);       // steel step underneath it
      t.fill(290, 0, 60, 60, MAT_STEEL);       // girder above
      t.carve(520, 100, 24, 60);               // pond
    },
  },

  // ---------------------------------------------------------------- 8
  {
    name: 'The Long Drop',
    hint: 'That cliff is far too high to jump. Go down through the rock, but watch out for the steel slab.',
    width: 840, height: 160, seed: 808, theme: 'day',
    total: 20, required: 17, releaseRate: 50, timeLimit: 270,
    skills: { climber: 0, floater: 2, bomber: 1, blocker: 2, builder: 2, basher: 2, miner: 2, digger: 1 },
    entrance: { x: 60, y: 15 },
    exit: { x: 790, y: 140 },
    water: [{ x: 600, y: 148, w: 24, h: 12 }],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(832, 0, 8, 160, MAT_STEEL);
      t.fillSurface(8, 360, (x) => (x < 180 ? 40 - Math.round(1 + Math.sin(x * 0.09)) : 40), 160);
      t.fill(200, 70, 141, 7, MAT_STEEL);      // buried steel slab
      t.fill(360, 140, 472, 20);
      t.carve(600, 140, 24, 20);
      t.fillEllipse(720, 144, 26, 34);
    },
  },

  // ---------------------------------------------------------------- 9
  {
    name: 'Pecking Order',
    hint: 'Twice the chickens, and they come out faster. Keep things orderly.',
    width: 900, height: 160, seed: 909, theme: 'dawn',
    total: 40, required: 32, releaseRate: 70, timeLimit: 300,
    skills: { climber: 1, floater: 1, bomber: 2, blocker: 3, builder: 3, basher: 3, miner: 1, digger: 2 },
    entrance: { x: 60, y: 40 },
    exit: { x: 830, y: 128 },
    water: [{ x: 300, y: 140, w: 26, h: 20 }],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(892, 0, 8, 160, MAT_STEEL);
      t.fillSurface(8, 300, (x) => (x < 200 ? 70 - Math.round(1 + Math.sin(x * 0.1)) : 70), 160);
      t.fill(220, 30, 14, 40);                 // pen wall
      t.fillEllipse(227, 31, 7, 5);
      t.fill(326, 70, 234, 26);                // plateau
      t.fill(326, 60, 7, 10);                  // lip
      t.fill(326, 96, 34, 64);
      t.fill(560, 20, 10, 80, MAT_STEEL);
      t.fill(360, 128, 532, 32);               // cavern floor
      t.fill(700, 90, 16, 38);                 // rock wall
    },
  },

  // ---------------------------------------------------------------- 10
  {
    name: 'Two Coops, One Barn',
    hint: 'Two hatches this time, and the barn is up on the tower. You will need a very tall staircase.',
    width: 900, height: 160, seed: 1010, theme: 'sunset',
    total: 30, required: 26, releaseRate: 55, timeLimit: 300,
    skills: { climber: 2, floater: 2, bomber: 1, blocker: 1, builder: 5, basher: 1, miner: 1, digger: 2 },
    entrances: [{ x: 60, y: 30 }, { x: 425, y: 30 }],
    exit: { x: 820, y: 70 },
    water: [],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(892, 0, 8, 160, MAT_STEEL);
      t.fillSurface(8, 240, (x) => 60 - Math.round(1 + Math.sin(x * 0.07)), 160);
      t.fill(240, 118, 652, 42);               // valley floor
      t.fill(380, 60, 90, 16);                 // floating island
      t.fill(374, 36, 6, 40, MAT_STEEL);
      t.fill(470, 36, 6, 40, MAT_STEEL);
      t.fill(740, 70, 152, 48);                // tower
      t.fill(740, 70, 6, 20, MAT_STEEL);
    },
  },

  // ---------------------------------------------------------------- 11
  {
    name: 'The Final Roost',
    hint: 'Everything you have learned. Send a Climber ahead to clear the way before you let the flock go.',
    width: 1200, height: 160, seed: 1111, theme: 'night',
    total: 40, required: 36, releaseRate: 60, timeLimit: 360,
    skills: { climber: 2, floater: 2, bomber: 3, blocker: 3, builder: 8, basher: 3, miner: 2, digger: 1 },
    entrance: { x: 60, y: 25 },
    exit: { x: 1110, y: 116 },
    water: [{ x: 700, y: 148, w: 24, h: 12 }],
    fire: [{ x: 420, y: 140, w: 30, h: 10 }],
    paint(t) {
      t.fill(0, 0, 8, 160, MAT_STEEL);
      t.fill(1192, 0, 8, 160, MAT_STEEL);
      t.fillSurface(8, 300, (x) => (x < 160 ? 50 - Math.round(1 + Math.sin(x * 0.08)) : 50), 160);
      t.fill(180, 80, 101, 7, MAT_STEEL);      // buried slab
      t.fill(300, 140, 892, 20);               // low ground
      t.fill(360, 100, 14, 40);                // pen wall
      t.fillEllipse(367, 101, 7, 5);
      t.fillEllipse(560, 144, 34, 40);         // hill...
      t.fill(548, 128, 24, 12, MAT_STEEL);     // ...with a steel heart
      t.carve(700, 140, 24, 20);               // pond
      t.fill(724, 130, 6, 10);                 // lip
      t.fill(1000, 116, 192, 24);              // tower
    },
  },
];
