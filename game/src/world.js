// Palmshade city layout: a regular road grid with solid blocks between
// the streets, a beach strip along the south edge and a marina in the
// south-west corner. Everything here is plain data plus collision helpers.

export const WORLD_W = 2560;
export const WORLD_H = 1920;
export const ROAD = 96;       // street width in pixels
export const PITCH = 320;     // distance between street centrelines

const PALETTE = ["#e2725b", "#e8a15c", "#d95f76", "#5ba8a0", "#7d6fb8", "#c9a227", "#4f86c6", "#8a9a5b"];

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Vertical streets sit at x = PITCH*i + ROAD/2 centres; blocks fill the gaps.
export function buildCity(seed = 7) {
  const rnd = mulberry(seed);
  const buildings = [];
  const palms = [];
  for (let bx = 0; bx < WORLD_W / PITCH; bx++) {
    for (let by = 0; by < WORLD_H / PITCH; by++) {
      const x0 = bx * PITCH + ROAD + 14;
      const y0 = by * PITCH + ROAD + 14;
      const w = PITCH - ROAD - 28;
      const h = PITCH - ROAD - 28;
      // Split most blocks into two buildings with a small alley between.
      const split = rnd() > 0.35;
      const colour = PALETTE[Math.floor(rnd() * PALETTE.length)];
      if (split) {
        const hw = (w - 16) / 2;
        buildings.push({ x: x0, y: y0, w: hw, h, c: colour, roof: shade(colour) });
        buildings.push({ x: x0 + hw + 16, y: y0, w: hw, h, c: PALETTE[Math.floor(rnd() * PALETTE.length)], roof: "#3d4a52" });
      } else {
        buildings.push({ x: x0, y: y0, w, h, c: colour, roof: shade(colour) });
      }
      for (let p = 0; p < 3; p++) palms.push({ x: bx * PITCH + ROAD / 2 + (rnd() - 0.5) * 40, y: by * PITCH + rnd() * PITCH });
    }
  }
  return { buildings, palms };
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * 0.62)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function hitsBuilding(x, y, r, buildings) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps; returns corrected position.
export function pushOut(x, y, r, buildings) {
  const b = hitsBuilding(x, y, r, buildings);
  if (!b) return { x, y, hit: false };
  const left = x + r - b.x, right = b.x + b.w - (x - r);
  const top = y + r - b.y, bottom = b.y + b.h - (y - r);
  const m = Math.min(left, right, top, bottom);
  if (m === left) x = b.x - r; else if (m === right) x = b.x + b.w + r;
  else if (m === top) y = b.y - r; else y = b.y + b.h + r;
  return { x, y, hit: true };
}

export const clampWorld = (v, max) => Math.max(24, Math.min(max - 24, v));
