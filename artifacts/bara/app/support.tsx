import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
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

export default function SupportScreen() {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!message.trim()) {
      Alert.alert(t("missingFields"), t("messagePlaceholder"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/support/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          userEmail: user?.email,
          userName: user?.fullName,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: Colors.navy }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t("contactSupport")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {sent ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Feather name="check-circle" size={40} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>{t("messageSent")}</Text>
              <Text style={styles.successSub}>{t("weWillGetBack")}</Text>
              <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()} activeOpacity={0.85}>
                <Text style={styles.backHomeBtnText}>{t("home")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.introCard}>
                <Feather name="headphones" size={20} color={Colors.gold} />
                <Text style={styles.introText}>{t("supportSubtitle")}</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("subject")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("subjectPlaceholder")}
                  placeholderTextColor={Colors.textMuted}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("yourMessage")}</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder={t("messagePlaceholder")}
                  placeholderTextColor={Colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.sendBtn, loading && styles.disabled]}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.navy} />
                ) : (
                  <>
                    <Feather name="send" size={16} color={Colors.navy} />
                    <Text style={styles.sendBtnText}>{t("sendMessage")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  content: { padding: 20, gap: 16 },
  introCard: {
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
  },
  introText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  multiline: { minHeight: 130, textAlignVertical: "top" },
  sendBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  sendBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  disabled: { opacity: 0.7 },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.success}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  backHomeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 6,
  },
  backHomeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.navy },
});
