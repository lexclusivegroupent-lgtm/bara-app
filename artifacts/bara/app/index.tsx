import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

const SERVICE_CARDS = [
  {
    icon: "tag-outline" as const,
    title: "Blocket & Facebook",
    desc: "Hämta ditt fynd snabbt",
  },
  {
    icon: "briefcase-outline" as const,
    title: "Kontors­material",
    desc: "Kontor & småsaker",
  },
  {
    icon: "laptop" as const,
    title: "Elektronik & prylar",
    desc: "Säker hantering",
  },
] as const;

const STEPS = [
  { n: "1", title: "Posta jobbet", sub: "60 sekunder", icon: "edit-3" as const },
  { n: "2", title: "Bäraren accepterar", sub: "Inom minuter", icon: "user-check" as const },
  { n: "3", title: "Levererat", sub: "På 30 minuter", icon: "check-circle" as const },
] as const;

const TRUST_BADGES = ["Max 15kg", "99–299 SEK", "30 min"] as const;

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const primaryScale = useSharedValue(1);
  const secondaryScale = useSharedValue(1);

  const primaryBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: primaryScale.value }],
  }));
  const secondaryBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: secondaryScale.value }],
  }));

  function springPress(sv: ReturnType<typeof useSharedValue<number>>) {
    sv.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }
  function springRelease(sv: ReturnType<typeof useSharedValue<number>>) {
    sv.value = withSpring(1, { damping: 15, stiffness: 400 });
  }

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.getItem("bara_onboarding_complete").then((val) => {
        if (!val) {
          router.replace("/onboarding");
          return;
        }
        setOnboardingChecked(true);
        if (user) {
          router.replace(user.role === "driver" ? "/(driver)/map" : "/(customer)/home");
          return;
        }
        opacity.value = withDelay(120, withTiming(1, { duration: 650 }));
        translateY.value = withDelay(120, withSpring(0, { damping: 16, stiffness: 90 }));
      });
    }
  }, [isLoading, user]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (isLoading || !onboardingChecked) {
    return <View style={styles.splash} />;
  }
  if (user) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 64 : 24),
            paddingBottom: insets.bottom + 48,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={animStyle} pointerEvents="box-none">

          {/* ─── HERO ─── */}
          <View style={styles.hero}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.wordmark}>Bära</Text>
            <Text style={styles.headline}>
              Smartaste sättet att{"\n"}flytta småsaker i din stad
            </Text>
            <View style={styles.badgeRow}>
              {TRUST_BADGES.map((label) => (
                <View key={label} style={styles.badge}>
                  <Text style={styles.badgeText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ─── CTA BUTTONS ─── */}
          <View style={styles.ctas}>
            <Animated.View style={primaryBtnStyle} pointerEvents="box-none">
              <Pressable
                style={styles.primaryBtn}
                onPress={() => router.push("/register")}
                onPressIn={() => springPress(primaryScale)}
                onPressOut={() => springRelease(primaryScale)}
              >
                <Text style={styles.primaryText}>Kom igång</Text>
                <Feather name="arrow-right" size={18} color={Colors.navy} />
              </Pressable>
            </Animated.View>
            <Animated.View style={secondaryBtnStyle} pointerEvents="box-none">
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => router.push("/login")}
                onPressIn={() => springPress(secondaryScale)}
                onPressOut={() => springRelease(secondaryScale)}
              >
                <Text style={styles.secondaryText}>Logga in</Text>
              </Pressable>
            </Animated.View>
          </View>

          {/* ─── SERVICE CARDS ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vad kan du skicka?</Text>
            <View style={styles.cardsRow}>
              {SERVICE_CARDS.map((card, i) => (
                <Animated.View
                  key={card.icon}
                  entering={FadeInDown.delay(i * 80 + 200).springify()}
                  style={styles.card}
                >
                  <View style={styles.cardIconBg}>
                    <MaterialCommunityIcons
                      name={card.icon}
                      size={20}
                      color={Colors.gold}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDesc}>{card.desc}</Text>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* ─── HOW IT WORKS ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Så fungerar det</Text>
            <View style={styles.steps}>
              {STEPS.map((step, i) => (
                <Animated.View
                  key={step.n}
                  entering={FadeInDown.delay(i * 100 + 300).springify()}
                  style={styles.stepRow}
                >
                  <View style={styles.stepLeft}>
                    <View style={styles.stepCircle}>
                      <Text style={styles.stepNum}>{step.n}</Text>
                    </View>
                    {i < STEPS.length - 1 && <View style={styles.stepConnector} />}
                  </View>
                  <View style={styles.stepBody}>
                    <View style={styles.stepTitleRow}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Feather name={step.icon} size={14} color={Colors.gold} />
                    </View>
                    <Text style={styles.stepSub}>{step.sub}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* ─── TRUST BAR ─── */}
          <View style={styles.trustBar}>
            <Feather name="shield" size={12} color={Colors.textMuted} />
            <Text style={styles.trustText}>
              Oberoende uppdragstagare · F-skatt · Säkra betalningar via Stripe
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceDark,
  },
  scroll: {
    paddingHorizontal: 24,
  },

  // ── Hero
  hero: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 14,
  },
  wordmark: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -2,
    marginBottom: 10,
  },
  headline: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 20,
    opacity: 0.88,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },

  // ── CTAs
  ctas: {
    gap: 10,
    marginBottom: 40,
  },
  primaryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.navy,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },

  // ── Sections
  section: {
    marginBottom: 36,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  // ── Service cards
  cardsRow: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${Colors.gold}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 16,
  },
  cardDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 15,
  },

  // ── Steps
  steps: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    gap: 16,
    minHeight: 60,
  },
  stepLeft: {
    alignItems: "center",
    width: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.gold}1A`,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  stepConnector: {
    flex: 1,
    width: 1.5,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  stepBody: {
    flex: 1,
    paddingTop: 5,
    paddingBottom: 18,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  stepSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },

  // ── Trust bar
  trustBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 20,
  },
  trustText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
