import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

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

const RESPONSIBILITIES = {
  sv: [
    "Giltigt svenskt körkort",
    "Giltig trafikförsäkring för ditt fordon",
    "Fordonet klarar besiktning",
    "Registrerad som F-skatteinnehavare eller enskild firma hos Skatteverket",
    "Behandla kunder och deras egendom med respekt",
    "Ta obligatoriska foton vid upphämtning och leverans",
  ],
  en: [
    "Valid Swedish driving license",
    "Valid traffic insurance for your vehicle",
    "Vehicle passes roadworthiness inspection",
    "Registered as F-tax holder or sole trader with Skatteverket",
    "Treat customers and their property with respect",
    "Take required photos at pickup and delivery",
  ],
};

export default function DriverAgreementScreen() {
  const { token, updateUser } = useAuth();
  const { lang, setLang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const isSv = lang === "sv";

  async function handleAccept() {
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/accept-driver-agreement`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await safeJson(res);
      if (res.ok) {
        updateUser(data);
        router.replace("/(driver)/map");
      }
    } catch {}
    setLoading(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <Text style={styles.title}>
          {isSv ? "Föraravtal — Bära AB" : "Driver Agreement — Bära AB"}
        </Text>
        <View style={styles.langRow}>
          {(["sv", "en"] as const).map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.langBtn, lang === l && styles.langBtnActive]}
              onPress={() => setLang(l)}
            >
              <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
                {l === "sv" ? "Svenska" : "English"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSv ? "1. Oberoendeuppdragstagare" : "1. Independent Contractor Status"}
          </Text>
          <Text style={styles.bodyText}>
            {isSv
              ? "Du är en oberoende uppdragstagare som använder Bäras plattform. Du är inte anställd av Bära AB. Du ansvarar för dina egna skatter, försäkringar och arbetsförhållanden. Bära garanterar inte minsta inkomst eller minsta antal timmar."
              : "You are an independent contractor using the Bära platform. You are not an employee of Bära AB. You are responsible for your own taxes, insurance, and working conditions. Bära does not guarantee minimum earnings or minimum hours."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSv ? "2. Dina rättigheter som Bära-förare" : "2. Your Rights as a Bära Driver"}
          </Text>
          {RIGHTS[isSv ? "sv" : "en"].map((right, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.goldCheck}>✓</Text>
              <Text style={styles.listText}>{i + 1}. {right}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSv ? "3. Ditt ansvar" : "3. Your Responsibilities"}
          </Text>
          {RESPONSIBILITIES[isSv ? "sv" : "en"].map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.checkBlue}>•</Text>
              <Text style={styles.listText}>{i + 1}. {item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.taxBox}>
          <Feather name="alert-circle" size={16} color={Colors.gold} />
          <Text style={styles.taxText}>
            {isSv
              ? "Viktigt: Kom ihåg att du är ansvarig för att rapportera din inkomst till Skatteverket. Vi rekommenderar att du sätter undan 30% av varje utbetalning för skatt."
              : "Important: Remember you are responsible for reporting your income to Skatteverket. We recommend setting aside 30% of each payment for tax."}
          </Text>
        </View>

        <View style={styles.commissionBox}>
          <Text style={styles.commissionLabel}>
            {isSv ? "Plattformsavgift" : "Platform Commission"}
          </Text>
          <Text style={styles.commissionValue}>25%</Text>
          <Text style={styles.commissionNote}>
            {isSv
              ? "Bära tar 25% provision på varje slutfört jobb. Inga månadsavgifter."
              : "Bära takes 25% commission on each completed job. No monthly fees."}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed && <Feather name="check" size={14} color={Colors.navy} />}
          </View>
          <Text style={styles.checkLabel}>
            {isSv
              ? "Jag bekräftar att jag har läst och förstår detta avtal"
              : "I confirm I have read and understand this agreement"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, !confirmed && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!confirmed || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.navy} />
            : <Text style={styles.acceptBtnText}>
                {isSv ? "Jag godkänner avtalet" : "I accept the agreement"}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fskattBtn}
          onPress={() => Linking.openURL("https://www.skatteverket.se/foretagochorganisationer/drivaforetag/anstallda/fskatt.4.18e1b10334ebe8bc80001753.html")}
          activeOpacity={0.8}
        >
          <Feather name="external-link" size={14} color={Colors.gold} />
          <Text style={styles.fskattBtnText}>
            {isSv ? "Läs mer om F-skatt" : "Learn more about F-tax"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  langRow: { flexDirection: "row", gap: 8 },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  langBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  langBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  langBtnTextActive: { color: Colors.navy },
  content: { padding: 20, gap: 16 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.gold },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 22 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  goldCheck: { fontSize: 15, color: Colors.gold, fontFamily: "Inter_700Bold", marginTop: 1 },
  checkBlue: { fontSize: 15, color: Colors.textMuted, fontFamily: "Inter_700Bold", marginTop: 1 },
  listText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  taxBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
  },
  taxText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 20 },
  commissionBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  commissionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  commissionValue: { fontSize: 40, fontFamily: "Inter_700Bold", color: Colors.gold },
  commissionNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  checkLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 20 },
  acceptBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnDisabled: { opacity: 0.4 },
  acceptBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.navy },
  fskattBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}50`,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: `${Colors.gold}10`,
  },
  fskattBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.gold },
});
