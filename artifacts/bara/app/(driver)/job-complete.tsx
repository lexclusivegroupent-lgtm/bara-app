import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";

export default function JobCompleteScreen() {
  const insets = useSafeAreaInsets();
  const { jobId, userId, payout } = useLocalSearchParams<{ jobId: string; userId: string; payout?: string }>();
  const { lang } = useLanguage();
  const isSv = lang === "sv";
  const payoutNum = payout ? Math.round(Number(payout)) : null;
  const taxReserve = payoutNum ? Math.round(payoutNum * 0.30) : null;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function handleRateCustomer() {
    router.replace({
      pathname: "/(driver)/rate",
      params: { jobId, userId },
    });
  }

  function handleBackToMap() {
    router.replace("/(driver)/map");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + 20 }]}>
      <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Feather name="check" size={56} color={Colors.navy} />
      </Animated.View>

      <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
        <Text style={styles.heading}>Job Complete!</Text>
        <Text style={styles.subheading}>Jobbet är klart!</Text>

        <Text style={styles.congrats}>
          Great work — thank you for making this delivery happen. The customer has been notified.
        </Text>
        <Text style={styles.congratsSV}>
          Snyggt jobbat — tack för att du genomförde denna leverans. Kunden har meddelats.
        </Text>

        <View style={styles.freeLaunchBanner}>
          <Feather name="gift" size={14} color={Colors.gold} />
          <Text style={styles.freeLaunchText}>
            Bära is free during launch — no fees collected. Thank you for being part of it!
          </Text>
        </View>

        {payoutNum && (
          <View style={styles.taxCard}>
            <Text style={styles.taxCardTitle}>
              {isSv ? "💰 Inkomstpåminnelse" : "💰 Tax Reminder"}
            </Text>
            <Text style={styles.taxCardBody}>
              {isSv
                ? `Inkomst: ${payoutNum} SEK — Kom ihåg att sätta undan ${taxReserve} SEK för skatt (30%)`
                : `Earnings: ${payoutNum} SEK — Remember to set aside ${taxReserve} SEK for tax (30%)`}
            </Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.buttons, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.rateBtn} onPress={handleRateCustomer} activeOpacity={0.85}>
          <Feather name="star" size={18} color={Colors.navy} />
          <Text style={styles.rateBtnText}>Rate the Customer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mapBtn} onPress={handleBackToMap} activeOpacity={0.8}>
          <Feather name="map" size={16} color={Colors.textMuted} />
          <Text style={styles.mapBtnText}>Back to Map</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 28,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  textBlock: {
    alignItems: "center",
    gap: 6,
  },
  heading: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    textAlign: "center",
  },
  subheading: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 4,
  },
  congrats: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
  },
  congratsSV: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 4,
  },
  freeLaunchBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${Colors.gold}18`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    marginTop: 12,
  },
  freeLaunchText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
    lineHeight: 18,
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
  },
  rateBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.navy,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  taxCard: {
    backgroundColor: `${Colors.success}15`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.success}35`,
    marginTop: 8,
    gap: 4,
  },
  taxCardTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  taxCardBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
});
