import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../../App'
import { FaqHeader, FaqList, FaqCta } from './components'

export default function FaqPage() {
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
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
        <FaqHeader light={light} />
        <FaqList light={light} />
        <FaqCta light={light} />
      </div>
    </div>
  )
}
