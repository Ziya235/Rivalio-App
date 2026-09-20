import { Eye, EyeOff } from 'lucide-react'

export function PasswordField({
  light,
  value,
  showPass,
  onChange,
  onToggle,
}: {
  light: boolean
  value: string
  showPass: boolean
  onChange: (value: string) => void
  onToggle: () => void
}) {
  return (
    <div>
      <label className={`text-sm font-medium block mb-1.5 ${light ? 'text-gray-700' : 'text-white/80'}`}>
        Şifrə
      </label>
      <div className="relative">
        <input
          type={showPass ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className={`w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition-colors ${
            light
              ? 'bg-white/50 border border-gray-200/80 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-500/50'
              : 'bg-[#18181f] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#c5f135]/50'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
            light ? 'text-gray-400 hover:text-gray-600' : 'text-white/30 hover:text-white/60'
          }`}
        >
          {!showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
