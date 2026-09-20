export function BrandMark({
  light,
  compact = false,
}: {
  light: boolean
  compact?: boolean
}) {
  const box = compact ? 'w-9 h-9' : 'w-10 h-10'
  const title = compact ? 'text-2xl' : 'text-2xl'

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${box} rounded-xl flex items-center justify-center font-display font-bold ${
          light
            ? 'bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25'
            : 'bg-[#c5f135] text-[#08080e]'
        }`}
      >
        R
      </div>
      <span className={`font-display font-700 ${title} ${light ? 'text-gray-900' : 'text-white'}`}>
        Rival
        <span
          className={
            light
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500'
              : 'text-[#c5f135]'
          }
        >
          io
        </span>
      </span>
    </div>
  )
}
