import { FAQS } from '../data'
import { AccordionItem } from './AccordionItem'

export function FaqList({ light }: { light: boolean }) {
  return (
    <div className="flex flex-col gap-3 mb-16">
      {FAQS.map((faq) => (
        <AccordionItem key={faq.q} q={faq.q} a={faq.a} light={light} />
      ))}
    </div>
  )
}
