import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const logoScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.getItem("bara_onboarding_complete").then((val) => {
        if (!val) {
          router.replace("/onboarding");
          return;
        }
        setOnboardingChecked(true);
        if (user) {
          if (user.role === "driver") {
            router.replace("/(driver)/map");
          } else {
            router.replace("/(customer)/home");
          }
          return;
        }
        logoScale.value = withSpring(1, { damping: 12 });
        contentOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
      });
    }
  }, [isLoading, user]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (isLoading || !onboardingChecked) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.navy }]} />
    );
  }

  if (user) return null;

  return (
    <LinearGradient
      colors={[Colors.surfaceDark, Colors.navy, Colors.surface]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
        <Animated.View style={[styles.logoSection, logoStyle]}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Bära</Text>
          {/* Brand tagline stays bilingual always — part of brand identity */}
          <Text style={styles.taglineEN}>Carry anything, anywhere</Text>
          <Text style={styles.taglineSV}>Bär vad som helst, vart som helst</Text>
          <View style={styles.freeLaunchBadge}>
            <Feather name="gift" size={12} color={Colors.success} />
            <Text style={styles.freeLaunchText}>{t("freeDuringLaunch")}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.serviceCards, contentStyle]}>
          <ServiceCard
            icon="sofa"
            title={t("furnitureTransport")}
            subtitle={t("moveSofas")}
            delay={0}
          />
          <ServiceCard
            icon="delete-sweep"
            title={t("junkTrash")}
            subtitle={t("clearOut")}
            delay={100}
          />
        </Animated.View>

        <Animated.View style={[styles.buttons, contentStyle]}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={() => router.push("/register")}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>{t("getStarted")}</Text>
            <Feather name="arrow-right" size={18} color={Colors.navy} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.loginText}>{t("logIn")}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

function ServiceCard({ icon, title, subtitle, delay }: { icon: any; title: string; subtitle: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay + 600).springify()}>
      <View style={styles.serviceCard}>
        <View style={styles.serviceIconBg}>
          <MaterialCommunityIcons name={icon} size={28} color={Colors.gold} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{title}</Text>
          <Text style={styles.serviceSubtitle}>{subtitle}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.textMuted} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 26,
  },
  appName: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -1,
  },
  taglineEN: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
    marginTop: 4,
  },
  taglineSV: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: "italic",
  },
  freeLaunchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.success}18`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.success}35`,
    marginTop: 10,
  },
  freeLaunchText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  serviceCards: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  serviceIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  serviceSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  buttons: {
    gap: 12,
    paddingBottom: 16,
  },
  getStartedBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  getStartedText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  loginBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  loginText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
