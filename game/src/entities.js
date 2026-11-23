// Vehicles, traffic drivers and police behaviour for Palmshade Heat.
// Cars travel along the street grid: each one picks a straight heading,
// follows its lane, and chooses a new direction at intersections.
import { WORLD_W, WORLD_H, PITCH, ROAD, pushOut, clampWorld } from "./world.js";

export const CAR_COLOURS = ["#f4f1de", "#e07a5f", "#3d8bfd", "#ffd166", "#8ecae6", "#90be6d", "#f28482", "#cdb4db"];

export function makeCar(x, y, angle, colour, kind = "civilian") {
  return { x, y, angle, speed: 0, colour, kind, w: 46, h: 24, driver: null, stuck: 0 };
}

const LANES = [ROAD / 4, -ROAD / 4];
export function lanePoint(axis, fixed, along) {
  return axis === "x" ? { x: along, y: fixed } : { x: fixed, y: along };
}

// Move an AI car forward along its current street, turning at junctions.
export function driveAI(car, dt, rnd) {
  const cruise = car.kind === "cop" ? 265 : 150;
  car.speed += ((car.targetSpeed ?? cruise) - car.speed) * Math.min(1, dt * 1.6);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Streets are the bands where x or y mod PITCH is below ROAD.
  const nearJunction = (nx % PITCH) < ROAD && (ny % PITCH) < ROAD;
  if (nearJunction && rnd() < dt * 0.9) {
    const turns = [0, Math.PI / 2, -Math.PI / 2];
    car.angle += turns[Math.floor(rnd() * turns.length)];
    car.angle = Math.round(car.angle / (Math.PI / 2)) * (Math.PI / 2);
  }
  // Keep the car inside the world by reversing its heading at the edges.
  if (nx < 60 || nx > WORLD_W - 60 || ny < 60 || ny > WORLD_H - 60) {
    car.angle += Math.PI;
    car.speed = 40;
    return;
  }
  car.x = nx; car.y = ny;
}

// Police steering: aim at the suspect, slow down when very close so a
// foot chase can end in an arrest instead of endless circling.
export function driveCop(car, dt, target) {
  const want = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
  const dist = Math.hypot(target.x - car.x, target.y - car.y);
  const top = dist > 90 ? 292 : 60;
  car.speed += (top - car.speed) * Math.min(1, dt * 2.2);
  car.x = clampWorld(car.x + Math.cos(car.angle) * car.speed * dt, WORLD_W);
  car.y = clampWorld(car.y + Math.sin(car.angle) * car.speed * dt, WORLD_H);
  return dist;
}

export function stepCarPhysics(car, dt, buildings, input) {
  const accel = input.up ? 340 : input.down ? -190 : 0;
  car.speed += accel * dt;
  car.speed -= car.speed * (input.brake ? 3.2 : 0.55) * dt;
  car.speed = Math.max(-130, Math.min(330, car.speed));
  if (Math.abs(car.speed) > 4) {
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    car.angle += steer * dt * 1.9 * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = pushOut(nx, ny, 22, buildings);
  if (fixed.hit) car.speed *= 0.35;
  car.x = clampWorld(fixed.x, WORLD_W);
  car.y = clampWorld(fixed.y, WORLD_H);
  return fixed.hit;
}

export { LANES };
