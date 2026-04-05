import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, formatSEK, formatDate, CANCELLATION_FEE } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { Job } from "@/components/JobCard";
import { BottomNav } from "@/components/BottomNav";
import { PhotoPicker } from "@/components/PhotoPicker";

export default function DriverActiveJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [pickupPhotos, setPickupPhotos] = useState<string[]>([]);
  const [dropoffPhotos, setDropoffPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["activeJob", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return safeJson(res);
    },
    enabled: !!token && !!id,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (job?.photosPickup?.length && !pickupPhotos.length) {
      setPickupPhotos(job.photosPickup);
    }
    if (job?.photosDropoff?.length && !dropoffPhotos.length) {
      setDropoffPhotos(job.photosDropoff);
    }
  }, [job?.id]);

  async function handleCancelJob() {
    if (!job) return;
    setCancelling(true);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${job.id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      router.replace("/(driver)/map");
    } catch (e: any) {
      setCompleteError(e.message || "Failed to cancel. Please try again.");
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }

  function handleNavigate() {
    if (!job) return;
    const address = job.pickupAddress || job.homeAddress;
    if (!address) return;
    const encoded = encodeURIComponent(`${address}, ${job.city}, Sweden`);
    const url = Platform.OS === "ios"
      ? `maps://?q=${encoded}`
      : `geo:0,0?q=${encoded}`;
    Linking.canOpenURL(url).then((supported) => {
      Linking.openURL(supported ? url : `https://maps.google.com/?q=${encoded}`);
    });
  }

  async function handleComplete() {
    if (!job) return;
    setCompleteError(null);

    if (pickupPhotos.length === 0) {
      setCompleteError(t("atLeastOnePickup"));
      return;
    }
    if (dropoffPhotos.length === 0) {
      setCompleteError(t("atLeastOneDropoff"));
      return;
    }

    setCompleting(true);
    try {
      setUploadingPhotos(true);
      const uploadRes = await fetch(`${BASE_URL}/api/jobs/${job.id}/photos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pickupPhotos, dropoffPhotos }),
      });
      if (!uploadRes.ok) {
        const err = await safeJson(uploadRes);
        throw new Error(err.error || "Failed to upload photos");
      }
      setUploadingPhotos(false);

      const completeRes = await fetch(`${BASE_URL}/api/jobs/${job.id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!completeRes.ok) {
        const err = await safeJson(completeRes);
        throw new Error(err.error || "Failed to complete job");
      }
      router.replace({
        pathname: "/(driver)/job-complete",
        params: { jobId: job.id, userId: job.customerId },
      });
    } catch (e: any) {
      setCompleteError(e.message || "Failed to complete job. Please try again.");
    } finally {
      setCompleting(false);
      setUploadingPhotos(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.navy }]}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.gold} />
          <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.navy }]}>
        <View style={styles.loadingState}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{t("noActiveJobFound")}</Text>
          <Text style={styles.emptySubtext}>{t("goToMap")}</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  if (job.status === "cancelled_by_customer") {
    const fee = job.cancellationFee ?? CANCELLATION_FEE;
    return (
      <View style={[styles.container, { backgroundColor: Colors.navy }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
          <Text style={styles.headerTitle}>{t("jobCancelled")}</Text>
        </View>
        <View style={styles.loadingState}>
          <View style={styles.cancelledIcon}>
            <Feather name="x-circle" size={36} color={Colors.error} />
          </View>
          <Text style={styles.cancelledTitle}>{t("customerCancelled")}</Text>
          <Text style={styles.cancelledSubtext}>
            {t("customerCancelledMsg")}
          </Text>
          <View style={styles.compensationCard}>
            <View style={styles.compensationCardHeader}>
              <Feather name="shield" size={16} color={Colors.success} />
              <Text style={styles.compensationCardTitle}>{t("youreProtected")}</Text>
            </View>
            <Text style={styles.compensationCardBody}>
              {t("yourCompensation")}{": "}
              <Text style={{ fontFamily: "Inter_700Bold", color: Colors.gold }}>{formatSEK(fee)}</Text>
            </Text>
            <View style={styles.compensationRow}>
              <Text style={styles.compensationLabel}>{t("yourCompensation")}</Text>
              <Text style={styles.compensationAmount}>{formatSEK(fee)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.backToMapBtn}
            onPress={() => router.replace("/(driver)/map")}
            activeOpacity={0.85}
          >
            <Feather name="map" size={15} color={Colors.navy} />
            <Text style={styles.backToMapText}>{t("findAnotherJob")}</Text>
          </TouchableOpacity>
        </View>
        <BottomNav />
      </View>
    );
  }

  const isFurniture = job.jobType === "furniture_transport";
  const canComplete = pickupPhotos.length > 0 && dropoffPhotos.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <Text style={styles.headerTitle}>{t("activeJob")}</Text>
        <View style={styles.jobTypeBadge}>
          <MaterialCommunityIcons
            name={isFurniture ? "sofa" : "delete-sweep"}
            size={14}
            color={Colors.gold}
          />
          <Text style={styles.jobTypeBadgeText}>
            {isFurniture ? t("furnitureTransport") : t("junkTrash")}
          </Text>
        </View>
      </View>

      <View style={styles.mapPlaceholder}>
        <MaterialCommunityIcons name="map-marker-path" size={28} color={Colors.textMuted} />
        <Text style={styles.mapText}>{t("routeToPickup")}</Text>
        <TouchableOpacity style={styles.navigationBtn} activeOpacity={0.85} onPress={handleNavigate}>
          <Feather name="navigation" size={14} color={Colors.navy} />
          <Text style={styles.navigationBtnText}>{t("navigateTo")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("customer")}</Text>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Feather name="user" size={18} color={Colors.gold} />
            </View>
            <Text style={styles.customerName}>{job.customer?.fullName || t("customer")}</Text>
          </View>
          {job.photosCustomer && job.photosCustomer.length > 0 && (
            <View style={styles.customerPhotosRow}>
              <Feather name="image" size={12} color={Colors.textMuted} />
              <Text style={styles.customerPhotosLabel}>{t("customerPhotosAttached")}</Text>
            </View>
          )}
          {job.photosCustomer && job.photosCustomer.length > 0 && (
            <PhotoPicker
              photos={job.photosCustomer}
              editable={false}
              label={t("customerPhotos")}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("jobDetails")}</Text>
          {isFurniture ? (
            <>
              <DetailRow icon="map-pin" label={t("pickup")} value={job.pickupAddress || "N/A"} />
              <DetailRow icon="flag" label={t("dropoff")} value={job.dropoffAddress || "N/A"} />
            </>
          ) : (
            <DetailRow icon="home" label={t("address")} value={job.homeAddress || "N/A"} />
          )}
          <DetailRow icon="package" label={t("items")} value={job.itemDescription} />
          <DetailRow icon="clock" label={t("time")} value={formatDate(job.preferredTime)} />
        </View>

        <View style={styles.card}>
          <View style={styles.photoSectionHeader}>
            <Feather name="camera" size={14} color={Colors.gold} />
            <Text style={styles.cardTitle}>{t("beforeLoading")}</Text>
          </View>
          <Text style={styles.photoHint}>{t("photoHintBefore")}</Text>
          <PhotoPicker
            photos={pickupPhotos}
            onChange={setPickupPhotos}
            maxPhotos={3}
            editable
          />
          {pickupPhotos.length === 0 && (
            <View style={styles.photoRequired}>
              <Feather name="alert-circle" size={12} color={Colors.orange} />
              <Text style={styles.photoRequiredText}>{t("requiredPhoto")}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.photoSectionHeader}>
            <Feather name="camera" size={14} color={Colors.gold} />
            <Text style={styles.cardTitle}>{t("afterDelivery")}</Text>
          </View>
          <Text style={styles.photoHint}>{t("photoHintAfter")}</Text>
          <PhotoPicker
            photos={dropoffPhotos}
            onChange={setDropoffPhotos}
            maxPhotos={3}
            editable
          />
          {dropoffPhotos.length === 0 && (
            <View style={styles.photoRequired}>
              <Feather name="alert-circle" size={12} color={Colors.orange} />
              <Text style={styles.photoRequiredText}>{t("requiredPhoto")}</Text>
            </View>
          )}
        </View>

        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <View>
              <Text style={styles.earningsLabel}>{t("jobValue")}</Text>
              <Text style={styles.earningsTotal}>{formatSEK(job.priceTotal)}</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsRight}>
              <Text style={styles.earningsLabel}>{t("yourEarnings")}</Text>
              <Text style={styles.earningsAmount}>{formatSEK(job.driverPayout)}</Text>
            </View>
          </View>
        </View>

        {completeError && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => setCompleteError(null)}
            activeOpacity={0.8}
          >
            <Feather name="alert-circle" size={14} color={Colors.error} />
            <Text style={styles.errorText}>{completeError}</Text>
            <Feather name="x" size={14} color={Colors.error} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.completeBtn, (!canComplete || completing) && styles.disabled]}
          onPress={handleComplete}
          disabled={!canComplete || completing}
          activeOpacity={0.85}
        >
          {completing ? (
            <View style={styles.completingRow}>
              <ActivityIndicator color={Colors.navy} />
              <Text style={styles.completeBtnText}>
                {uploadingPhotos ? t("uploadingPhotos") : t("completing")}
              </Text>
            </View>
          ) : (
            <>
              <Feather name="check-circle" size={18} color={canComplete ? Colors.navy : Colors.textMuted} />
              <Text style={[styles.completeBtnText, !canComplete && styles.completeBtnTextDisabled]}>
                {t("completeJob")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!canComplete && (
          <Text style={styles.completeHint}>{t("addPhotosHint")}</Text>
        )}

        {/* Chat with customer */}
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push({ pathname: "/chat", params: { jobId: String(job.id) } })}
          activeOpacity={0.85}
        >
          <Feather name="message-circle" size={16} color={Colors.gold} />
          <Text style={styles.chatBtnText}>{t("chat")}</Text>
        </TouchableOpacity>

        {/* Driver cancel */}
        {!showCancelConfirm ? (
          <TouchableOpacity
            style={styles.cancelJobBtn}
            onPress={() => setShowCancelConfirm(true)}
            activeOpacity={0.85}
          >
            <Feather name="x-circle" size={15} color={Colors.error} />
            <Text style={styles.cancelJobBtnText}>{t("cancelJob")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.cancelConfirmCard}>
            <Feather name="alert-triangle" size={18} color={Colors.error} />
            <Text style={styles.cancelConfirmText}>{t("cancelJobConfirm")}</Text>
            <View style={styles.cancelConfirmBtns}>
              <TouchableOpacity style={styles.cancelConfirmNo} onPress={() => setShowCancelConfirm(false)}>
                <Text style={styles.cancelConfirmNoText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelConfirmYes, cancelling && styles.disabled]}
                onPress={handleCancelJob}
                disabled={cancelling}
                activeOpacity={0.85}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Text style={styles.cancelConfirmYesText}>{t("cancelJob")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 16 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon} size={13} color={Colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  jobTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.gold}18`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  jobTypeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.gold },
  mapPlaceholder: {
    height: 120,
    backgroundColor: Colors.surfaceDark,
    margin: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  navigationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  navigationBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  content: { paddingHorizontal: 16, gap: 14 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  photoSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  photoHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: -4,
  },
  photoRequired: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: -4,
  },
  photoRequiredText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.orange,
  },
  customerPhotosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: -4,
  },
  customerPhotosLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  customerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginTop: 2,
  },
  earningsCard: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  earningsLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, letterSpacing: 0.5 },
  earningsTotal: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 3 },
  earningsDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },
  earningsRight: { flex: 1 },
  earningsAmount: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.gold, marginTop: 3 },
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
  completeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  completeBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  completeBtnTextDisabled: { color: `${Colors.navy}80` },
  disabled: { opacity: 0.6 },
  completeHint: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: -8,
  },
  cancelledIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.error}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelledTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  cancelledSubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  compensationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: `${Colors.success}40`,
    width: "100%",
  },
  compensationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compensationCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  compensationCardBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 20,
  },
  compensationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 2,
  },
  compensationLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  compensationAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  backToMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  backToMapText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    marginTop: 4,
  },
  chatBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  cancelJobBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    marginTop: 4,
  },
  cancelJobBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  cancelConfirmCard: {
    backgroundColor: `${Colors.error}12`,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
    gap: 12,
    alignItems: "center",
    marginTop: 8,
  },
  cancelConfirmText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 20,
  },
  cancelConfirmBtns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelConfirmNo: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelConfirmNoText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  cancelConfirmYes: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: Colors.error,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelConfirmYesText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  disabled: { opacity: 0.7 },
});
