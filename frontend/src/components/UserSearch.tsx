import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, X } from "lucide-react";
import { Avatar } from "./ui";
import { searchUsers, type UserSearchHit } from "../api/users";

type UserSearchProps = {
  light?: boolean;
};

export function UserSearch({ light = false }: UserSearchProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const q = query.trim().replace(/^@+/, "");
    abortRef.current?.abort();

    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setOpen(true);

    const timer = window.setTimeout(async () => {
      try {
        const data = await searchUsers(q, controller.signal);
        if (controller.signal.aborted) return;
        setResults(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setResults([]);
        setError(err instanceof Error ? err.message : "Axtarış alınmadı");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const goToUser = (hit: UserSearchHit) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (hit.playerId) {
      navigate(`/players/${hit.playerId}`);
      return;
    }
    navigate(`/users/${hit.id}`);
  };

  const showPanel = open && query.trim().length > 0;
  const panel = light
    ? "border-gray-200 bg-white shadow-xl"
    : "border-white/10 bg-[#14141c] shadow-2xl";
  const hoverRow = light ? "hover:bg-gray-50" : "hover:bg-white/5";
  const nameText = light ? "text-gray-900" : "text-white";
  const muted = light ? "text-gray-500" : "text-white/45";
  const inputClass = light
    ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500/50"
    : "bg-[#18181f] border-white/10 text-white placeholder-white/30 focus:border-[#c5f135]/50";

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          size={16}
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${light ? "text-gray-400" : "text-white/35"}`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          placeholder="İstifadəçi axtar..."
          autoComplete="off"
          className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm outline-none transition-all ${inputClass}`}
        />
        {query ? (
          <button
            type="button"
            aria-label="Təmizlə"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 ${light ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700" : "text-white/35 hover:bg-white/10 hover:text-white"}`}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div
          className={`absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border ${panel}`}
        >
          {loading ? (
            <div className={`flex items-center gap-2 px-4 py-3.5 text-sm ${muted}`}>
              <Loader2 size={14} className="animate-spin" />
              Axtarılır...
            </div>
          ) : error ? (
            <p className="px-4 py-3.5 text-sm text-rose-400">{error}</p>
          ) : results.length === 0 ? (
            <p className={`px-4 py-3.5 text-sm ${muted}`}>Nəticə tapılmadı</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {results.map((hit) => {
                const fullName = `${hit.firstName} ${hit.lastName}`.trim();
                return (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => goToUser(hit)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${hoverRow}`}
                    >
                      <Avatar src={hit.image || undefined} name={fullName || hit.username} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold ${nameText}`}>
                          {fullName || hit.username}
                        </span>
                        <span className={`block truncate text-xs ${muted}`}>
                          @{hit.username}
                          {hit.teamName ? ` · ${hit.teamName}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
