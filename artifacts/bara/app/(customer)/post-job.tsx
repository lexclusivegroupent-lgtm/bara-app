import React, { useState, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, calculatePrice, formatSEK } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { PhotoPicker } from "@/components/PhotoPicker";

export default function PostJobScreen() {
  const { type } = useLocalSearchParams<{ type: "furniture_transport" | "junk_pickup" }>();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  const jobType = (type || "furniture_transport") as "furniture_transport" | "junk_pickup";
  const isFurniture = jobType === "furniture_transport";

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [distanceKm, setDistanceKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [agreedToOwnership, setAgreedToOwnership] = useState(false);
  const [customerPhotos, setCustomerPhotos] = useState<string[]>([]);

  const pricing = calculatePrice(jobType, distanceKm);

  async function estimateDistance() {
    if (!pickupAddress || !dropoffAddress) return;
    setCalculating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/distance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ origin: pickupAddress, destination: dropoffAddress }),
      });
      const data = await safeJson(res);
      if (data.distanceKm) setDistanceKm(data.distanceKm);
    } catch {}
    setCalculating(false);
  }

  async function handlePost() {
    if (!itemDescription.trim()) {
      Alert.alert("Missing Info", "Please describe the items.");
      return;
    }
    if (!preferredTime.trim()) {
      Alert.alert("Missing Info", "Please enter a preferred time.");
      return;
    }
    if (isFurniture && (!pickupAddress.trim() || !dropoffAddress.trim())) {
      Alert.alert("Missing Info", "Please enter pickup and drop-off addresses.");
      return;
    }
    if (!isFurniture && !homeAddress.trim()) {
      Alert.alert("Missing Info", "Please enter your home address.");
      return;
    }
    if (!agreedToOwnership) {
      Alert.alert("Confirmation Required", "Please confirm item ownership.");
      return;
    }

    setLoading(true);
    try {
      const { priceTotal, driverPayout, platformFee } = calculatePrice(jobType, distanceKm);
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobType,
          pickupAddress: isFurniture ? pickupAddress : null,
          dropoffAddress: isFurniture ? dropoffAddress : null,
          homeAddress: !isFurniture ? homeAddress : null,
          itemDescription: itemDescription.trim(),
          preferredTime,
          distanceKm,
          priceTotal,
          driverPayout,
          platformFee,
          city: user?.city,
          customerPhotos,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to post job");
      router.replace("/(customer)/my-jobs");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to post job.");
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
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons
            name={isFurniture ? "sofa" : "delete-sweep"}
            size={18}
            color={Colors.gold}
          />
          <Text style={styles.headerTitle}>Post a Job</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.jobTypeBadge}>
          <MaterialCommunityIcons
            name={isFurniture ? "sofa" : "delete-sweep"}
            size={20}
            color={Colors.gold}
          />
          <Text style={styles.jobTypeLabel}>
            {isFurniture ? "Furniture Transport" : "Junk & Trash Pickup"}
          </Text>
        </View>

        {isFurniture ? (
          <>
            <FormField label="Pickup Address" icon="map-pin">
              <TextInput
                style={styles.input}
                placeholder="Enter pickup address"
                placeholderTextColor={Colors.textMuted}
                value={pickupAddress}
                onChangeText={setPickupAddress}
                onBlur={estimateDistance}
              />
            </FormField>
            <FormField label="Drop-off Address" icon="flag">
              <TextInput
                style={styles.input}
                placeholder="Enter drop-off address"
                placeholderTextColor={Colors.textMuted}
                value={dropoffAddress}
                onChangeText={setDropoffAddress}
                onBlur={estimateDistance}
              />
            </FormField>
          </>
        ) : (
          <FormField label="Home Address" icon="home">
            <TextInput
              style={styles.input}
              placeholder="Enter your home address"
              placeholderTextColor={Colors.textMuted}
              value={homeAddress}
              onChangeText={setHomeAddress}
            />
          </FormField>
        )}

        <FormField label="Item Description" icon="package">
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Describe the items (e.g. 3-seater sofa, dining table, 4 chairs)"
            placeholderTextColor={Colors.textMuted}
            value={itemDescription}
            onChangeText={setItemDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </FormField>

        <View style={styles.photoSection}>
          <View style={styles.photoSectionHeader}>
            <Feather name="camera" size={13} color={Colors.textMuted} />
            <Text style={styles.photoSectionTitle}>Item Photos (Optional)</Text>
          </View>
          <Text style={styles.photoSectionHint}>
            Photos help drivers prepare the right equipment and improve your quote accuracy.
          </Text>
          <PhotoPicker
            photos={customerPhotos}
            onChange={setCustomerPhotos}
            maxPhotos={3}
            editable
          />
        </View>

        <FormField label="Preferred Time" icon="clock">
          <TextInput
            style={styles.input}
            placeholder="e.g. Tomorrow at 14:00, or Saturday morning"
            placeholderTextColor={Colors.textMuted}
            value={preferredTime}
            onChangeText={setPreferredTime}
          />
        </FormField>

        {calculating && (
          <View style={styles.calculatingRow}>
            <ActivityIndicator size="small" color={Colors.gold} />
            <Text style={styles.calculatingText}>Estimating distance...</Text>
          </View>
        )}

        <View style={styles.freeLaunchNote}>
          <Feather name="gift" size={14} color={Colors.success} />
          <Text style={styles.freeLaunchNoteText}>
            This service is completely free during our launch period — Helt gratis under lanseringen
          </Text>
        </View>

        <TouchableOpacity
          style={styles.ownershipRow}
          onPress={() => setAgreedToOwnership(!agreedToOwnership)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreedToOwnership && styles.checkboxActive]}>
            {agreedToOwnership && <Feather name="check" size={12} color={Colors.navy} />}
          </View>
          <Text style={styles.ownershipText}>
            I confirm these items are legally owned by me and are not prohibited items (weapons, illegal substances, stolen goods, hazardous materials, or live animals)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.postBtn, loading && styles.disabled]}
          onPress={handlePost}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.navy} />
          ) : (
            <>
              <Text style={styles.postBtnText}>Post Job — it's free!</Text>
              <Feather name="arrow-right" size={16} color={Colors.navy} />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

function FormField({ label, icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={styles.formField}>
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
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  jobTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.gold}18`,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  jobTypeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.gold },
  formField: { gap: 8 },
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
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  calculatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calculatingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  priceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  priceCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  priceValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  priceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 2,
  },
  priceTotalLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  priceTotalValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  ownershipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  ownershipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  photoSection: {
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  photoSectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  photoSectionHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 17,
  },
  postBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  postBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  disabled: { opacity: 0.7 },
  freeLaunchNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  freeLaunchNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
    lineHeight: 18,
  },
});
