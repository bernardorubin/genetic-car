import { useState } from 'react';
import { copyToClipboard, dailySeed, shareUrlForSeed } from '../state/sharing';
import { useSim } from '../state/useSim';

export function ShareBar() {
  const { settings, setSetting } = useSim();
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = shareUrlForSeed(settings.seed);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const onDaily = () => {
    setSetting('seed', dailySeed());
  };

  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      <button
        onClick={onShare}
        className="hairline rounded-md px-2.5 py-1.5 text-[11px] font-mono text-ink-100 hover:bg-white/5 transition"
        title="Copy a URL that opens this world on another device"
      >
        {copied ? 'copied ✓' : 'share url'}
      </button>
      <button
        onClick={onDaily}
        className="hairline rounded-md px-2.5 py-1.5 text-[11px] font-mono text-ink-100 hover:bg-white/5 transition"
        title="Load today's daily seed — same world for everyone, every day"
      >
        daily seed
      </button>
    </div>
  );
}
