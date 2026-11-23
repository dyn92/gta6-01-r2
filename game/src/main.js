// Palmshade Heat — main loop, rendering, missions and police heat.
// A 2D top-down open-world crime game drawn entirely on one canvas.
import { WORLD_W, WORLD_H, ROAD, PITCH, buildCity, pushOut, clampWorld, mulberry } from "./world.js";
import { CAR_COLOURS, makeCar, driveAI, driveCop, stepCarPhysics } from "./entities.js";

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const mapCanvas = document.getElementById("map");
const mctx = mapCanvas.getContext("2d");
const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
const scene = params.get("scene") || hashParams.get("scene") || "";
const seed = Number(params.get("seed") || hashParams.get("seed") || 7);
const rnd = mulberry(seed * 977 + 13);
const city = buildCity(seed);

const keys = {};
addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key.toLowerCase() === "p" && state.mode === "play") state.paused = !state.paused;
  if (e.key.toLowerCase() === "e") tryToggleCar();
});
addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
const down = (...names) => names.some((n) => keys[n]);

const streetX = (i) => i * PITCH + ROAD / 2;
const streetY = (i) => i * PITCH + ROAD / 2;

const state = {
  mode: "title", paused: false, cash: 0, wanted: 0, heat: 0,
  time: 0, bustTimer: 0, faresDone: 0, message: "",
};
const hero = { x: streetX(1), y: streetY(2), r: 13, angle: 0, speedWalk: 175, car: null, hp: 100 };
const heroCar = makeCar(streetX(1) + 52, streetY(2), 0, "#19b3a6", "hero");
const traffic = [];
for (let i = 0; i < 11; i++) {
  const horiz = i % 2 === 0;
  const c = makeCar(streetX(1 + (i % 7)), streetY(1 + (i % 5)), horiz ? 0 : Math.PI / 2, CAR_COLOURS[i % CAR_COLOURS.length]);
  if (!horiz) { c.x = streetX(1 + (i % 7)); c.y = streetY(1 + (i % 5)) + i * 37; }
  traffic.push(c);
}
const peds = [];
for (let i = 0; i < 14; i++) peds.push({ x: streetX(1 + (i % 7)) + 30, y: 120 + i * 121, a: rnd() * 6.28, t: rnd() * 9, c: CAR_COLOURS[(i * 3) % CAR_COLOURS.length] });
let cops = [];

// ---- missions: pick a passenger up, then reach the drop marker in time ----
let mission = null;
function newMission() {
  const px = streetX(1 + Math.floor(rnd() * 7)), py = streetY(1 + Math.floor(rnd() * 5));
  const dx = streetX(1 + Math.floor(rnd() * 7)), dy = streetY(1 + Math.floor(rnd() * 5));
  const dist = Math.hypot(dx - px, dy - py);
  mission = { stage: "pickup", px, py, dx, dy, left: 38 + dist / 55, fare: Math.round(60 + dist / 9) };
}
function focusPos() { return hero.car ? { x: hero.car.x, y: hero.car.y } : hero; }

function addHeat(amount) {
  state.heat = Math.min(100, state.heat + amount);
  state.wanted = state.heat >= 66 ? 3 : state.heat >= 36 ? 2 : state.heat >= 12 ? 1 : 0;
  const wantCops = state.wanted === 3 ? 3 : state.wanted === 2 ? 2 : state.wanted === 1 ? 1 : 0;
  while (cops.length < wantCops) {
    const f = focusPos();
    cops.push(makeCar(f.x + 520, f.y - 380, 0, "#12263a", "cop"));
  }
  if (state.wanted === 0) cops = [];
}

function tryToggleCar() {
  if (state.mode !== "play") return;
  if (hero.car) {
    hero.x = hero.car.x + 34; hero.y = hero.car.y + 10; hero.car = null;
    state.message = "On foot.";
    return;
  }
  const near = [heroCar, ...traffic].find((c) => Math.hypot(c.x - hero.x, c.y - hero.y) < 58);
  if (near) {
    hero.car = near;
    if (near !== heroCar) { addHeat(16); state.message = "Car taken! The owner called it in."; }
    else state.message = "Your coupe. Drive!";
  }
}

function endGame(title, text) {
  state.mode = "over";
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  $("endcard").classList.remove("hidden");
}
function restart() {
  Object.assign(state, { mode: "play", cash: 0, wanted: 0, heat: 0, bustTimer: 0, faresDone: 0 });
  hero.x = streetX(1); hero.y = streetY(2); hero.car = null; hero.hp = 100;
  heroCar.x = streetX(1) + 52; heroCar.y = streetY(2); heroCar.speed = 0; heroCar.angle = 0;
  cops = []; newMission();
  $("endcard").classList.add("hidden"); $("overlay").classList.add("hidden");
}
$("startBtn").addEventListener("click", restart);
$("againBtn").addEventListener("click", restart);

