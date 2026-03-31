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
import { Colors } from "@/constants/colors";
import { BASE_URL, formatSEK, formatDate, getStatusColor, getStatusLabel } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { Job } from "@/components/JobCard";
import { PhotoPicker } from "@/components/PhotoPicker";

const STEPS = [
  { key: "pending", label: "Job Posted", icon: "clipboard-check" },
  { key: "accepted", label: "Driver Assigned", icon: "account-check" },
  { key: "arrived", label: "Driver Arrived", icon: "map-marker-check" },
  { key: "in_progress", label: "En Route", icon: "truck-fast" },
  { key: "completed", label: "Completed", icon: "check-circle" },
];

function getStepIndex(status: string) {
  const map: Record<string, number> = { pending: 0, accepted: 1, arrived: 2, in_progress: 3, completed: 4 };
  return map[status] ?? 0;
}

export default function JobStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

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
          <Text style={styles.loadingText}>Loading...</Text>
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

  const currentStep = getStepIndex(job.status);
  const isFurniture = job.jobType === "furniture_transport";

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusTracker}>
          {STEPS.map((step, idx) => {
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
                  {idx < STEPS.length - 1 && (
                    <View style={[styles.stepLine, isPast && idx < currentStep && styles.stepLineActive]} />
                  )}
                </View>
                <Text style={[styles.stepLabel, isPast && styles.stepLabelActive, isActive && styles.stepLabelCurrent]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.cardTitle}>Job Details</Text>
          {isFurniture ? (
            <>
              <DetailRow icon="map-pin" label="Pickup" value={job.pickupAddress || "N/A"} />
              <DetailRow icon="flag" label="Drop-off" value={job.dropoffAddress || "N/A"} />
            </>
          ) : (
            <DetailRow icon="home" label="Address" value={job.homeAddress || "N/A"} />
          )}
          <DetailRow icon="package" label="Items" value={job.itemDescription} />
          <DetailRow icon="clock" label="Time" value={formatDate(job.preferredTime)} />
        </View>

        <View style={styles.freeLaunchCard}>
          <Feather name="gift" size={14} color={Colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.freeLaunchText}>Free during launch period</Text>
            <Text style={styles.freeLaunchSubtext}>No fees, no charges — Inga avgifter under lanseringen</Text>
          </View>
        </View>

        {job.driver && (
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>Your Driver</Text>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Feather name="user" size={22} color={Colors.gold} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{job.driver.fullName}</Text>
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
            <Text style={styles.cardTitle}>Job Photos</Text>
            {job.photosCustomer && job.photosCustomer.length > 0 && (
              <View style={styles.photoGroup}>
                <Text style={styles.photoGroupLabel}>Your Photos</Text>
                <PhotoPicker photos={job.photosCustomer} editable={false} />
              </View>
            )}
            {job.photosPickup && job.photosPickup.length > 0 && (
              <View style={styles.photoGroup}>
                <Text style={styles.photoGroupLabel}>Before Loading</Text>
                <PhotoPicker photos={job.photosPickup} editable={false} />
              </View>
            )}
            {job.photosDropoff && job.photosDropoff.length > 0 && (
              <View style={styles.photoGroup}>
                <Text style={styles.photoGroupLabel}>After Delivery</Text>
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
            <Text style={styles.rateBtnText}>Rate Your Driver</Text>
          </TouchableOpacity>
        )}

        {job.status === "completed" && job.rating && (
          <View style={styles.ratedCard}>
            <Feather name="check-circle" size={16} color={Colors.success} />
            <Text style={styles.ratedText}>You rated this job {job.rating} stars</Text>
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
                  <Text style={styles.cancelBtnText}>Cancel Job</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {(job.status === "accepted" || job.status === "arrived" || job.status === "in_progress") && (
          <View style={styles.cancelLocked}>
            <Feather name="lock" size={14} color={Colors.textMuted} />
            <Text style={styles.cancelLockedText}>
              Cannot cancel — a driver has already accepted this job
            </Text>
          </View>
        )}

        {job.disputed ? (
          <View style={styles.disputedCard}>
            <Feather name="alert-triangle" size={14} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.disputedTitle}>Dispute Reported</Text>
              {job.disputeReason && (
                <Text style={styles.disputedReason}>"{job.disputeReason}"</Text>
              )}
              <Text style={styles.disputedSubtext}>Our team will review this within 24 hours.</Text>
            </View>
          </View>
        ) : (job.status !== "pending" && job.status !== "cancelled") && (
          <TouchableOpacity
            style={styles.disputeBtn}
            onPress={() => setShowDisputeModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="flag" size={14} color={Colors.textMuted} />
            <Text style={styles.disputeBtnText}>Report an Issue</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>

      <Modal visible={showDisputeModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <TouchableOpacity onPress={() => { setShowDisputeModal(false); setDisputeError(null); }} style={styles.modalClose}>
                <Feather name="x" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Describe the problem. Our team will review your report within 24 hours.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Driver didn't arrive, item was damaged..."
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
                : <Text style={styles.submitDisputeBtnText}>Submit Report</Text>
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
