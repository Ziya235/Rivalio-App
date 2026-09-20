import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../../../components/ui'

export function FinalCtaSection() {
  const navigate = useNavigate()

  return (
    <section className="py-28 relative overflow-hidden">
      <div className="hero-glow w-[500px] h-[500px] bg-[#c5f135]/6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-display text-6xl sm:text-7xl font-bold text-white mb-4 leading-tight">
          Növbəti oyunun
          <br />
          <span className="text-gradient-lime">səni gözləyir</span>
        </h2>
        <p className="text-white/45 text-lg mb-10">
          Rivalio-ya qoşul, komandanı yarat və öz rəqibini tap.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/register')} size="lg">
            Qeydiyyatdan keç
            <ArrowRight size={18} />
          </Button>
          <Button onClick={() => navigate('/sports')} variant="outline" size="lg">
            İdmanları kəşf et
          </Button>
        </div>
      </div>
    </section>
  )
}
