import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../../../components/ui'

export function FaqCta({ light }: { light: boolean }) {
  const navigate = useNavigate()

  return (
    <div
      className={`rounded-3xl p-8 text-center ${
        light
          ? 'bg-white/70 border border-white/80'
          : 'bg-[#101017] border border-white/5'
      }`}
    >
      <h2 className={`font-display text-3xl font-bold mb-2 ${light ? 'text-gray-900' : 'text-white'}`}>
        Cavabını tapmadın?
      </h2>
      <p className={`mb-6 text-sm ${light ? 'text-gray-500' : 'text-white/45'}`}>
        Platformanı kəşf et və ya hesab yaradıb dərhal istifadəyə başla.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={() => navigate('/register')} size="lg">
          Qeydiyyatdan keç
          <ArrowRight size={18} />
        </Button>
        <Button
          onClick={() => navigate('/about-us')}
          variant="outline"
          size="lg"
          className={light ? '!text-slate-800 !border-slate-300 hover:!border-[#4d6b0b] hover:!text-[#4d6b0b]' : ''}
        >
          Haqqımızda
        </Button>
      </div>
    </div>
  )
}
