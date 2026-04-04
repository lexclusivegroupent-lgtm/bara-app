import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, calculatePrice, formatSEK } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { PhotoPicker } from "@/components/PhotoPicker";
import { PlacesAutocomplete, type PlaceResult } from "@/components/PlacesAutocomplete";
import { BaraDateTimePicker } from "@/components/BaraDateTimePicker";

export default function PostJobScreen() {
  const { type } = useLocalSearchParams<{ type: "furniture_transport" | "bulky_delivery" | "junk_pickup" }>();
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const jobType = (type || "furniture_transport") as "furniture_transport" | "bulky_delivery" | "junk_pickup";
  const isFurniture = jobType === "furniture_transport" || jobType === "bulky_delivery";

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [extraStops, setExtraStops] = useState<string[]>([]);
  const [itemDescription, setItemDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState<Date | null>(null);
  const [distanceKm, setDistanceKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [agreedToOwnership, setAgreedToOwnership] = useState(false);
  const [customerPhotos, setCustomerPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customerPriceInput, setCustomerPriceInput] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);
  // Logistics details
  const [floorNumber, setFloorNumber] = useState("");
  const [hasElevator, setHasElevator] = useState<boolean | null>(null);
  const [helpersNeeded, setHelpersNeeded] = useState("");
  const [estimatedWeight, setEstimatedWeight] = useState("");
  // Promo code
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const pricing = calculatePrice(jobType, distanceKm);
  const suggestedPrice = pricing.priceTotal;
  const minPrice = Math.max(299, Math.round(suggestedPrice * 0.70));
  const maxPrice = Math.round(suggestedPrice * 1.30);

  // Haversine formula for direct distance between two lat/lng points
  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Auto-calculate distance whenever both sets of coordinates are available
  useEffect(() => {
    if (!isFurniture) return;
    if (pickupCoords && dropoffCoords) {
      const km = Math.max(1, Math.round(haversineKm(
        pickupCoords.lat, pickupCoords.lng,
        dropoffCoords.lat, dropoffCoords.lng
      ) * 10) / 10);
      setDistanceKm(km);
      setCustomerPriceInput("");
      setPriceError(null);
    }
  }, [pickupCoords, dropoffCoords, isFurniture]);

  async function estimateDistance() {
    // Only called as fallback when coordinates aren't available from autocomplete
    if (!pickupAddress || !dropoffAddress) return;
    if (pickupCoords && dropoffCoords) return; // already calculated via haversine
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
      if (data.distanceKm) {
        setDistanceKm(data.distanceKm);
        setCustomerPriceInput("");
        setPriceError(null);
      }
    } catch {}
    setCalculating(false);
  }

  // Fallback: when user types manually (no coords from Places), debounce a server geocode call
  useEffect(() => {
    if (!isFurniture) return;
    if (pickupCoords && dropoffCoords) return; // haversine effect handles this
    if (!pickupAddress.trim() || !dropoffAddress.trim()) return;

    const timer = setTimeout(() => {
      estimateDistance();
    }, 900);
    return () => clearTimeout(timer);
  }, [pickupAddress, dropoffAddress]);

  function handlePickupSelect(result: PlaceResult) {
    setPickupAddress(result.address);
    setPickupCoords(result.lat != null && result.lng != null ? { lat: result.lat, lng: result.lng } : null);
  }

  function handleDropoffSelect(result: PlaceResult) {
    setDropoffAddress(result.address);
    setDropoffCoords(result.lat != null && result.lng != null ? { lat: result.lat, lng: result.lng } : null);
  }

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoDiscount(null);
    try {
      const res = await fetch(`${BASE_URL}/api/promos/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setPromoError(t("promoInvalid")); return; }
      setPromoDiscount(data.discountAmount);
    } catch {
      setPromoError(t("promoInvalid"));
    } finally {
      setPromoLoading(false);
    }
  }

  async function handlePost() {
    if (!itemDescription.trim()) {
      setError(t("pleaseDescribeItems"));
      return;
    }
    if (!preferredTime) {
      setError(t("pleaseEnterTime"));
      return;
    }
    if (isFurniture && (!pickupAddress.trim() || !dropoffAddress.trim())) {
      setError(t("pleaseEnterAddresses"));
      return;
    }
    if (!isFurniture && !homeAddress.trim()) {
      setError(t("pleaseEnterHome"));
      return;
    }
    if (!agreedToOwnership) {
      setError(t("pleaseConfirmOwnership"));
      return;
    }

    setPriceError(null);
    const cpRaw = customerPriceInput.trim();
    let resolvedCustomerPrice: number | null = null;
    if (cpRaw) {
      const cp = parseInt(cpRaw, 10);
      if (isNaN(cp) || cp < minPrice || cp > maxPrice) {
        setPriceError(`Enter a price between ${minPrice} and ${maxPrice} kr`);
        return;
      }
      resolvedCustomerPrice = cp;
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
          extraStops: extraStops.filter(Boolean),
          itemDescription: itemDescription.trim(),
          preferredTime: preferredTime ? preferredTime.toISOString() : null,
          distanceKm,
          priceTotal,
          driverPayout,
          platformFee,
          customerPrice: resolvedCustomerPrice,
          city: user?.city,
          customerPhotos,
          floorNumber: floorNumber ? parseInt(floorNumber, 10) : null,
          hasElevator: hasElevator,
          helpersNeeded: helpersNeeded ? parseInt(helpersNeeded, 10) : 0,
          estimatedWeightKg: estimatedWeight ? parseFloat(estimatedWeight) : null,
          promoCode: promoCode.trim() || null,
          discountAmount: promoDiscount,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to post job");
      router.replace("/(customer)/my-jobs");
    } catch (e: any) {
      setError(e.message || "Failed to post job. Please try again.");
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
          <Text style={styles.headerTitle}>{t("postAJob")}</Text>
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
            {isFurniture ? t("furnitureTransport") : t("junkTrashPickup")}
          </Text>
        </View>

        {isFurniture ? (
          <>
            <FormField label={t("pickupAddress")} icon="map-pin">
              <PlacesAutocomplete
                value={pickupAddress}
                onSelect={handlePickupSelect}
                placeholder={t("searchPickup")}
                token={token}
              />
            </FormField>
            <FormField label={t("dropoffAddress")} icon="flag">
              <PlacesAutocomplete
                value={dropoffAddress}
                onSelect={handleDropoffSelect}
                placeholder={t("searchDropoff")}
                token={token}
              />
            </FormField>

            {/* Extra stops */}
            <FormField label={t("extraStops")} icon="git-branch">
              <View style={{ gap: 8 }}>
                {extraStops.map((stop, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={`${t("stop")} ${i + 1}`}
                      placeholderTextColor={Colors.textMuted}
                      value={stop}
                      onChangeText={(v) => {
                        const updated = [...extraStops];
                        updated[i] = v;
                        setExtraStops(updated);
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setExtraStops(extraStops.filter((_, j) => j !== i))}
                      style={{ padding: 8 }}
                    >
                      <Feather name="x" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                {extraStops.length < 3 && (
                  <TouchableOpacity
                    onPress={() => setExtraStops([...extraStops, ""])}
                    style={styles.addStopBtn}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={14} color={Colors.gold} />
                    <Text style={styles.addStopText}>{t("addStop")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </FormField>
          </>
        ) : (
          <FormField label={t("homeAddress")} icon="home">
            <PlacesAutocomplete
              value={homeAddress}
              onSelect={(r) => setHomeAddress(r.address)}
              placeholder={t("searchHome")}
              token={token}
            />
          </FormField>
        )}

        <FormField label={t("itemDescription")} icon="package">
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder={t("itemDescriptionPlaceholder")}
            placeholderTextColor={Colors.textMuted}
            value={itemDescription}
            onChangeText={setItemDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </FormField>

        {/* Logistics details */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionBlockHeader}>
            <Feather name="layers" size={14} color={Colors.gold} />
            <Text style={styles.sectionBlockTitle}>{t("logisticsDetails")}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.miniLabel}>{t("floorNumber")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("floorPlaceholder")}
                placeholderTextColor={Colors.textMuted}
                value={floorNumber}
                onChangeText={setFloorNumber}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.miniLabel}>{t("helpersNeeded")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("helpersPlaceholder")}
                placeholderTextColor={Colors.textMuted}
                value={helpersNeeded}
                onChangeText={setHelpersNeeded}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={{ gap: 6, marginTop: 8 }}>
            <Text style={styles.miniLabel}>{t("estimatedWeight")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("weightPlaceholder")}
              placeholderTextColor={Colors.textMuted}
              value={estimatedWeight}
              onChangeText={setEstimatedWeight}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ marginTop: 8, gap: 6 }}>
            <Text style={styles.miniLabel}>{t("elevatorAvailable")}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {([true, false] as const).map((v) => (
                <TouchableOpacity
                  key={String(v)}
                  style={[styles.boolBtn, hasElevator === v && styles.boolBtnActive]}
                  onPress={() => setHasElevator(hasElevator === v ? null : v)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.boolBtnText, hasElevator === v && styles.boolBtnTextActive]}>
                    {v ? t("yes") : t("no")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.prohibitedCard}>
          <View style={styles.prohibitedHeader}>
            <Feather name="alert-triangle" size={14} color={Colors.gold} />
            <Text style={styles.prohibitedTitle}>{t("prohibitedItems")}</Text>
          </View>
          <Text style={styles.prohibitedText}>{t("prohibitedList")}</Text>
          <Text style={styles.prohibitedSubtext}>{t("prohibitedNote")}</Text>
        </View>

        <View style={styles.photoSection}>
          <View style={styles.photoSectionHeader}>
            <Feather name="camera" size={13} color={Colors.textMuted} />
            <Text style={styles.photoSectionTitle}>{t("itemPhotos")}</Text>
          </View>
          <Text style={styles.photoSectionHint}>{t("photosHint")}</Text>
          <PhotoPicker
            photos={customerPhotos}
            onChange={setCustomerPhotos}
            maxPhotos={3}
            editable
          />
        </View>

        <FormField label={t("preferredTime")} icon="clock">
          <BaraDateTimePicker
            value={preferredTime}
            onChange={setPreferredTime}
            minimumDate={new Date(Date.now() + 2 * 60 * 60 * 1000)}
            placeholder={t("selectDateTimePlaceholder")}
          />
        </FormField>

        {calculating && (
          <View style={styles.calculatingRow}>
            <ActivityIndicator size="small" color={Colors.gold} />
            <Text style={styles.calculatingText}>{t("estimatingDistance")}</Text>
          </View>
        )}

        {/* Promo code */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionBlockHeader}>
            <Feather name="tag" size={14} color={Colors.gold} />
            <Text style={styles.sectionBlockTitle}>{t("promoCode")}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t("promoPlaceholder")}
              placeholderTextColor={Colors.textMuted}
              value={promoCode}
              onChangeText={(v) => { setPromoCode(v.toUpperCase()); setPromoDiscount(null); setPromoError(null); }}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.applyBtn, promoLoading && styles.disabled]}
              onPress={applyPromo}
              disabled={promoLoading || !promoCode.trim()}
              activeOpacity={0.8}
            >
              {promoLoading ? (
                <ActivityIndicator size="small" color={Colors.navy} />
              ) : (
                <Text style={styles.applyBtnText}>{t("applyCode")}</Text>
              )}
            </TouchableOpacity>
          </View>
          {promoDiscount != null && (
            <View style={styles.promoSuccessRow}>
              <Feather name="check-circle" size={13} color={Colors.success} />
              <Text style={styles.promoSuccessText}>{t("promoApplied")} −{formatSEK(promoDiscount)}</Text>
            </View>
          )}
          {promoError && (
            <Text style={styles.promoErrorText}>{promoError}</Text>
          )}
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceCardTitle}>{t("yourOfferToDriver")}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("suggestedPrice")}</Text>
            <Text style={styles.priceValue}>{formatSEK(suggestedPrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("allowedRange")}</Text>
            <Text style={styles.priceValue}>{formatSEK(minPrice)} – {formatSEK(maxPrice)}</Text>
          </View>
          <View style={styles.priceInputRow}>
            <View style={[styles.priceInputWrap, priceError ? styles.priceInputError : null]}>
              <TextInput
                style={styles.priceInput}
                placeholder={suggestedPrice.toString()}
                placeholderTextColor={Colors.textMuted}
                value={customerPriceInput}
                onChangeText={(v) => {
                  setCustomerPriceInput(v.replace(/[^0-9]/g, ""));
                  setPriceError(null);
                }}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <Text style={styles.priceUnit}>kr</Text>
            </View>
          </View>
          {priceError && (
            <Text style={styles.priceErrorText}>{priceError}</Text>
          )}
          <Text style={styles.priceHint}>
            {t("leaveBlankPrice")}
          </Text>
        </View>

        <View style={styles.freeLaunchNote}>
          <Feather name="gift" size={14} color={Colors.success} />
          <Text style={styles.freeLaunchNoteText}>
            {t("freeLaunchNote")}
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
            {t("ownershipConfirm")}
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
              <Text style={styles.postBtnText}>{t("postJobBtn")}</Text>
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
  prohibitedCard: {
    backgroundColor: `${Colors.gold}10`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
    gap: 6,
  },
  prohibitedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  prohibitedTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prohibitedText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    lineHeight: 20,
  },
  prohibitedSubtext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 17,
  },
  priceInputRow: {
    marginTop: 4,
  },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  priceInputError: {
    borderColor: "#E05252",
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  priceUnit: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  priceErrorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#E05252",
  },
  priceHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 16,
  },
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
  sectionBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  sectionBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sectionBlockTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  miniLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  boolBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  boolBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}18`,
  },
  boolBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  boolBtnTextActive: {
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
  },
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addStopText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },
  applyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    height: 48,
  },
  applyBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  promoSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  promoSuccessText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
  },
  promoErrorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
  },
});
