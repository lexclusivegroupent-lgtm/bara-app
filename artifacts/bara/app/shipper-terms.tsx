import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

// ⚖️ LEGAL REVIEW NEEDED — this is a short placeholder, not a complete or
// lawyer-reviewed contract. It exists so the B2B intermediary/liability
// model is stated somewhere before real shipper companies use the app.
export default function ShipperTermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Villkor för avsändare</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.reviewBadge}>
          <Feather name="alert-triangle" size={14} color={Colors.gold} />
          <Text style={styles.reviewBadgeText}>LEGAL REVIEW NEEDED — placeholder text, not a final contract</Text>
        </View>

        <Text style={styles.sectionTitle}>Bäras roll</Text>
        <Text style={styles.body}>
          Bära förmedlar uppdrag mellan företag. Bära transporterar inte gods, tar inte gods i besittning
          och är inte part i den faktiska transporten. Bära är inte arbetsgivare och inte transportör.
        </Text>

        <Text style={styles.sectionTitle}>Åkeriets ansvar</Text>
        <Text style={styles.body}>
          När din förfrågan tilldelas ett åkeri ingår du ett direkt avtal med det åkeriet för det specifika
          uppdraget. Utförande åkeri ansvarar för fordon, förare, försäkring och gods under transport.
        </Text>

        <Text style={styles.sectionTitle}>Ditt ansvar som avsändare</Text>
        <Text style={styles.body}>
          Du ansvarar för att lämna korrekt information om gods, hämt- och lämnadress samt kontaktuppgifter,
          och att godset är lagligt att transportera.
        </Text>

        <Text style={styles.sectionTitle}>Försäkring</Text>
        <Text style={styles.body}>
          Bära tecknar ingen försäkring för gods under transport. Frågor om försäkring och skador hanteras
          med det utförande åkeriet.
        </Text>

        <Text style={styles.sectionTitle}>Tillämplig lag</Text>
        <Text style={styles.body}>
          Svensk lag gäller. Fullständiga villkor kommer att granskas av jurist innan betalning införs i plattformen.
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
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.gold}12`,
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  reviewBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.gold, flex: 1 },
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
});
