import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function AccordionItem({
  q,
  a,
  light,
}: {
  q: string
  a: string
  light: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        light ? 'border-slate-900/10 bg-white/70' : 'border-white/7 bg-[#101017]'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
          light ? 'hover:bg-slate-900/5' : 'hover:bg-white/3'
        }`}
      >
        <span className={`font-medium text-sm pr-4 ${light ? 'text-gray-900' : 'text-white'}`}>
          {q}
        </span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 transition-transform duration-300 ${
            light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
          } ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <div className={`px-5 pb-5 text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/55'}`}>
          {a}
        </div>
      </div>
    </div>
  )
}
