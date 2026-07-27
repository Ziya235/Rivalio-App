import { useState, useEffect } from 'react'
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
import TeamsPage from './pages/TeamsPage'
import TeamDetailPage from './pages/TeamDetailPage'
import CreateTeamPage from './pages/CreateTeamPage'
import FindOpponentPage from './pages/FindOpponentPage'
import LeagueDetailPage from './pages/LeagueDetailPage'
import PlayerProfilePage from './pages/PlayerProfilePage'
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

const NO_HEADER = ['/login', '/register']
const NO_FOOTER = ['/chat', '/login', '/register']

export type AppOutletContext = {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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

  return (
    <div className="min-h-screen bg-[#08080e] text-white font-body">
      {showHeader && <Header />}

      <main>
        <Outlet context={{ isLoggedIn, onLogin: handleLogin, onLogout: handleLogout } satisfies AppOutletContext} />
      </main>

      {showFooter && <Footer />}

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

function SportRoute() {
  const { sport } = useParams<{ sport: string }>()
  if (sport === 'football') return <FootballPage />
  return <SportGenericPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminLeaguesPage />} />
          <Route path="matches" element={<AdminMatchesPage />} />
          <Route path="matches/:matchId" element={<AdminMatchDetailPage />} />
          <Route path="leagues/:leagueId" element={<AdminLeagueDetailPage />} />
          <Route path="leagues/:leagueId/teams/:teamId" element={<AdminTeamPage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="sports" element={<SportsPage />} />
          <Route path="sports/:sport" element={<SportRoute />} />
          <Route path="teams" element={<TeamsPage />} />
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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
