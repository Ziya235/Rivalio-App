import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, toApiError } from "../api/errors";

type Entry = { data: unknown; at: number };

// Tiny stale-while-revalidate cache: revisiting a screen shows the last data
// instantly and refreshes in the background. Identical in-flight requests are
// shared so two components asking for the same key make one HTTP call.
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export function clearQueryCache() {
  cache.clear();
  inflight.clear();
}

export function invalidateQueries(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function run<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export type QueryState<T> = {
  data: T | undefined;
  error: ApiError | null;
  /** First load with nothing to show yet. */
  loading: boolean;
  /** Pull-to-refresh in progress. */
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** Background reload without spinners (polling, socket-triggered). */
  reload: () => Promise<void>;
  setData: (updater: (current: T | undefined) => T | undefined) => void;
};

/**
 * `key` must uniquely describe the request; pass `null` to skip fetching.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>): QueryState<T> {
  const cached = key ? (cache.get(key)?.data as T | undefined) : undefined;
  const [data, setDataState] = useState<T | undefined>(cached);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(key != null && cached === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  const execute = useCallback(async (mode: "initial" | "refresh" | "silent") => {
    const currentKey = keyRef.current;
    if (!currentKey) return;
    if (mode === "refresh") setRefreshing(true);
    try {
      const result = await run(currentKey, () => fetcherRef.current());
      if (keyRef.current !== currentKey) return;
      setDataState(result);
      setError(null);
    } catch (err) {
      if (keyRef.current !== currentKey) return;
      const apiError = toApiError(err);
      if (apiError.kind === "cancelled") return;
      // Keep showing stale data on a failed background refresh.
      if (mode !== "silent") setError(apiError);
    } finally {
      if (keyRef.current === currentKey) {
        setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!key) {
      setLoading(false);
      return;
    }
    const hit = cache.get(key);
    setDataState(hit?.data as T | undefined);
    setLoading(hit === undefined);
    setError(null);
    void execute(hit ? "silent" : "initial");
  }, [key, execute]);

  const refresh = useCallback(() => execute("refresh"), [execute]);
  const reload = useCallback(() => execute("silent"), [execute]);

  const setData = useCallback((updater: (current: T | undefined) => T | undefined) => {
    setDataState((current) => {
      const next = updater(current);
      const currentKey = keyRef.current;
      if (currentKey && next !== undefined) cache.set(currentKey, { data: next, at: Date.now() });
      return next;
    });
  }, []);

  return { data, error, loading, refreshing, refresh, reload, setData };
}
