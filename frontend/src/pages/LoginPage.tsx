import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daxil olmaq mümkün olmadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#08080e] grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=900&h=700&fit=crop&auto=format"
          alt="Sports"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080e]/80 via-[#08080e]/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#c5f135] flex items-center justify-center font-display font-bold text-[#08080e]">
                R
              </div>
              <span className="font-display font-700 text-2xl text-white">
                Rival<span className="text-[#c5f135]">io</span>
              </span>
            </div>
            <h2 className="font-display text-5xl font-800 text-white leading-tight mb-3">
              Oyunun sənin
              <br />
              <span className="text-[#c5f135]">üçün başlasın</span>
            </h2>
            <p className="text-white/55 text-base max-w-sm">
              Rivalio-ya qoşul. Oyunçu tap, komanda qur, rəqib axtar.
            </p>
          </div>
          <div className="flex gap-4">
            {['2,500+ Oyunçu', '350+ Komanda', '120+ Liqa'].map((s) => (
              <div key={s} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-white font-medium">
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#c5f135] flex items-center justify-center font-display font-bold text-[#08080e]">
              R
            </div>
            <span className="font-display font-700 text-2xl text-white">
              Rival<span className="text-[#c5f135]">io</span>
            </span>
          </div>

          <h1 className="font-display text-4xl font-bold text-white mb-1">Xoş gəldiniz!</h1>
          <p className="text-white/45 text-sm mb-8">Hesabınıza daxil olun</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              placeholder="ali@example.com"
              type="email"
              value={email}
              onChange={setEmail}
            />

            <div>
              <label className="text-sm font-medium text-white/80 block mb-1.5">Şifrə</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#18181f] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5f135]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {!showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

          

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading || !email || !password}>
              {loading ? 'Daxil olunur...' : 'Daxil ol'}
              {!loading && <ArrowRight size={18} />}
            </Button>

            <p className="text-center text-sm text-white/45">
              Hesabın yoxdur?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-[#c5f135] hover:text-[#d4f55a] font-semibold transition-colors"
              >
                Qeydiyyatdan keç
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
