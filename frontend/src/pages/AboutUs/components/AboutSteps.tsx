import { STEPS } from '../data'

export function AboutSteps({ light }: { light: boolean }) {
  return (
    <div className="mb-20">
      <h2 className={`font-display text-4xl font-bold mb-8 ${light ? 'text-gray-900' : 'text-white'}`}>
        Necə işləyir
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className={`rounded-2xl p-6 ${
              light
                ? 'bg-white/70 border border-white/80'
                : 'bg-[#101017] border border-white/5'
            }`}
          >
            <div
              className={`font-display text-2xl font-bold mb-3 ${
                light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
              }`}
            >
              {step.num}
            </div>
            <h3 className={`font-semibold mb-2 ${light ? 'text-gray-900' : 'text-white'}`}>
              {step.title}
            </h3>
            <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/45'}`}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
