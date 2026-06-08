/** Tiny "beta" pill. Lime so it reads as experimental/new against the teal accent. */
export function BetaBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border border-lime-400/30 bg-lime-400/10 px-1 py-px text-[8px] font-mono uppercase tracking-[0.14em] leading-none text-lime-400 ${className}`}
    >
      beta
    </span>
  );
}
