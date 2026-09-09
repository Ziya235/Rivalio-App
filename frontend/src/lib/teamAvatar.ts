const TONES = [
  "bg-emerald-600 text-white",
  "bg-sky-600 text-white",
  "bg-violet-600 text-white",
  "bg-amber-500 text-white",
  "bg-rose-600 text-white",
  "bg-teal-600 text-white",
  "bg-indigo-600 text-white",
  "bg-cyan-600 text-white",
] as const;

export function teamInitialTone(name: string): string {
  const key = name.trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}
