import React from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

interface LanguageToggleProps {
  style?: object;
}

export function LanguageToggle({ style }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();

  return (
    <View style={[styles.pill, style]}>
      <Pressable
        style={[styles.option, lang === "sv" && styles.active]}
        onPress={() => setLang("sv")}
        hitSlop={6}
      >
        <Text style={[styles.label, lang === "sv" && styles.activeLabel]}>
          {Platform.OS === "web" ? "🇸🇪 " : ""}SV
        </Text>
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        style={[styles.option, lang === "en" && styles.active]}
        onPress={() => setLang("en")}
        hitSlop={6}
      >
        <Text style={[styles.label, lang === "en" && styles.activeLabel]}>
          {Platform.OS === "web" ? "🇬🇧 " : ""}EN
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    backgroundColor: Colors.gold,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  activeLabel: {
    color: Colors.navy,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
});
