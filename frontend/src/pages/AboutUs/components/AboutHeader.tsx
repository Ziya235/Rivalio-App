export function AboutHeader({ light }: { light: boolean }) {
  return (
    <div className="mb-16 max-w-3xl">
      <h1
        className={`font-display text-5xl sm:text-6xl font-bold mb-5 leading-tight ${
          light ? 'text-gray-900' : 'text-white'
        }`}
      >
        Oyunçu, komanda və rəqib tapmaq üçün sosial idman platforması
      </h1>
      <p className={`text-lg leading-relaxed ${light ? 'text-gray-500' : 'text-white/45'}`}>
        Rivalio Azərbaycanda idman həvəskarlarını bir araya gətirir. Meydanda yoldaş,
        komanda və ya növbəti rəqibini tap, liqalara qoşul və nəticələrini izlə.
      </p>
    </div>
  )
}
