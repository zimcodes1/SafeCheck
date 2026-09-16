import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type FC,
  type ReactNode,
} from "react";

interface ThemeContextType {
  resolvedTheme: "light" | "dark";
  isDark: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export const ThemeProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    getSystemTheme,
  );

  const applyTheme = useCallback((resolved: "light" | "dark") => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved);
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const active = getSystemTheme();
    setResolvedTheme(active);
    applyTheme(active);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? "dark" : "light";
      setResolvedTheme(newResolved);
      applyTheme(newResolved);
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider
      value={{
        resolvedTheme,
        isDark: resolvedTheme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
