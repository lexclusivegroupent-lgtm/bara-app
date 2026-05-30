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
import { safeBack } from "@/utils/navigation";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { SWEDISH_CITIES } from "@/constants/config";
import { LanguageToggle } from "@/components/LanguageToggle";

type Role = "customer" | "driver" | "both";

const TOTAL_STEPS = 4;

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
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

  const showVehicle = role === "driver" || role === "both";
  const maxStep = showVehicle ? TOTAL_STEPS : TOTAL_STEPS - 1;

  function handleBack() {
    if (step === 1) {
      safeBack();
    } else {
      setStep(step - 1);
    }
  }

  function handleNext() {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!fullName.trim()) {
        Alert.alert(t("missingFields"), isSv ? "Ange ditt namn." : "Enter your name.");
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        Alert.alert(t("missingFields"), t("errorInvalidEmail"));
        return;
      }
      if (password.length < 6) {
        Alert.alert(t("missingFields"), isSv ? "Lösenordet måste vara minst 6 tecken." : "Password must be at least 6 characters.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (showVehicle) {
        setStep(4);
      } else {
        handleRegister();
      }
    }
  }

  async function handleRegister() {
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

  const effectiveStep = showVehicle ? step : step;
  const effectiveMax = showVehicle ? 4 : 3;

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
        {/* Top row: back + lang toggle */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>
          <LanguageToggle />
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {Array.from({ length: effectiveMax }).map((_, i) => (
            <View
              key={i}
              style={[styles.stepDot, i + 1 <= effectiveStep && styles.stepDotActive]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          {isSv ? `Steg ${effectiveStep} av ${effectiveMax}` : `Step ${effectiveStep} of ${effectiveMax}`}
        </Text>

        {/* Step 1: Role selection */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {isSv ? "Vad vill du göra?" : "What would you like to do?"}
            </Text>
            <Text style={styles.stepSubtitle}>
              {isSv ? "Välj hur du vill använda Bära." : "Choose how you want to use Bära."}
            </Text>

            <View style={styles.roleCards}>
              {([
                {
                  id: "customer" as Role,
                  icon: "account",
                  labelSV: "Kund",
                  labelEN: "Customer",
                  descSV: "Jag vill skicka eller hämta saker",
                  descEN: "I want to send or pick up items",
                },
                {
                  id: "driver" as Role,
                  icon: "truck",
                  labelSV: "Bärare",
                  labelEN: "Carrier",
                  descSV: "Jag vill köra och tjäna pengar",
                  descEN: "I want to drive and earn money",
                },
                {
                  id: "both" as Role,
                  icon: "account-switch",
                  labelSV: "Båda",
                  labelEN: "Both",
                  descSV: "Jag vill både skicka och köra",
                  descEN: "I want to both send and drive",
                },
              ]).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleCard, role === r.id && styles.roleCardActive]}
                  onPress={() => setRole(r.id)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name={r.icon as any}
                    size={28}
                    color={role === r.id ? Colors.navy : Colors.gold}
                  />
                  <View style={styles.roleCardText}>
                    <Text style={[styles.roleCardTitle, role === r.id && styles.roleCardTitleActive]}>
                      {isSv ? r.labelSV : r.labelEN}
                    </Text>
                    <Text style={[styles.roleCardDesc, role === r.id && styles.roleCardDescActive]}>
                      {isSv ? r.descSV : r.descEN}
                    </Text>
                  </View>
                  {role === r.id && (
                    <Feather name="check-circle" size={22} color={Colors.navy} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{isSv ? "Fortsätt" : "Continue"}</Text>
              <Feather name="arrow-right" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Personal info */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {isSv ? "Dina uppgifter" : "Your details"}
            </Text>
            <Text style={styles.stepSubtitle}>
              {isSv ? "Fyll i ditt namn, e-post och lösenord." : "Enter your name, email and password."}
            </Text>

            <View style={styles.form}>
              <InputField
                label={t("fullName")}
                icon="user"
                value={fullName}
                onChangeText={setFullName}
                placeholder={t("yourFullName")}
              />
              <InputField
                label={t("email")}
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="din@epost.se"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InputField
                label={t("password")}
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder={isSv ? "Minst 6 tecken" : "Minimum 6 characters"}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? "eye-off" : "eye"}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
            </View>

            <TouchableOpacity style={[styles.nextBtn, { marginTop: 24 }]} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{isSv ? "Fortsätt" : "Continue"}</Text>
              <Feather name="arrow-right" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: City + vehicle (if driver) */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {isSv ? "Din stad" : "Your city"}
            </Text>
            <Text style={styles.stepSubtitle}>
              {isSv ? "Välj din stad för att hitta jobb nära dig." : "Choose your city to find jobs nearby."}
            </Text>

            <View style={styles.form}>
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
                  <View style={styles.anyCarBanner}>
                    <MaterialCommunityIcons name="cart-check" size={18} color={Colors.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.anyCarTitle}>
                        {isSv ? "Vilken bil som helst kvalificerar" : "Any car qualifies"}
                      </Text>
                      <Text style={styles.anyCarSub}>
                        {isSv
                          ? "Ingen skåpbil eller trailer krävs."
                          : "No van or trailer needed."}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.vehicleTypeSection}>
                    <Text style={styles.vehicleTypeLabel}>{t("vehicleType")}</Text>
                    <View style={styles.vehicleTypeGrid}>
                      {[
                        { id: "regular_car", labelSV: "Personbil", labelEN: "Regular car", icon: "car" },
                        { id: "suv", labelSV: "SUV", labelEN: "SUV", icon: "car-side" },
                        { id: "estate_car", labelSV: "Kombi", labelEN: "Estate car", icon: "car-estate" },
                        { id: "roof_box", labelSV: "Bil med takbox", labelEN: "Roof box", icon: "car-settings" },
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
                            {isSv ? vt.labelSV : vt.labelEN}
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
                    placeholder={isSv ? "t.ex. Volvo V60, vit" : "e.g. Volvo V60, white"}
                  />
                </>
              )}
            </View>

            {!showVehicle && (
              <TouchableOpacity
                style={[styles.termsRow, { marginTop: 16 }]}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                  {agreedToTerms && <Feather name="check" size={14} color={Colors.navy} />}
                </View>
                <Text style={styles.termsText}>
                  {t("agreeToTerms")}
                  <Text style={styles.termsLink} onPress={() => router.push("/terms")}>
                    {t("termsOfService")}
                  </Text>
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextBtn, { marginTop: 24 }, loading && styles.disabled]}
              onPress={handleNext}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {showVehicle ? (isSv ? "Fortsätt" : "Continue") : (isSv ? "Skapa konto" : "Create Account")}
                  </Text>
                  <Feather name={showVehicle ? "arrow-right" : "check"} size={20} color={Colors.navy} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Terms + create account (driver/both only) */}
        {step === 4 && showVehicle && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {isSv ? "Godkänn villkor" : "Agree to Terms"}
            </Text>
            <Text style={styles.stepSubtitle}>
              {isSv
                ? "Läs och godkänn villkoren för att slutföra din registrering."
                : "Read and accept the terms to complete your registration."}
            </Text>

            <View style={styles.form}>
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                  {agreedToTerms && <Feather name="check" size={14} color={Colors.navy} />}
                </View>
                <Text style={styles.termsText}>
                  {t("agreeToTerms")}
                  <Text style={styles.termsLink} onPress={() => router.push("/terms")}>
                    {t("termsOfService")}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, { marginTop: 24 }, loading && styles.disabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>{t("createAccountBtn")}</Text>
                  <Feather name="check" size={20} color={Colors.navy} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3 customer-only terms (inline, no step 4) */}
        {step === 3 && !showVehicle && (
          <View style={[styles.form, { marginTop: 16 }]}>
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                {agreedToTerms && <Feather name="check" size={14} color={Colors.navy} />}
              </View>
              <Text style={styles.termsText}>
                {t("agreeToTerms")}
                <Text style={styles.termsLink} onPress={() => router.push("/terms")}>
                  {t("termsOfService")}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  backBtn: { width: 56, height: 56, justifyContent: "center", alignItems: "center" },
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  stepDotActive: { backgroundColor: Colors.gold },
  stepLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 24,
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  stepSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 28, lineHeight: 22 },

  roleCards: { gap: 12, marginBottom: 8 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleCardActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  roleCardText: { flex: 1 },
  roleCardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 2 },
  roleCardTitleActive: { color: Colors.navy },
  roleCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 19 },
  roleCardDescActive: { color: `${Colors.navy}CC` },

  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, letterSpacing: 0.4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  pickerText: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityOptionActive: { backgroundColor: `${Colors.gold}18` },
  cityOptionText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  cityOptionTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.gold },

  anyCarBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  anyCarTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.gold, marginBottom: 2 },
  anyCarSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 18 },

  vehicleTypeSection: { gap: 8 },
  vehicleTypeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  vehicleTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vehicleTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleTypeBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  vehicleTypeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  vehicleTypeBtnTextActive: { color: Colors.navy, fontFamily: "Inter_600SemiBold" },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  termsText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted, flex: 1, lineHeight: 21 },
  termsLink: { color: Colors.gold, fontFamily: "Inter_600SemiBold" },

  nextBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  nextBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.navy },
  disabled: { opacity: 0.7 },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  footerLink: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.gold },
});
