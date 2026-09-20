export function LoginBackground({ light }: { light: boolean }) {
  if (!light) return null

  return (
    <>
      <div className="absolute inset-0 [background:linear-gradient(135deg,#dbeafe_0%,#e0f2fe_25%,#f0f9ff_50%,#ede9fe_75%,#e0f2fe_100%)]" />
      <div className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-sky-300/25 via-blue-200/15 to-transparent blur-3xl" />
      <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-300/20 to-transparent blur-3xl" />
    </>
  )
}
