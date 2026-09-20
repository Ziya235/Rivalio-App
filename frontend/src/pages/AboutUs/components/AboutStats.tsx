import { STATS } from '../data'

export function AboutStats({ light }: { light: boolean }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-2xl p-6 ${
            light
              ? 'bg-white/70 border border-white/80 shadow-[0_10px_40px_rgba(15,23,42,0.06)]'
              : 'bg-[#101017] border border-white/5'
          }`}
        >
          <div
            className={`font-display text-4xl font-bold mb-1 ${
              light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
            }`}
          >
            {stat.value}
          </div>
          <div className={`text-sm ${light ? 'text-gray-500' : 'text-white/40'}`}>{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
