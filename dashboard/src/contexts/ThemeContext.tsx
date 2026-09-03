import {
	createContext,
	useEffect,
	useState,
	useCallback,
	type FC,
	type ReactNode,
} from "react";
import { type Theme } from "../types";

interface ThemeContextType {
	theme: Theme;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
	isDark: boolean;
}

const STORAGE_KEY = "safecheck-theme";

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextType | undefined>(
	undefined,
);

export const ThemeProvider: FC<{
	children: ReactNode;
	defaultTheme?: Theme;
}> = ({ children, defaultTheme = "system" }) => {
	const [theme, setThemeState] = useState<Theme>(() => {
		const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
		return saved || defaultTheme;
	});

	const getSystemTheme = (): "light" | "dark" => {
		if (typeof window === "undefined") return "dark";
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	};

	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
		if (theme === "system") return getSystemTheme();
		return theme;
	});

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
		const active = theme === "system" ? getSystemTheme() : theme;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setResolvedTheme(active);
		applyTheme(active);
		localStorage.setItem(STORAGE_KEY, theme);

		if (theme === "system") {
			const media = window.matchMedia("(prefers-color-scheme: dark)");
			const listener = (e: MediaQueryListEvent) => {
				const newResolved = e.matches ? "dark" : "light";
				setResolvedTheme(newResolved);
				applyTheme(newResolved);
			};
			media.addEventListener("change", listener);
			return () => media.removeEventListener("change", listener);
		}
	}, [theme, applyTheme]);

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);
	};

	const toggleTheme = () => {
		setThemeState((prev) => {
			const current = prev === "system" ? getSystemTheme() : prev;
			return current === "dark" ? "light" : "dark";
		});
	};

	return (
		<ThemeContext.Provider
			value={{
				theme,
				resolvedTheme,
				setTheme,
				toggleTheme,
				isDark: resolvedTheme === "dark",
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
};
