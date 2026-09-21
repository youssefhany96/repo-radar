import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Mode = "light" | "dark";

interface ThemeState {
  /** null = follow the system, which is the default until the user chooses. */
  mode: Mode | null;
  toggle: (systemPrefersDark: boolean) => void;
}

// In a store because the choice has to survive a reload. `null` means no
// explicit choice, so the app keeps following the system.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: null,
      toggle: (systemPrefersDark) => {
        const current = get().mode ?? (systemPrefersDark ? "dark" : "light");
        set({ mode: current === "light" ? "dark" : "light" });
      },
    }),
    { name: "repo-radar:theme:v1", storage: createJSONStorage(() => localStorage) },
  ),
);
