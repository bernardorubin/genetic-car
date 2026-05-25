import { Vec2 } from 'planck';
import type { SimWorld } from '../sim/world';
import type { Car } from '../sim/car';

const COLOR_TERRAIN_FILL = 'rgba(56, 189, 248, 0.07)';
const COLOR_TERRAIN_LINE = 'rgba(125, 211, 252, 0.55)';
const COLOR_CHASSIS_FILL = 'rgba(125, 211, 252, 0.18)';
const COLOR_CHASSIS_STROKE = 'rgba(125, 211, 252, 0.95)';
const COLOR_CHASSIS_LEAD = 'rgba(251, 191, 36, 0.30)';
const COLOR_CHASSIS_LEAD_STROKE = 'rgba(251, 191, 36, 1)';
const COLOR_CHASSIS_DEAD = 'rgba(255,255,255,0.04)';
const COLOR_CHASSIS_DEAD_STROKE = 'rgba(255,255,255,0.15)';
const COLOR_WHEEL_FILL = 'rgba(163, 230, 53, 0.10)';
const COLOR_WHEEL_STROKE = 'rgba(163, 230, 53, 0.95)';
const COLOR_WHEEL_DEAD = 'rgba(255,255,255,0.18)';

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  sim: SimWorld,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  drawBackdrop(ctx, width, height);

  ctx.save();
  const { x: cx, y: cy, zoom } = sim.camera;
  // Camera transform: world (cx, cy) → screen (width*0.33, height*0.65),
  // Y inverted because canvas y grows downward but our world y grows upward.
  const focusSX = width * 0.33;
  const focusSY = height * 0.65;
  ctx.translate(focusSX, focusSY);
  ctx.scale(zoom, -zoom);
  ctx.translate(-cx, -cy);

  drawTerrain(ctx, sim);

  const leader = sim.leader();
  for (const car of sim.cars) drawCar(ctx, car, car === leader);

  ctx.restore();

  drawDistanceMarkers(ctx, sim, width);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Subtle grid in screen space — gives parallax feel without computation.
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
}

function drawTerrain(ctx: CanvasRenderingContext2D, sim: SimWorld) {
  const pts = sim.getTerrain().points;
  if (pts.length === 0) return;

  // Filled area under the terrain (down to a very low y).
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, -200);
  ctx.lineTo(pts[0].x, -200);
  ctx.closePath();
  ctx.fillStyle = COLOR_TERRAIN_FILL;
  ctx.fill();

  // Surface stroke.
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = COLOR_TERRAIN_LINE;
  ctx.lineWidth = 0.06;
  ctx.stroke();
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car, isLeader: boolean) {
  const xf = car.chassis.getTransform();
  // Chassis polygon
  ctx.beginPath();
  for (let i = 0; i < car.chassisVerts.length; i++) {
    const world = transform(xf.p, xf.q.c, xf.q.s, car.chassisVerts[i]);
    if (i === 0) ctx.moveTo(world.x, world.y);
    else ctx.lineTo(world.x, world.y);
  }
  ctx.closePath();
  if (!car.alive) {
    ctx.fillStyle = COLOR_CHASSIS_DEAD;
    ctx.strokeStyle = COLOR_CHASSIS_DEAD_STROKE;
  } else if (isLeader) {
    ctx.fillStyle = COLOR_CHASSIS_LEAD;
    ctx.strokeStyle = COLOR_CHASSIS_LEAD_STROKE;
  } else {
    ctx.fillStyle = COLOR_CHASSIS_FILL;
    ctx.strokeStyle = COLOR_CHASSIS_STROKE;
  }
  ctx.lineWidth = 0.05;
  ctx.fill();
  ctx.stroke();

  // Wheels
  for (let w = 0; w < 2; w++) {
    const wheel = car.wheels[w];
    const wxf = wheel.getTransform();
    const r = car.wheelRadii[w];
    ctx.beginPath();
    ctx.arc(wxf.p.x, wxf.p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = car.alive ? COLOR_WHEEL_FILL : 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.strokeStyle = car.alive ? COLOR_WHEEL_STROKE : COLOR_WHEEL_DEAD;
    ctx.lineWidth = 0.05;
    ctx.stroke();
    // Spoke for rotation feedback
    const angle = wxf.q.getAngle();
    ctx.beginPath();
    ctx.moveTo(wxf.p.x, wxf.p.y);
    ctx.lineTo(wxf.p.x + Math.cos(angle) * r, wxf.p.y + Math.sin(angle) * r);
    ctx.stroke();
  }
}

function drawDistanceMarkers(
  ctx: CanvasRenderingContext2D,
  sim: SimWorld,
  width: number,
) {
  // Screen-space label of camera x in meters, top-right corner of the canvas.
  const leader = sim.leader();
  if (!leader) return;
  const dist = leader.maxX.toFixed(1) + ' m';
  ctx.font = '12px ui-monospace, "JetBrains Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(200,206,224,0.6)';
  ctx.fillText(`leader · ${dist}`, width - 16, 16);
  ctx.textAlign = 'left';
}

function transform(p: Vec2, c: number, s: number, v: Vec2): { x: number; y: number } {
  return {
    x: c * v.x - s * v.y + p.x,
    y: s * v.x + c * v.y + p.y,
  };
}
