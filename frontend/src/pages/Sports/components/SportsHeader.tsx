export function SportsHeader({ light }: { light: boolean }) {
  return (
    <div className="mb-14">
      <h1
        className={`font-display text-5xl sm:text-6xl font-bold mb-3 ${
          light ? 'text-gray-900' : 'text-white'
        }`}
      >
        İdman növləri
      </h1>

      <p
        className={`text-lg max-w-xl ${
          light ? 'text-gray-500' : 'text-white/45'
        }`}
      >
        Sevdiyin idmanı seç, oyunçuları tap, komandalar qur və
        rəqabətə qoşul.
      </p>
    </div>
  )
}
