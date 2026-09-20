import { HOW_STEPS } from '../data'

export function HowItWorksSection() {
  return (
    <section className="py-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-5xl font-bold text-white mb-3">Necə işləyir?</h2>
          <p className="text-white/45 text-base">4 sadə addımda idman icmasına qoşul</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#c5f135]/20 to-transparent" />

          {HOW_STEPS.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center relative">
              <div className="w-20 h-20 rounded-2xl bg-[#101017] border border-white/8 flex flex-col items-center justify-center mb-5 relative z-10 hover:border-[#c5f135]/30 transition-colors">
                <span className="font-display text-3xl font-800 text-[#c5f135]/50 leading-none">{step.num}</span>
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{step.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
