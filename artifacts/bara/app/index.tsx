import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/constants/config";

// ── Design tokens ────────────────────────────────────────────
const NAVY    = "#1B2A4A";
const GOLD    = "#C9A84C";
const GOLD_DIM = "#A88535";
const SURFACE = "#243252";
const DARK    = "#0F1A2E";
const BORDER  = "#2D3F60";
const TEXT    = "#FFFFFF";
const MUTED   = "#8B9CBD";
const RED     = "#E05252";
const GREEN   = "#4CAF82";

const { width: SW, height: SH } = Dimensions.get("window");
const MAX_W = 640;

// ── Bilingual copy ───────────────────────────────────────────
const COPY = {
  sv: {
    tagline1: "Bär vad som helst. Vart som helst.",
    tagline2: "Carry anything, anywhere.",
    problemQ:   "Köpte du något på Blocket? Hur tar du hem det?",
    problemSub: "Bought something on Blocket? How do you get it home?",
    prob1: "Flyttfirma kostar 1 500 kr/timme",
    prob2: "Ingen vill köra din soffa",
    prob3: "Bilen räcker inte till",
    solveH: "Bära löser det.",
    solveSub: "Som Uber — fast för att bära saker.",
    f1t: "Möbeltransport",        f1d: "Hämtning och leverans direkt till dörren. Inga frågor.",
    f2t: "Skräphämtning",         f2d: "Vi tar det du vill bli av med. Snabbt och enkelt.",
    f3t: "Skrymmande leverans",   f3d: "Det som inte får plats i bilen — det tar vi hand om.",
    howH: "Så här fungerar det",
    s1t: "Lägg upp ett jobb",     s1d: "Beskriv vad som ska flyttas och när.",
    s2t: "En förare accepterar",  s2d: "En verifierad förare nära dig tar jobbet.",
    s3t: "Klart!",                s3d: "Betalning sker automatiskt. Båda betygsätter varandra.",
    waitH: "Var först i Sverige",
    waitSub: "Bära lanserar snart i Stockholm, Göteborg och Malmö. Anmäl dig nu.",
    placeholder: "Din e-postadress",
    cta: "Få tidig tillgång →",
    okTitle: "Välkommen! 🇸🇪",
    okBody: "Du är med på listan. Vi hör av oss när vi lanserar.",
    okSub: "Inget spam. Bara Bära.",
    citiesH: "Lanserar i",
    citiesSub: "Fler städer kommer snart",
    built: "Byggt i Sverige 🇸🇪",
  },
  en: {
    tagline1: "Carry anything, anywhere.",
    tagline2: "Bär vad som helst. Vart som helst.",
    problemQ:   "Bought something on Blocket? How do you get it home?",
    problemSub: "Köpte du något på Blocket? Hur tar du hem det?",
    prob1: "Moving companies charge 1 500 kr/hr",
    prob2: "Nobody wants to drive your sofa",
    prob3: "Your car just isn't big enough",
    solveH: "Bära solves it.",
    solveSub: "Like Uber — but for carrying things.",
    f1t: "Furniture Transport",   f1d: "Pickup and delivery straight to your door. No questions.",
    f2t: "Junk Pickup",           f2d: "We take what you want gone. Fast and simple.",
    f3t: "Bulky Delivery",        f3d: "What doesn't fit in your car — we handle it.",
    howH: "How it works",
    s1t: "Post a job",            s1d: "Describe what needs moving and when.",
    s2t: "A driver accepts",      s2d: "A verified driver near you takes the job.",
    s3t: "Done!",                 s3d: "Payment happens automatically. Both rate each other.",
    waitH: "Be first in Sweden",
    waitSub: "Bära launches soon in Stockholm, Gothenburg and Malmö. Sign up now.",
    placeholder: "Your email address",
    cta: "Get early access →",
    okTitle: "Welcome! 🇸🇪",
    okBody: "You're on the list. We'll reach out when we launch.",
    okSub: "No spam. Just Bära.",
    citiesH: "Launching in",
    citiesSub: "More cities coming soon",
    built: "Built in Sweden 🇸🇪",
  },
} as const;

