import { useEffect, useRef } from 'react';

export function SimCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

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
    const draw = () => {
      ctx.save();
      ctx.scale(dpr, dpr);
      const { clientWidth: w, clientHeight: h } = canvas;
      // Placeholder backdrop — physics renderer lands next chunk
      ctx.fillStyle = 'rgba(7,8,13,0.0)';
      ctx.clearRect(0, 0, w, h);

      // Horizon line + grid hint
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(200,206,224,0.45)';
      ctx.font = '13px ui-monospace, "JetBrains Mono", monospace';
      ctx.fillText('// physics simulation mounts here', 20, h - 20);

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}
