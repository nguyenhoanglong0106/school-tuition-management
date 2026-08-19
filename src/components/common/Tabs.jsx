export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-slate-100 overflow-x-auto scrollbar-thin">
      <div className="flex gap-1 min-w-max px-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              active === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
