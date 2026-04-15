import { createContext, useContext, type ReactNode } from "react";
import { mobileTheme } from "./mobile-theme";

const MobileThemeContext = createContext(mobileTheme);

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  return <MobileThemeContext.Provider value={mobileTheme}>{children}</MobileThemeContext.Provider>;
}

export function useMobileTheme() {
  return useContext(MobileThemeContext);
}

