import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, formatSEK, formatDate, getStatusColor, getStatusLabel, CANCELLATION_FEE } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { Job } from "@/components/JobCard";
import { PhotoPicker } from "@/components/PhotoPicker";
import { BaraDateTimePicker } from "@/components/BaraDateTimePicker";
import { VehicleBadge } from "@/components/VehicleTypePicker";

const STEP_KEYS = [
  { key: "pending", tKey: "stepJobPosted", icon: "clipboard-check" },
  { key: "accepted", tKey: "stepDriverAssigned", icon: "account-check" },
  { key: "arrived", tKey: "stepDriverArrived", icon: "map-marker-check" },
  { key: "in_progress", tKey: "stepEnRoute", icon: "truck-fast" },
  { key: "completed", tKey: "stepCompleted", icon: "check-circle" },
] as const;

function getStepIndex(status: string) {
  const map: Record<string, number> = { pending: 0, accepted: 1, arrived: 2, in_progress: 3, completed: 4 };
  return map[status] ?? 0;
}

export default function JobStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelFeeModal, setShowCancelFeeModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<Date | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return safeJson(res);
    },
    enabled: !!token && !!id,
    refetchInterval: 15000,
  });

  if (isLoading || !job) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.navy }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
      </View>
    );
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return;
    setDisputing(true);
    setDisputeError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Could not flag dispute");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      setShowDisputeModal(false);
      setDisputeReason("");
    } catch (e: any) {
      setDisputeError(e.message || "Could not submit dispute. Please try again.");
    } finally {
      setDisputing(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Could not cancel job");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      router.replace("/(customer)/home");
    } catch (e: any) {
      setCancelError(e.message || "Could not cancel job. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleReschedule(newTime: Date) {
    setRescheduling(true);
    setRescheduleError(null);
    setRescheduleSuccess(false);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${id}/reschedule`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ preferredTime: newTime.toISOString() }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Could not reschedule");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      setRescheduleTime(newTime);
      setRescheduleSuccess(true);
      setTimeout(() => setRescheduleSuccess(false), 3000);
    } catch (e: any) {
      setRescheduleError(e.message || "Could not reschedule. Please try again.");
    } finally {
      setRescheduling(false);
    }
  }

  const currentStep = getStepIndex(job.status);
  const isFurniture = job.jobType === "furniture_transport";

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("jobStatus")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusTracker}>
          {STEP_KEYS.map((step, idx) => {
            const isComplete = idx < currentStep;
            const isActive = idx === currentStep;
            const isPast = idx <= currentStep;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={[
                    styles.stepDot,
                    isComplete && styles.stepDotComplete,
                    isActive && styles.stepDotActive,
                  ]}>
                    {isComplete ? (
                      <Feather name="check" size={12} color={Colors.navy} />
                    ) : (
                      <MaterialCommunityIcons
                        name={step.icon as any}
                        size={14}
                        color={isActive ? Colors.navy : Colors.textMuted}
                      />
                    )}
                  </View>
                  {idx < STEP_KEYS.length - 1 && (
                    <View style={[styles.stepLine, isPast && idx < currentStep && styles.stepLineActive]} />
                  )}
                </View>
                <Text style={[styles.stepLabel, isPast && styles.stepLabelActive, isActive && styles.stepLabelCurrent]}>
                  {t(step.tKey)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.detailCard}>
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

        <View style={styles.freeLaunchCard}>
          <Feather name="gift" size={14} color={Colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.freeLaunchText}>{t("freeDuringLaunch")}</Text>
            <Text style={styles.freeLaunchSubtext}>{t("noFeesLaunch")}</Text>
          </View>
        </View>

        {job.driver && (
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>{t("yourDriver")}</Text>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Feather name="user" size={22} color={Colors.gold} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{job.driver.fullName}</Text>
                {job.driver.vehicleType && (
                  <VehicleBadge vehicleType={job.driver.vehicleType} lang={lang} />
                )}
                {job.driver.rating && (
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={12} color={Colors.gold} />
                    <Text style={styles.ratingText}>{Number(job.driver.rating).toFixed(1)}</Text>
                  </View>
                )}
                {job.driver.vehicleDescription && (
                  <Text style={styles.vehicleText}>{job.driver.vehicleDescription}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {((job.photosCustomer && job.photosCustomer.length > 0) ||
          (job.photosPickup && job.photosPickup.length > 0) ||
          (job.photosDropoff && job.photosDropoff.length > 0)) && (
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>{t("jobPhotos")}</Text>
            {job.photosCustomer && job.photosCustomer.length > 0 && (
              <View style={styles.photoGroup}>
                <Text style={styles.photoGroupLabel}>{t("yourPhotos")}</Text>
                <PhotoPicker photos={job.photosCustomer} editable={false} />
              </View>
            )}
            {job.photosPickup && job.photosPickup.length > 0 && (
              <View style={styles.photoGroup}>
                <Text style={styles.photoGroupLabel}>{t("photosBefore")}</Text>
                <PhotoPicker photos={job.photosPickup} editable={false} />
              </View>
            )}
            {job.photosDropoff && job.photosDropoff.length > 0 && (
              <View style={styles.photoGroup}>
                <Text style={styles.photoGroupLabel}>{t("photosAfter")}</Text>
                <PhotoPicker photos={job.photosDropoff} editable={false} />
              </View>
            )}
          </View>
        )}

        {job.status === "completed" && !job.rating && (
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => router.push({ pathname: "/(customer)/rate", params: { jobId: job.id, userId: job.driverId } })}
            activeOpacity={0.85}
          >
            <Feather name="star" size={16} color={Colors.navy} />
            <Text style={styles.rateBtnText}>{t("rateYourDriver")}</Text>
          </TouchableOpacity>
        )}

        {job.status === "completed" && job.rating && (
          <View style={styles.ratedCard}>
            <Feather name="check-circle" size={16} color={Colors.success} />
            <Text style={styles.ratedText}>{job.rating} ★</Text>
          </View>
        )}

        {(job.status === "pending" || job.status === "accepted") && (
          <View style={styles.rescheduleCard}>
            <View style={styles.rescheduleTitleRow}>
              <Feather name="calendar" size={15} color={Colors.gold} />
              <Text style={styles.rescheduleTitle}>{t("rescheduleJob")}</Text>
            </View>
            {rescheduling ? (
              <View style={styles.reschedulingRow}>
                <ActivityIndicator size="small" color={Colors.gold} />
                <Text style={styles.reschedulingText}>{t("rescheduling")}</Text>
              </View>
            ) : (
              <BaraDateTimePicker
                value={rescheduleTime || (job.preferredTime ? new Date(job.preferredTime) : null)}
                onChange={handleReschedule}
                minimumDate={new Date(Date.now() + 60 * 60 * 1000)}
                placeholder={t("selectDateTimePlaceholder")}
              />
            )}
            {rescheduleSuccess && (
              <View style={styles.rescheduleSuccess}>
                <Feather name="check-circle" size={14} color={Colors.success} />
                <Text style={styles.rescheduleSuccessText}>{t("rescheduledMsg")}</Text>
              </View>
            )}
            {rescheduleError && (
              <TouchableOpacity style={styles.cancelError} onPress={() => setRescheduleError(null)} activeOpacity={0.8}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.cancelErrorText}>{rescheduleError}</Text>
                <Feather name="x" size={14} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {job.status === "pending" && (
          <>
            {cancelError && (
              <TouchableOpacity style={styles.cancelError} onPress={() => setCancelError(null)} activeOpacity={0.8}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.cancelErrorText}>{cancelError}</Text>
                <Feather name="x" size={14} color={Colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.85}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Feather name="x-circle" size={16} color={Colors.error} />
                  <Text style={styles.cancelBtnText}>{t("cancelJobFree")}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {(job.status === "accepted" || job.status === "arrived" || job.status === "in_progress") && (
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push({ pathname: "/chat", params: { jobId: String(job.id) } })}
            activeOpacity={0.85}
          >
            <Feather name="message-circle" size={16} color={Colors.gold} />
            <Text style={styles.chatBtnText}>{t("chatWithDriver")}</Text>
          </TouchableOpacity>
        )}

        {(job.status === "accepted" || job.status === "arrived" || job.status === "in_progress") && (
          <>
            {cancelError && (
              <TouchableOpacity style={styles.cancelError} onPress={() => setCancelError(null)} activeOpacity={0.8}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.cancelErrorText}>{cancelError}</Text>
                <Feather name="x" size={14} color={Colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelWithFeeBtn}
              onPress={() => setShowCancelFeeModal(true)}
              activeOpacity={0.85}
            >
              <Feather name="x-circle" size={15} color={Colors.error} />
              <Text style={styles.cancelWithFeeBtnText}>{t("cancelJob")}</Text>
              <View style={styles.feePill}>
                <Text style={styles.feePillText}>{CANCELLATION_FEE} kr</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {job.status === "cancelled_by_customer" && (
          <View style={styles.cancelledWithFeeCard}>
            <View style={styles.cancelledWithFeeHeader}>
              <Feather name="x-circle" size={16} color={Colors.error} />
              <Text style={styles.cancelledWithFeeTitle}>{t("jobCancelled")}</Text>
            </View>
            <Text style={styles.cancelledWithFeeText}>
              {t("cancelledAfterAccepted")}{" "}
              <Text style={{ fontFamily: "Inter_700Bold" }}>{formatSEK(job.cancellationFee ?? CANCELLATION_FEE)}</Text>{" "}
              {t("cancellationFeeApplies")}
            </Text>
          </View>
        )}

        {job.disputed ? (
          <View style={styles.disputedCard}>
            <Feather name="alert-triangle" size={14} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.disputedTitle}>{t("disputeReported")}</Text>
              {job.disputeReason && (
                <Text style={styles.disputedReason}>"{job.disputeReason}"</Text>
              )}
              <Text style={styles.disputedSubtext}>{t("disputeReview")}</Text>
            </View>
          </View>
        ) : (job.status !== "pending" && job.status !== "cancelled") && (
          <TouchableOpacity
            style={styles.disputeBtn}
            onPress={() => setShowDisputeModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="flag" size={14} color={Colors.textMuted} />
            <Text style={styles.disputeBtnText}>{t("reportIssue")}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>

      <Modal visible={showCancelFeeModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.feeModalIcon}>
              <Feather name="alert-triangle" size={28} color={Colors.error} />
            </View>
            <Text style={styles.feeModalTitle}>{t("cancellationFeeTitle")}</Text>
            <Text style={styles.feeModalBody}>
              {t("cancelledAfterAccepted")}{" "}
              <Text style={styles.feeModalAmount}>{formatSEK(CANCELLATION_FEE)}</Text>
            </Text>
            <View style={styles.feeBreakdown}>
              <View style={styles.feeBreakdownRow}>
                <Text style={styles.feeBreakdownLabel}>{t("cancellationFeeRow")}</Text>
                <Text style={styles.feeBreakdownValue}>{formatSEK(CANCELLATION_FEE)}</Text>
              </View>
              <View style={styles.feeBreakdownRow}>
                <Text style={styles.feeBreakdownLabel}>{t("driverReceives")}</Text>
                <Text style={[styles.feeBreakdownValue, { color: Colors.success }]}>{formatSEK(CANCELLATION_FEE)}</Text>
              </View>
            </View>
            <Text style={styles.feeModalHint}>{t("youWontBeCharged")}</Text>
            <View style={styles.feeModalActions}>
              <TouchableOpacity
                style={styles.feeModalKeepBtn}
                onPress={() => setShowCancelFeeModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.feeModalKeepText}>{t("keepJob")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feeModalConfirmBtn, cancelling && styles.cancelBtnDisabled]}
                onPress={() => { setShowCancelFeeModal(false); handleCancel(); }}
                disabled={cancelling}
                activeOpacity={0.85}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.feeModalConfirmText}>{t("cancelAndPay")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDisputeModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("reportIssue")}</Text>
              <TouchableOpacity onPress={() => { setShowDisputeModal(false); setDisputeError(null); }} style={styles.modalClose}>
                <Feather name="x" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t("disputeReview")}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("messagePlaceholder")}
              placeholderTextColor={Colors.textMuted}
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {disputeError && (
              <View style={styles.disputeError}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.disputeErrorText}>{disputeError}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.submitDisputeBtn, (!disputeReason.trim() || disputing) && styles.disabled]}
              onPress={handleDispute}
              disabled={!disputeReason.trim() || disputing}
              activeOpacity={0.85}
            >
              {disputing
                ? <ActivityIndicator color={Colors.navy} />
                : <Text style={styles.submitDisputeBtnText}>{t("sendMessage")}</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Feather name={icon} size={13} color={Colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textMuted },
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
  content: { padding: 20, gap: 16 },
  statusTracker: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepLeft: {
    alignItems: "center",
    width: 32,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotComplete: {
    backgroundColor: Colors.gold,
  },
  stepDotActive: {
    backgroundColor: Colors.gold,
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  stepLineActive: {
    backgroundColor: Colors.gold,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    paddingTop: 8,
  },
  stepLabelActive: {
    color: Colors.text,
  },
  stepLabelCurrent: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailIconWrap: {
    width: 24,
    alignItems: "center",
    paddingTop: 2,
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
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${Colors.gold}20`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
  },
  driverDetails: { flex: 1, gap: 3 },
  driverName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.gold },
  vehicleText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  rateBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rateBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  ratedCard: {
    backgroundColor: `${Colors.success}18`,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  ratedText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.success },
  chatBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chatBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: `${Colors.error}60`,
    backgroundColor: `${Colors.error}12`,
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  cancelLocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelLockedText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  cancelWithFeeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: `${Colors.error}60`,
    backgroundColor: `${Colors.error}10`,
  },
  cancelWithFeeBtnText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  feePill: {
    backgroundColor: `${Colors.error}22`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
  },
  feePillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  cancelledWithFeeCard: {
    backgroundColor: `${Colors.error}10`,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  cancelledWithFeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelledWithFeeTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  cancelledWithFeeText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 20,
  },
  feeModalIcon: {
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.error}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  feeModalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  feeModalBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 22,
    textAlign: "center",
  },
  feeModalAmount: {
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  feeBreakdown: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feeBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeBreakdownLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  feeBreakdownValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  feeModalHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
    fontStyle: "italic",
  },
  feeModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  feeModalKeepBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feeModalKeepText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  feeModalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error,
  },
  feeModalConfirmText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  freeLaunchCard: {
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
  freeLaunchText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  freeLaunchSubtext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: `${Colors.success}CC`,
    fontStyle: "italic",
    marginTop: 2,
  },
  photoGroup: { gap: 6 },
  photoGroupLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  rescheduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  rescheduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rescheduleTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
    letterSpacing: 0.3,
  },
  reschedulingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  reschedulingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  rescheduleSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.success}18`,
    borderWidth: 1,
    borderColor: `${Colors.success}40`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rescheduleSuccessText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
  },
  cancelError: {
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
  cancelErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  disputeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  disputeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  disputedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
  },
  disputedTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  disputedReason: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  disputedSubtext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  modalClose: { padding: 4 },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 20,
    marginTop: -8,
  },
  modalInput: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    minHeight: 100,
  },
  disputeError: {
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
  disputeErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  submitDisputeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitDisputeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  disabled: { opacity: 0.5 },
});
