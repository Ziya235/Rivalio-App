export function splitTelegramText(text, limit = 4096) {
  const source = String(text ?? "").trim();
  if (!source) return [];
  if (source.length <= limit) return [source];

  const chunks = [];
  let rest = source;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut < Math.floor(limit * 0.5)) cut = rest.lastIndexOf(" ", limit);
    if (cut < Math.floor(limit * 0.5)) cut = limit;
    const piece = rest.slice(0, cut).trimEnd();
    if (piece) chunks.push(piece);
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
