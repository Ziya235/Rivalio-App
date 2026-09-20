import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Tabs } from '../../components/ui'
import { fetchPlayerProfile, type PlayerProfile } from '../../api/players'
import { fetchUserProfile } from '../../api/users'
import { fetchVisibleChampionships } from '../../api/championships'
import type { ChampionshipListItem } from '../../types/championship'
import { useAuth } from '../../context/AuthContext'
import type { AppOutletContext } from '../../App'
import { ChampionshipsTab } from '../Profile/components'
import { PLAYER_PROFILE_TABS, calcAge, type PlayerProfileTab } from './helpers'
import { PlayerHeader, PlayerInfoTab, PlayerLeaguesTab, PlayerTeamsTab } from './components'

export default function PlayerProfilePage() {
  const { playerId: playerIdParam, userId: userIdParam } = useParams<{
    playerId?: string
    userId?: string
  }>()
  const playerId = Number(playerIdParam)
  const profileUserId = Number(userIdParam)
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const light = !isDarkMode
  const bg = light
    ? '[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]'
    : 'bg-[#08080e]'

  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [championships, setChampionships] = useState<ChampionshipListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [tab, setTab] = useState<PlayerProfileTab>('Profil Məlumatları')

  useEffect(() => {
    const byPlayer = Number.isInteger(playerId) && playerId > 0
    const byUser = Number.isInteger(profileUserId) && profileUserId > 0
    if (!user || (!byPlayer && !byUser)) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const request = byPlayer ? fetchPlayerProfile(playerId) : fetchUserProfile(profileUserId)

    request
      .then(async (profile) => {
        if (cancelled) return
        setPlayer(profile)

        const teamIds = new Set(profile.teams.map((team) => team.id))
        if (teamIds.size === 0) {
          setChampionships([])
          return
        }

        try {
          const items = await fetchVisibleChampionships({ includeAll: true })
          if (cancelled) return
          setChampionships(
            items.filter(
              (item) =>
                item.teams?.some((row) => teamIds.has(row.teamId)) ||
                item.myTeams?.some((team) => teamIds.has(team.id)),
            ),
          )
        } catch {
          if (!cancelled) setChampionships([])
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Oyunçu profili yüklənmədi')
        setPlayer(null)
        setChampionships([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playerId, profileUserId, user])

  const age = useMemo(() => calcAge(player?.dateOfBirth ?? null), [player])
  const fullName = player ? `${player.firstName} ${player.lastName}`.trim() : ''
  const isSelf = Boolean(user && player?.userId === user.id)

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen pt-16 flex items-center justify-center ${bg}`}>
        <p className={`text-sm ${light ? 'text-gray-500' : 'text-white/50'}`}>Yüklənir...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (isSelf) return <Navigate to="/profile" replace />

  if (error || !player) {
    return (
      <div className={`min-h-screen pt-24 text-center text-rose-400 ${bg}`}>
        {error || 'Oyunçu tapılmadı'}
      </div>
    )
  }

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bg}`}>
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        <PlayerHeader
          light={light}
          player={player}
          fullName={fullName}
          age={age}
          isSelf={isSelf}
          photoOpen={photoOpen}
          onOpenPhoto={() => setPhotoOpen(true)}
          onClosePhoto={() => setPhotoOpen(false)}
        />

        <Tabs
          tabs={[...PLAYER_PROFILE_TABS]}
          active={tab}
          onChange={(next) => setTab(next as PlayerProfileTab)}
          className="mb-8 overflow-x-auto"
          light={light}
        />

        {tab === 'Profil Məlumatları' ? (
          <PlayerInfoTab light={light} player={player} age={age} />
        ) : null}

        {tab === 'Komandalar' ? (
          <PlayerTeamsTab
            light={light}
            teams={player.teams}
            onOpenTeam={(id) => navigate(`/teams/${id}`)}
          />
        ) : null}

        {tab === 'Liqalar' ? (
          <PlayerLeaguesTab
            light={light}
            leagues={player.leagues}
            onOpenLeague={(id) => navigate(`/leagues/${id}`)}
          />
        ) : null}

        {tab === 'Çempionatlar' ? (
          <ChampionshipsTab
            light={light}
            loading={false}
            error={null}
            items={championships}
            onOpen={(id) => navigate(`/sports/football/championships/${id}`)}
          />
        ) : null}
      </div>
    </div>
  )
}
