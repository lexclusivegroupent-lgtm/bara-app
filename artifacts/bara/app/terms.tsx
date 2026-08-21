import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();
  const isSv = lang === "sv";

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isSv ? "Användarvillkor" : "Terms of Service"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{isSv ? "Uppdaterad: April 2025" : "Updated: April 2025"}</Text>

        {/* ⚖️ Requires Swedish legal review before launch — updated for the
            professional, company-only positioning (no longer describes
            individual gig drivers). */}
        <Text style={styles.sectionTitle}>
          {isSv ? "1. Plattformens natur" : "1. Platform Nature"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Bära är en teknologiplattform som kopplar samman kunder med verifierade partnerföretag för möbeltransport, skrymmande föremål, grovsopor och second hand-leveranser. Bära är inte ett transportföretag och tillhandahåller inte transporttjänster direkt."
            : "Bära is a technology platform that connects customers with verified partner companies for furniture transport, bulky item pickup, junk removal and second-hand deliveries. Bära is not a transport company and does not provide transport services directly."}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "2. Partnerföretag" : "2. Partner Companies"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Jobb på Bäras plattform utförs av registrerade partnerföretag, inte av privatpersoner. Partners är oberoende uppdragstagare, inte anställda av Bära AB. De driver sina egna verksamheter, sätter sina egna scheman och förväntas ha F-skatt samt ansvarsförsäkring som täcker transportverksamhet. Bära garanterar inte minsta inkomst eller antal uppdrag."
            : "Jobs on the Bära platform are performed by registered partner companies, not private individuals. Partners are independent contractors, not employees of Bära AB. They operate their own businesses, set their own schedules, and are expected to hold F-skatt and liability insurance covering transport activities. Bära does not guarantee minimum earnings or a minimum number of jobs."}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "3. Plattformsavgift (25%)" : "3. Platform Commission (25%)"}
        </Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>
            {isSv
              ? "Bära tar 25% provision av varje slutfört jobb. Förare tar emot 75% av det totala jobbvärdet. Inga månadsavgifter."
              : "Bära takes 25% commission on every completed job. Drivers receive 75% of the total job value. No monthly fees."}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          {isSv ? "4. Avbokningspolicy" : "4. Cancellation Policy"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Om en kund avbokar ett jobb efter att en förare har accepterat det, tillkommer en avbokningsavgift på 150 SEK som tillfaller föraren. Bära avbokar aldrig ett jobb till nackdel för föraren utan giltigt skäl."
            : "If a customer cancels a job after a driver has accepted it, a cancellation fee of 150 SEK applies, paid to the driver. Bära will never cancel a job to the driver's detriment without valid reason."}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "5. Tvistlösning" : "5. Dispute Resolution"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Tvister hanteras via Bäras tvistprocess i appen. Båda parter kan lämna in foton och förklaringar. Bäras support granskar alla tvister inom 48 timmar. Kontakt: hello@baraapp.se"
            : "Disputes are handled via Bära's in-app dispute process. Both parties can submit photos and explanations. Bära support reviews all disputes within 48 hours. Contact: hello@baraapp.se"}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "6. Avstängning och överklagande" : "6. Deactivation and Appeals"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Bära kan stänga av konton som bryter mot dessa villkor. Förare kan överklaga varje avstängning inom 14 dagar via överklagandeformuläret i appen eller genom att kontakta hello@baraapp.se."
            : "Bära may deactivate accounts that violate these terms. Drivers may appeal any deactivation within 14 days via the appeal form in the app or by contacting hello@baraapp.se."}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "7. Förbjudna föremål" : "7. Prohibited Items"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Följande föremål får inte transporteras:\n\n• Vapen eller skjutvapen\n• Olagliga substanser\n• Stöldgods\n• Farliga material\n• Levande djur\n• Föremål över 500 kg utan föregående godkännande"
            : "The following items may not be transported:\n\n• Weapons or firearms\n• Illegal substances\n• Stolen goods\n• Hazardous materials\n• Live animals\n• Items over 500 kg without prior approval"}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "8. Ansvarsbegränsning" : "8. Liability"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Bära har transportörsansvarsförsäkring. Kunder rekommenderas att försäkra värdefulla föremål separat. Bäras ansvar är begränsat till värdet av transportörsförsäkringen."
            : "Bära holds carrier liability insurance. Customers are recommended to separately insure valuable items. Bära's liability is limited to the value of the carrier insurance."}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "9. Tillämplig lag" : "9. Governing Law"}
        </Text>
        <Text style={styles.body}>
          {isSv
            ? "Dessa villkor regleras av svensk lag. Eventuella tvister avgörs i svenska domstolar."
            : "These terms are governed by Swedish law. Any disputes shall be resolved in Swedish courts."}
        </Text>

        <Text style={styles.sectionTitle}>
          {isSv ? "10. Kontakt" : "10. Contact"}
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL("mailto:hello@baraapp.se?subject=Legal Inquiry")}>
          <Text style={[styles.body, { color: Colors.gold }]}>hello@baraapp.se</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  updated: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 8, fontStyle: "italic" },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
    marginBottom: 8,
    marginTop: 20,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 22,
  },
  highlightBox: {
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 22,
  },
});
