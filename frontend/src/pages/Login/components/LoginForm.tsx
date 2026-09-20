import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import { BrandMark } from './BrandMark'
import { PasswordField } from './PasswordField'

export function LoginForm({ light }: { light: boolean }) {
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
      const nextUser = await login(email, password)
      navigate(nextUser.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daxil olmaq mümkün olmadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 flex min-h-0 items-center justify-center overflow-y-auto p-6 sm:p-12">
      <div
        className={`w-full max-w-md ${
          light
            ? 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_40px_rgba(56,126,245,0.08)] rounded-3xl p-8'
            : ''
        }`}
      >
        <div className="lg:hidden mb-10">
          <BrandMark light={light} compact />
        </div>

        <h1 className={`font-display text-4xl font-bold mb-1 ${light ? 'text-gray-900' : 'text-white'}`}>
          Xoş gəldiniz!
        </h1>
        <p className={`text-sm mb-8 ${light ? 'text-gray-500' : 'text-white/45'}`}>Hesabınıza daxil olun</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            placeholder="ali@example.com"
            type="email"
            value={email}
            onChange={setEmail}
            light={light}
          />

          <PasswordField
            light={light}
            value={password}
            showPass={showPass}
            onChange={setPassword}
            onToggle={() => setShowPass((v) => !v)}
          />

          {error ? (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          ) : null}

          <Button type="submit" fullWidth size="lg" disabled={loading || !email || !password}>
            {loading ? 'Daxil olunur...' : 'Daxil ol'}
            {!loading && <ArrowRight size={18} />}
          </Button>

          <p className={`text-center text-sm ${light ? 'text-gray-500' : 'text-white/45'}`}>
            Hesabın yoxdur?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className={`font-semibold transition-colors ${
                light ? 'text-sky-600 hover:text-sky-700' : 'text-[#c5f135] hover:text-[#d4f55a]'
              }`}
            >
              Qeydiyyatdan keç
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