// ── Component ────────────────────────────────────────────────
export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [lang, setLang]   = useState<"sv" | "en">("sv");
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errMsg, setErrMsg]   = useState("");

  const c = COPY[lang];

  // Animations
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.55)).current;
  const chevronY     = useRef(new Animated.Value(0)).current;
  const checkScale   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem("bara_lang").then((v) => {
      if (v === "sv" || v === "en") setLang(v);
    });

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale,   { toValue: 1.55, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseScale,   { toValue: 1,    duration: 2000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0,    duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.55, duration: 2000, useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(chevronY, { toValue: 10, duration: 750, useNativeDriver: true }),
        Animated.timing(chevronY, { toValue: 0,  duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === "driver" ? "/(driver)/map" : "/(customer)/home");
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (status === "success") {
      Animated.spring(checkScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }
  }, [status]);

  function switchLang(l: "sv" | "en") {
    setLang(l);
    AsyncStorage.setItem("bara_lang", l);
  }

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrMsg(lang === "sv" ? "Ange din e-postadress." : "Please enter your email.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrMsg("");
    try {
      const res  = await fetch(`${BASE_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setErrMsg(data.error ?? (lang === "sv" ? "Något gick fel." : "Something went wrong."));
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrMsg(lang === "sv" ? "Kunde inte nå servern." : "Could not reach the server.");
      setStatus("error");
    }
  }

  if (isLoading || user) return <View style={{ flex: 1, backgroundColor: NAVY }} />;

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <View style={[s.hero, { minHeight: SH, paddingTop: insets.top + 56 }]}>
          <View style={s.heroCenter}>
            {/* Logo + pulse ring */}
            <View style={s.logoWrap}>
              <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
              <View style={s.logoBorder}>
                <Image source={require("../assets/images/logo.png")} style={s.logoImg} resizeMode="contain" />
              </View>
            </View>

            <Text style={s.heroTitle}>BÄRA</Text>
            <Text style={s.heroTag1}>{c.tagline1}</Text>
            <Text style={s.heroTag2}>{c.tagline2}</Text>
          </View>

          <Animated.View style={[s.scrollHint, { transform: [{ translateY: chevronY }] }]}>
            <Feather name="chevron-down" size={24} color={GOLD} />
          </Animated.View>
        </View>

        {/* ── PROBLEM ──────────────────────────────────────── */}
        <Section>
          <View style={s.problemCard}>
            <Text style={s.problemQ}>{c.problemQ}</Text>
            <Text style={s.problemSub}>{c.problemSub}</Text>
            <View style={s.probItems}>
              {[c.prob1, c.prob2, c.prob3].map((p, i) => (
                <View key={i} style={s.probItem}>
                  <Feather name="x-circle" size={18} color={RED} />
                  <Text style={s.probText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        </Section>

        {/* ── SOLUTION ─────────────────────────────────────── */}
        <Section>
          <Text style={s.solveH}>{c.solveH}</Text>
          <Text style={s.solveSub}>{c.solveSub}</Text>
          {[
            { emoji: "🛋", t: c.f1t, d: c.f1d },
            { emoji: "🗑", t: c.f2t, d: c.f2d },
            { emoji: "📦", t: c.f3t, d: c.f3d },
          ].map((f, i) => (
            <View key={i} style={s.featCard}>
              <Text style={s.featEmoji}>{f.emoji}</Text>
              <View style={s.featBody}>
                <Text style={s.featTitle}>{f.t}</Text>
                <Text style={s.featDesc}>{f.d}</Text>
              </View>
            </View>
          ))}
        </Section>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <Section>
          <Text style={s.sectionH}>{c.howH}</Text>
          <View>
            {[
              { n: "1", t: c.s1t, d: c.s1d },
              { n: "2", t: c.s2t, d: c.s2d },
              { n: "3", t: c.s3t, d: c.s3d },
            ].map((step, i) => (
              <View key={i} style={s.step}>
                <View style={s.stepLeft}>
                  <View style={s.stepCircle}><Text style={s.stepNum}>{step.n}</Text></View>
                  {i < 2 && <View style={s.stepLine} />}
                </View>
                <View style={[s.stepContent, i < 2 && { paddingBottom: 40 }]}>
                  <Text style={s.stepTitle}>{step.t}</Text>
                  <Text style={s.stepDesc}>{step.d}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* ── WAITLIST ──────────────────────────────────────── */}
        <View style={s.waitOuter}>
          <View style={s.waitGlowWrap} pointerEvents="none">
            <View style={s.waitGlow} />
          </View>
          <View style={s.waitInner}>
            <Text style={s.waitH}>{c.waitH}</Text>
            <Text style={s.waitSub}>{c.waitSub}</Text>

            {status === "success" ? (
              <Animated.View style={[s.successBox, { transform: [{ scale: checkScale }] }]}>
                <View style={s.checkCircle}>
                  <Feather name="check" size={28} color={NAVY} />
                </View>
                <Text style={s.successTitle}>{c.okTitle}</Text>
                <Text style={s.successBody}>{c.okBody}</Text>
                <Text style={s.successSub}>{c.okSub}</Text>
              </Animated.View>
            ) : (
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <TextInput
                  style={[s.input, focused && s.inputFocused]}
                  placeholder={c.placeholder}
                  placeholderTextColor={MUTED}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (status === "error") setStatus("idle"); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={submit}
                  returnKeyType="send"
                  editable={status !== "loading"}
                />
                <TouchableOpacity
                  style={[s.cta, status === "loading" && s.ctaDisabled]}
                  onPress={submit}
                  disabled={status === "loading"}
                  activeOpacity={0.85}
                >
                  {status === "loading"
                    ? <ActivityIndicator size="small" color={NAVY} />
                    : <Text style={s.ctaText}>{c.cta}</Text>}
                </TouchableOpacity>
                {status === "error" && (
                  <View style={s.errRow}>
                    <Feather name="alert-circle" size={12} color={RED} />
                    <Text style={s.errText}>{errMsg}</Text>
                  </View>
                )}
              </KeyboardAvoidingView>
            )}
          </View>
        </View>

        {/* ── CITIES ───────────────────────────────────────── */}
        <Section>
          <Text style={s.sectionH}>{c.citiesH}</Text>
          <View style={s.cityRow}>
            {["Stockholm", "Göteborg", "Malmö", "Uppsala", "Växjö"].map((city) => (
              <View key={city} style={s.cityPill}>
                <Text style={s.cityText}>{city}</Text>
              </View>
            ))}
          </View>
          <Text style={s.citiesSub}>{c.citiesSub}</Text>
        </Section>

        {/* ── FOOTER ───────────────────────────────────────── */}
        <View style={[s.footer, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={s.footerMain}>© 2026 Bära · baraapp.se · hello@baraapp.se</Text>
          <Text style={s.footerSub}>{c.built}</Text>
        </View>
      </ScrollView>

      {/* ── Fixed language toggle ─────────────────────────── */}
      <View style={[s.langToggle, { top: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => switchLang("sv")} activeOpacity={0.75}>
          <Text style={[s.langBtn, lang === "sv" && s.langActive]}>SV</Text>
        </TouchableOpacity>
        <Text style={s.langSep}>|</Text>
        <TouchableOpacity onPress={() => switchLang("en")} activeOpacity={0.75}>
          <Text style={[s.langBtn, lang === "en" && s.langActive]}>EN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <View style={s.section}>{children}</View>;
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: NAVY },
  scrollContent: { alignItems: "center" },

  // Hero
  hero: {
    width: "100%",
    maxWidth: MAX_W,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCenter:  { alignItems: "center", gap: 14 },
  logoWrap:    { width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  pulseRing: {
    position: "absolute",
    width: 80, height: 80,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: GOLD,
  },
  logoBorder: {
    width: 80, height: 80,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: `${GOLD}55`,
    backgroundColor: `${GOLD}10`,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg:    { width: 72, height: 72 },
  heroTitle:  { fontSize: 72, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 14 },
  heroTag1:   { fontSize: 20, fontFamily: "Inter_400Regular", color: TEXT, fontStyle: "italic", textAlign: "center" },
  heroTag2:   { fontSize: 14, fontFamily: "Inter_400Regular", color: GOLD_DIM, textAlign: "center" },
  scrollHint: { position: "absolute", bottom: 36 },

  // Section wrapper
  section: {
    width: "100%",
    maxWidth: MAX_W,
    paddingHorizontal: 24,
    paddingVertical: 60,
    gap: 24,
  },
  sectionH: { fontSize: 32, fontFamily: "Inter_700Bold", color: TEXT },

  // Problem
  problemCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    gap: 14,
  },
  problemQ:   { fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT, lineHeight: 30 },
  problemSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED, fontStyle: "italic" },
  probItems:  { gap: 14, marginTop: 4 },
  probItem:   { flexDirection: "row", alignItems: "center", gap: 10 },
  probText:   { fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT, flex: 1 },

  // Solution
  solveH:   { fontSize: 38, fontFamily: "Inter_700Bold", color: GOLD },
  solveSub:  { fontSize: 17, fontFamily: "Inter_400Regular", color: MUTED, marginTop: -12 },
  featCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  featEmoji: { fontSize: 34 },
  featBody:  { flex: 1, gap: 5 },
  featTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT },
  featDesc:  { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED, lineHeight: 21 },

  // Timeline
  step:        { flexDirection: "row", gap: 16 },
  stepLeft:    { alignItems: "center", width: 40 },
  stepCircle:  { width: 40, height: 40, borderRadius: 20, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" },
  stepNum:     { fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY },
  stepLine:    { width: 2, flex: 1, backgroundColor: `${GOLD}35`, marginVertical: 4, minHeight: 28 },
  stepContent: { flex: 1, paddingTop: 8, gap: 5 },
  stepTitle:   { fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT },
  stepDesc:    { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED, lineHeight: 21 },

  // Waitlist
  waitOuter:   { width: "100%", backgroundColor: DARK, alignItems: "center", paddingVertical: 64, paddingHorizontal: 24, overflow: "hidden" },
  waitGlowWrap:{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  waitGlow:    { width: Math.min(SW, 480), height: Math.min(SW, 480), borderRadius: 300, backgroundColor: `${GOLD}12` },
  waitInner:   { width: "100%", maxWidth: MAX_W, gap: 20 },
  waitH:       { fontSize: 36, fontFamily: "Inter_700Bold", color: TEXT, textAlign: "center" },
  waitSub:     { fontSize: 16, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center", lineHeight: 25 },
  input:       { backgroundColor: SURFACE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 17, fontSize: 16, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 12 },
  inputFocused:{ borderColor: GOLD },
  cta:         { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText:     { fontSize: 17, fontFamily: "Inter_700Bold", color: NAVY },
  errRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  errText:     { fontSize: 13, fontFamily: "Inter_400Regular", color: RED, flex: 1 },

  // Success
  successBox:   { backgroundColor: `${GREEN}15`, borderWidth: 1, borderColor: `${GREEN}30`, borderRadius: 20, padding: 32, alignItems: "center", gap: 12 },
  checkCircle:  { width: 60, height: 60, borderRadius: 30, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: GREEN, textAlign: "center" },
  successBody:  { fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT, textAlign: "center", lineHeight: 23 },
  successSub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center" },

  // Cities
  cityRow:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cityPill: { borderWidth: 1.5, borderColor: `${GOLD}55`, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: `${GOLD}0E` },
  cityText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: GOLD },
  citiesSub:{ fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED, marginTop: -8 },

  // Footer
  footer:     { width: "100%", maxWidth: MAX_W, alignItems: "center", paddingTop: 40, paddingHorizontal: 24, gap: 8, borderTopWidth: 1, borderTopColor: BORDER },
  footerMain: { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center" },
  footerSub:  { fontSize: 12, fontFamily: "Inter_400Regular", color: `${MUTED}70`, textAlign: "center" },

  // Language toggle
  langToggle: { position: "absolute", right: 16, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${DARK}F0`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  langBtn:    { fontSize: 12, fontFamily: "Inter_700Bold", color: MUTED },
  langActive: { color: GOLD },
  langSep:    { fontSize: 11, color: BORDER },
});
