import { useEffect, useRef } from 'react';
import { drawWorld } from '../render/canvas';
import { useSim } from '../state/useSim';

export function SimCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { getPopulation, settings } = useSim();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const loop = () => {
      const pop = getPopulation();
      if (pop && settings.render) {
        ctx.save();
        ctx.scale(dpr, dpr);
        drawWorld(ctx, pop.sim, canvas.clientWidth, canvas.clientHeight);
        ctx.restore();
      } else {
        // Render is off — clear once so we don't leave a stale frame.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [getPopulation, settings.render]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}
