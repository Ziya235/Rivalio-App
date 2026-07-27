import { type ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  className = '',
  type = 'button',
  fullWidth,
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-[#c5f135] text-[#08080e] hover:bg-[#d4f55a] active:scale-[0.98] glow-lime',
    secondary:
      'bg-[#18181f] text-white border border-white/10 hover:bg-[#22222c] active:scale-[0.98]',
    outline:
      'bg-transparent text-white border border-white/20 hover:border-[#c5f135] hover:text-[#c5f135] active:scale-[0.98]',
    ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/5 active:scale-[0.98]',
    danger:
      'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

interface BadgeProps {
  children: ReactNode
  variant?: 'public' | 'private' | 'pending' | 'accepted' | 'rejected' | 'lime' | 'purple' | 'blue' | 'orange'
  className?: string
}

export function Badge({ children, variant = 'lime', className = '' }: BadgeProps) {
  const variants = {
    public: 'badge-public',
    private: 'badge-private',
    pending: 'badge-pending',
    accepted: 'badge-accepted',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    lime: 'bg-[#c5f135]/10 text-[#c5f135] border border-[#c5f135]/20',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#101017] card-border rounded-2xl ${hover ? 'hover-card cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-[#c5f135]/30 to-[#7c3aed]/30 flex items-center justify-center font-bold text-[#c5f135] flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  )
}

interface InputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
  className?: string
  icon?: ReactNode
  error?: string
  readOnly?: boolean
  disabled?: boolean
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  className = '',
  icon,
  error,
  readOnly,
  disabled,
}: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-white/80">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={disabled}
          className={`w-full bg-[#18181f] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm transition-all ${icon ? 'pl-10' : ''} ${error ? 'border-red-500/50' : ''} ${readOnly || disabled ? 'opacity-70 cursor-default focus:outline-none' : 'focus:outline-none focus:border-[#c5f135]/50'}`}
        />
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

interface SelectFieldProps {
  label?: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  className?: string
}

export function SelectField({ label, value, onChange, options, className = '' }: SelectFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-white/80">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#18181f] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#18181f]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface StatItemProps {
  label: string
  value: string | number
  sublabel?: string
  accent?: boolean
}

export function StatItem({ label, value, sublabel, accent }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-2xl font-bold ${accent ? 'text-[#c5f135]' : 'text-white'} font-display`}>
        {value}
      </span>
      <span className="text-xs text-white/50 text-center">{label}</span>
      {sublabel && <span className="text-xs text-white/30">{sublabel}</span>}
    </div>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-white/7 ${className}`} />
}

interface TabsProps {
  tabs: string[]
  active: string
  onChange: (t: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-0 border-b border-white/8 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-5 py-3 text-sm font-semibold transition-all duration-200 ${
            active === tab ? 'tab-active' : 'tab-inactive hover:text-white/80'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

export function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  const colors = {
    success: 'bg-[#c5f135]/10 border-[#c5f135]/30 text-[#c5f135]',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  }
  return (
    <div
      className={`fixed bottom-6 right-6 z-[999] px-5 py-3 rounded-xl border ${colors[type]} text-sm font-medium backdrop-blur-sm animate-count`}
    >
      {message}
    </div>
  )
}
