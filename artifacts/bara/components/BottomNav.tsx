import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { router, usePathname } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  icon: string;
  iconSet: "feather" | "mci";
  route: string;
}

const CUSTOMER_TABS: NavItem[] = [
  { label: "Home", icon: "home", iconSet: "feather", route: "/(customer)/home" },
  { label: "My Jobs", icon: "briefcase", iconSet: "feather", route: "/(customer)/my-jobs" },
  { label: "Settings", icon: "settings", iconSet: "feather", route: "/(customer)/settings" },
];

const DRIVER_TABS: NavItem[] = [
  { label: "Map", icon: "map", iconSet: "feather", route: "/(driver)/map" },
  { label: "Active Job", icon: "truck-delivery", iconSet: "mci", route: "/(driver)/active-job" },
  { label: "Settings", icon: "settings", iconSet: "feather", route: "/(driver)/settings" },
];

export function BottomNav() {
  const { user, activeMode } = useAuth();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const effectiveMode = user?.role === "both" ? activeMode : (user?.role ?? "customer");
  const tabs = effectiveMode === "customer" ? CUSTOMER_TABS : DRIVER_TABS;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {tabs.map((tab) => {
        const slug = tab.route.replace("/(customer)/", "").replace("/(driver)/", "");
        const isActive = pathname.includes(slug);

        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            {tab.iconSet === "feather" ? (
              <Feather name={tab.icon as any} size={22} color={isActive ? Colors.gold : Colors.textMuted} />
            ) : (
              <MaterialCommunityIcons name={tab.icon as any} size={22} color={isActive ? Colors.gold : Colors.textMuted} />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    minHeight: 44,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.gold,
  },
});
