import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

        <Text style={styles.sectionTitle}>1. Who We Are</Text>
        <Text style={styles.body}>
          Bära AB operates the Bära platform — a marketplace connecting customers with independent drivers in Sweden for furniture transport and junk pickup services.
        </Text>

        <Text style={styles.sectionTitle}>2. Data We Collect</Text>
        <Text style={styles.body}>
          We collect the following personal data when you use Bära:{"\n\n"}
          • <Text style={styles.bold}>Account data:</Text> full name, email address, city, role{"\n"}
          • <Text style={styles.bold}>Driver data:</Text> vehicle description, availability status{"\n"}
          • <Text style={styles.bold}>Job data:</Text> pickup/dropoff addresses, item descriptions, preferred times{"\n"}
          • <Text style={styles.bold}>Photos:</Text> images uploaded for job documentation{"\n"}
          • <Text style={styles.bold}>Usage data:</Text> app interactions, job history, ratings
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Data</Text>
        <Text style={styles.body}>
          Your data is used to:{"\n\n"}
          • Connect customers with available drivers{"\n"}
          • Process and track jobs{"\n"}
          • Maintain platform safety and trust (ratings, dispute resolution){"\n"}
          • Improve the Bära platform{"\n"}
          • Comply with Swedish and EU legal obligations
        </Text>

        <Text style={styles.sectionTitle}>4. Data Sharing</Text>
        <Text style={styles.body}>
          We do not sell your personal data. We share limited data with:{"\n\n"}
          • Drivers (to fulfil your job request){"\n"}
          • Customers (driver name, rating, vehicle){"\n"}
          • Payment processors (for future payment integration){"\n"}
          • Authorities when required by law
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.body}>
          We retain your data for as long as your account is active. Job records are kept for a minimum of 12 months for dispute resolution purposes. You may request deletion at any time (see Section 7).
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights (GDPR)</Text>
        <Text style={styles.body}>
          Under the GDPR, you have the right to:{"\n\n"}
          • Access the personal data we hold about you{"\n"}
          • Correct inaccurate data{"\n"}
          • Request deletion of your data (right to be forgotten){"\n"}
          • Request a copy of your data (data portability){"\n"}
          • Object to processing of your data{"\n"}
          • Lodge a complaint with Integritetsskyddsmyndigheten (IMY)
        </Text>

        <Text style={styles.sectionTitle}>7. Account Deletion & Data Export</Text>
        <Text style={styles.body}>
          To request account deletion or a copy of your data, contact us at:{"\n\n"}
          <Text style={styles.email}>privacy@bara.se</Text>{"\n\n"}
          We will process your request within 30 days in accordance with GDPR requirements. You can also submit a deletion request from the Settings screen in the app.
        </Text>

        <Text style={styles.sectionTitle}>8. Cookies & Tracking</Text>
        <Text style={styles.body}>
          The Bära mobile app does not use cookies. We use standard server logs to monitor performance and security. No third-party advertising trackers are used.
        </Text>

        <Text style={styles.sectionTitle}>9. Security</Text>
        <Text style={styles.body}>
          We protect your data using industry-standard security measures including encrypted connections (HTTPS/TLS), hashed passwords, and JWT-based authentication. We never store passwords in plain text.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact</Text>
        <Text style={styles.body}>
          For privacy questions or to exercise your rights:{"\n\n"}
          Email: <Text style={styles.email}>privacy@bara.se</Text>{"\n"}
          Address: Bära AB, Sweden
        </Text>

        <Text style={styles.sectionTitle}>Integritetspolicy (Svenska)</Text>
        <Text style={styles.body}>
          Bära AB behandlar dina personuppgifter i enlighet med GDPR och svensk dataskyddslagstiftning. Vi samlar in namn, e-post, stad och jobbinformation för att kunna tillhandahålla vår tjänst. Du har rätt att begära tillgång till, rättelse av, eller radering av dina uppgifter. Kontakta oss på privacy@bara.se.
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
  email: {
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },
});
