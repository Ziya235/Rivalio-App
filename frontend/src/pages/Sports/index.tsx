import { useOutletContext } from 'react-router-dom'
import { SPORTS1 } from '../../data'
import type { AppOutletContext } from '../../App'
import { SportsHeader, SportCard } from './components'

export default function SportsPage() {
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const light = !isDarkMode

  return (
    <div
      className={`min-h-screen pt-24 pb-20 ${
        light
          ? '[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]'
          : 'bg-[#08080e]'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <SportsHeader light={light} />

        <div className="flex flex-col gap-6">
          {SPORTS1.map((sport) => (
            <SportCard key={sport.id} sport={sport} light={light} />
          ))}
        </div>
      </div>
    </div>
  )
}
