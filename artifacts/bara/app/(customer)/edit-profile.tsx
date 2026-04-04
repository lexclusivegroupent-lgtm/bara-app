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
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, SWEDISH_CITIES } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { VehicleTypePicker, type VehicleType } from "@/components/VehicleTypePicker";

export default function EditProfileScreen() {
  const { user, token, updateUser } = useAuth();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [city, setCity] = useState(user?.city || "Stockholm");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(
    (user?.vehicleType as VehicleType | null) ?? null
  );
  const [vehicleDescription, setVehicleDescription] = useState(user?.vehicleDescription || "");
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable ?? true);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDriver = user?.role === "driver" || user?.role === "both";

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert(t("missingInfo"), t("pleaseDescribeItems"));
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
          vehicleType: isDriver ? vehicleType : undefined,
          vehicleDescription: isDriver ? (vehicleDescription.trim() || null) : undefined,
          isAvailable: isDriver ? isAvailable : undefined,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      updateUser(data);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save profile.");
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

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Feather name="user" size={36} color={Colors.gold} />
          </View>
        </View>

        {/* Full name */}
        <FormField label={t("fullName")} icon="user">
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t("yourFullName")}
            placeholderTextColor={Colors.textMuted}
          />
        </FormField>

        {/* City */}
        <View style={styles.field}>
          <View style={styles.fieldLabel}>
            <Feather name="map-pin" size={13} color={Colors.textMuted} />
            <Text style={styles.fieldLabelText}>{t("city")}</Text>
          </View>
          <TouchableOpacity
            style={styles.fieldInput}
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
                    <Text style={[styles.cityOptionText, city === c && styles.cityOptionTextActive]}>{c}</Text>
                    {city === c && <Feather name="check" size={14} color={Colors.gold} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Driver-only section */}
        {isDriver && (
          <>
            {/* Vehicle type picker */}
            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <Feather name="truck" size={13} color={Colors.textMuted} />
                <Text style={styles.fieldLabelText}>
                  {lang === "sv" ? "Fordonstyp" : "Vehicle Type"}
                </Text>
              </View>
              <VehicleTypePicker
                value={vehicleType}
                onChange={setVehicleType}
                lang={lang}
              />
            </View>

            {/* Vehicle notes / registration */}
            <FormField
              label={lang === "sv" ? "Fordonsbeskrivning (valfritt)" : "Vehicle Notes (optional)"}
              icon="info"
            >
              <TextInput
                style={styles.input}
                value={vehicleDescription}
                onChangeText={setVehicleDescription}
                placeholder={lang === "sv" ? "t.ex. Vit Volvo V90, reg. ABC123" : "e.g. White Volvo V90, reg. ABC123"}
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>

            {/* Availability toggle */}
            <View style={styles.availabilityRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.availabilityLabel}>
                  {lang === "sv" ? "Tillgänglig för jobb" : "Available for Jobs"}
                </Text>
                <Text style={styles.availabilitySubtext}>
                  {lang === "sv"
                    ? "Aktivera eller pausa nya jobb"
                    : "Toggle to accept or pause new jobs"}
                </Text>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
                trackColor={{ false: Colors.border, true: `${Colors.success}60` }}
                thumbColor={isAvailable ? Colors.success : Colors.textMuted}
              />
            </View>
          </>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

function FormField({ label, icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <Feather name={icon} size={13} color={Colors.textMuted} />
        <Text style={styles.fieldLabelText}>{label}</Text>
      </View>
      <View style={styles.fieldInput}>{children}</View>
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
  fieldLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabelText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
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
  availabilityRow: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availabilityLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  availabilitySubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
});
