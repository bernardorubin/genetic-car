import { Vec2 } from 'planck';
import type { SimWorld } from '../sim/world';
import type { Car } from '../sim/car';

// Tier milestones in world meters. Cars reaching each zone unlock a new color
// for the terrain surface ahead of them — a visceral sense of progress.
const TERRAIN_TIERS: Array<{ x: number; line: string; fill: string }> = [
  { x: 0,    line: 'rgba(125, 211, 252, 0.70)', fill: 'rgba(56, 189, 248, 0.08)'  }, // sky
  { x: 80,   line: 'rgba(163, 230, 53, 0.80)',  fill: 'rgba(163, 230, 53, 0.08)'  }, // lime
  { x: 200,  line: 'rgba(251, 191, 36, 0.85)',  fill: 'rgba(251, 191, 36, 0.09)'  }, // amber
  { x: 400,  line: 'rgba(249, 115, 22, 0.90)',  fill: 'rgba(249, 115, 22, 0.10)'  }, // orange
  { x: 650,  line: 'rgba(244, 63, 94, 0.95)',   fill: 'rgba(244, 63, 94, 0.11)'   }, // rose
  { x: 1000, line: 'rgba(217, 70, 239, 1.00)',  fill: 'rgba(217, 70, 239, 0.12)'  }, // fuchsia
];
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

  const first = pts[0];
  const last = pts[pts.length - 1];

  // Horizontal gradient over the full terrain extent. createLinearGradient is
  // in current-transform space, so this is in world meters — color stops snap
  // to the actual tier x positions.
  const span = last.x - first.x;
  const fill = ctx.createLinearGradient(first.x, 0, last.x, 0);
  const stroke = ctx.createLinearGradient(first.x, 0, last.x, 0);
  for (const tier of TERRAIN_TIERS) {
    if (tier.x > last.x) break;
    const t = span > 0 ? (tier.x - first.x) / span : 0;
    fill.addColorStop(Math.max(0, Math.min(1, t)), tier.fill);
    stroke.addColorStop(Math.max(0, Math.min(1, t)), tier.line);
  }

  // Fill area under the terrain.
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineTo(last.x, -200);
  ctx.lineTo(first.x, -200);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  // Surface stroke.
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.06;
  ctx.stroke();

  drawTierMarkers(ctx, first.y, last.x);
}

function drawTierMarkers(ctx: CanvasRenderingContext2D, baseY: number, maxX: number) {
  // Faint vertical tick + label at each milestone, in world space.
  ctx.font = '0.7px ui-monospace, "JetBrains Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for (const tier of TERRAIN_TIERS) {
    if (tier.x === 0 || tier.x > maxX) continue;
    ctx.strokeStyle = tier.line.replace(/[\d.]+\)$/, '0.25)');
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(tier.x, baseY + 8);
    ctx.lineTo(tier.x, baseY - 200);
    ctx.stroke();

    // Label flipped manually because we're inside a y-inverted transform.
    ctx.save();
    ctx.translate(tier.x, baseY + 1.2);
    ctx.scale(1, -1);
    ctx.fillStyle = tier.line;
    ctx.fillText(`${tier.x}m`, 0, 0);
    ctx.restore();
  }
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

  // Wheels (variable count per car: 1..MAX_WHEELS)
  for (let w = 0; w < car.wheels.length; w++) {
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
