import { Sidebar } from './ui/Sidebar';
import { Hud } from './ui/Hud';
import { SimCanvas } from './ui/SimCanvas';

export default function App() {
  return (
    <div className="h-full w-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-baseline gap-3">
          <span className="text-ink-50 text-lg font-semibold tracking-tight">
            genetic<span className="text-accent-400">.cars</span>
          </span>
          <span className="text-ink-500 text-xs font-mono uppercase tracking-[0.18em]">
            evolutionary 2D vehicle lab
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-ink-300">
          <a
            href="https://github.com/bernardorubin/genetic-car"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink-50 transition"
          >
            github ↗
          </a>
        </div>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-[1fr_320px] gap-4 px-6 pb-6">
        <section className="relative glass rounded-2xl overflow-hidden">
          <SimCanvas />
          <Hud />
        </section>
        <aside className="glass rounded-2xl overflow-y-auto">
          <Sidebar />
        </aside>
      </main>
    </div>
  );
}
