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
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

function getStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length < 8) return { level: 0, label: "Too short", color: Colors.error };
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak", color: "#E87A2A" };
  if (score === 2) return { level: 2, label: "Good", color: "#4A9EE8" };
  return { level: 3, label: "Strong", color: Colors.success };
}

export default function ResetPasswordScreen() {
  const { token: paramToken } = useLocalSearchParams<{ token?: string }>();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState(paramToken || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = getStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  async function handleReset() {
    if (!token.trim()) {
      setError("Please enter your reset token.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach server. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.navy }]}>
        <View style={[styles.centerContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.successIcon}>
            <Feather name="check-circle" size={48} color={Colors.success} />
          </View>
          <Text style={styles.doneTitle}>Password updated!</Text>
          <Text style={styles.doneSubtitle}>
            Your password has been changed. You can now log in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.replace("/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
            <Feather name="shield" size={28} color={Colors.gold} />
          </View>

          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>
            Enter your reset token and choose a strong new password.
          </Text>

          <View style={styles.form}>
            {!paramToken && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reset Token</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="key" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Paste your reset token"
                    placeholderTextColor={Colors.textMuted}
                    value={token}
                    onChangeText={(t) => { setToken(t); setError(null); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.textMuted}
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setError(null); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBar}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSegment,
                          i < strength.level ? { backgroundColor: strength.color } : { backgroundColor: Colors.border },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, confirmPassword.length > 0 && { borderColor: passwordsMatch ? Colors.success : Colors.error }]}>
                <Feather name="lock" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Repeat your password"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                {confirmPassword.length > 0 && (
                  <Feather
                    name={passwordsMatch ? "check" : "x"}
                    size={16}
                    color={passwordsMatch ? Colors.success : Colors.error}
                  />
                )}
              </View>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, (loading || newPassword.length < 8 || !passwordsMatch) && styles.btnDisabled]}
              onPress={handleReset}
              disabled={loading || newPassword.length < 8 || !passwordsMatch}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.navy} />
                : <Text style={styles.btnText}>Reset Password</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
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
  eyeBtn: { padding: 2 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  strengthBar: { flex: 1, flexDirection: "row", gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 50 },
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
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: `${Colors.success}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  doneSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  loginBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },
  loginBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.navy },
});