// ---- deterministic screenshot scenes (also handy for manual testing) ----
function applyScene(name) {
  restart();
  const setCar = (x, y, a) => { heroCar.x = x; heroCar.y = y; heroCar.angle = a; hero.car = heroCar; hero.x = x; hero.y = y; };
  if (name === "cover") {
    hero.x = streetX(2) - 30; hero.y = streetY(3) + 26; hero.car = null;
    heroCar.x = streetX(2) + 34; heroCar.y = streetY(3) + 8; heroCar.angle = 0.5;
    state.message = "Palmshade Bay — find a fare, earn cash, dodge the law.";
  } else if (name === "drive") {
    setCar(streetX(3) + 10, streetY(2), 0); heroCar.speed = 210;
    state.cash = 240; state.message = "Downtown run — traffic everywhere.";
  } else if (name === "chase") {
    setCar(streetX(4), streetY(3), 0); heroCar.speed = 260;
    state.cash = 610; addHeat(80);
    cops.forEach((c, i) => { c.x = heroCar.x - 190 - i * 90; c.y = heroCar.y - 70 + i * 68; c.angle = 0.3; });
    state.message = "Three stars! Lose the cruisers between the blocks.";
  } else if (name === "mission") {
    setCar(streetX(2) + 20, streetY(4), Math.PI / 2); heroCar.speed = 120;
    mission.stage = "drop"; mission.left = 27; state.cash = 380;
    state.message = "Passenger aboard — get to the gold marker before the timer dies.";
  }
}
if (scene) applyScene(scene);

// ---- update ----
function update(dt) {
  if (state.mode !== "play" || state.paused) return;
  state.time += dt;
  const input = { up: down("w", "arrowup"), down: down("s", "arrowdown"), left: down("a", "arrowleft"), right: down("d", "arrowright"), brake: down(" ") };
  if (hero.car) {
    const before = hero.car.speed;
    stepCarPhysics(hero.car, dt, city.buildings, input);
    if (Math.abs(before) > 200 && Math.abs(hero.car.speed) < 60) addHeat(7); // hard crash
    hero.x = hero.car.x; hero.y = hero.car.y;
  } else {
    const run = down("shift") ? 1.55 : 1;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      hero.angle = Math.atan2(my, mx);
      const fixed = pushOut(hero.x + mx * hero.speedWalk * run * dt, hero.y + my * hero.speedWalk * run * dt, hero.r, city.buildings);
      hero.x = clampWorld(fixed.x, WORLD_W); hero.y = clampWorld(fixed.y, WORLD_H);
    }
  }
  for (const c of traffic) if (c !== hero.car) driveAI(c, dt, rnd);
  for (const p of peds) {
    p.t -= dt;
    if (p.t <= 0) { p.a = rnd() * Math.PI * 2; p.t = 2 + rnd() * 5; }
    const f = pushOut(p.x + Math.cos(p.a) * 34 * dt, p.y + Math.sin(p.a) * 34 * dt, 9, city.buildings);
    p.x = f.x; p.y = f.y;
    if (hero.car && Math.abs(hero.car.speed) > 150 && Math.hypot(p.x - hero.car.x, p.y - hero.car.y) < 30) addHeat(10);
  }
  // police pursuit and arrest pressure
  let copClose = false;
  for (const c of cops) {
    const d = driveCop(c, dt, focusPos());
    const fixed = pushOut(c.x, c.y, 22, city.buildings); c.x = fixed.x; c.y = fixed.y;
    if (d < 64) copClose = true;
    if (hero.car && d < 40 && Math.abs(hero.car.speed) < 30) copClose = true;
  }
  const mySpeed = hero.car ? Math.abs(hero.car.speed) : (down("w", "a", "s", "d") ? 120 : 0);
  if (copClose && mySpeed < 55) {
    state.bustTimer += dt;
    if (state.bustTimer > 2.4) return endGame("BUSTED", `The Palmshade PD boxed you in. Fares completed: ${state.faresDone}. Cash seized: $${state.cash}.`);
  } else state.bustTimer = Math.max(0, state.bustTimer - dt * 1.6);
  if (state.wanted === 0 && state.heat > 0) state.heat = Math.max(0, state.heat - dt * 2);
  if (state.heat > 0 && cops.length === 0 && state.wanted > 0) { /* heat cools below */ }
  if (state.wanted > 0 && cops.every((c) => Math.hypot(c.x - hero.x, c.y - hero.y) > 700)) {
    state.heat = Math.max(0, state.heat - dt * 9);
    if (state.heat < 12) { state.wanted = 0; cops = []; state.message = "You lost the heat. Back to work."; }
  }
  // mission flow
  if (mission) {
    const f = focusPos();
    const tx = mission.stage === "pickup" ? mission.px : mission.dx;
    const ty = mission.stage === "pickup" ? mission.py : mission.dy;
    if (Math.hypot(f.x - tx, f.y - ty) < 52) {
      if (mission.stage === "pickup") { mission.stage = "drop"; state.message = "Passenger in! Follow the gold marker."; }
      else {
        state.cash += mission.fare; state.faresDone++;
        state.message = `Fare paid: +$${mission.fare}. Total fares: ${state.faresDone}.`;
        if (state.faresDone >= 6) return endGame("DEBT PAID", `Six fares banked and $${state.cash} in hand — Nia buys her way out of Palmshade. You win!`);
        newMission();
      }
    } else if (mission.stage === "drop") {
      mission.left -= dt;
      if (mission.left <= 0) { state.message = "Passenger bailed — fare lost."; addHeat(4); newMission(); }
    }
  }
}

