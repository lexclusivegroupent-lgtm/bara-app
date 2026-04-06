import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";

const DATA_TYPES = {
  sv: [
    { name: "Namn och e-post", why: "Kontoskapande och kommunikation", retention: "30 dagar efter kontoborttagning" },
    { name: "Platsdata (GPS)", why: "Matchning av jobb och navigering", retention: "Anonymiseras 90 dagar efter leverans" },
    { name: "Betalningshistorik", why: "Redovisning och skatteändamål", retention: "7 år (lagkrav)" },
    { name: "Profilfoto", why: "Identifieringsändamål", retention: "30 dagar efter kontoborttagning" },
    { name: "Leveransfoton", why: "Bevis på upphämtning och leverans", retention: "90 dagar efter jobbets slut" },
    { name: "Push-tokens", why: "Skicka notifikationer", retention: "Raderas vid utloggning" },
    { name: "IP-adress och enhetsdata", why: "Säkerhet och bedrägeriskydd", retention: "90 dagar" },
  ],
  en: [
    { name: "Name and email", why: "Account creation and communication", retention: "30 days after account deletion" },
    { name: "Location data (GPS)", why: "Job matching and navigation", retention: "Anonymised 90 days after delivery" },
    { name: "Payment history", why: "Accounting and tax purposes", retention: "7 years (legal requirement)" },
    { name: "Profile photo", why: "Identification purposes", retention: "30 days after account deletion" },
    { name: "Delivery photos", why: "Proof of pickup and delivery", retention: "90 days after job completion" },
    { name: "Push tokens", why: "Sending notifications", retention: "Deleted on logout" },
    { name: "IP address and device data", why: "Security and fraud prevention", retention: "90 days" },
  ],
};

const THIRD_PARTIES = [
  { name: "Cloudinary", purpose: "Photo storage", url: "https://cloudinary.com/privacy" },
  { name: "Resend", purpose: "Email delivery", url: "https://resend.com/privacy" },
  { name: "Railway", purpose: "Server hosting", url: "https://railway.app/legal/privacy" },
  { name: "Google Maps", purpose: "Maps and address lookup", url: "https://policies.google.com/privacy" },
];

export default function DataPrivacyScreen() {
  const { token } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";

  async function handleExport() {
    try {
      const res = await fetch(`${BASE_URL}/api/users/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert(
          isSv ? "Export begärd" : "Export Requested",
          isSv ? "Din data förbereds och skickas till din e-post inom 24 timmar." : "Your data is being prepared and will be emailed to you within 24 hours."
        );
      }
    } catch {
      Alert.alert("Error", "Could not process export request.");
    }
  }

  const dataTypes = DATA_TYPES[isSv ? "sv" : "en"];

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isSv ? "Din data och integritet" : "Your Data and Privacy"}</Text>
          <Text style={styles.subtitle}>{isSv ? "GDPR — Bära AB" : "GDPR — Bära AB"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSv ? "Vad vi samlar in" : "What We Collect"}</Text>
          {dataTypes.map((d, i) => (
            <View key={i} style={styles.dataRow}>
              <View style={styles.dataLeft}>
                <Text style={styles.dataName}>{d.name}</Text>
                <Text style={styles.dataWhy}>{isSv ? "Syfte: " : "Purpose: "}{d.why}</Text>
              </View>
              <View style={styles.retentionBadge}>
                <Text style={styles.retentionText}>{d.retention}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSv ? "Tredjepartsleverantörer" : "Third Party Processors"}</Text>
          <Text style={styles.bodyText}>
            {isSv
              ? "Vi delar din data med dessa leverantörer för att kunna tillhandahålla tjänsten:"
              : "We share your data with these providers to operate the service:"}
          </Text>
          {THIRD_PARTIES.map((tp, i) => (
            <TouchableOpacity key={i} style={styles.thirdPartyRow} onPress={() => Linking.openURL(tp.url)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tpName}>{tp.name}</Text>
                <Text style={styles.tpPurpose}>{tp.purpose}</Text>
              </View>
              <Feather name="external-link" size={14} color={Colors.gold} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.retentionBox}>
          <Feather name="clock" size={15} color={Colors.gold} />
          <Text style={styles.retentionNotice}>
            {isSv
              ? "Personliga adresser anonymiseras 90 dagar efter jobbets slut. Kontodata raderas inom 30 dagar efter begäran om kontoborttagning."
              : "Personal addresses are anonymised 90 days after job completion. Account data is deleted within 30 days of an account deletion request."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSv ? "Dina rättigheter (GDPR)" : "Your Rights (GDPR)"}</Text>
          {[
            { icon: "download", label: isSv ? "Ladda ner min data" : "Download my data", action: handleExport },
            { icon: "trash-2", label: isSv ? "Radera mitt konto" : "Delete my account", action: () => router.push("/data-privacy"), danger: true },
            { icon: "mail", label: isSv ? "Kontakta vårt dataskyddsombud" : "Contact our data officer", action: () => Linking.openURL("mailto:hello@baraapp.se?subject=GDPR Request") },
            { icon: "flag", label: isSv ? "Klagomål till IMY" : "Complaint to IMY (DPA)", action: () => Linking.openURL("https://www.imy.se/privatperson/dataskydd/anmalan-till-imy/") },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.rightRow} onPress={item.action} activeOpacity={0.7}>
              <View style={[styles.rightIcon, item.danger && styles.rightIconDanger]}>
                <Feather name={item.icon as any} size={15} color={item.danger ? Colors.error : Colors.gold} />
              </View>
              <Text style={[styles.rightLabel, item.danger && styles.rightLabelDanger]}>{item.label}</Text>
              <Feather name="chevron-right" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.iMyBox}>
          <Text style={styles.iMyTitle}>{isSv ? "Klagomål" : "Complaints"}</Text>
          <Text style={styles.iMyText}>
            {isSv
              ? "Om du anser att vi hanterar din data felaktigt kan du lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY) på imy.se."
              : "If you believe we are handling your data incorrectly, you can file a complaint with the Swedish Data Protection Authority (IMY) at imy.se."}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://www.imy.se")}
            activeOpacity={0.8}
            style={styles.iMyLink}
          >
            <Feather name="external-link" size={13} color={Colors.gold} />
            <Text style={styles.iMyLinkText}>imy.se</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactBox}>
          <Text style={styles.contactLabel}>{isSv ? "Dataskyddskontakt" : "Data Protection Contact"}</Text>
          <TouchableOpacity onPress={() => Linking.openURL("mailto:hello@baraapp.se?subject=Data Protection")}>
            <Text style={styles.contactEmail}>hello@baraapp.se</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backArrow: { padding: 4, marginTop: 2 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  content: { padding: 20, gap: 16 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    gap: 0,
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
  bodyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 20, paddingHorizontal: 16, paddingVertical: 10 },
  dataRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dataLeft: { flex: 1, gap: 3 },
  dataName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  dataWhy: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  retentionBadge: {
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    maxWidth: 120,
  },
  retentionText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.gold, textAlign: "center" },
  retentionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  retentionNotice: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  thirdPartyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tpName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  tpPurpose: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  rightIconDanger: { backgroundColor: `${Colors.error}18` },
  rightLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  rightLabelDanger: { color: Colors.error },
  iMyBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iMyTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  iMyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 20 },
  iMyLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  iMyLinkText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.gold },
  contactBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  contactEmail: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.gold },
});
