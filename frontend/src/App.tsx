import { useState, useEffect, type ReactNode } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { AdminLayout } from './components/admin/AdminLayout'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import SportsPage from './pages/SportsPage'
import FootballPage from './pages/FootballPage'
import SportGenericPage from './pages/SportGenericPage'
import TeamDetailPage from './pages/TeamDetailPage'
import CreateTeamPage from './pages/CreateTeamPage'
import FindOpponentPage from './pages/FindOpponentPage'
import LeagueDetailPage from './pages/LeagueDetailPage'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MyProfilePage from './pages/MyProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import { AdminLeaguesPage } from './pages/admin/AdminLeaguesPage'
import { AdminLeagueDetailPage } from './pages/admin/AdminLeagueDetailPage'
import { AdminTeamPage } from './pages/admin/AdminTeamPage'
import { AdminMatchesPage } from './pages/admin/AdminMatchesPage'
import { AdminMatchDetailPage } from './pages/admin/AdminMatchDetailPage'
import { AdminChampionshipsPage } from './pages/admin/AdminChampionshipsPage'
import PlayerProfilePage from './pages/PlayerProfilePage'
import AboutUsPage from './pages/AboutUsPage'
import FaqPage from './pages/FaqPage'

const NO_HEADER = ['/login', '/register']
const NO_FOOTER = ['/chat', '/login', '/register']

export type AppOutletContext = {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  isDarkMode: boolean
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('rivalio-theme') !== 'light')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogin = () => {
    navigate('/')
    showToast('Xoş gəldiniz! Platformaya daxil oldunuz.')
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    showToast('Uğurla çıxış etdiniz.')
  }

  const isLoggedIn = !!user
  const showHeader = !NO_HEADER.includes(location.pathname)
  const showFooter = !NO_FOOTER.includes(location.pathname)
  const isLandingPage = location.pathname === '/'
  const supportsTheme =
    isLandingPage ||
    location.pathname.startsWith('/sports') ||
    location.pathname.startsWith('/teams') ||
    location.pathname.startsWith('/players') ||
    location.pathname.startsWith('/leagues') ||
    location.pathname === '/profile' ||
    location.pathname === '/notifications' ||
    location.pathname === '/about-us' ||
    location.pathname === '/faq'
  const isLightMode = supportsTheme && !isDarkMode

  const toggleTheme = () => {
    setIsDarkMode((current) => {
      const next = !current
      localStorage.setItem('rivalio-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <div
      className={`min-h-screen font-body transition-colors duration-300 ${
        isLightMode
          ? 'text-slate-900'
          : 'bg-[#08080e] text-white'
      }`}
    >
      {showHeader && (
        <Header
          isLightMode={isLightMode}
          showThemeToggle={supportsTheme}
          onThemeToggle={toggleTheme}
        />
      )}

      <main>
        <Outlet
          context={{
            isLoggedIn,
            onLogin: handleLogin,
            onLogout: handleLogout,
            isDarkMode,
          } satisfies AppOutletContext}
        />
      </main>

      {showFooter && <Footer isLightMode={isLightMode} />}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[999] px-5 py-3 rounded-xl border text-sm font-medium backdrop-blur-sm animate-count ${
            toast.type === 'success'
              ? 'bg-[#c5f135]/10 border-[#c5f135]/30 text-[#c5f135]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

function BlockAdminFromSports({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAuth()
  if (isLoading) return null
  if (isAdmin) return <Navigate to="/admin" replace />
  return children
}

function SportRoute() {
  const { sport } = useParams<{ sport: string }>()
  if (sport === 'football') return <FootballPage />
  return <SportGenericPage />
}

function AdminLegacyMatchRedirect() {
  const { matchId } = useParams()
  return <Navigate to={`/admin/football/matches/${matchId}`} replace />
}

function AdminLegacyLeagueRedirect() {
  const { leagueId } = useParams()
  return <Navigate to={`/admin/football/leagues/${leagueId}`} replace />
}

function AdminLegacyTeamRedirect() {
  const { leagueId, teamId } = useParams()
  return <Navigate to={`/admin/football/leagues/${leagueId}/teams/${teamId}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="football/leagues" replace />} />
          <Route path="football/leagues" element={<AdminLeaguesPage />} />
          <Route path="football/leagues/:leagueId" element={<AdminLeagueDetailPage />} />
          <Route path="football/leagues/:leagueId/teams/:teamId" element={<AdminTeamPage />} />
          <Route path="football/matches" element={<AdminMatchesPage />} />
          <Route path="football/matches/:matchId" element={<AdminMatchDetailPage />} />
          <Route path="football/championships" element={<AdminChampionshipsPage />} />
          <Route path="matches" element={<Navigate to="/admin/football/matches" replace />} />
          <Route path="matches/:matchId" element={<AdminLegacyMatchRedirect />} />
          <Route path="leagues/:leagueId" element={<AdminLegacyLeagueRedirect />} />
          <Route path="leagues/:leagueId/teams/:teamId" element={<AdminLegacyTeamRedirect />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route index element={<LandingPage />} />
          <Route
            path="sports"
            element={
              <BlockAdminFromSports>
                <SportsPage />
              </BlockAdminFromSports>
            }
          />
          <Route
            path="sports/:sport"
            element={
              <BlockAdminFromSports>
                <SportRoute />
              </BlockAdminFromSports>
            }
          />
          <Route path="teams/create" element={<CreateTeamPage />} />
          <Route path="teams/:teamId" element={<TeamDetailPage />} />
          <Route path="find-opponent" element={<FindOpponentPage />} />
          <Route path="leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="players/:playerId" element={<PlayerProfilePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="profile" element={<MyProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="about-us" element={<AboutUsPage />} />
          <Route path="faq" element={<FaqPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
