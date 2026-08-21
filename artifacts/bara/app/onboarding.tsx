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

  const totalSlides = 4;

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
              ? "Boka hjälp med möbler, skrymmande föremål, grovsopor och second hand-leveranser. Vi skickar din förfrågan till rätt lokal partner."
              : "Book help with furniture, bulky items, junk removal and second-hand deliveries. We route your request to the right local partner."}
          </Text>
          <View style={styles.featurePills}>
            <FeaturePill text={isSv ? "Lokala partners" : "Local partners"} />
            <FeaturePill text={isSv ? "Enkelt" : "Simple"} />
            <FeaturePill text={isSv ? "Tryggt" : "Reliable"} />
          </View>
        </View>

        {/* Slide 2 — What you can send */}
        <View style={[styles.slide, { paddingTop: insets.top + (Platform.OS === "web" ? 87 : 60) }]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="check-circle-outline" size={56} color={Colors.gold} />
          </View>
          <Text style={styles.slideTitle}>
            {isSv ? "Vad vi hjälper dig med" : "What we help you with"}
          </Text>
          <Text style={styles.slideSubtitle}>
            {isSv
              ? "Från enstaka möbler till hela grovsopshämtningar — våra partners har rätt fordon och utrustning."
              : "From single furniture pieces to full junk removal — our partners have the right vehicles and equipment."}
          </Text>
          <View style={styles.allowedGrid}>
            <View style={styles.allowedColumn}>
              <Text style={styles.allowedHeader}>✅ {isSv ? "Vi förmedlar" : "We handle"}</Text>
              {(isSv ? [
                "Möbeltransport",
                "Skrymmande föremål",
                "Grovsopor & bortforsling",
                "Second hand-leverans",
                "Blocket & Facebook-fynd",
              ] : [
                "Furniture transport",
                "Bulky items",
                "Junk removal",
                "Second-hand delivery",
                "Blocket & Facebook picks",
              ]).map((item) => (
                <Text key={item} style={styles.allowedItem}>{item}</Text>
              ))}
            </View>
            <View style={styles.allowedColumn}>
              <Text style={styles.prohibitedHeader}>❌ {isSv ? "Inte tillåtet" : "Not allowed"}</Text>
              {(isSv ? [
                "Farliga ämnen",
                "Kemikalier",
                "Föremål med specialtillstånd",
              ] : [
                "Hazardous materials",
                "Chemicals",
                "Items requiring special permits",
              ]).map((item) => (
                <Text key={item} style={styles.prohibitedItem}>{item}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Slide 3 — How it works */}
        <View style={[styles.slide, { paddingTop: insets.top + (Platform.OS === "web" ? 87 : 60) }]}>
          <Text style={styles.slideTitle}>
            {isSv ? "Så fungerar det" : "How it works"}
          </Text>
          <View style={styles.stepList}>
            <Step
              number="1"
              title={isSv ? "Skicka en förfrågan" : "Submit a request"}
              desc={isSv ? "Välj kategori, beskriv föremålen, lägg till foton och önskad tid." : "Choose a category, describe the items, add photos and your preferred time."}
            />
            <Step
              number="2"
              title={isSv ? "Vi matchar dig med en partner" : "We match you with a partner"}
              desc={isSv ? "Bära skickar din förfrågan till en lokal, professionell tjänsteleverantör i ditt område." : "Bära routes your request to a local, professional service provider in your area."}
            />
            <Step
              number="3"
              title={isSv ? "Partnern kontaktar dig" : "The partner contacts you"}
              desc={isSv ? "Ni bekräftar detaljer och pris tillsammans — sedan är bokningen klar." : "You confirm details and price together — then your booking is set."}
            />
          </View>

          {/* Trust signal: only verified, insured companies perform jobs */}
          <View style={styles.contractorNote}>
            <Text style={styles.contractorNoteText}>
              {isSv
                ? "Alla partners är registrerade företag med F-skatt och ansvarsförsäkring — aldrig privatpersoner."
                : "All partners are registered companies with F-skatt and liability insurance — never private individuals."}
            </Text>
          </View>
        </View>

        {/* Slide 4 — Partner recruitment */}
        <View style={[styles.slide, { paddingTop: insets.top + (Platform.OS === "web" ? 87 : 60) }]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="domain" size={56} color={Colors.gold} />
          </View>
          <Text style={styles.slideTitle}>
            {isSv ? "Driver du ett transportföretag?" : "Run a transport business?"}
          </Text>
          <Text style={styles.slideSubtitle}>
            {isSv
              ? "Bli partner och få kvalificerade förfrågningar från kunder i ditt område — utan att jaga leads själv."
              : "Become a partner and receive qualified customer requests in your area — without chasing leads yourself."}
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text={isSv ? "Förfrågningar i dina serviceområden" : "Requests in your service areas"} />
            <BulletPoint text={isSv ? "Välj själv vilka kategorier du tar" : "Choose which categories you take"} />
            <BulletPoint text={isSv ? "Acceptera eller tacka nej — du bestämmer" : "Accept or decline — you decide"} />
            <BulletPoint text={isSv ? "Direktkontakt med kunden" : "Direct contact with the customer"} />
          </View>
          {/* ⚖️ Partner relationship disclaimer */}
          <View style={styles.contractorNote}>
            <Text style={styles.contractorNoteText}>
              {isSv
                ? "Partners på Bära är självständiga företag. Bära förmedlar förfrågningar men är inte part i uppdragsavtalet."
                : "Partners on Bära are independent businesses. Bära routes requests but is not a party to the service agreement."}
            </Text>
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
  allowedGrid: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  allowedColumn: {
    flex: 1,
    gap: 6,
  },
  allowedHeader: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
    marginBottom: 4,
  },
  prohibitedHeader: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#E05252",
    marginBottom: 4,
  },
  allowedItem: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 19,
  },
  prohibitedItem: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 19,
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
  contractorNote: {
    marginTop: 20,
    backgroundColor: `${Colors.gold}10`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
    width: "100%",
  },
  contractorNoteText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
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
