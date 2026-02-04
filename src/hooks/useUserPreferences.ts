import { useState, useEffect, useCallback } from "react";

export type ThemePreference = "light" | "dark" | "system";

interface UserPreferences {
  theme: ThemePreference;
}

const STORAGE_KEY = "user_preferences";

const defaultPreferences: UserPreferences = {
  theme: "system",
};

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultPreferences;
}

function savePreferences(prefs: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    preferences.theme === "system" ? getSystemTheme() : preferences.theme
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (preferences.theme === "system") {
        setResolvedTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preferences.theme]);

  // Update resolved theme when preference changes
  useEffect(() => {
    if (preferences.theme === "system") {
      setResolvedTheme(getSystemTheme());
    } else {
      setResolvedTheme(preferences.theme);
    }
  }, [preferences.theme]);

  // Apply theme to document
  useEffect(() => {
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((theme: ThemePreference) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, theme };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferences((prev) => {
      const newTheme: ThemePreference = 
        prev.theme === "system" 
          ? "dark" 
          : prev.theme === "dark" 
            ? "light" 
            : "system";
      const newPrefs = { ...prev, theme: newTheme };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  return {
    preferences,
    theme: preferences.theme,
    resolvedTheme,
    isDark: resolvedTheme === "dark",
    setTheme,
    toggleTheme,
  };
}
