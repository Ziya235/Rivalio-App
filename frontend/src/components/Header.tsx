import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { Button, Avatar } from './ui'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { label: 'Ana Səhifə', to: '/' },
  { label: 'İdmanlar', to: '/sports' },
  { label: 'Komandalar', to: '/teams' },
  { label: 'Haqqımızda', to: '/' },
  { label: 'FAQ', to: '/' },
]

export default function Header() {
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = !!user
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const displayName = user?.firstName || user?.username || ''

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
          scrolled
            ? 'bg-[#08080e]/90 backdrop-blur-xl border-b border-white/8 shadow-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#c5f135] flex items-center justify-center font-display font-900 text-[#08080e] text-sm group-hover:scale-110 transition-transform">
                R
              </div>
              <span className="font-display font-700 text-xl tracking-wide text-white">
                Rival<span className="text-[#c5f135]">io</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-[#c5f135] bg-[#c5f135]/8'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {isLoggedIn && user ? (
                <>
                  <button
                    onClick={() => navigate('/notifications')}
                    className="relative p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c5f135] rounded-full" />
                  </button>
                  <button
                    onClick={() => navigate('/chat')}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    Chat
                  </button>

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((open) => !open)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-xl transition-all"
                    >
                      <Avatar name={fullName || displayName} src={user.image || undefined} size="sm" />
                      <div className="hidden sm:flex flex-col items-start leading-tight">
                        <span className="text-sm text-white/90 font-medium">{displayName}</span>
                        <span className="text-[11px] text-white/40">@{user.username}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-white/40 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-white/8">
                          <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                          <p className="text-xs text-white/40 truncate">@{user.username}</p>
                          {isAdmin && (
                            <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#c5f135] bg-[#c5f135]/10 px-2 py-0.5 rounded-md">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="p-1.5">
                          <button
                            onClick={() => {
                              setMenuOpen(false)
                              navigate('/profile')
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                          >
                            <User size={15} />
                            Profilim
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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
                    className="hidden sm:block text-sm text-white/70 hover:text-white px-4 py-2 rounded-lg transition-all hover:bg-white/5"
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
                className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden bg-[#08080e]/98 backdrop-blur-xl border-t border-white/8">
            <div className="max-w-[1280px] mx-auto px-4 py-4 flex flex-col gap-1">
              {isLoggedIn && user && (
                <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white/5 rounded-xl">
                  <Avatar name={fullName || displayName} src={user.image || undefined} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                    <p className="text-xs text-white/40 truncate">@{user.username}</p>
                  </div>
                </div>
              )}

              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="text-left px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/8 flex flex-col gap-2 mt-2">
                {isLoggedIn ? (
                  <>
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
