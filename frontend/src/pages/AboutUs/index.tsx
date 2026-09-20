import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../../App'
import {
  AboutHeader,
  AboutStats,
  AboutMission,
  AboutValues,
  AboutSteps,
  AboutCta,
} from './components'

export default function AboutUsPage() {
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
        <AboutHeader light={light} />
        <AboutStats light={light} />
        <AboutMission light={light} />
        <AboutValues light={light} />
        <AboutSteps light={light} />
        <AboutCta light={light} />
      </div>
    </div>
  )
}
