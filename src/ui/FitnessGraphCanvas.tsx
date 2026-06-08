import { useEffect, useRef } from 'react';

const HEIGHT = 120;
const PADDING = 6;

export interface FitnessPoint {
  best: number;
  top10Avg: number;
  avg: number;
}

/** Presentational per-generation fitness chart. Context-free so both the 2D and 3D
 * labs can pass their own history. */
export function FitnessGraphCanvas({ history }: { history: readonly FitnessPoint[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = HEIGHT;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, 0, 0, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (history.length === 0) {
      ctx.fillStyle = 'rgba(200,206,224,0.4)';
      ctx.font = '11px ui-monospace, "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('waiting for generation 1', w / 2, h / 2);
      return;
    }

    let yMax = 1;
    for (const g of history) yMax = Math.max(yMax, g.best);
    yMax *= 1.1;

    const plotW = w - PADDING * 2;
    const plotH = h - PADDING * 2;
    const stepX = history.length > 1 ? plotW / (history.length - 1) : 0;
    const yPx = (v: number) => PADDING + plotH - (v / yMax) * plotH;
    const xPx = (i: number) => PADDING + i * stepX;

    drawSeries(ctx, history, xPx, yPx, (g) => g.avg, 'rgba(56, 189, 248, 0.95)');
    drawSeries(ctx, history, xPx, yPx, (g) => g.top10Avg, 'rgba(163, 230, 53, 0.95)');
    drawSeries(ctx, history, xPx, yPx, (g) => g.best, 'rgba(251, 113, 133, 0.95)');

    ctx.font = '10px ui-monospace, "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const last = history[history.length - 1];
    ctx.fillStyle = 'rgba(251, 113, 133, 0.95)';
    ctx.fillText(`best  ${last.best.toFixed(1)}m`, w - PADDING - 2, PADDING + 2);
    ctx.fillStyle = 'rgba(163, 230, 53, 0.95)';
    ctx.fillText(`top10 ${last.top10Avg.toFixed(1)}m`, w - PADDING - 2, PADDING + 14);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
    ctx.fillText(`avg   ${last.avg.toFixed(1)}m`, w - PADDING - 2, PADDING + 26);
  }, [history]);

  return <canvas ref={ref} className="w-full" style={{ height: HEIGHT }} />;
}

function drawSeries<T>(
  ctx: CanvasRenderingContext2D,
  data: readonly T[],
  xPx: (i: number) => number,
  yPx: (v: number) => number,
  get: (d: T) => number,
  color: string,
) {
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = xPx(i);
    const y = yPx(get(data[i]));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
