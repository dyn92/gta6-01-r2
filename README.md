[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dyn92/gta6-01-r2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dyn92/gta6-01-r2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Palmshade Heat

An original 2D top-down open-world crime game for the browser, built for
make.fun's "Make GTA 6" bounty. You play Nia Sol, a dockside courier in the
tropical port city of Palmshade who owes the wrong people money. Run
pickup-and-drop fares, stack cash, steal a faster ride when you need one —
and shake the Palmshade PD before three stars turn into handcuffs.

Everything is original: the city, names, art and code were written for this
entry. No assets, no libraries, no network requests — the game runs fully
offline from the static files under `game/`.

## How to play

- **WASD / arrow keys** — walk, or steer and drive while in a car
- **E** — get into the nearest car (yours is turquoise; taking someone
  else's raises your wanted level), or step out again
- **Space** — handbrake
- **Shift** — sprint on foot
- **P** — pause

Pick up the passenger at the blue **P** marker, then reach the gold **$**
marker before the fare timer runs out. Each completed fare pays cash.
Finish six fares to pay off Nia's debt and win. Speeding past pedestrians,
crashing hard, and stealing cars all raise your heat: at one to three
wanted stars, police cruisers hunt you. If a cruiser pins you while you
are slow, the bust meter fills — get moving or get **BUSTED**. Break line
of sight and put distance between you and the cruisers to cool the heat.

## Run it locally

```sh
node serve.ts
```

then open <http://localhost:8080/>. Requires Node 22 or later; there is
nothing to install.

Deterministic scenes for screenshots live behind a query string, for
example `?scene=chase&seed=7` (also accepted as `#scene=chase`). Scenes:
`cover`, `drive`, `chase`, `mission`. Without a scene the game opens on
its title screen and waits for **START ENGINE**.

## How the grader runs it

```sh
node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory
(`$MAKEFUN_OUTPUT_DIR`, default `/output`), validates that there are 3–4
screenshots of at most 256 KiB each, and writes `dossier.json` there using
`buildDossier` from the vendored `vendor/makefun-game.ts`.

## Features

- A 2560×1920 city: road grid, solid city blocks with collision, palms,
  a beach and bay along the south edge
- Walking and driving with simple arcade car physics, plus cars you can
  enter, drive and abandon anywhere
- Animated traffic that follows the street grid and turns at junctions,
  and wandering pedestrians
- Police AI with a three-star wanted system, pursuit steering, a bust
  meter, and heat that cools when you break away
- Timed pickup-and-drop missions with cash fares and a six-fare win arc
- HUD with cash, wanted stars and mission text, plus a live minimap
  showing your position, the mission target and police cruisers
- Title screen, pause, BUSTED / WASTED-style end cards and restart

## Layout

- `main.ts` — grader entrypoint (staging + dossier)
- `serve.ts` — dependency-free static server for local playtests
- `game/index.html`, `game/style.css` — page shell and HUD styling
- `game/src/world.js` — city generation and collision
- `game/src/entities.js` — vehicle physics, traffic and police steering
- `game/src/main.js` — game loop, rendering, missions and heat
- `screenshots/` — four 1280×720 renders of the game itself
- `shots.json` — the screenshot scene list

MIT licensed — see `LICENSE`.
