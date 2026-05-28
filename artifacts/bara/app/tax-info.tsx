import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { formatSEK } from "@/constants/config";

const SKATTEVERKET_LINKS = [
  {
    labelSV: "F-skatt och FA-skatt",
    labelEN: "F-tax and FA-tax",
    url: "https://www.skatteverket.se/foretagochorganisationer/drivaforetag/anstallda/fskatt.4.18e1b10334ebe8bc80001753.html",
  },
  {
    labelSV: "Egenavgifter",
    labelEN: "Self-employment contributions (egenavgifter)",
    url: "https://www.skatteverket.se/foretagochorganisationer/drivaforetag/skatterochavgifter/egenavgifter.4.233f91f71260075abe8800020817.html",
  },
  {
    labelSV: "Deklarera inkomst från uppdrag",
    labelEN: "Declare income from assignments",
    url: "https://www.skatteverket.se/privat/deklaration/deklarationsblankett/blanketten.4.18e1b10334ebe8bc80001752.html",
  },
];

export default function TaxInfoScreen() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";
  const [grossInput, setGrossInput] = useState("");

  const gross = parseFloat(grossInput) || 0;
  const egenavgifter = Math.round(gross * 0.285);
  const incomeTax = Math.round((gross - egenavgifter) * 0.30);
  const netAfterTax = Math.round(gross - egenavgifter - incomeTax);

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isSv ? "Skatt & ansvar ⚖️" : "Tax & Responsibility ⚖️"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Main tax fact */}
        <View style={styles.alertCard}>
          <Feather name="alert-circle" size={18} color={Colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {isSv ? "Inkomst från Bära är skattepliktig" : "Income from Bära is taxable"}
            </Text>
            <Text style={styles.alertBody}>
              {isSv
                ? "All inkomst du tjänar via Bära är skattepliktig från första kronan. Det finns ingen skattefri gräns."
                : "All income you earn via Bära is taxable from the first krona. There is no tax-free threshold."}
            </Text>
          </View>
        </View>

        {/* Your obligations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSv ? "Ditt ansvar som uppdragstagare" : "Your obligations as a contractor"}
          </Text>
          {(isSv ? [
            "Deklarera alla inkomster från Bära i din årsdeklaration",
            "Betala egenavgifter på din nettoinkomst (~28,5%)",
            "Ha F-skatt eller FA-skatt för att Bära ska betala ut utan skatteavdrag",
            "Sätt undan ca 30–35% av varje utbetalning för skatt och avgifter",
          ] : [
            "Declare all income from Bära in your annual tax return",
            "Pay egenavgifter (self-employment contributions) on your net income (~28.5%)",
            "Hold F-tax or FA-tax so Bära pays you without deducting tax",
            "Set aside approx. 30–35% of each payment for taxes and contributions",
          ]).map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Feather name="chevron-right" size={14} color={Colors.gold} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* DAC7 reporting notice */}
        <View style={styles.dac7Card}>
          <View style={styles.dac7Header}>
            <Feather name="file-text" size={16} color={Colors.gold} />
            <Text style={styles.dac7Title}>
              {isSv ? "Bära rapporterar dina inkomster (DAC7)" : "Bära reports your income (DAC7)"}
            </Text>
          </View>
          <Text style={styles.dac7Body}>
            {isSv
              ? "Enligt EU-direktiv DAC7 är Bära skyldigt att rapportera dina totala inkomster via plattformen till Skatteverket en gång per år. Detta inkluderar ditt namn, personnummer och totala intäkter."
              : "Under EU directive DAC7, Bära is required to report your total platform earnings to Skatteverket once per year. This includes your name, personal identity number, and total earnings."}
          </Text>
        </View>

        {/* Tax estimate widget */}
        <View style={styles.estimateCard}>
          <Text style={styles.estimateTitle}>
            {isSv ? "Skatteuppskattning" : "Tax estimate"}
          </Text>
          <Text style={styles.estimateSub}>
            {isSv ? "Ange din bruttoinkomst från Bära:" : "Enter your gross income from Bära:"}
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.grossInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={grossInput}
              onChangeText={setGrossInput}
            />
            <Text style={styles.sek}>SEK</Text>
          </View>
          {gross > 0 && (
            <View style={styles.estimateRows}>
              <EstimateRow label={isSv ? "Bruttoinkomst" : "Gross income"} value={formatSEK(gross)} />
              <EstimateRow label={isSv ? "Egenavgifter (~28,5%)" : "Egenavgifter (~28.5%)"} value={`– ${formatSEK(egenavgifter)}`} color="#E05252" />
              <EstimateRow label={isSv ? "Inkomstskatt (~30%)" : "Income tax (~30%)"} value={`– ${formatSEK(incomeTax)}`} color="#E05252" />
              <View style={styles.divider} />
              <EstimateRow label={isSv ? "Beräknat netto" : "Estimated net"} value={formatSEK(netAfterTax)} bold />
            </View>
          )}
        </View>

        <View style={styles.disclaimerCard}>
          <Feather name="info" size={13} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            {isSv
              ? "Detta är en uppskattning, inte skatterådgivning. Kontakta en redovisningskonsult för personlig rådgivning."
              : "This is an estimate, not tax advice. Contact an accountant for personal advice."}
          </Text>
        </View>

        {/* Skatteverket links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSv ? "Användbara länkar (Skatteverket)" : "Useful links (Skatteverket)"}
          </Text>
          {SKATTEVERKET_LINKS.map((link) => (
            <TouchableOpacity
              key={link.url}
              style={styles.linkRow}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={14} color={Colors.gold} />
              <Text style={styles.linkText}>{isSv ? link.labelSV : link.labelEN}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

function EstimateRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={styles.estimateRow}>
      <Text style={[styles.estimateLabel, bold && styles.estimateLabelBold]}>{label}</Text>
      <Text style={[styles.estimateValue, color ? { color } : {}, bold && styles.estimateValueBold]}>{value}</Text>
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
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  content: { padding: 20, gap: 14 },
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}40`,
  },
  alertTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 6 },
  alertBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bulletText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  dac7Card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dac7Header: { flexDirection: "row", alignItems: "center", gap: 8 },
  dac7Title: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.gold },
  dac7Body: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 20 },
  estimateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  estimateTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  estimateSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  grossInput: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  sek: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  estimateRows: { gap: 8, marginTop: 4 },
  estimateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  estimateLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  estimateLabelBold: { fontFamily: "Inter_700Bold", color: Colors.text },
  estimateValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  estimateValueBold: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.gold },
  divider: { height: 1, backgroundColor: Colors.border },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 17 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  linkText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.gold },
});
