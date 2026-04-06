import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { StarRating } from "@/components/StarRating";

const RIGHTS = {
  sv: [
    "Du bestämmer dina egna arbetstider — Bära kräver inga minimitimmar",
    "Du kan arbeta för andra plattformar samtidigt",
    "Du kan tacka nej till vilket jobb som helst utan påföljd",
    "Din provisionssats ändras aldrig utan 60 dagars varsel",
    "Du kan överklaga varje avstängning inom 14 dagar",
    "Du får betalning inom 7 dagar efter slutfört jobb",
    "Du kan ta pauser och semester utan påföljd",
  ],
  en: [
    "You set your own hours — Bära requires no minimum hours",
    "You can work for other platforms simultaneously",
    "You can decline any job without penalty",
    "Your commission rate never changes without 60 days notice",
    "You can appeal any deactivation within 14 days",
    "You receive payment within 7 days of job completion",
    "You can take breaks and holidays without penalty",
  ],
};

interface EarningsData {
  totalEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  yearEarnings: number;
  jobCount: number;
  avgPerJob: number;
}

export default function DriverWelfareScreen() {
  const { user, token } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";

  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEarnings() {
      try {
        const res = await fetch(`${BASE_URL}/api/users/earnings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await safeJson(res);
          setEarnings(data);
        }
      } catch {}
      setLoading(false);
    }
    fetchEarnings();
  }, []);

  const rights = RIGHTS[isSv ? "sv" : "en"];

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isSv ? "Min status" : "My Status"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.earningsCard}>
              <Text style={styles.cardLabel}>{isSv ? "Inkomstöversikt" : "Earnings Summary"}</Text>
              <View style={styles.earningsGrid}>
                <View style={styles.earningsCell}>
                  <Text style={styles.earningsPeriod}>{isSv ? "Denna vecka" : "This week"}</Text>
                  <Text style={styles.earningsValue}>{earnings?.weekEarnings ?? 0} SEK</Text>
                </View>
                <View style={styles.earningsCell}>
                  <Text style={styles.earningsPeriod}>{isSv ? "Denna månad" : "This month"}</Text>
                  <Text style={styles.earningsValue}>{earnings?.monthEarnings ?? 0} SEK</Text>
                </View>
                <View style={styles.earningsCell}>
                  <Text style={styles.earningsPeriod}>{isSv ? "Detta år" : "This year"}</Text>
                  <Text style={styles.earningsValue}>{earnings?.yearEarnings ?? 0} SEK</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Feather name="briefcase" size={14} color={Colors.gold} />
                  <Text style={styles.statValue}>{user?.totalJobs ?? 0}</Text>
                  <Text style={styles.statLabel}>{isSv ? "Jobb totalt" : "Total jobs"}</Text>
                </View>
                <View style={styles.statItem}>
                  <Feather name="trending-up" size={14} color={Colors.gold} />
                  <Text style={styles.statValue}>{earnings?.avgPerJob ?? 0} SEK</Text>
                  <Text style={styles.statLabel}>{isSv ? "Snitt per jobb" : "Avg per job"}</Text>
                </View>
                <View style={styles.statItem}>
                  <Feather name="star" size={14} color={Colors.gold} />
                  <Text style={styles.statValue}>
                    {user?.rating ? Number(user.rating).toFixed(1) : "—"}
                  </Text>
                  <Text style={styles.statLabel}>{isSv ? "Betyg" : "Rating"}</Text>
                </View>
              </View>
              {user?.rating && (
                <View style={styles.starsRow}>
                  <StarRating rating={Number(user.rating)} size={18} />
                  <Text style={styles.ratingCount}>
                    {isSv ? `Baserat på ${user.totalJobs} jobb` : `Based on ${user.totalJobs} jobs`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.rightsCard}>
              <View style={styles.rightsHeader}>
                <Feather name="shield" size={18} color={Colors.gold} />
                <Text style={styles.rightsTitle}>{isSv ? "Bäras löften till dig" : "Bära's commitments to you"}</Text>
              </View>
              {rights.map((right, i) => (
                <View key={i} style={styles.rightItem}>
                  <Text style={styles.goldCheck}>✓</Text>
                  <Text style={styles.rightText}>{right}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.supportBtn}
                onPress={() => router.push("/support")}
                activeOpacity={0.85}
              >
                <Feather name="headphones" size={15} color={Colors.navy} />
                <Text style={styles.supportBtnText}>{isSv ? "Kontakta support" : "Contact support"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sideGigCard}>
              <View style={styles.sideGigHeader}>
                <Text style={styles.sideGigEmoji}>💼</Text>
                <Text style={styles.sideGigTitle}>{isSv ? "Bära som biinkomst" : "Bära as side income"}</Text>
              </View>
              <Text style={styles.sideGigBody}>
                {isSv
                  ? "Bära är designat som en flexibel biinkomst — inte en ersättning för primär anställning. De flesta Bära-förare slutför 2-4 jobb per dag vid sidan av annat arbete."
                  : "Bära is designed as a flexible side income — not a replacement for primary employment. Most Bära drivers complete 2-4 jobs per day alongside other work."}
              </Text>
              <View style={styles.sideGigStats}>
                {[
                  { icon: "clock", label: isSv ? "Flexibla tider" : "Flexible hours" },
                  { icon: "dollar-sign", label: isSv ? "Biinkomst" : "Side income" },
                  { icon: "user-check", label: isSv ? "Dina regler" : "Your rules" },
                ].map((s, i) => (
                  <View key={i} style={styles.sideGigStat}>
                    <Feather name={s.icon as any} size={16} color={Colors.gold} />
                    <Text style={styles.sideGigStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.agreementLink}
              onPress={() => router.push("/driver-agreement")}
              activeOpacity={0.8}
            >
              <Feather name="file-text" size={15} color={Colors.gold} />
              <Text style={styles.agreementLinkText}>{isSv ? "Visa föraravtal" : "View Driver Agreement"}</Text>
              <Feather name="chevron-right" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backArrow: { padding: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  content: { padding: 20, gap: 16 },
  earningsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  earningsGrid: { flexDirection: "row", gap: 10 },
  earningsCell: {
    flex: 1,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
    gap: 4,
  },
  earningsPeriod: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "center" },
  earningsValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.gold, textAlign: "center" },
  statRow: { flexDirection: "row", gap: 10 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ratingCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  rightsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  rightsHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  rightsTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.gold },
  rightItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  goldCheck: { fontSize: 14, color: Colors.gold, fontFamily: "Inter_700Bold", marginTop: 1 },
  rightText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  supportBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.navy },
  sideGigCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sideGigHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sideGigEmoji: { fontSize: 22 },
  sideGigTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  sideGigBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 21 },
  sideGigStats: { flexDirection: "row", gap: 10 },
  sideGigStat: { flex: 1, alignItems: "center", gap: 6, backgroundColor: `${Colors.gold}12`, borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: `${Colors.gold}25` },
  sideGigStatLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.gold, textAlign: "center" },
  agreementLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  agreementLinkText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
});
