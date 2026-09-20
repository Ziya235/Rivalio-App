import { VALUES } from '../data'

export function AboutValues({ light }: { light: boolean }) {
  return (
    <div className="mb-20">
      <h2 className={`font-display text-4xl font-bold mb-8 ${light ? 'text-gray-900' : 'text-white'}`}>
        Dəyərlərimiz
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {VALUES.map((item) => (
          <div
            key={item.title}
            className={`rounded-2xl p-6 ${
              light
                ? 'bg-white/70 border border-white/80'
                : 'bg-[#101017] border border-white/5'
            }`}
          >
            <item.icon
              size={22}
              className={`mb-4 ${light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'}`}
            />
            <h3 className={`font-semibold mb-2 ${light ? 'text-gray-900' : 'text-white'}`}>
              {item.title}
            </h3>
            <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/45'}`}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
