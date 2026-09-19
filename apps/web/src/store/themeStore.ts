import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Mode = "light" | "dark";

interface ThemeState {
  /** null = follow the system, which is the default until the user chooses. */
  mode: Mode | null;
  toggle: (systemPrefersDark: boolean) => void;
}

/**
 * Theme preference is in a store rather than component state for one reason:
 * it has to survive a reload. Local state would reset to system preference on
 * every visit, quietly discarding a choice the user made.
 *
 * `null` is meaningful here — it means "no explicit choice", so the app keeps
 * following the system and updates live if the OS theme changes. Only once the
 * user toggles does an explicit value get stored.
 */
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
