import { FAQS } from '../data'
import { AccordionItem } from './AccordionItem'

export function FaqSection() {
  return (
    <section className="py-24">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-5xl font-bold text-white mb-3">Tez-tez verilən suallar</h2>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  )
}
