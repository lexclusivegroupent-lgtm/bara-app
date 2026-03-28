import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { SWEDISH_CITIES } from "@/constants/config";

type Role = "customer" | "driver" | "both";

const ROLES: { id: Role; label: string; icon: string }[] = [
  { id: "customer", label: "Customer", icon: "account" },
  { id: "driver", label: "Driver", icon: "truck" },
  { id: "both", label: "Both", icon: "account-switch" },
];

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("Stockholm");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    if (!agreedToTerms) {
      Alert.alert("Terms Required", "Please agree to the Terms of Service.");
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        city,
        vehicleDescription: vehicleDescription.trim() || undefined,
      });
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const showVehicle = role === "driver" || role === "both";

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoSmall}>
            <MaterialCommunityIcons name="truck-delivery" size={28} color={Colors.gold} />
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join Bära today</Text>
        </View>

        <View style={styles.rolePicker}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
              onPress={() => setRole(r.id)}
            >
              <MaterialCommunityIcons
                name={r.icon as any}
                size={16}
                color={role === r.id ? Colors.navy : Colors.textMuted}
              />
              <Text style={[styles.roleText, role === r.id && styles.roleTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {role === "both" && (
          <View style={styles.bothHint}>
            <Feather name="info" size={13} color={Colors.gold} />
            <Text style={styles.bothHintText}>
              You can post jobs as a customer and accept jobs as a driver
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <InputField label="Full Name" icon="user" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
          <InputField label="Email" icon="mail" value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" />
          <InputField
            label="Password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "eye-off" : "eye"}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowCityPicker(!showCityPicker)}
            >
              <Feather name="map-pin" size={16} color={Colors.textMuted} />
              <Text style={[styles.pickerText, { color: Colors.text }]}>{city}</Text>
              <Feather name={showCityPicker ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {showCityPicker && (
              <View style={styles.cityDropdown}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {SWEDISH_CITIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cityOption, city === c && styles.cityOptionActive]}
                      onPress={() => { setCity(c); setShowCityPicker(false); }}
                    >
                      <Text style={[styles.cityOptionText, city === c && styles.cityOptionTextActive]}>{c}</Text>
                      {city === c && <Feather name="check" size={14} color={Colors.gold} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {showVehicle && (
            <InputField
              label="Vehicle Description"
              icon="truck"
              value={vehicleDescription}
              onChangeText={setVehicleDescription}
              placeholder="e.g. White Volvo V90, large van"
            />
          )}

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
              {agreedToTerms && <Feather name="check" size={12} color={Colors.navy} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text style={styles.termsLink} onPress={() => router.push("/terms")}>Terms of Service</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.disabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.footerLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function InputField({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, rightIcon, onRightIconPress }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Feather name={icon} size={16} color={Colors.textMuted} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || "default"}
          autoCapitalize={autoCapitalize || "words"}
          autoCorrect={false}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={{ padding: 2 }}>
            <Feather name={rightIcon} size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center", marginBottom: 20 },
  header: { marginBottom: 28 },
  logoSmall: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  rolePicker: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  roleBtnActive: { backgroundColor: Colors.gold },
  roleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  roleTextActive: { color: Colors.navy },
  bothHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    marginBottom: 12,
  },
  bothHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.gold,
    lineHeight: 18,
  },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },
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
  input: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  pickerText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  cityDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -4,
    overflow: "hidden",
  },
  cityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityOptionActive: { backgroundColor: `${Colors.gold}18` },
  cityOptionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  cityOptionTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.gold },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  termsText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, flex: 1 },
  termsLink: { color: Colors.gold, fontFamily: "Inter_500Medium" },
  registerBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  registerBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  disabled: { opacity: 0.7 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.gold },
});
