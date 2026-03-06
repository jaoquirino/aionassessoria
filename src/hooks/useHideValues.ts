import { useState, useCallback } from "react";

const STORAGE_KEY = "hide-monetary-values";

export function useHideValues() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setHidden(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const mask = useCallback((value: string) => {
    if (!hidden) return value;
    return value.replace(/[\d.,]+/g, "••••");
  }, [hidden]);

  return { hidden, toggle, mask };
}
