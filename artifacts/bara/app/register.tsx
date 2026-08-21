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
import { SWEDISH_CITIES, BASE_URL, LEAD_GEN_MODE } from "@/constants/config";
import { safeJson } from "@/utils/api";

type Role = "customer" | "driver" | "both";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();
  // In lead-gen mode, public self-registration is customer-only — partner
  // companies are onboarded by admin (see the "Are you a transport company?"
  // interest card below and Admin → Partners). The role picker and
  // individual-gig vehicle picker only render with LEAD_GEN_MODE off.
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("Stockholm");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [vehicleType, setVehicleType] = useState("regular_car");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Partner interest — lightweight, no-account submission for transport
  // companies. Captured via /api/waitlist (type: partner_interest); admin
  // follows up and onboards through the Partners tab.
  const [showPartnerInterest, setShowPartnerInterest] = useState(false);
  const [interestCompanyName, setInterestCompanyName] = useState("");
  const [interestEmail, setInterestEmail] = useState("");
  const [interestPhone, setInterestPhone] = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);

  async function handlePartnerInterestSubmit() {
    if (!interestCompanyName.trim() || !interestEmail.trim()) {
      Alert.alert(
        isSv ? "Uppgifter saknas" : "Missing information",
        isSv ? "Ange företagsnamn och e-post." : "Enter a company name and email."
      );
      return;
    }
    setInterestSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: interestEmail.trim(),
          type: "partner_interest",
          companyName: interestCompanyName.trim(),
          phone: interestPhone.trim() || undefined,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setInterestSubmitted(true);
    } catch (e: any) {
      Alert.alert(isSv ? "Fel" : "Error", e.message || (isSv ? "Kunde inte skicka." : "Could not submit."));
    } finally {
      setInterestSubmitting(false);
    }
  }

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
    // Carriers must be adults — validated client-side for instant feedback,
    // enforced server-side regardless.
    if (showVehicle) {
      if (!dateOfBirth.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
        Alert.alert(
          isSv ? "Födelsedatum krävs" : "Date of birth required",
          isSv ? "Ange ditt födelsedatum som ÅÅÅÅ-MM-DD." : "Enter your date of birth as YYYY-MM-DD."
        );
        return;
      }
      const dob = new Date(dateOfBirth.trim());
      const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (isNaN(dob.getTime()) || ageYears < 18) {
        Alert.alert(
          isSv ? "Åldersgräns" : "Age requirement",
          isSv ? "Du måste vara minst 18 år för att bli bärare." : "You must be at least 18 years old to become a carrier."
        );
        return;
      }
    }
    setLoading(true);
    try {
      const result = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        city,
        vehicleDescription: vehicleDescription.trim() || undefined,
        vehicleType: showVehicle ? vehicleType : undefined,
        dateOfBirth: showVehicle ? dateOfBirth.trim() : undefined,
      });
      if (result.requiresVerification) {
        router.push({ pathname: "/verify-email", params: { email: email.trim() } });
        return;
      }
      router.replace("/onboarding");
    } catch (e: any) {
      Alert.alert(t("registrationFailed"), e.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  // Also gated on !LEAD_GEN_MODE directly (belt and suspenders): role can
  // only become "driver"/"both" via the picker above, which is itself
  // hidden in lead-gen mode, but this keeps the vehicle section safe even
  // if role is ever set some other way in the future.
  const showVehicle = !LEAD_GEN_MODE && (role === "driver" || role === "both");

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

        {/* Legacy individual-gig signup — role picker + "any car" vehicle
            picker below. Not shown in lead-gen mode: public registration is
            customer-only, and partner companies are onboarded by admin. */}
        {!LEAD_GEN_MODE && (
          <>
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
          </>
        )}

        {/* Partner interest — for transport companies, not individuals.
            No account is created here; admin follows up and onboards via
            the Partners tab once F-skatt and insurance are confirmed. */}
        {LEAD_GEN_MODE && (
          <View style={styles.partnerCard}>
            <TouchableOpacity
              style={styles.partnerCardHeader}
              onPress={() => setShowPartnerInterest(!showPartnerInterest)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="domain" size={18} color={Colors.gold} />
              <Text style={styles.partnerCardTitle}>
                {isSv ? "Är du ett transportföretag?" : "Are you a transport company?"}
              </Text>
              <Feather name={showPartnerInterest ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {!showPartnerInterest && (
              <Text style={styles.partnerCardSub}>
                {isSv
                  ? "Bli partner och få kvalificerade förfrågningar i ditt område."
                  : "Become a partner and receive qualified requests in your area."}
              </Text>
            )}

            {showPartnerInterest && (
              interestSubmitted ? (
                <View style={styles.partnerSuccessRow}>
                  <Feather name="check-circle" size={16} color={Colors.success} />
                  <Text style={styles.partnerSuccessText}>
                    {isSv ? "Tack! Vi hör av oss inom kort." : "Thanks! We'll be in touch soon."}
                  </Text>
                </View>
              ) : (
                <View style={styles.partnerForm}>
                  <TextInput
                    style={styles.partnerInput}
                    placeholder={isSv ? "Företagsnamn" : "Company name"}
                    placeholderTextColor={Colors.textMuted}
                    value={interestCompanyName}
                    onChangeText={setInterestCompanyName}
                  />
                  <TextInput
                    style={styles.partnerInput}
                    placeholder={isSv ? "E-post" : "Email"}
                    placeholderTextColor={Colors.textMuted}
                    value={interestEmail}
                    onChangeText={setInterestEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.partnerInput}
                    placeholder={isSv ? "Telefon (valfritt)" : "Phone (optional)"}
                    placeholderTextColor={Colors.textMuted}
                    value={interestPhone}
                    onChangeText={setInterestPhone}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    style={[styles.partnerSubmitBtn, interestSubmitting && styles.disabled]}
                    onPress={handlePartnerInterestSubmit}
                    disabled={interestSubmitting}
                    activeOpacity={0.85}
                  >
                    {interestSubmitting ? (
                      <ActivityIndicator color={Colors.navy} size="small" />
                    ) : (
                      <Text style={styles.partnerSubmitBtnText}>
                        {isSv ? "Skicka intresseanmälan" : "Send interest"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )
            )}
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
                <MaterialCommunityIcons name="cart-check" size={18} color={Colors.gold} />
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

              <InputField
                label={isSv ? "Födelsedatum (ÅÅÅÅ-MM-DD)" : "Date of birth (YYYY-MM-DD)"}
                icon="calendar"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="1995-06-15"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
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
  partnerCard: {
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    marginBottom: 16,
  },
  partnerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  partnerCardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  partnerCardSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 17,
  },
  partnerForm: {
    gap: 8,
    marginTop: 12,
  },
  partnerInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  partnerSubmitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 2,
  },
  partnerSubmitBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  partnerSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  partnerSuccessText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
    flex: 1,
  },
});
