import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/7 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-white font-medium text-sm pr-4">{q}</span>
        <ChevronDown
          size={18}
          className={`text-[#c5f135] flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <div className="px-5 pb-5 text-sm text-white/55 leading-relaxed">{a}</div>
      </div>
    </div>
  )
}
