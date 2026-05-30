import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/navigation";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBankIdModal, setShowBankIdModal] = useState(false);
  const isSv = t("logIn") === "Logga in";

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError(t("pleaseFillAll"));
      return;
    }
    setError(null);
    setLoading(true);
    console.log("[Login] handleLogin() called for:", email.trim());
    try {
      console.log("[Login] Calling login() from AuthContext...");
      const { mode } = await login(email.trim(), password);
      console.log("[Login] login() resolved, mode:", mode);
      const destination = mode === "driver" ? "/(driver)/map" : "/(customer)/home";
      console.log("[Login] Navigating to:", destination);
      router.replace(destination as any);
      console.log("[Login] router.replace() called successfully");
    } catch (e: any) {
      console.log("[Login] login() threw error:", e.message);
      setError(e.message || t("errorLoginFailed"));
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={safeBack}
          >
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoSmall}
              resizeMode="contain"
            />
            <Text style={styles.title}>{t("welcomeBack")}</Text>
            <Text style={styles.subtitle}>{t("loginSubtitle")}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("email")}</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={16} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t("password")}</Text>
                <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                  <Text style={styles.forgotLink}>{t("forgotPassword")}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Your password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={styles.loginBtnText}>{t("loginBtn")}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{isSv ? "eller" : "or"}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.bankIdBtn}
            onPress={() => setShowBankIdModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.bankIdBtnText}>🔐 BankID</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t("noAccount")}</Text>
            <TouchableOpacity onPress={() => router.replace("/register")}>
              <Text style={styles.footerLink}>{t("signUp")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showBankIdModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRow}>
              <Text style={styles.modalIcon}>🔐</Text>
            </View>
            <Text style={styles.modalTitle}>BankID</Text>
            <Text style={styles.modalBody}>
              {isSv
                ? "Inloggning med BankID kommer snart. Vi jobbar på att integrera BankID för enklare och säkrare inloggning."
                : "BankID login is coming soon. We are working on integrating BankID for easier and more secure login."}
            </Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowBankIdModal(false)} activeOpacity={0.85}>
              <Text style={styles.modalCloseBtnText}>{isSv ? "Stäng" : "Close"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  backBtn: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  header: {
    marginBottom: 36,
  },
  logoSmall: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  forgotLink: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },
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
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
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
  inputIcon: {},
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  eyeBtn: {
    padding: 2,
  },
  loginBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  loginBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  bankIdBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  bankIdBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalIconRow: { alignItems: "center" },
  modalIcon: { fontSize: 48 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  modalBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 23,
  },
  modalCloseBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 4,
    width: "100%",
  },
  modalCloseBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.navy },
  disabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
});
