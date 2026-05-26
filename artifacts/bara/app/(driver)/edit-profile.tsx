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
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, SWEDISH_CITIES } from "@/constants/config";
import { safeJson } from "@/utils/api";

export default function DriverEditProfileScreen() {
  const { user, token, updateUser } = useAuth();
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [city, setCity] = useState(user?.city || "Stockholm");
  const [vehicleDescription, setVehicleDescription] = useState(user?.vehicleDescription || "");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  // F-tax (F-skatt) fields
  const [ftaxRegistered, setFtaxRegistered] = useState(user?.ftaxRegistered ?? false);
  const [ftaxNumber, setFtaxNumber] = useState(user?.ftaxNumber || "");

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert(t("missingInfo"), t("enterFullName"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          city,
          vehicleDescription: vehicleDescription.trim() || null,
          ftaxRegistered,
          ftaxNumber: ftaxNumber.trim() || null,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      updateUser(data);
      router.back();
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("editProfileTitle")}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.gold} />
          ) : (
            <Text style={styles.saveText}>{t("saveChanges")}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Feather name="user" size={36} color={Colors.gold} />
          </View>
        </View>

        {/* ⚖️ Contractor disclaimer — requires Swedish legal review before launch */}
        <View style={styles.contractorNote}>
          <Feather name="info" size={13} color={Colors.textMuted} />
          <Text style={styles.contractorNoteText}>
            {isSv
              ? "Bära är en teknologiplattform som kopplar ihop kunder med oberoende förare. Förare är egenföretagare, inte anställda hos Bära."
              : "Bära is a technology platform connecting customers with independent drivers. Drivers are independent contractors, not employees of Bära."}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("fullName")}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t("yourFullName")}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("city")}</Text>
          <TouchableOpacity
            style={[styles.inputWrap, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
            onPress={() => setShowCityPicker(!showCityPicker)}
          >
            <Text style={[styles.input, { color: Colors.text }]}>{city}</Text>
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
                    <Text style={[styles.cityOptionText, city === c && { color: Colors.gold, fontFamily: "Inter_600SemiBold" }]}>{c}</Text>
                    {city === c && <Feather name="check" size={14} color={Colors.gold} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("vehicleDescription")}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={vehicleDescription}
              onChangeText={setVehicleDescription}
              placeholder={t("vehiclePlaceholder")}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* F-tax (F-skatt) section */}
        <View style={styles.ftaxSection}>
          <Text style={styles.ftaxSectionTitle}>
            {isSv ? "F-skatt (F-tax)" : "F-tax Registration (F-skatt)"}
          </Text>
          <Text style={styles.ftaxSectionSub}>
            {isSv
              ? "F-skatt krävs när dina sammanlagda intäkter överstiger 1 000 kr. Kontakta Skatteverket för registrering."
              : "F-tax is required once your total earnings exceed 1,000 SEK. Contact Skatteverket to register."}
          </Text>

          <View style={styles.ftaxToggleRow}>
            <Text style={styles.ftaxToggleLabel}>
              {isSv ? "Jag har F-skatt registrerad" : "I have F-tax registration"}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([true, false] as const).map((v) => (
                <TouchableOpacity
                  key={String(v)}
                  style={[
                    styles.ftaxToggleBtn,
                    ftaxRegistered === v && (v ? styles.ftaxToggleBtnYes : styles.ftaxToggleBtnNo),
                  ]}
                  onPress={() => setFtaxRegistered(v)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.ftaxToggleBtnText,
                    ftaxRegistered === v && { fontFamily: "Inter_600SemiBold", color: Colors.navy },
                  ]}>
                    {v ? (isSv ? "Ja" : "Yes") : (isSv ? "Nej" : "No")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {ftaxRegistered && (
            <View style={styles.field}>
              <Text style={styles.label}>{isSv ? "F-skattsedelnummer" : "F-tax number"}</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={ftaxNumber}
                  onChangeText={setFtaxNumber}
                  placeholder={isSv ? "t.ex. 556XXX-XXXX" : "e.g. 556XXX-XXXX"}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          )}

          {user?.ftaxVerifiedByAdmin && (
            <View style={styles.ftaxVerifiedBadge}>
              <Feather name="check-circle" size={13} color={Colors.success} />
              <Text style={styles.ftaxVerifiedText}>
                {isSv ? "F-skatt verifierad av Bära" : "F-tax verified by Bära"}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  saveBtn: { paddingHorizontal: 8, paddingVertical: 4, minWidth: 40, alignItems: "flex-end" },
  saveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.gold },
  content: { padding: 20, gap: 18 },
  avatarSection: { alignItems: "center", paddingVertical: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${Colors.gold}40`,
  },
  field: { gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },
  inputWrap: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
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
  contractorNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contractorNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 17,
  },
  ftaxSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  ftaxSectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  ftaxSectionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 18,
  },
  ftaxToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  ftaxToggleLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  ftaxToggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  ftaxToggleBtnYes: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  ftaxToggleBtnNo: { borderColor: Colors.border, backgroundColor: Colors.surface },
  ftaxToggleBtnText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  ftaxVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  ftaxVerifiedText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
});
