import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

export default function AppealScreen() {
  const { token } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";

  const [reason, setReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [supportingInfo, setSupportingInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!reason.trim() || !explanation.trim()) {
      Alert.alert(
        isSv ? "Fält saknas" : "Missing Fields",
        isSv ? "Vänligen fyll i vad som hände och din förklaring." : "Please fill in what happened and your explanation."
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason, explanation, supportingInfo }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setSubmitted(true);
      } else {
        Alert.alert("Error", data.error || "Could not submit appeal.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Feather name="check" size={36} color={Colors.navy} />
          </View>
          <Text style={styles.successTitle}>{isSv ? "Överklagan inlämnad" : "Appeal Submitted"}</Text>
          <Text style={styles.successBody}>
            {isSv
              ? "Vi har tagit emot din överklagan och granskar den inom 14 dagar. Du får ett meddelande när beslutet är fattat."
              : "We have received your appeal and will review it within 14 days. You will receive a notification when a decision is made."}
          </Text>
          <Text style={styles.successContact}>
            {isSv ? "Frågor? Kontakta oss på " : "Questions? Contact us at "}
            <Text style={{ color: Colors.gold }}>hello@baraapp.se</Text>
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.backBtnText}>{isSv ? "Tillbaka" : "Go Back"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.container, { backgroundColor: Colors.navy }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{isSv ? "Överklaga beslut" : "Appeal a Decision"}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Feather name="info" size={15} color={Colors.gold} />
            <Text style={styles.infoText}>
              {isSv
                ? "Du har rätt att överklaga varje beslut om avstängning eller varning inom 14 dagar. Vi granskar alla överklagan rättvist och opartiskt."
                : "You have the right to appeal any deactivation or warning decision within 14 days. We review all appeals fairly and impartially."}
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{isSv ? "Vad hände?" : "What happened?"} *</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder={isSv ? "Beskriv kortfattat vad beslutet gällde..." : "Briefly describe what the decision was about..."}
              placeholderTextColor={Colors.textMuted}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{isSv ? "Din förklaring" : "Your Explanation"} *</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={5}
              placeholder={isSv ? "Förklara din sida av händelsen..." : "Explain your side of the situation..."}
              placeholderTextColor={Colors.textMuted}
              value={explanation}
              onChangeText={setExplanation}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{isSv ? "Stödjande information (valfritt)" : "Supporting Information (optional)"}</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder={isSv ? "Eventuell ytterligare information, vittnen, bevis etc..." : "Any additional info, witnesses, evidence etc..."}
              placeholderTextColor={Colors.textMuted}
              value={supportingInfo}
              onChangeText={setSupportingInfo}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.timelineBox}>
            <Feather name="clock" size={14} color={Colors.textMuted} />
            <Text style={styles.timelineText}>
              {isSv
                ? "Handläggningstid: upp till 14 dagar. Du meddelas via app-notifikation."
                : "Processing time: up to 14 days. You will be notified via push notification."}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.disabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.navy} />
              : <>
                  <Feather name="send" size={16} color={Colors.navy} />
                  <Text style={styles.submitBtnText}>{isSv ? "Skicka överklagan" : "Submit Appeal"}</Text>
                </>
            }
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    minHeight: 100,
  },
  timelineBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 17,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.navy },
  disabled: { opacity: 0.6 },
  successCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  successBody: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 23 },
  successContact: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  backBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  backBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.navy },
});
