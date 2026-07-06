import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { completeEmailVerification } = useAuth();
  const { lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (otp.length !== 6) {
      setError(isSv ? "Ange den 6-siffriga koden från din e-post." : "Enter the 6-digit code from your email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Invalid or expired code");

      // Persist the session exactly like login, then route by role
      const mode = await completeEmailVerification(data.token, data.user);
      router.replace(mode === "driver" ? "/(driver)/leads" : "/(customer)/home");
    } catch (e: any) {
      setError(e.message === "Invalid or expired code"
        ? (isSv ? "Ogiltig eller utgången kod. Försök igen." : "Invalid or expired code. Try again.")
        : e.message || (isSv ? "Något gick fel." : "Something went wrong."));
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      Alert.alert(
        isSv ? "Kod skickad" : "Code sent",
        isSv ? "En ny 6-siffrig kod har skickats till din e-post." : "A new 6-digit code has been sent to your email."
      );
    } catch {
      Alert.alert(
        isSv ? "Fel" : "Error",
        isSv ? "Kunde inte skicka koden. Vänta en stund och försök igen." : "Could not resend code. Please wait a moment and try again."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          <View style={styles.iconCircle}>
            <Feather name="mail" size={32} color={Colors.gold} />
          </View>

          <Text style={styles.title}>
            {isSv ? "Verifiera din e-post" : "Verify your email"}
          </Text>
          <Text style={styles.subtitle}>
            {isSv ? "Ange den 6-siffriga koden som skickats till" : "Enter the 6-digit code sent to"}
            {"\n"}
            <Text style={styles.email}>{email}</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={(t) => { setOtp(t.replace(/\D/g, "").slice(0, 6)); setError(null); }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            textContentType="oneTimeCode"
            accessibilityLabel="One-time verification code"
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}
            accessibilityRole="button"
            accessibilityLabel="Confirm email verification"
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.buttonText}>{isSv ? "Verifiera e-post" : "Verify email"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={resending}
            accessibilityRole="button"
            accessibilityLabel="Resend verification code"
          >
            <Text style={styles.resendText}>
              {resending ? (isSv ? "Skickar…" : "Sending…") : (isSv ? "Skicka koden igen" : "Resend code")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/login")}>
            <Text style={styles.backText}>{isSv ? "Tillbaka till inloggning" : "Back to login"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.gold}15`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${Colors.gold}40`,
    marginBottom: 24,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: "center", marginBottom: 32, lineHeight: 22 },
  email: { fontFamily: "Inter_600SemiBold", color: Colors.text },
  input: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: 12,
    textAlign: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.error}15`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1 },
  button: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.navy, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resendButton: { padding: 12 },
  resendText: { color: Colors.gold, fontSize: 14, fontFamily: "Inter_500Medium" },
  backButton: { padding: 12, marginTop: 8 },
  backText: { color: Colors.textMuted, fontSize: 13 },
});
