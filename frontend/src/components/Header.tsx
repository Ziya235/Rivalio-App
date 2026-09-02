import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, LogOut, User, Moon, Sun, Shield } from 'lucide-react'
import { Button, Avatar } from './ui'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const NAV_LINKS = [
  { label: 'Ana Səhifə', to: '/' },
  { label: 'İdmanlar', to: '/sports' },
  { label: 'Haqqımızda', to: '/about-us' },
  { label: 'FAQ', to: '/faq' },
]

type HeaderProps = {
  isLightMode?: boolean
  showThemeToggle?: boolean
  onThemeToggle?: () => void
}

export default function Header({
  isLightMode = false,
  showThemeToggle = false,
  onThemeToggle,
}: HeaderProps) {
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = !!user
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const displayName = user?.firstName || user?.username || ''
  const navLinks = NAV_LINKS.filter((link) => !(isAdmin && link.to === '/sports'))

  const accentText = isLightMode ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
  const strongText = isLightMode ? 'text-slate-900' : 'text-white'
  const mutedText = isLightMode ? 'text-slate-500' : 'text-white/40'
  const iconButton = isLightMode
    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/5'
    : 'text-white/70 hover:text-white hover:bg-white/5'

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    setMobileOpen(false)
    logout()
    navigate('/')
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isLightMode ? 'header--light' : ''
        } ${
          scrolled
            ? isLightMode
              ? 'bg-white/70 backdrop-blur-xl border-b border-slate-900/10 shadow-lg'
              : 'bg-[#08080e]/90 backdrop-blur-xl border-b border-white/8 shadow-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#c5f135] flex items-center justify-center font-display font-900 text-[#08080e] text-sm group-hover:scale-110 transition-transform">
                R
              </div>
              <span
                className={`font-display font-700 text-xl tracking-wide ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}
              >
                Rival<span className={accentText}>io</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? isLightMode
                          ? 'text-[#3f5808] bg-[#4d6b0b]/12'
                          : 'text-[#c5f135] bg-[#c5f135]/8'
                        : iconButton
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {showThemeToggle && (
                <button
                  type="button"
                  onClick={onThemeToggle}
                  aria-label={isLightMode ? 'Dark moda keç' : 'Light moda keç'}
                  title={isLightMode ? 'Dark moda keç' : 'Light moda keç'}
                  className={`p-2 rounded-lg border transition-all ${
                    isLightMode
                      ? 'text-slate-700 border-slate-900/10 hover:text-slate-950 hover:bg-slate-900/5'
                      : 'text-white/70 border-white/10 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              )}

              {isLoggedIn && user ? (
                <>
                  {isAdmin && (
                    <Button
                      onClick={() => navigate('/admin')}
                      size="sm"
                      className="hidden sm:inline-flex"
                    >
                      <Shield size={15} />
                      Admin Panel
                    </Button>
                  )}
                  <NotificationBell isLightMode={isLightMode} />
                  <button
                    onClick={() => navigate('/chat')}
                    className={`hidden sm:flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${iconButton}`}
                  >
                    Chat
                  </button>

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((open) => !open)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all ${
                        isLightMode ? 'hover:bg-slate-900/5' : 'hover:bg-white/5'
                      }`}
                    >
                      <Avatar name={fullName || displayName} src={user.image || undefined} size="sm" />
                      <div className="hidden sm:flex flex-col items-start leading-tight">
                        <span className={`text-sm font-medium ${strongText}`}>{displayName}</span>
                        <span className={`text-[11px] ${mutedText}`}>@{user.username}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`${mutedText} transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {menuOpen && (
                      <div
                        className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl overflow-hidden z-50 border ${
                          isLightMode ? 'bg-white border-slate-900/10' : 'bg-[#12121a] border-white/10'
                        }`}
                      >
                        <div
                          className={`px-4 py-3 border-b ${
                            isLightMode ? 'border-slate-900/10' : 'border-white/8'
                          }`}
                        >
                          <p className={`text-sm font-semibold truncate ${strongText}`}>{fullName}</p>
                          <p className={`text-xs truncate ${mutedText}`}>@{user.username}</p>
                          {isAdmin && (
                            <span
                              className={`inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${accentText} ${
                                isLightMode ? 'bg-[#4d6b0b]/12' : 'bg-[#c5f135]/10'
                              }`}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="p-1.5">
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setMenuOpen(false)
                                navigate('/admin')
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-all ${
                                isLightMode
                                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-900/5'
                                  : 'text-white/75 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <Shield size={15} />
                              Admin Panel
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setMenuOpen(false)
                              navigate('/profile')
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-all ${
                              isLightMode
                                ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-900/5'
                                : 'text-white/75 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <User size={15} />
                            Profilim
                          </button>
                          <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-all ${
                              isLightMode
                                ? 'text-red-600 hover:bg-red-500/10'
                                : 'text-red-400 hover:bg-red-500/10'
                            }`}
                          >
                            <LogOut size={15} />
                            Çıxış
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className={`hidden sm:block text-sm px-4 py-2 rounded-lg transition-all ${
                      isLightMode
                        ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/5'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Daxil ol
                  </button>
                  <Button onClick={() => navigate('/register')} size="sm">
                    Qeydiyyat
                  </Button>
                </>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`lg:hidden p-2 rounded-lg transition-all ${
                  isLightMode
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/5'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div
            className={`lg:hidden backdrop-blur-xl border-t ${
              isLightMode
                ? 'bg-white/90 border-slate-900/10'
                : 'bg-[#08080e]/98 border-white/8'
            }`}
          >
            <div className="max-w-[1280px] mx-auto px-4 py-4 flex flex-col gap-1">
              {isLoggedIn && user && (
                <div
                  className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-xl ${
                    isLightMode ? 'bg-slate-900/5' : 'bg-white/5'
                  }`}
                >
                  <Avatar name={fullName || displayName} src={user.image || undefined} size="sm" />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${strongText}`}>{fullName}</p>
                    <p className={`text-xs truncate ${mutedText}`}>@{user.username}</p>
                  </div>
                </div>
              )}

              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-left px-4 py-3 text-sm rounded-xl transition-all ${
                    isLightMode
                      ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/5'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div
                className={`pt-2 border-t flex flex-col gap-2 mt-2 ${
                  isLightMode ? 'border-slate-900/10' : 'border-white/8'
                }`}
              >
                {isLoggedIn ? (
                  <>
                    {isAdmin && (
                      <Button
                        onClick={() => {
                          navigate('/admin')
                          setMobileOpen(false)
                        }}
                        fullWidth
                      >
                        Admin Panel
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        navigate('/profile')
                        setMobileOpen(false)
                      }}
                      variant="outline"
                      fullWidth
                    >
                      Profilim
                    </Button>
                    <Button onClick={handleLogout} variant="outline" fullWidth>
                      Çıxış
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        navigate('/login')
                        setMobileOpen(false)
                      }}
                      variant="outline"
                      fullWidth
                    >
                      Daxil ol
                    </Button>
                    <Button
                      onClick={() => {
                        navigate('/register')
                        setMobileOpen(false)
                      }}
                      fullWidth
                    >
                      Qeydiyyat
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
