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
import { Colors } from "@/constants/colors";
import { BASE_URL, SWEDISH_CITIES } from "@/constants/config";
import { safeJson } from "@/utils/api";

export default function DriverEditProfileScreen() {
  const { user, token, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [city, setCity] = useState(user?.city || "Stockholm");
  const [vehicleDescription, setVehicleDescription] = useState(user?.vehicleDescription || "");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Missing Info", "Please enter your full name.");
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
        body: JSON.stringify({ fullName: fullName.trim(), city, vehicleDescription: vehicleDescription.trim() || null }),
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.gold} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Feather name="user" size={36} color={Colors.gold} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>City</Text>
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
          <Text style={styles.label}>Vehicle Description</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={vehicleDescription}
              onChangeText={setVehicleDescription}
              placeholder="e.g. White Volvo V90, cargo van"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
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
});
