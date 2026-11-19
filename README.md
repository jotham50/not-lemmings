# Flock Off!

A browser puzzle game about a flock of chickens that walk straight ahead whatever is in front of them. You hand out skills to individual chickens so that enough of the flock gets from the coop to the barn. It's plain JavaScript with no build step and no dependencies.

## Play

Open `index.html` in a browser. Or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## How it works

Chickens drop out of the coop and walk forward on their own. They step up and down small slopes and turn around when they hit a wall. A chicken dies if it falls too far, walks into water or falls off the bottom of the map. Save the required number of chickens before time runs out.

| Key | Skill | What it does |
|-----|-------|--------------|
| 1 | **Climber** | Permanent. Climbs vertical walls. Falls off backwards if it hits an overhang. |
| 2 | **Flapper** | Permanent. Flaps its wings on long falls and lands safely. |
| 3 | **Exploder** | 5-second countdown, then panics and blows a hole in the ground. Doesn't affect steel. |
| 4 | **Blocker** | Stands still and turns other chickens around. |
| 5 | **Builder** | Lays a staircase of 12 straw bricks. Ticks when it is running out. |
| 6 | **Basher** | Tunnels horizontally until there's nothing left to bash. |
| 7 | **Miner** | Tunnels diagonally downwards. |
| 8 | **Digger** | Digs straight down. |

A chicken with both Climber and Flapper is an **Athlete**. Steel plates can't be dug, bashed, mined or blown up.

### Controls

- **Mouse:** pick a skill, then click a chicken. The cursor brackets the chicken that will get the skill.
- **Scrolling:** <kbd>←</kbd>/<kbd>→</kbd> (or <kbd>A</kbd>/<kbd>D</kbd>), push the mouse against the edge of the screen, or click/drag on the mini-map.
- <kbd>-</kbd>/<kbd>+</kbd> or the Rate buttons: change the release rate. It can't go below the level's starting rate.
- <kbd>P</kbd> / <kbd>Space</kbd>: pause.
- <kbd>F</kbd>: fast-forward.
- <kbd>N</kbd> twice, or Nuke twice: every chicken explodes.
- <kbd>M</kbd>: mute.
- <kbd>R</kbd>: restart the level.

## Code layout

```
index.html       page + HUD markup
style.css        HUD styling
js/audio.js      synthesised sound effects (Web Audio)
js/sprites.js    pixel-art chicken frames defined as text, plus a tiny digit font
js/terrain.js    destructible per-pixel terrain (dirt / steel), procedural texturing
js/chicken.js    chicken state machine (walk, fall, climb, float, build, bash, mine, dig, ...)
js/levels.js     level definitions: each level paints its terrain with shape helpers
js/game.js       simulation loop, rendering, input, UI
```

### Adding a level

Add an object to the `LEVELS` array in `js/levels.js`. Give it its size, the number of chickens and how many must be saved, its skill counts, the entrance and exit positions, and any water rectangles. Then write a `paint(t)` function that builds the terrain with `t.fill`, `t.fillEllipse`, `t.fillSurface` and `t.carve`. Pass `MAT_STEEL` to make a part indestructible.

All art, sound, names and levels are original.
