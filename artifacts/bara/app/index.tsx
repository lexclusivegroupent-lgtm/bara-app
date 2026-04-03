import React, { useEffect } from "react";
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
import { Colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");

/**
 * Asset fail-safe logo: renders assets/logo.png and falls back to the
 * branded truck icon if the image fails to load (missing file, network
 * error, or corrupt asset).
 */
function LogoWithFallback() {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    // Themed placeholder — always renders correctly
    return (
      <MaterialCommunityIcons name="truck-fast" size={56} color={Colors.gold} />
    );
  }

  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require("../assets/logo.png")}
      style={{ width: 72, height: 72, resizeMode: "contain" }}
      onError={() => setHasError(true)}
    />
  );
}

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const logoScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isLoading) {
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
    }
  }, [isLoading, user]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (isLoading) {
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
      <View
        style={[
          styles.content,
          {
            paddingTop:
              insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
      >
        {/* ── Logo ── */}
        <Animated.View style={[styles.logoSection, logoStyle]}>
          <View style={styles.logoImage}>
            <LogoWithFallback />
          </View>
          <Text style={styles.appName}>Bära</Text>
          <Text style={styles.taglineEN}>Carry anything, anywhere</Text>
          <Text style={styles.taglineSV}>Bär vad som helst, vart som helst</Text>
          <View style={styles.freeLaunchBadge}>
            <Feather name="gift" size={12} color={Colors.success} />
            <Text style={styles.freeLaunchText}>Free to use during launch</Text>
          </View>
        </Animated.View>

        {/* ── Service cards ── */}
        <Animated.View style={[styles.serviceCards, contentStyle]}>
          <ServiceCard
            icon="sofa"
            title="Furniture Transport"
            subtitle="Move sofas, tables & more"
            delay={0}
          />
          <ServiceCard
            icon="delete-sweep"
            title="Junk & Trash Pickup"
            subtitle="Clear out unwanted items"
            delay={100}
          />
        </Animated.View>

        {/* ── AI Culture Shock Assistant (web teaser) ── */}
        {Platform.OS === "web" && (
          <Animated.View style={[styles.aiSection, contentStyle]}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons
                name="robot-excited-outline"
                size={18}
                color={Colors.gold}
              />
              <Text style={styles.aiHeaderText}>
                AI Culture Shock Assistant
              </Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaText}>BETA</Text>
              </View>
            </View>

            {/* Mock AI conversation bubble */}
            <View style={styles.aiBubble}>
              <Text style={styles.aiBubbleText}>
                🇸🇪{"  "}"Hej! New to Sweden? Pro tip: Swedes take furniture
                moving{" "}
                <Text style={{ fontStyle: "italic" }}>very</Text> seriously —
                almost as seriously as their right to silence in elevators. Let
                Bära handle the heavy lifting while you practice your{" "}
                <Text style={{ fontStyle: "italic" }}>lagom</Text>."
              </Text>
            </View>

            <Text style={styles.aiSubtext}>
              Full AI culture guide · Coming soon
            </Text>
          </Animated.View>
        )}

        {/* ── CTA buttons ── */}
        <Animated.View style={[styles.buttons, contentStyle]}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={() => router.push("/register")}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Feather name="arrow-right" size={18} color={Colors.navy} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

function ServiceCard({
  icon,
  title,
  subtitle,
  delay,
}: {
  icon: any;
  title: string;
  subtitle: string;
  delay: number;
}) {
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

  // ── Logo section ──────────────────────────────────────────────
  logoSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 26,
    backgroundColor: `${Colors.gold}18`,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}50`,
    alignItems: "center",
    justifyContent: "center",
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

  // ── Service cards ──────────────────────────────────────────────
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

  // ── AI Culture Shock Assistant ────────────────────────────────
  aiSection: {
    backgroundColor: `${Colors.gold}0D`,
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
    flex: 1,
  },
  betaBadge: {
    backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${Colors.gold}45`,
  },
  betaText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    letterSpacing: 0.8,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  aiBubbleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  aiSubtext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },

  // ── Buttons ────────────────────────────────────────────────────
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
