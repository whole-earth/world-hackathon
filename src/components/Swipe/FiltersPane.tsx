"use client"

export function FiltersPane({ onClose }: { onClose?: () => void }) {
  return (
    <div className="relative h-full w-full">
      <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Filters</h1>
        <button
          className="px-3 py-1 rounded-full bg-white/10 text-sm"
          onClick={() => onClose?.()}
        >
          Done
        </button>
      </header>

      <main className="pt-16 pb-14 h-full overflow-y-auto px-4">
        <div className="rounded-lg bg-white/5 border border-white/10 p-4">
          <p className="text-sm text-white/80">TBD filter stack goes here.</p>
          <ul className="mt-3 space-y-2 text-white/80 text-sm">
            <li>• Theme</li>
            <li>• Date range</li>
            <li>• Popularity</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

