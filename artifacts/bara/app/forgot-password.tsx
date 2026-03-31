import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      if (data.devToken) {
        setDevToken(data.devToken);
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach server. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Feather name="lock" size={28} color={Colors.gold} />
          </View>

          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we'll send you a reset link.
          </Text>

          {!submitted ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email address</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={Colors.navy} />
                  : <Text style={styles.btnText}>Send Reset Link</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successBox}>
              <View style={styles.successIconWrap}>
                <Feather name="check-circle" size={32} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successBody}>
                If <Text style={{ color: Colors.text }}>{email.trim()}</Text> is registered, a reset link has been sent. Check your inbox and spam folder.
              </Text>

              {devToken && (
                <View style={styles.devBox}>
                  <Text style={styles.devLabel}>DEV MODE — No SMTP configured</Text>
                  <Text style={styles.devDesc}>
                    In production this would be emailed. Your token for testing:
                  </Text>
                  <Text style={styles.devToken} selectable>{devToken}</Text>
                  <TouchableOpacity
                    style={styles.devBtn}
                    onPress={() => router.push({ pathname: "/reset-password", params: { token: devToken } })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.devBtnText}>Use this token →</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.replace("/login")}>
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center", marginBottom: 32 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 22, marginBottom: 32 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.error}18`,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.error },
  btn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  successBox: { gap: 16, alignItems: "center", paddingTop: 8 },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: `${Colors.success}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  successBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  devBox: {
    width: "100%",
    backgroundColor: `${Colors.gold}10`,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  devLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  devDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  devToken: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    backgroundColor: Colors.navy,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  devBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  backToLoginBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  backToLoginText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textMuted },
});
