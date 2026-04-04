import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { router, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface NavItem {
  label: string;
  labelSv: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  slug: string;
}

const CUSTOMER_TABS: NavItem[] = [
  { label: "Home",     labelSv: "Hem",           icon: "home",       route: "/(customer)/home",     slug: "home" },
  { label: "My Jobs",  labelSv: "Mina jobb",     icon: "briefcase",  route: "/(customer)/my-jobs",  slug: "my-jobs" },
  { label: "Settings", labelSv: "Inställningar", icon: "settings",   route: "/(customer)/settings", slug: "settings" },
];

const DRIVER_TABS: NavItem[] = [
  { label: "Jobs",     labelSv: "Jobb",          icon: "map",         route: "/(driver)/map",      slug: "map" },
  { label: "Earnings", labelSv: "Intäkter",      icon: "dollar-sign", route: "/(driver)/earnings", slug: "earnings" },
  { label: "Settings", labelSv: "Inställningar", icon: "settings",    route: "/(driver)/settings", slug: "settings" },
];

export function BottomNav() {
  const { user, activeMode } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (!user) return null;

  const effectiveMode = user.role === "both" ? activeMode : user.role;
  const tabs = effectiveMode === "driver" ? DRIVER_TABS : CUSTOMER_TABS;
  const bottomPad = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8);

  function isActive(tab: NavItem) {
    return pathname === `/${tab.slug}` || pathname.endsWith(`/${tab.slug}`);
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <TouchableOpacity
            key={tab.slug}
            style={styles.tab}
            onPress={() => router.replace(tab.route as any)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.pill, active && styles.pillActive]}>
              <Feather
                name={tab.icon}
                size={20}
                color={active ? Colors.navy : Colors.textMuted}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {lang === "sv" ? tab.labelSv : tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  pill: {
    width: 48,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: Colors.gold,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
  },
});