// ---- drawing ----
function drawCar(c, isHero) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(-21, -9, 48, 26);
  ctx.fillStyle = c.kind === "cop" ? "#16283d" : c.colour;
  ctx.beginPath(); ctx.roundRect(-24, -12, 48, 24, 7); ctx.fill();
  if (c.kind === "cop") { ctx.fillStyle = "#f5f7fa"; ctx.fillRect(-8, -12, 17, 24); }
  ctx.fillStyle = "#bfe8f2"; ctx.fillRect(-4, -9, 15, 18);
  ctx.fillStyle = "#20303a"; ctx.fillRect(-20, -10, 7, 20);
  ctx.fillStyle = "#ffd94d"; ctx.fillRect(22, -10, 3, 6); ctx.fillRect(22, 4, 3, 6);
  if (c.kind === "cop") { ctx.fillStyle = (Math.floor(state.time * 4) % 2 ? "#ff4757" : "#3d8bfd"); ctx.fillRect(-3, -4, 8, 8); }
  if (isHero) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-24, -12, 48, 24, 7); ctx.stroke(); }
  ctx.restore();
}
function draw() {
  const f = focusPos();
  const camX = Math.max(0, Math.min(WORLD_W - 1280, f.x - 640));
  const camY = Math.max(0, Math.min(WORLD_H - 720, f.y - 360));
  ctx.fillStyle = "#2e8b74"; ctx.fillRect(0, 0, 1280, 720); // grass / ground
  ctx.save(); ctx.translate(-camX, -camY);
  // beach along the south edge
  ctx.fillStyle = "#f2dfa0"; ctx.fillRect(0, WORLD_H - 130, WORLD_W, 130);
  ctx.fillStyle = "#39a7c9"; ctx.fillRect(0, WORLD_H - 62, WORLD_W, 62);
  // streets
  ctx.fillStyle = "#39434c";
  for (let i = 0; i <= WORLD_W / PITCH; i++) ctx.fillRect(i * PITCH, 0, ROAD, WORLD_H);
  for (let i = 0; i <= WORLD_H / PITCH; i++) ctx.fillRect(0, i * PITCH, WORLD_W, ROAD);
  ctx.strokeStyle = "#f7d154"; ctx.lineWidth = 3; ctx.setLineDash([22, 18]);
  for (let i = 0; i <= WORLD_W / PITCH; i++) { ctx.beginPath(); ctx.moveTo(i * PITCH + ROAD / 2, 0); ctx.lineTo(i * PITCH + ROAD / 2, WORLD_H); ctx.stroke(); }
  for (let i = 0; i <= WORLD_H / PITCH; i++) { ctx.beginPath(); ctx.moveTo(0, i * PITCH + ROAD / 2); ctx.lineTo(WORLD_W, i * PITCH + ROAD / 2); ctx.stroke(); }
  ctx.setLineDash([]);
  // buildings with roofs and windows
  for (const b of city.buildings) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof; ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
    ctx.fillStyle = "rgba(255,240,170,.85)";
    for (let wx = b.x + 20; wx < b.x + b.w - 14; wx += 26) for (let wy = b.y + 20; wy < b.y + b.h - 14; wy += 26) ctx.fillRect(wx, wy, 9, 9);
  }
  // palms
  for (const p of city.palms) {
    ctx.strokeStyle = "#6b4a2b"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4, p.y - 13); ctx.stroke();
    ctx.strokeStyle = "#2f9e5f"; ctx.lineWidth = 3;
    for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28; ctx.beginPath(); ctx.moveTo(p.x + 4, p.y - 13); ctx.lineTo(p.x + 4 + Math.cos(a) * 15, p.y - 13 + Math.sin(a) * 8); ctx.stroke(); }
  }
  // mission markers
  if (mission && state.mode === "play") {
    const tx = mission.stage === "pickup" ? mission.px : mission.dx;
    const ty = mission.stage === "pickup" ? mission.py : mission.dy;
    const pulse = 20 + Math.sin(state.time * 5) * 5;
    ctx.strokeStyle = mission.stage === "pickup" ? "#4dd2ff" : "#ffd94d"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(tx, ty, pulse, 0, 6.29); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.font = "bold 26px Verdana"; ctx.fillText(mission.stage === "pickup" ? "P" : "$", tx - 8, ty + 9);
  }
  for (const p of peds) {
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#f2c094"; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 4.5, 0, 6.29); ctx.fill();
  }
  for (const c of traffic) if (c !== hero.car) drawCar(c, false);
  if (heroCar !== hero.car) drawCar(heroCar, false);
  for (const c of cops) drawCar(c, false);
  if (hero.car) drawCar(hero.car, true);
  else {
    ctx.save(); ctx.translate(hero.x, hero.y); ctx.rotate(hero.angle);
    ctx.fillStyle = "#ff5964"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#f2c094"; ctx.beginPath(); ctx.arc(3, 0, 6, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(6, -3, 8, 6);
    ctx.restore();
  }
  ctx.restore();
  // HUD text handled by DOM; vignette + pause label
  if (state.paused) { ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, 1280, 720); ctx.fillStyle = "#fff"; ctx.font = "bold 44px Verdana"; ctx.fillText("PAUSED", 540, 360); }
  if (state.bustTimer > 0.15 && state.mode === "play") {
    ctx.fillStyle = "#ff4757"; ctx.font = "bold 30px Verdana";
    ctx.fillText("BUSTING… " + Math.ceil(2.4 - state.bustTimer), 520, 90);
  }
  drawMap(camX, camY);
  syncHud();
}
function drawMap() {
  const sx = 180 / WORLD_W, sy = 140 / WORLD_H;
  mctx.fillStyle = "#14505c"; mctx.fillRect(0, 0, 180, 140);
  mctx.fillStyle = "#39434c";
  for (let i = 0; i <= WORLD_W / PITCH; i++) mctx.fillRect(i * PITCH * sx, 0, ROAD * sx, 140);
  for (let i = 0; i <= WORLD_H / PITCH; i++) mctx.fillRect(0, i * PITCH * sy, 180, ROAD * sy);
  if (mission) {
    const tx = (mission.stage === "pickup" ? mission.px : mission.dx) * sx, ty = (mission.stage === "pickup" ? mission.py : mission.dy) * sy;
    mctx.fillStyle = "#ffd94d"; mctx.beginPath(); mctx.arc(tx, ty, 5, 0, 6.29); mctx.fill();
  }
  for (const c of cops) { mctx.fillStyle = "#3d8bfd"; mctx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4); }
  const f = focusPos();
  mctx.fillStyle = "#fff"; mctx.beginPath(); mctx.arc(f.x * sx, f.y * sy, 4, 0, 6.29); mctx.fill();
}
function syncHud() {
  $("cash").textContent = "$" + state.cash;
  $("stars").textContent = "★".repeat(state.wanted) + "☆".repeat(3 - state.wanted);
  let text = state.message;
  if (mission && state.mode === "play") {
    text += mission.stage === "pickup" ? "  •  Reach the blue P marker to pick up your passenger."
      : `  •  Drop-off: gold $ marker — ${Math.max(0, mission.left).toFixed(0)}s left, fare $${mission.fare}.`;
  }
  if (state.wanted > 0) text += "  •  Police are hunting you — break line of sight and cool the heat.";
  $("mission").textContent = text;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw();
  requestAnimationFrame(frame);
}
if (!scene) { /* title screen waits for START */ }
requestAnimationFrame(frame);

// Exposed for automated playtests: a tiny, honest snapshot of live state.
window.__palmshade = { state, hero, heroCar, traffic, get cops() { return cops; }, get mission() { return mission; }, restart, applyScene };
