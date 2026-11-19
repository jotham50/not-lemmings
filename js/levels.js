'use strict';
// Level definitions. Each level paints its own terrain with the Terrain helpers.
const LEVELS = [
  {
    name: 'Why Did the Chicken Cross the Barnyard?',
    hint: 'Bash the rock, bridge the pit, dig down, then get past the hill and the pond.',
    width: 960,
    height: 160,
    seed: 1337,
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
];
