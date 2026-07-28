/**
 * Session persistence for the prototype.
 *
 * All platform state lives in React state so the demo stays self-contained,
 * but a planner who refreshes the browser must not lose project progress,
 * recorded decisions or approved versions. Each slice is mirrored into
 * localStorage after mount (never during render, so SSR markup and the first
 * client render stay identical).
 */
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "difp:v1:";

export const persistKeys: string[] = [];

export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  if (!persistKeys.includes(key)) persistKeys.push(key);
  const initialJson = JSON.stringify(initial);
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt or unavailable storage */
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const next = JSON.stringify(value);
      if (next === initialJson) window.localStorage.removeItem(PREFIX + key);
      else window.localStorage.setItem(PREFIX + key, next);
    } catch {
      /* quota or private mode — persistence is best effort */
    }
  }, [initialJson, key, value]);

  return [value, setValue];
}

/** Wipe every persisted slice so the next state assignment starts from seed. */
export function clearPersistedState() {
  try {
    for (const key of persistKeys) window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
