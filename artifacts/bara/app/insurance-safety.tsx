import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

const PROHIBITED = {
  sv: [
    "Vapen och ammunition",
    "Olagliga substanser eller narkotika",
    "Stöldgods eller olagliga varor",
    "Farliga material (explosiver, brandfarliga vätskor, giftiga ämnen)",
    "Levande djur",
    "Föremål över 500 kg utan föregående godkännande",
    "Avfall som kräver specialhantering",
  ],
  en: [
    "Weapons and ammunition",
    "Illegal substances or narcotics",
    "Stolen goods or illegal items",
    "Hazardous materials (explosives, flammable liquids, toxic substances)",
    "Live animals",
    "Items over 500 kg without prior approval",
    "Waste requiring special handling",
  ],
};

const DRIVER_REQS = {
  sv: [
    "Giltigt B-körkort (minst 2 år)",
    "Giltig trafikförsäkring",
    "Fordonet klarar besiktning",
    "F-skatteregistrering hos Skatteverket",
    "Godkänd ID-verifiering",
  ],
  en: [
    "Valid Class B driving license (at least 2 years)",
    "Valid traffic insurance",
    "Vehicle passes roadworthiness inspection",
    "F-tax registration with Skatteverket",
    "Approved ID verification",
  ],
};

export default function InsuranceSafetyScreen() {
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isSv ? "Försäkring och säkerhet" : "Insurance and Safety"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.insuranceCard}>
          <View style={styles.insuranceHeader}>
            <Feather name="shield" size={20} color={Colors.gold} />
            <Text style={styles.insuranceTitle}>{isSv ? "Plattformsförsäkring" : "Platform Insurance"}</Text>
          </View>
          <Text style={styles.insuranceBody}>
            {isSv
              ? "Bära AB har transportörsansvarsförsäkring som täcker skador på föremål under transport upp till 50 000 SEK per jobb."
              : "Bära AB holds carrier liability insurance covering damage to items during transport up to 50,000 SEK per job."}
          </Text>
          <View style={styles.pendingBadge}>
            <Feather name="clock" size={12} color={Colors.gold} />
            <Text style={styles.pendingBadgeText}>
              {isSv ? "Försäkringen aktiveras vid AB-registrering" : "Insurance activates upon AB registration"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSv ? "Förarkrav" : "Driver Requirements"}</Text>
          {DRIVER_REQS[isSv ? "sv" : "en"].map((req, i) => (
            <View key={i} style={styles.reqRow}>
              <Feather name="check-circle" size={15} color={Colors.success} />
              <Text style={styles.reqText}>{req}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSv ? "Kundskydd" : "Customer Protection"}</Text>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>{isSv ? "Om ett föremål skadas" : "If an item is damaged"}</Text>
            <Text style={styles.infoBody}>
              {isSv
                ? "Fotografera skadan omedelbart och rapportera via appen inom 48 timmar. Kontakta oss på hello@baraapp.se med foton och beskrivning."
                : "Photograph the damage immediately and report via the app within 48 hours. Contact us at hello@baraapp.se with photos and description."}
            </Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>{isSv ? "Förväntad svarstid" : "Expected response time"}</Text>
            <Text style={styles.infoBody}>
              {isSv ? "Vi svarar på alla skadeanmälningar inom 48 timmar." : "We respond to all damage reports within 48 hours."}
            </Text>
          </View>
        </View>

        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Feather name="alert-triangle" size={18} color={Colors.error} />
            <Text style={styles.emergencyTitle}>{isSv ? "Nödinformation" : "Emergency Information"}</Text>
          </View>
          {[
            { label: isSv ? "Nödnummer" : "Emergency", value: "112" },
            { label: isSv ? "Bära support" : "Bära support", value: "hello@baraapp.se" },
            { label: isSv ? "Rapportera säkerhetsproblem" : "Report safety concern", value: "safety@baraapp.se" },
          ].map((item, i) => (
            <View key={i} style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>{item.label}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (item.value === "112") {
                    Linking.openURL("tel:112");
                  } else {
                    Linking.openURL(`mailto:${item.value}`);
                  }
                }}
              >
                <Text style={styles.emergencyValue}>{item.value}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSv ? "Förbjudna föremål" : "Prohibited Items"}</Text>
          <Text style={styles.prohibitedNote}>
            {isSv
              ? "Följande föremål får inte transporteras via Bära-plattformen:"
              : "The following items cannot be transported via the Bära platform:"}
          </Text>
          {PROHIBITED[isSv ? "sv" : "en"].map((item, i) => (
            <View key={i} style={styles.prohibitedRow}>
              <Feather name="x-circle" size={14} color={Colors.error} />
              <Text style={styles.prohibitedText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contactBox}>
          <Text style={styles.contactLabel}>{isSv ? "Frågor om försäkring?" : "Insurance questions?"}</Text>
          <TouchableOpacity onPress={() => Linking.openURL("mailto:hello@baraapp.se?subject=Insurance Question")}>
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
  insuranceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}50`,
  },
  insuranceHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  insuranceTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.gold },
  insuranceBody: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 22 },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    alignSelf: "flex-start",
  },
  pendingBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.gold },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
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
  reqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reqText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  infoBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  infoTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  infoBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 20 },
  emergencyCard: {
    backgroundColor: `${Colors.error}12`,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: `${Colors.error}40`,
  },
  emergencyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  emergencyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.error },
  emergencyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  emergencyLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  emergencyValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  prohibitedNote: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, paddingHorizontal: 16, paddingVertical: 10 },
  prohibitedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  prohibitedText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
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
