import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const theme = useMobileTheme();

  return (
    <View
      style={{
        alignItems: "center",
        gap: 4
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? theme.colors.accentBuddy : theme.colors.surfaceMuted
        }}
      >
        <Text
          style={{
            color: focused ? theme.colors.textInverted : theme.colors.textSecondary,
            fontSize: 11,
            fontFamily: theme.fonts.bodyMedium
          }}
        >
          {label.slice(0, 1)}
        </Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const theme = useMobileTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.borderSoft,
          height: 78,
          paddingTop: 8,
          paddingBottom: 10
        },
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: theme.fonts.bodyMedium
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="buddy"
        options={{
          title: "Buddy",
          tabBarIcon: ({ focused }) => <TabIcon label="Buddy" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
          tabBarIcon: ({ focused }) => <TabIcon label="Trips" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ focused }) => <TabIcon label="Saved" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />
        }}
      />
    </Tabs>
  );
}
