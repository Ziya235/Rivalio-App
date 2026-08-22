import { useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import type { AppOutletContext } from '../App'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const light = !isDarkMode
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
      const nextUser = await login(email, password)
      navigate(nextUser.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daxil olmaq mümkün olmadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen grid lg:grid-cols-2 relative ${light ? "" : "bg-[#08080e]"}`}>
      {light && (
        <>
          <div className="absolute inset-0 [background:linear-gradient(135deg,#dbeafe_0%,#e0f2fe_25%,#f0f9ff_50%,#ede9fe_75%,#e0f2fe_100%)]" />
          <div className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-sky-300/25 via-blue-200/15 to-transparent blur-3xl" />
          <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-300/20 to-transparent blur-3xl" />
        </>
      )}
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

      <div className="relative z-10 flex items-center justify-center p-6 sm:p-12">
        <div className={`w-full max-w-md ${light ? "bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_40px_rgba(56,126,245,0.08)] rounded-3xl p-8" : ""}`}>
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold ${light ? "bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25" : "bg-[#c5f135] text-[#08080e]"}`}>
              R
            </div>
            <span className={`font-display font-700 text-2xl ${light ? "text-gray-900" : "text-white"}`}>
              Rival<span className={light ? "text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500" : "text-[#c5f135]"}>io</span>
            </span>
          </div>

          <h1 className={`font-display text-4xl font-bold mb-1 ${light ? "text-gray-900" : "text-white"}`}>Xoş gəldiniz!</h1>
          <p className={`text-sm mb-8 ${light ? "text-gray-500" : "text-white/45"}`}>Hesabınıza daxil olun</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              placeholder="ali@example.com"
              type="email"
              value={email}
              onChange={setEmail}
              light={light}
            />

            <div>
              <label className={`text-sm font-medium block mb-1.5 ${light ? "text-gray-700" : "text-white/80"}`}>Şifrə</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition-colors ${
                    light
                      ? "bg-white/50 border border-gray-200/80 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-500/50"
                      : "bg-[#18181f] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#c5f135]/50"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${light ? "text-gray-400 hover:text-gray-600" : "text-white/30 hover:text-white/60"}`}
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

            <p className={`text-center text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
              Hesabın yoxdur?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className={`font-semibold transition-colors ${light ? "text-sky-600 hover:text-sky-700" : "text-[#c5f135] hover:text-[#d4f55a]"}`}
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
