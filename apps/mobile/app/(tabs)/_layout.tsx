import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const theme = useMobileTheme();

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <View
        style={{
          minWidth: focused ? 38 : 30,
          height: 30,
          paddingHorizontal: focused ? 10 : 0,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? theme.colors.accentBuddy : theme.colors.surfaceMuted,
          borderWidth: focused ? 1 : 0,
          borderColor: focused ? theme.colors.borderSoft : "transparent"
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
  const { session, status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (!session?.authenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: "transparent",
          position: "absolute",
          left: theme.layout.tabBarInset,
          right: theme.layout.tabBarInset,
          bottom: theme.layout.tabBarInset,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
          borderRadius: 24,
          ...theme.shadow.card
        },
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: theme.fonts.bodyMedium
        },
        tabBarItemStyle: {
          paddingTop: 2
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
