import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const totalSlides = 3;

  async function handleGetStarted() {
    await AsyncStorage.setItem("bara_onboarding_complete", "1");
    router.replace("/register");
  }

  async function handleSkip() {
    await AsyncStorage.setItem("bara_onboarding_complete", "1");
    router.replace("/");
  }

  function handleNext() {
    const next = currentSlide + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setCurrentSlide(next);
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const slide = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slide);
  }

  return (
    <LinearGradient colors={[Colors.surfaceDark, Colors.navy]} style={styles.container}>
      {currentSlide < totalSlides - 1 && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + (Platform.OS === "web" ? 77 : 16) }]}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipText}>{isSv ? "Hoppa över" : "Skip"}</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={styles.slideContainer}
      >
        {/* Slide 1 — What Bära is */}
        <View style={[styles.slide, { paddingTop: insets.top + (Platform.OS === "web" ? 87 : 60) }]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="package-variant-closed" size={56} color={Colors.gold} />
          </View>
          <Text style={styles.slideTitle}>
            {isSv ? "Välkommen till Bära" : "Welcome to Bära"}
          </Text>
          <Text style={styles.slideSubtitle}>
            {isSv
              ? "Hämtning av små föremål — från Blocket, Facebook Marketplace eller hemmet. Får plats i vilken bil som helst. Från 99 kr, klart på 30 minuter."
              : "Small item pickup — from Blocket, Facebook Marketplace or home. Fits in any car. From 99 SEK, done in 30 minutes."}
          </Text>
          <View style={styles.featurePills}>
            <FeaturePill text={isSv ? "Från 99 kr" : "From 99 SEK"} />
            <FeaturePill text={isSv ? "30 min" : "30 min"} />
            <FeaturePill text={isSv ? "Vilken bil som helst" : "Any car"} />
          </View>
        </View>

        {/* Slide 2 — How it works */}
        <View style={[styles.slide, { paddingTop: insets.top + (Platform.OS === "web" ? 87 : 60) }]}>
          <Text style={styles.slideTitle}>
            {isSv ? "Så fungerar det" : "How it works"}
          </Text>
          <View style={styles.stepList}>
            <Step
              number="1"
              title={isSv ? "Lägg upp ett jobb" : "Post a job"}
              desc={isSv ? "Välj kategori, ange hämtnings- och leveransadress och bekräfta att föremålet är litet." : "Choose a category, enter pickup and drop-off address, confirm the item is small."}
            />
            <Step
              number="2"
              title={isSv ? "En förare accepterar" : "A driver accepts"}
              desc={isSv ? "En förare nära dig tar jobbet med sin vanliga bil — ingen skåpbil behövs." : "A driver near you takes the job in their regular car — no van needed."}
            />
            <Step
              number="3"
              title={isSv ? "Klart på 30 minuter!" : "Done in 30 minutes!"}
              desc={isSv ? "Enkelt, snabbt och prisvärt. Kvitto skickas direkt." : "Simple, fast and affordable. Receipt sent instantly."}
            />
          </View>
        </View>

        {/* Slide 3 — Drive with any car */}
        <View style={[styles.slide, { paddingTop: insets.top + (Platform.OS === "web" ? 87 : 60) }]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="car-hatchback" size={56} color={Colors.gold} />
          </View>
          <Text style={styles.slideTitle}>
            {isSv ? "Kör med din vanliga bil" : "Drive with any car"}
          </Text>
          <Text style={styles.slideSubtitle}>
            {isSv
              ? "Ingen skåpbil eller trailer behövs. Alla föremål ryms i en vanlig personbil."
              : "No van or trailer needed. All items fit in a regular passenger car."}
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text={isSv ? "Vanlig bil, SUV, kombi eller bil med takbox" : "Regular car, SUV, estate or car with roof box"} />
            <BulletPoint text={isSv ? "Tjäna 75% av varje jobb" : "Earn 75% of every job"} />
            <BulletPoint text={isSv ? "Du bestämmer dina egna tider" : "You set your own hours"} />
            <BulletPoint text={isSv ? "Inga minimikrav eller garantier" : "No minimum requirements"} />
          </View>
        </View>
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, currentSlide === i && styles.dotActive]}
          />
        ))}
      </View>

      {/* Bottom button */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) }]}>
        {currentSlide < totalSlides - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{isSv ? "Nästa" : "Next"}</Text>
            <Feather name="arrow-right" size={18} color={Colors.navy} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.getStartedBtn} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={styles.getStartedBtnText}>
              {isSv ? "Kom igång — det är gratis!" : "Get Started — it's free!"}
            </Text>
            <Feather name="arrow-right" size={18} color={Colors.navy} />
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

function FeaturePill({ text }: { text: string }) {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.text}>{text}</Text>
    </View>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.circle}>
        <Text style={stepStyles.number}>{number}</Text>
      </View>
      <View style={stepStyles.text}>
        <Text style={stepStyles.title}>{title}</Text>
        <Text style={stepStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={bulletStyles.row}>
      <Feather name="check-circle" size={18} color={Colors.gold} />
      <Text style={bulletStyles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: "absolute",
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  slideContainer: { flex: 1 },
  slide: {
    width,
    paddingHorizontal: 32,
    alignItems: "center",
    paddingBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${Colors.gold}30`,
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  featurePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  stepList: {
    width: "100%",
    gap: 20,
    marginTop: 16,
  },
  bulletList: {
    width: "100%",
    gap: 16,
    marginTop: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.gold,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  nextBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
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
  getStartedBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
});

const pillStyles = StyleSheet.create({
  pill: {
    backgroundColor: `${Colors.gold}20`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
});

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  number: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.navy,
  },
  text: { flex: 1, paddingTop: 4 },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 3,
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 19,
  },
});

const bulletStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
    lineHeight: 22,
  },
});
