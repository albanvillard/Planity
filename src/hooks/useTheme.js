import { useState, useEffect } from "react";

/**
 * Hook personnalisé pour gérer l'état du thème sombre/clair.
 * Persiste le choix dans le localStorage et détecte la préférence système par défaut.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // 1. Vérification dans le localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme;
    }
    // 2. Détection de la préférence système
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return systemPrefersDark ? "dark" : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}

export default useTheme;
