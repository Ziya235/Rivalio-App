export function FaqHeader({ light }: { light: boolean }) {
  return (
    <div className="mb-12 text-center">
      <p
        className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${
          light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
        }`}
      >
        Dəstək
      </p>
      <h1
        className={`font-display text-5xl sm:text-6xl font-bold mb-4 ${
          light ? 'text-gray-900' : 'text-white'
        }`}
      >
        Tez-tez verilən suallar
      </h1>
      <p className={`text-lg ${light ? 'text-gray-500' : 'text-white/45'}`}>
        Qeydiyyat, komandalar, liqalar və chat haqqında ən çox soruşulan suallar.
      </p>
    </div>
  )
}
