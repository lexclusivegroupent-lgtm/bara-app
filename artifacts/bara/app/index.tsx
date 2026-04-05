import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
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
  FadeIn,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
      contentOpacity.value = withDelay(300, withTiming(1, { duration: 700 }));
    }
  }, [isLoading, user]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg("Drop your email in there. We promise not to be weird about it.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${BASE_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg("Could not reach the server. Check your connection.");
      setStatus("error");
    }
  }

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: Colors.surfaceDark }} />;
  }

  if (user) return null;

  return (
    <LinearGradient
      colors={[Colors.surfaceDark, Colors.navy, "#0F1A2E"]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 48 : 24),
              paddingBottom: insets.bottom + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <Animated.View style={[styles.logoSection, logoStyle]}>
            <View style={styles.logoRing}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Bära</Text>
            <View style={styles.comingSoonBadge}>
              <Feather name="clock" size={11} color={Colors.gold} />
              <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
            </View>
          </Animated.View>

          {/* ── Headline ── */}
          <Animated.View style={[styles.headlineSection, contentStyle]}>
            <Text style={styles.headline}>
              Moving in Sweden?{"\n"}Let's make it{" "}
              <Text style={styles.headlineAccent}>"Bära"</Text>.
            </Text>
            <Text style={styles.subheadline}>
              The logistics app that understands your culture shock.{"\n"}
              Coming soon to save your back and your sanity.
            </Text>

            {/* Perks row */}
            <Animated.View
              entering={FadeInDown.delay(600).springify()}
              style={styles.perksRow}
            >
              <PerkBadge icon="sofa" label="Furniture moves" />
              <PerkBadge icon="delete-sweep" label="Junk pickup" />
              <PerkBadge icon="flag" label="Sweden-first" />
            </Animated.View>
          </Animated.View>

          {/* ── Email signup ── */}
          <Animated.View style={[styles.signupSection, contentStyle]}>
            {status === "success" ? (
              <Animated.View entering={FadeIn.duration(400)} style={styles.successCard}>
                <View style={styles.successIcon}>
                  <Feather name="check" size={22} color={Colors.navy} />
                </View>
                <Text style={styles.successTitle}>Välkommen!</Text>
                <Text style={styles.successBody}>
                  We'll email you the moment we go live.{"\n"}
                  Until then — enjoy your Fika. ☕
                </Text>
              </Animated.View>
            ) : (
              <>
                <Text style={styles.signupLabel}>Be the first to know</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (status === "error") setStatus("idle");
                    }}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="send"
                    editable={status !== "loading"}
                  />
                  <TouchableOpacity
                    style={[styles.notifyBtn, status === "loading" && styles.notifyBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={status === "loading"}
                    activeOpacity={0.85}
                  >
                    {status === "loading" ? (
                      <ActivityIndicator size="small" color={Colors.navy} />
                    ) : (
                      <Text style={styles.notifyBtnText}>Get Notified</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {status === "error" && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.errorRow}>
                    <Feather name="alert-circle" size={12} color={Colors.error} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </Animated.View>
                )}
              </>
            )}
          </Animated.View>

          {/* ── Service preview ── */}
          <Animated.View style={[styles.previewSection, contentStyle]}>
            <Text style={styles.previewLabel}>What we're building</Text>
            <View style={styles.previewCards}>
              <Animated.View entering={FadeInDown.delay(700).springify()}>
                <PreviewCard
                  icon="sofa"
                  title="Furniture Transport"
                  desc="Sofas, wardrobes, that IKEA flat-pack nightmare — we've got you."
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(800).springify()}>
                <PreviewCard
                  icon="delete-sweep"
                  title="Junk Pickup"
                  desc="Swedes call it 'grovsoprummet'. We call it gone."
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(900).springify()}>
                <PreviewCard
                  icon="truck-delivery"
                  title="Bulky Delivery"
                  desc="Big stuff that won't fit in your Volvo. We get it."
                />
              </Animated.View>
            </View>
          </Animated.View>

          {/* ── Login link ── */}
          <Animated.View style={[styles.loginSection, contentStyle]}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push("/login")}
              activeOpacity={0.8}
            >
              <Feather name="log-in" size={15} color={Colors.gold} />
              <Text style={styles.loginText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View style={[styles.footer, contentStyle]}>
            <Text style={styles.footerText}>
              No spam. Just help. And maybe a few jokes about Fika. 🇸🇪
            </Text>
            <Text style={styles.footerSub}>
              Made with käärlek for expats everywhere.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function PerkBadge({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.perkBadge}>
      <MaterialCommunityIcons name={icon} size={14} color={Colors.gold} />
      <Text style={styles.perkLabel}>{label}</Text>
    </View>
  );
}

function PreviewCard({ icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewCardIcon}>
        <MaterialCommunityIcons name={icon} size={24} color={Colors.gold} />
      </View>
      <View style={styles.previewCardInfo}>
        <Text style={styles.previewCardTitle}>{title}</Text>
        <Text style={styles.previewCardDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 36,
  },

  // Logo
  logoSection: { alignItems: "center", gap: 12 },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: `${Colors.gold}50`,
    backgroundColor: `${Colors.gold}12`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: { width: 90, height: 90 },
  appName: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -1,
  },
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.gold}18`,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
    letterSpacing: 0.5,
  },

  // Headline
  headlineSection: { gap: 12 },
  headline: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: 36,
    textAlign: "center",
  },
  headlineAccent: {
    color: Colors.gold,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 22,
    textAlign: "center",
  },
  perksRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  perkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.gold}10`,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  perkLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },

  // Signup
  signupSection: { gap: 10 },
  signupLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  notifyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  notifyBtnDisabled: { opacity: 0.6 },
  notifyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
    flex: 1,
  },

  // Success
  successCard: {
    backgroundColor: `${Colors.success}15`,
    borderWidth: 1,
    borderColor: `${Colors.success}35`,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  successBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },

  // Service preview
  previewSection: { gap: 14 },
  previewLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  previewCards: { gap: 10 },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  previewCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCardInfo: { flex: 1, gap: 3 },
  previewCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  previewCardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 17,
  },

  // Login
  loginSection: { alignItems: "center" },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}40`,
    borderRadius: 12,
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },

  // Footer
  footer: { alignItems: "center", gap: 6, paddingTop: 8 },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  footerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: `${Colors.textMuted}80`,
    textAlign: "center",
    fontStyle: "italic",
  },
});
