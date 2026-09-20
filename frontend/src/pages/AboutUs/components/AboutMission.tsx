import { Target, Trophy } from 'lucide-react'

export function AboutMission({ light }: { light: boolean }) {
  const cardClass = light
    ? 'bg-white/70 border border-white/80'
    : 'bg-[#101017] border border-white/5'
  const iconClass = light
    ? 'bg-[#4d6b0b]/12 text-[#4d6b0b]'
    : 'bg-[#c5f135]/10 text-[#c5f135]'

  return (
    <div className="grid lg:grid-cols-2 gap-10 mb-20 items-start">
      <div className={`rounded-3xl p-8 ${cardClass}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${iconClass}`}>
          <Target size={22} />
        </div>
        <h2 className={`font-display text-3xl font-bold mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
          Missiyamız
        </h2>
        <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/50'}`}>
          İdmanı təşkilatçılıq yükündən azad etmək. Kiminsə komandada yer axtarması,
          rəqib tapması və ya liqaya qoşulması bir neçə klikdən ibarət olsun. Rivalio
          yerli idman icmasını rəqəmsal olaraq birləşdirir.
        </p>
      </div>
      <div className={`rounded-3xl p-8 ${cardClass}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${iconClass}`}>
          <Trophy size={22} />
        </div>
        <h2 className={`font-display text-3xl font-bold mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
          Nə təklif edirik
        </h2>
        <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/50'}`}>
          Futbol, basketbol, tennis, stolüstü tennis və voleybol üzrə oyunçu axtarışı,
          komanda idarəetməsi, challenge, liqalar, statistikalar və chat. Əsas
          funksiyalar pulsuzdur.
        </p>
      </div>
    </div>
  )
}
