import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>1. Platform Nature</Text>
        <Text style={styles.body}>
          Bära is a technology platform that connects customers with independent drivers. Bära is not a transport company and does not provide transport services directly.
        </Text>

        <Text style={styles.sectionTitle}>2. Independent Contractors</Text>
        <Text style={styles.body}>
          Drivers on the Bära platform are independent contractors, not employees of Bära AB. They operate their own vehicles and set their own schedules.
        </Text>

        <Text style={styles.sectionTitle}>3. Liability</Text>
        <Text style={styles.body}>
          Bära is not responsible for damage to items during transport. Items are transported at the customer's own risk. We strongly recommend insuring valuable items before transport.
        </Text>

        <Text style={styles.sectionTitle}>4. Item Ownership</Text>
        <Text style={styles.body}>
          By using Bära, customers confirm that they own the items being transported and have the legal right to transport them.
        </Text>

        <Text style={styles.sectionTitle}>5. Prohibited Items</Text>
        <Text style={styles.body}>
          The following items may not be transported using Bära:{"\n\n"}• Weapons or firearms{"\n"}• Illegal substances or narcotics{"\n"}• Stolen goods{"\n"}• Hazardous materials{"\n"}• Live animals
        </Text>

        <Text style={styles.sectionTitle}>6. Payments</Text>
        <Text style={styles.body}>
          Payments are processed securely through Stripe. Drivers receive 75% of the job value. Bära retains 25% as a platform fee.
        </Text>

        <Text style={styles.sectionTitle}>7. Governing Law</Text>
        <Text style={styles.body}>
          These terms are governed by Swedish law. Any disputes shall be resolved in Swedish courts.
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
