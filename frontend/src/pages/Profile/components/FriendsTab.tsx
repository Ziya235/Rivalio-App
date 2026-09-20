import { MessageCircle, UserMinus } from 'lucide-react'
import { Avatar, Badge, Button } from '../../../components/ui'
import type { FriendListItem, FriendRequest } from '../../../api/friends'

function personName(user: { firstName: string; lastName: string; username: string }) {
  return `${user.firstName} ${user.lastName}`.trim() || user.username
}

export function FriendsTab({
  light,
  loading,
  error,
  friends,
  incoming,
  busyId,
  onOpenProfile,
  onMessage,
  onRemove,
  onAccept,
  onReject,
}: {
  light: boolean
  loading: boolean
  error: string | null
  friends: FriendListItem[]
  incoming: FriendRequest[]
  busyId: number | null
  onOpenProfile: (userId: number) => void
  onMessage: (userId: number) => void
  onRemove: (userId: number) => void
  onAccept: (requestId: number) => void
  onReject: (requestId: number) => void
}) {
  const cardCls = light
    ? 'bg-white/70 backdrop-blur-sm border border-gray-200'
    : 'bg-[#101017] card-border'

  if (loading) {
    return <p className={`text-sm ${light ? 'text-gray-400' : 'text-white/40'}`}>Yüklənir...</p>
  }
  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  return (
    <div className="space-y-8">
      {incoming.length > 0 ? (
        <div>
          <h3 className={`font-display text-xl font-700 mb-3 flex items-center gap-2 ${light ? 'text-gray-900' : 'text-white'}`}>
            Gələn sorğular
            <Badge variant="lime">{incoming.length}</Badge>
          </h3>
          <div className="space-y-3">
            {incoming.map((req) => {
              const name = personName(req.sender)
              return (
                <div key={req.id} className={`rounded-2xl p-4 flex items-center gap-3 ${cardCls}`}>
                  <button type="button" onClick={() => onOpenProfile(req.sender.id)}>
                    <Avatar src={req.sender.image || undefined} name={name} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(req.sender.id)}
                      className={`font-medium truncate text-left ${light ? 'text-gray-900 hover:text-emerald-700' : 'text-white hover:text-[#c5f135]'}`}
                    >
                      {name}
                    </button>
                    <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                      @{req.sender.username}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === req.id} onClick={() => onAccept(req.id)}>
                      Qəbul et
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === req.id}
                      onClick={() => onReject(req.id)}
                    >
                      Rədd et
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
          Dostlar ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <p className={`text-sm ${light ? 'text-gray-400' : 'text-white/30'}`}>Hələ dostunuz yoxdur</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {friends.map((item) => {
              const name = personName(item.friend)
              return (
                <div key={item.friendshipId} className={`rounded-2xl p-4 flex items-center gap-3 ${cardCls}`}>
                  <button type="button" onClick={() => onOpenProfile(item.friend.id)}>
                    <Avatar src={item.friend.image || undefined} name={name} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(item.friend.id)}
                      className={`font-medium truncate text-left ${light ? 'text-gray-900 hover:text-emerald-700' : 'text-white hover:text-[#c5f135]'}`}
                    >
                      {name}
                    </button>
                    <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                      @{item.friend.username}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onMessage(item.friend.id)}
                      disabled={busyId === item.friend.id}
                      className={`p-2 rounded-lg transition-all ${
                        light
                          ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-500/10'
                          : 'text-white/40 hover:text-[#c5f135] hover:bg-[#c5f135]/10'
                      }`}
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.friend.id)}
                      disabled={busyId === item.friend.id}
                      className={`p-2 rounded-lg transition-all ${
                        light
                          ? 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                          : 'text-white/40 hover:text-red-400 hover:bg-red-400/10'
                      }`}
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
