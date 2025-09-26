"use client"

export function ChannelsList({ onOpenFilters }: { onOpenFilters?: () => void }) {
  // Placeholder static channels
  const channels = [
    { id: 'env', title: 'Environment', desc: 'Climate, ecology, energy' },
    { id: 'tools', title: 'Tools', desc: 'Hardware, software, craft' },
    { id: 'shelter', title: 'Shelter', desc: 'Housing, architecture' },
    { id: 'education', title: 'Education', desc: 'Learning, pedagogy' },
    { id: 'crypto', title: 'Cryptography', desc: 'Security, protocols' },
  ];

  return (
    <div className="relative h-full w-full">
      <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <button
          className="px-3 py-1 rounded-full bg-white/10 text-sm"
          onClick={() => onOpenFilters?.()}
        >
          Filters
        </button>
        <h1 className="text-lg font-semibold">Channels</h1>
        <div className="w-[72px]" />
      </header>

      <main className="pt-16 pb-14 h-full overflow-y-auto">
        <ul className="px-4 space-y-3">
          {channels.map((ch) => (
            <li key={ch.id} className="rounded-lg bg-white/5 border border-white/10 p-4">
              <h3 className="text-base font-medium">{ch.title}</h3>
              <p className="text-sm text-white/70">{ch.desc}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

