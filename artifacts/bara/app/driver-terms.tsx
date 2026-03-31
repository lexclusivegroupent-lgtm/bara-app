import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

export default function DriverTermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Driver Terms</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

        <Text style={styles.intro}>
          By registering as a driver on Bära, you agree to the following terms. Please read them carefully.
        </Text>

        <Text style={styles.sectionTitle}>1. Independent Contractor Status</Text>
        <Text style={styles.body}>
          You are an independent contractor, not an employee of Bära AB. You are responsible for your own taxes, insurance, and compliance with Swedish laws regarding transport and self-employment.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility Requirements</Text>
        <Text style={styles.body}>
          To drive on the Bära platform you must:{"\n\n"}
          • Hold a valid Swedish driving licence (if using a vehicle){"\n"}
          • Have a vehicle in roadworthy condition (if applicable){"\n"}
          • Be at least 18 years of age{"\n"}
          • Not have been banned from driving in the last 3 years{"\n"}
          • Have the right to work in Sweden
        </Text>

        <Text style={styles.sectionTitle}>3. Driver Obligations</Text>
        <Text style={styles.body}>
          As a Bära driver you must:{"\n\n"}
          • Only accept jobs you can genuinely fulfil{"\n"}
          • Arrive at the pickup location within the agreed time{"\n"}
          • Handle all items with care and professionalism{"\n"}
          • Take required photos at pickup and dropoff{"\n"}
          • Treat customers with respect at all times{"\n"}
          • Not transport prohibited items (see Section 5){"\n"}
          • Report any incidents, damage, or disputes immediately
        </Text>

        <Text style={styles.sectionTitle}>4. Photo Documentation</Text>
        <Text style={styles.body}>
          Mandatory photo documentation is required for every job:{"\n\n"}
          • <Text style={styles.bold}>Before Loading:</Text> Photos showing the items and pickup location{"\n"}
          • <Text style={styles.bold}>After Delivery:</Text> Photos confirming delivery at the correct location{"\n\n"}
          Jobs cannot be marked as complete without both sets of photos. This protects both you and the customer in case of disputes.
        </Text>

        <Text style={styles.sectionTitle}>5. Prohibited Items</Text>
        <Text style={styles.body}>
          You must never transport the following:{"\n\n"}
          • Weapons, firearms, or ammunition{"\n"}
          • Illegal substances or narcotics{"\n"}
          • Stolen goods or property you suspect is stolen{"\n"}
          • Hazardous materials (chemicals, flammable liquids, explosives){"\n"}
          • Live animals{"\n"}
          • Any items the customer cannot confirm legal ownership of{"\n\n"}
          Accepting a job containing prohibited items may result in immediate account suspension and reporting to authorities.
        </Text>

        <Text style={styles.sectionTitle}>6. Cancellations & No-Shows</Text>
        <Text style={styles.body}>
          Repeated cancellations or no-shows damage the trust of the platform. Bära monitors driver behaviour and reserves the right to suspend or permanently remove drivers with excessive cancellations or complaints.{"\n\n"}
          If you are unable to complete a job, cancel as early as possible so the customer can find another driver.
        </Text>

        <Text style={styles.sectionTitle}>7. Earnings & Payments</Text>
        <Text style={styles.body}>
          During the current launch period, all jobs are completely free — no platform fees, no commissions. Once Bära moves to a paid model, drivers will receive a minimum of 75% of the job value. You will be notified before any fee structure is introduced.
        </Text>

        <Text style={styles.sectionTitle}>8. Ratings & Account Standing</Text>
        <Text style={styles.body}>
          Your rating is visible to customers. Bära reserves the right to suspend drivers with a sustained average rating below 3.0 stars or with multiple upheld dispute reports.
        </Text>

        <Text style={styles.sectionTitle}>9. Liability</Text>
        <Text style={styles.body}>
          As an independent contractor, you are personally liable for any damage to customer property during transport. Bära strongly recommends obtaining appropriate liability insurance for transport activities.
        </Text>

        <Text style={styles.sectionTitle}>10. Future Verification</Text>
        <Text style={styles.body}>
          Bära may in the future require drivers to complete identity verification (BankID) and submit their driver's licence for review. Drivers who do not complete verification within the stated timeframe may have their accounts suspended.
        </Text>

        <Text style={styles.sectionTitle}>11. Governing Law</Text>
        <Text style={styles.body}>
          These terms are governed by Swedish law. Any disputes shall be resolved in Swedish courts.
        </Text>

        <Text style={styles.sectionTitle}>Förarvillkor (Svenska)</Text>
        <Text style={styles.body}>
          Genom att registrera dig som förare på Bära intygar du att du är en självständig uppdragstagare, inte anställd av Bära AB. Du ansvarar för egna skatter och försäkringar. Du åtar dig att alltid ta obligatoriska foton, behandla föremål varsamt och aldrig transportera förbjudna föremål. Vid frågor, kontakta oss på support@bara.se.
        </Text>

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
  content: { paddingHorizontal: 24, paddingTop: 24 },
  lastUpdated: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 8,
    fontStyle: "italic",
  },
  intro: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 8,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
  },
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
  bold: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
