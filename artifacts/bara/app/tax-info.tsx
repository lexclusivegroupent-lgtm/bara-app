import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Switch,
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

const TAX_INFO = {
  sv: {
    title: "Skatt & ansvar",
    subtitle: "Viktigt att veta om skatt på din inkomst från Bära",
    sections: [
      {
        title: "⚖️ Din skatteplikt",
        content:
          "All inkomst från Bära är skattepliktig från första krona. Du är ansvarig för att anmäla din inkomst till Skatteverket.",
      },
      {
        title: "⚖️ F-skatt och FA-skatt",
        content:
          "Som egenföretagare måste du registrera dig för F-skatt eller FA-skatt hos Skatteverket. Detta är ett juridiskt krav och Bära kan inte göra detta åt dig.",
        action: "Läs mer om F-skatt",
        url: "https://skatteverket.se/fortagare/egenforetagare/privatperson/forskott.4.3dce86411545f1e3e1c2db1.html",
      },
      {
        title: "⚖️ Vi witholdar inte skatt",
        content:
          "Bära witholdar inte skatt från dina utbetalningar. Du måste själv ansvara för att sätta undan pengar för skatt och deklarera din inkomst årligen.",
      },
      {
        title: "⚖️ Egenavgifter",
        content:
          "Du kan behöva betala egenavgifter (sjukförsäkringsavgift) beroende på din inkomstnivå. Läs mer på Skatteverkets webbplats.",
        action: "Läs mer om egenavgifter",
        url: "https://skatteverket.se/privat/skatter/arbete/egenforetagare/egenavgift.4.4d0cd7d114ce0b5ef6g3c5c.html",
      },
      {
        title: "⚖️ DAC7 — Rapportering till Skatteverket",
        content:
          "Bära kan komma att rapportera dina intäkter till Skatteverket enligt DAC7-reglerna (en EU-regel) om du överskrider vissa trösklar: 30+ avslutade jobb ELLER 22 000 SEK eller mer i inkomst under ett kalenderår. Du behöver ge ditt samtycke för detta.",
      },
      {
        title: "⚖️ Deklaration",
        content:
          "Du måste deklarera din inkomst från Bära varje år, även om du inte får några handlingar från oss. Glöm inte att dra av dina utgifter (bensin, försäkring, underhåll, etc.).",
        action: "Läs mer om deklaration",
        url: "https://skatteverket.se/privat/skatter/arbete/egenforetagare/deklarera.4.4d0cd7d114ce0b5ef6b1334.html",
      },
    ],
    dac7Label: "Jag samtycker till att Bära rapporterar mina intäkter till Skatteverket under DAC7-reglerna",
    dac7Helper:
      "Ditt samtycke är frivilligt och du kan ändra det när som helst i dina inställningar.",
    consentUpdating: "Uppdaterar...",
    consentError: "Kunde inte uppdatera samtycke",
  },
  en: {
    title: "Tax & Responsibility",
    subtitle: "Important information about tax on your Bära income",
    sections: [
      {
        title: "⚖️ Your tax obligation",
        content:
          "All income from Bära is taxable from the first krona. You are responsible for reporting your income to Skatteverket (Swedish Tax Agency).",
      },
      {
        title: "⚖️ Self-employment tax (F-skatt)",
        content:
          "As a self-employed person, you must register for F-skatt or FA-skatt with Skatteverket. This is a legal requirement and Bära cannot do this for you.",
        action: "Learn more about F-skatt",
        url: "https://skatteverket.se/fortagare/egenforetagare/privatperson/forskott.4.3dce86411545f1e3e1c2db1.html",
      },
      {
        title: "⚖️ We do not withhold tax",
        content:
          "Bära does not withhold tax from your payments. You must set aside money for taxes yourself and declare your income annually.",
      },
      {
        title: "⚖️ Social security contributions",
        content:
          "You may need to pay social security contributions (health insurance contribution) depending on your income level. Learn more on Skatteverket's website.",
        action: "Learn more about social security",
        url: "https://skatteverket.se/privat/skatter/arbete/egenforetagare/egenavgift.4.4d0cd7d114ce0b5ef6g3c5c.html",
      },
      {
        title: "⚖️ DAC7 — Reporting to Swedish Tax Agency",
        content:
          "Bära may report your income to Skatteverket under DAC7 rules (an EU regulation) if you exceed certain thresholds: 30+ completed jobs OR 22,000 SEK or more in income during a calendar year. You need to consent to this.",
      },
      {
        title: "⚖️ Tax declaration",
        content:
          "You must declare your Bära income every year, even if you don't receive any documents from us. Remember to deduct your expenses (fuel, insurance, maintenance, etc.).",
        action: "Learn more about tax declaration",
        url: "https://skatteverket.se/privat/skatter/arbete/egenforetagare/deklarera.4.4d0cd7d114ce0b5ef6b1334.html",
      },
    ],
    dac7Label: "I consent to Bära reporting my income to Skatteverket under DAC7 rules",
    dac7Helper: "Your consent is voluntary and you can change it anytime in your settings.",
    consentUpdating: "Updating...",
    consentError: "Could not update consent",
  },
};

export default function TaxInfoScreen() {
  const { user, token, updateUser } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";
  const t = TAX_INFO[isSv ? "sv" : "en"];

  const [dac7Consent, setDac7Consent] = useState(user?.dac7Consented || false);
  const [updating, setUpdating] = useState(false);

  async function handleDac7ConsentChange(value: boolean) {
    setUpdating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/dac7-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ consented: value }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setDac7Consent(value);
        updateUser(data);
      }
    } catch {}
    setUpdating(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={Colors.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {t.sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
            {section.url && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => Linking.openURL(section.url!)}
                activeOpacity={0.8}
              >
                <Text style={styles.linkButtonText}>{section.action}</Text>
                <Feather name="external-link" size={12} color={Colors.gold} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={[styles.section, styles.consentSection]}>
          <View style={styles.consentHeader}>
            <Text style={styles.sectionTitle}>{t.dac7Label}</Text>
            {updating ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <Switch
                value={dac7Consent}
                onValueChange={handleDac7ConsentChange}
                disabled={updating}
                trackColor={{ false: Colors.border, true: `${Colors.success}60` }}
                thumbColor={dac7Consent ? Colors.success : Colors.textMuted}
              />
            )}
          </View>
          <Text style={styles.consentHelper}>{t.dac7Helper}</Text>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 16 }} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${Colors.gold}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  content: { padding: 20, gap: 16 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 8,
  },
  linkButtonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
    flex: 1,
  },
  consentSection: {
    backgroundColor: `${Colors.gold}08`,
    borderColor: `${Colors.gold}30`,
  },
  consentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  consentHelper: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
});
