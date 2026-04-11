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
  Image,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { SWEDISH_CITIES } from "@/constants/config";

type Role = "customer" | "driver" | "both";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("Stockholm");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [vehicleType, setVehicleType] = useState("regular_car");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const ROLES: { id: Role; label: string; icon: string }[] = [
    { id: "customer", label: t("customer"), icon: "account" },
    { id: "driver", label: t("driver"), icon: "truck" },
    { id: "both", label: t("both"), icon: "account-switch" },
  ];

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t("missingFields"), t("pleaseFillAll"));
      return;
    }
    if (!agreedToTerms) {
      Alert.alert(t("termsRequired"), t("pleaseAgreeTerms"));
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
        vehicleType: showVehicle ? vehicleType : undefined,
      });
      router.replace("/onboarding");
    } catch (e: any) {
      Alert.alert(t("registrationFailed"), e.message || t("somethingWentWrong"));
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
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoSmall}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t("createAccount")}</Text>
          <Text style={styles.subtitle}>{t("joinBara")}</Text>
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
            <Text style={styles.bothHintText}>{t("bothHint")}</Text>
          </View>
        )}

        <View style={styles.form}>
          <InputField label={t("fullName")} icon="user" value={fullName} onChangeText={setFullName} placeholder={t("yourFullName")} />
          <InputField label={t("email")} icon="mail" value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" />
          <InputField
            label={t("password")}
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder={t("minimumChars")}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "eye-off" : "eye"}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("city")}</Text>
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
            <>
              {/* Any car qualifies banner */}
              <View style={styles.anyCarBanner}>
                <MaterialCommunityIcons name="car-check" size={18} color={Colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.anyCarTitle}>
                    {isSv ? "Vilken bil som helst kvalificerar" : "Any car qualifies"}
                  </Text>
                  <Text style={styles.anyCarSub}>
                    {isSv
                      ? "Ingen skåpbil eller trailer krävs — bara en vanlig personbil."
                      : "No van or trailer needed — just a regular car."}
                  </Text>
                </View>
              </View>

              {/* Vehicle type picker */}
              <View style={styles.vehicleTypeSection}>
                <Text style={styles.vehicleTypeLabel}>{t("vehicleType") || "Vehicle type"}</Text>
                <View style={styles.vehicleTypeGrid}>
                  {[
                    { id: "regular_car", labelSV: "Personbil", labelEN: "Regular car", icon: "car" },
                    { id: "suv", labelSV: "SUV", labelEN: "SUV", icon: "car-side" },
                    { id: "estate_car", labelSV: "Kombi", labelEN: "Estate car", icon: "car-estate" },
                    { id: "roof_box", labelSV: "Bil med takbox", labelEN: "Car with roof box", icon: "car-settings" },
                  ].map((vt) => (
                    <TouchableOpacity
                      key={vt.id}
                      style={[styles.vehicleTypeBtn, vehicleType === vt.id && styles.vehicleTypeBtnActive]}
                      onPress={() => setVehicleType(vt.id)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={vt.icon as any}
                        size={20}
                        color={vehicleType === vt.id ? Colors.navy : Colors.gold}
                      />
                      <Text style={[styles.vehicleTypeBtnText, vehicleType === vt.id && styles.vehicleTypeBtnTextActive]}>
                        {vt.labelSV}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <InputField
                label={t("vehicleDescription")}
                icon="truck"
                value={vehicleDescription}
                onChangeText={setVehicleDescription}
                placeholder={t("vehiclePlaceholder")}
              />
            </>
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
              {t("agreeToTerms")}
              <Text style={styles.termsLink} onPress={() => router.push("/terms")}>{t("termsOfService")}</Text>
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
              <Text style={styles.registerBtnText}>{t("createAccountBtn")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("alreadyHaveAccount")}</Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.footerLink}>{t("logIn")}</Text>
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
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 16,
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
  anyCarBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  anyCarTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
    marginBottom: 2,
  },
  anyCarSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 17,
  },
  vehicleTypeSection: { gap: 8 },
  vehicleTypeLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  vehicleTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleTypeBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  vehicleTypeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  vehicleTypeBtnTextActive: {
    color: Colors.navy,
    fontFamily: "Inter_600SemiBold",
  },
});
