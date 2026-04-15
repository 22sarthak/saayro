import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileThemeProvider } from "@/theme/mobile-theme-provider";
import { mobileTheme } from "@/theme/mobile-theme";

export default function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(mobileTheme.colors.background);
  }, []);

  return (
    <SafeAreaProvider>
      <MobileThemeProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade"
          }}
        />
      </MobileThemeProvider>
    </SafeAreaProvider>
  );
}
