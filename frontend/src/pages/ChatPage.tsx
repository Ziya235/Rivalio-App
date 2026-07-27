import { useState, useRef, useEffect } from 'react'
import { Search, Send, Image, Smile, MoreVertical, Phone, Video, ArrowLeft } from 'lucide-react'
import { Avatar } from '../components/ui'

interface Message {
  id: string
  from: 'me' | 'them'
  text: string
  time: string
  read: boolean
}

interface Conversation {
  id: string
  name: string
  avatar?: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
  type: 'friend' | 'team' | 'match'
}

const CONVERSATIONS: Conversation[] = [
  { id: 'c1', name: 'Tural Həsənov', lastMessage: 'Bazar ertəsi oynaya bilərik?', time: '09:41', unread: 2, online: true, type: 'friend' },
  { id: 'c2', name: 'Bakı Strikerlər', lastMessage: 'Məşq yarın saat 18:00-da', time: 'Dün', unread: 5, online: false, type: 'team' },
  { id: 'c3', name: 'Gənclik Feniks ⚔️', lastMessage: 'Challenge qəbul olundu!', time: 'Dün', unread: 1, online: false, type: 'match' },
  { id: 'c4', name: 'Nigar Əliyeva', lastMessage: 'Çox sağ ol!', time: 'Sar.', unread: 0, online: true, type: 'friend' },
  { id: 'c5', name: 'Rauf Quliyev', lastMessage: '👍', time: 'Çər.', unread: 0, online: false, type: 'friend' },
]

const MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', from: 'them', text: 'Salam! Futbol oynamaq üçün hazırsan?', time: '09:30', read: true },
    { id: 'm2', from: 'me', text: 'Salam! Bəli, nə zaman?', time: '09:32', read: true },
    { id: 'm3', from: 'them', text: 'Bazar ertəsi saat 18:00-da Bakı şəhər stadionunda.', time: '09:35', read: true },
    { id: 'm4', from: 'me', text: 'Əla! Ora gəlirəm. Neçə nəfər olacaq?', time: '09:36', read: true },
    { id: 'm5', from: 'them', text: 'Bazar ertəsi oynaya bilərik?', time: '09:41', read: false },
  ],
  c2: [
    { id: 'm1', from: 'them', text: 'Komanda üzvləri, bu həftə çox yaxşı oynadınız 🔥', time: '18:00', read: true },
    { id: 'm2', from: 'me', text: 'Təşəkkürlər kapitan!', time: '18:05', read: true },
    { id: 'm3', from: 'them', text: 'Məşq yarın saat 18:00-da', time: '18:10', read: false },
  ],
  c3: [
    { id: 'm1', from: 'them', text: 'Salam! 26 iyul oyunu üçün challenge göndərdik.', time: 'Dün', read: true },
    { id: 'm2', from: 'me', text: 'Qəbul edirik. Uğurlar!', time: 'Dün', read: true },
    { id: 'm3', from: 'them', text: 'Challenge qəbul olundu!', time: 'Dün', read: false },
  ],
}

export default function ChatPage() {
  const [activeConv, setActiveConv] = useState<string | null>('c1')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(MESSAGES)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv, messages])

  const sendMessage = () => {
    if (!message.trim() || !activeConv) return
    const newMsg: Message = {
      id: Date.now().toString(),
      from: 'me',
      text: message,
      time: new Date().toLocaleTimeString('az', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    }
    setMessages((prev) => ({
      ...prev,
      [activeConv]: [...(prev[activeConv] || []), newMsg],
    }))
    setMessage('')
  }

  const activeConvData = CONVERSATIONS.find((c) => c.id === activeConv)
  const filteredConvs = CONVERSATIONS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-[#08080e] min-h-screen pt-16">
      <div className="max-w-[1280px] mx-auto h-[calc(100vh-64px)] flex">
        {/* Left: Conversation list */}
        <div
          className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-white/7 flex-shrink-0`}
        >
          <div className="p-4 border-b border-white/7">
            <h2 className="font-display text-2xl font-700 text-white mb-3">Mesajlar</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Axtar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#18181f] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {['Dostlar', 'Komanda', 'Match Chat'].map((section) => {
              const sectionType = section === 'Dostlar' ? 'friend' : section === 'Komanda' ? 'team' : 'match'
              const convs = filteredConvs.filter((c) => c.type === sectionType)
              if (convs.length === 0) return null
              return (
                <div key={section}>
                  <div className="px-4 py-2 text-xs font-semibold text-white/25 uppercase tracking-wider">
                    {section}
                  </div>
                  {convs.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConv(conv.id)
                        setMobileView('chat')
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-colors text-left ${
                        activeConv === conv.id ? 'bg-[#c5f135]/5 border-r-2 border-[#c5f135]' : ''
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={conv.name} size="md" />
                        {conv.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#c5f135] rounded-full border-2 border-[#08080e]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-white text-sm font-semibold truncate">{conv.name}</span>
                          <span className="text-white/30 text-xs flex-shrink-0">{conv.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/45 text-xs truncate">{conv.lastMessage}</span>
                          {conv.unread > 0 && (
                            <span className="ml-2 min-w-[18px] h-[18px] bg-[#c5f135] text-[#08080e] text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Chat */}
        {activeConv && activeConvData ? (
          <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0`}>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-white/7 flex items-center gap-3">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 text-white/50 hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="relative">
                <Avatar name={activeConvData.name} size="md" />
                {activeConvData.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#c5f135] rounded-full border-2 border-[#08080e]" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold text-sm">{activeConvData.name}</div>
                <div className="text-xs text-white/40">
                  {activeConvData.online ? (
                    <span className="text-[#c5f135]">Online</span>
                  ) : (
                    'Son dəfə bu gün görüldü'
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <Phone size={16} />
                </button>
                <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <Video size={16} />
                </button>
                <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {(messages[activeConv] || []).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.from === 'me'
                        ? 'bg-[#c5f135] text-[#08080e] rounded-tr-sm'
                        : 'bg-[#18181f] text-white border border-white/7 rounded-tl-sm'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div
                      className={`text-[10px] mt-1 ${
                        msg.from === 'me' ? 'text-[#08080e]/60 text-right' : 'text-white/30'
                      }`}
                    >
                      {msg.time}
                      {msg.from === 'me' && (
                        <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/7">
              <div className="flex items-center gap-2 bg-[#18181f] border border-white/10 rounded-2xl px-4 py-2.5">
                <button className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
                  <Smile size={18} />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Mesaj yaz..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                />
                <button className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
                  <Image size={18} />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="w-8 h-8 rounded-xl bg-[#c5f135] flex items-center justify-center text-[#08080e] hover:bg-[#d4f55a] transition-all disabled:opacity-30 flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <div className="text-white/50 text-lg">Söhbəti seçin</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
