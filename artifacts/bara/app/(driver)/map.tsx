import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  Switch,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { StarRating } from "@/components/StarRating";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { JobCard, Job } from "@/components/JobCard";
import { DriverMapView } from "@/components/DriverMapView";

export default function DriverMapScreen() {
  const { user, token, updateUser, activeMode, setActiveMode } = useAuth();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [surchargeJob, setSurchargeJob] = useState<Job | null>(null);
  const [surchargeStairs, setSurchargeStairs] = useState(false);
  const [surchargeDistance, setSurchargeDistance] = useState(false);
  const isSv = lang === "sv";

  useEffect(() => {
    if (user && !user.driverOnboardingComplete) {
      router.replace("/driver-onboarding-checklist");
    }
  }, [user?.driverOnboardingComplete]);

  const { data: jobs, isLoading, refetch, isRefetching } = useQuery<Job[]>({
    queryKey: ["availableJobs", user?.city],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs?city=${encodeURIComponent(user?.city || "")}&status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return safeJson(res);
    },
    enabled: !!token && !!user,
    refetchInterval: 20000,
  });

  function openSurchargeSheet(job: Job) {
    setSurchargeStairs(false);
    setSurchargeDistance(false);
    setSurchargeJob(job);
  }

  async function handleAccept(jobId: number, surcharges?: { stairs: boolean; distance: boolean }) {
    setAccepting(jobId);
    setSurchargeJob(null);
    setErrorMsg(null);
    try {
      const body: Record<string, unknown> = {};
      if (surcharges?.stairs) body.surchargeStairs = 50;
      if (surcharges?.distance) body.surchargeDistance = 25;
      const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to accept job");
      queryClient.invalidateQueries({ queryKey: ["availableJobs"] });
      router.push({ pathname: "/(driver)/active-job", params: { id: jobId } });
    } catch (e: any) {
      setErrorMsg(e.message || "Could not accept this job.");
    } finally {
      setAccepting(null);
    }
  }

  async function toggleAvailability() {
    try {
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: !user?.isAvailable }),
      });
      const data = await safeJson(res);
      if (res.ok) updateUser(data);
    } catch {}
  }


  const firstName = user?.fullName?.split(" ")[0] || "Driver";
  const availableJobs = (jobs || []).filter(j => j.customerId !== user?.id);

  function handleSwitchMode(mode: "customer" | "driver") {
    setActiveMode(mode);
    if (mode === "customer") router.replace("/(customer)/home");
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <View>
          <Text style={styles.greeting}>{t("hello")}, {firstName}</Text>
          <Text style={styles.city}>{user?.city}</Text>
          <View style={{ marginTop: 4 }}>
            <StarRating
              rating={user?.rating ? Number(user.rating) : null}
              totalJobs={user?.totalJobs}
              size={13}
              showNew
              showCount
            />
          </View>
        </View>
        <View style={styles.headerRight}>
          {user?.role === "both" && (
            <View style={styles.modePill}>
              <TouchableOpacity
                style={[styles.modeBtn, activeMode === "customer" && styles.modeBtnActive]}
                onPress={() => handleSwitchMode("customer")}
              >
                <Text style={[styles.modeBtnText, activeMode === "customer" && styles.modeBtnTextActive]}>{t("customerMode")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, activeMode === "driver" && styles.modeBtnActive]}
                onPress={() => handleSwitchMode("driver")}
              >
                <Text style={[styles.modeBtnText, activeMode === "driver" && styles.modeBtnTextActive]}>{t("driverMode")}</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.availabilityToggle}>
            <Text style={[styles.availabilityText, user?.isAvailable && styles.availabilityTextActive]}>
              {user?.isAvailable ? t("availableStatus") : t("offlineStatus")}
            </Text>
            <Switch
              value={!!user?.isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: Colors.border, true: `${Colors.success}80` }}
              thumbColor={user?.isAvailable ? Colors.success : Colors.textMuted}
            />
          </View>
        </View>
      </View>

      <DriverMapView
        city={user?.city || "Stockholm"}
        jobs={availableJobs}
        onAccept={handleAccept}
        accepting={accepting}
        isAvailable={!!user?.isAvailable}
      />

      <View style={styles.jobsSection}>
        <View style={styles.jobsHeader}>
          <Text style={styles.jobsTitle}>{t("availableJobs")}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{availableJobs.length}</Text>
          </View>
        </View>

        <View style={styles.driverLaunchNote}>
          <Feather name="gift" size={12} color={Colors.gold} />
          <Text style={styles.driverLaunchNoteText}>
            {t("freeLaunchNote")}
          </Text>
        </View>

        {errorMsg && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => setErrorMsg(null)}
            activeOpacity={0.8}
          >
            <Feather name="alert-circle" size={14} color={Colors.error} />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
            <Feather name="x" size={14} color={Colors.error} />
          </TouchableOpacity>
        )}

        <FlatList
          data={availableJobs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              showAcceptButton={!!user?.isAvailable}
              onAccept={() => openSurchargeSheet(item)}
              isAccepting={accepting === item.id}
              showDriverEarnings
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.jobsList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={availableJobs.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{t("loading")}</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🚛</Text>
                <Text style={styles.emptyTitle}>{t("noJobsAvailable")}</Text>
                <Text style={styles.emptySubtext}>{t("noJobsAvailableSub")}</Text>
                <Text style={styles.emptyHint}>{t("stayOnlineHint")}</Text>
              </View>
            )
          }
        />
      </View>

      <BottomNav />

      <Modal
        visible={!!surchargeJob}
        transparent
        animationType="slide"
        onRequestClose={() => setSurchargeJob(null)}
      >
        <View style={styles.surchargeOverlay}>
          <View style={styles.surchargeSheet}>
            <View style={styles.surchargeSheetHandle} />
            <Text style={styles.surchargeSheetTitle}>
              {isSv ? "Lägg till tilläggsavgift?" : "Add a surcharge?"}
            </Text>
            <Text style={styles.surchargeSheetSub}>
              {isSv
                ? "Kunden måste godkänna tillägget innan jobbet bekräftas."
                : "Customer must approve before the job is confirmed."}
            </Text>

            <TouchableOpacity
              style={[styles.surchargeOption, surchargeStairs && styles.surchargeOptionActive]}
              onPress={() => setSurchargeStairs(!surchargeStairs)}
              activeOpacity={0.8}
            >
              <View style={[styles.surchargeCheck, surchargeStairs && styles.surchargeCheckActive]}>
                {surchargeStairs && <Feather name="check" size={12} color={Colors.navy} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.surchargeOptionTitle}>
                  {isSv ? "Extra för trappor" : "Stairs surcharge"}
                </Text>
                <Text style={styles.surchargeOptionDesc}>
                  {isSv ? "Inga hiss, 2+ våningar" : "No lift, 2+ floors"}
                </Text>
              </View>
              <Text style={styles.surchargeOptionPrice}>+50 kr</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.surchargeOption, surchargeDistance && styles.surchargeOptionActive]}
              onPress={() => setSurchargeDistance(!surchargeDistance)}
              activeOpacity={0.8}
            >
              <View style={[styles.surchargeCheck, surchargeDistance && styles.surchargeCheckActive]}>
                {surchargeDistance && <Feather name="check" size={12} color={Colors.navy} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.surchargeOptionTitle}>
                  {isSv ? "Extra avstånd" : "Extra distance"}
                </Text>
                <Text style={styles.surchargeOptionDesc}>
                  {isSv ? "Mer än 5 km extra körning" : "More than 5 km extra driving"}
                </Text>
              </View>
              <Text style={styles.surchargeOptionPrice}>+25 kr</Text>
            </TouchableOpacity>

            {(surchargeStairs || surchargeDistance) && (
              <View style={styles.surchargeTotalRow}>
                <Text style={styles.surchargeTotalLabel}>
                  {isSv ? "Totalt tillägg:" : "Total surcharge:"}
                </Text>
                <Text style={styles.surchargeTotalAmount}>
                  +{(surchargeStairs ? 50 : 0) + (surchargeDistance ? 25 : 0)} kr
                </Text>
              </View>
            )}

            <View style={styles.surchargeSheetActions}>
              <TouchableOpacity
                style={styles.surchargeSkipBtn}
                onPress={() => surchargeJob && handleAccept(surchargeJob.id, { stairs: false, distance: false })}
                activeOpacity={0.8}
              >
                <Text style={styles.surchargeSkipBtnText}>
                  {isSv ? "Acceptera utan tillägg" : "Accept without surcharge"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.surchargeConfirmBtn, !(surchargeStairs || surchargeDistance) && styles.surchargeConfirmBtnDisabled]}
                onPress={() => surchargeJob && handleAccept(surchargeJob.id, { stairs: surchargeStairs, distance: surchargeDistance })}
                disabled={!(surchargeStairs || surchargeDistance)}
                activeOpacity={0.85}
              >
                <Text style={[styles.surchargeConfirmBtnText, !(surchargeStairs || surchargeDistance) && styles.surchargeConfirmBtnTextDisabled]}>
                  {isSv ? "Skicka tillägg till kund" : "Send surcharge to customer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  city: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  modePill: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  modeBtnActive: { backgroundColor: Colors.gold },
  modeBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  modeBtnTextActive: { color: Colors.navy },
  availabilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  availabilityTextActive: { color: Colors.success },
  jobsSection: { flex: 1, paddingHorizontal: 16 },
  jobsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  jobsTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  countBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.navy },
  jobsList: { paddingBottom: 16 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  emptyHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", fontStyle: "italic" },
  driverLaunchNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
    marginBottom: 10,
  },
  driverLaunchNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },
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
    marginBottom: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  surchargeOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  surchargeSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  surchargeSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 4,
  },
  surchargeSheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  surchargeSheetSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 19,
    marginTop: -6,
  },
  surchargeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  surchargeOptionActive: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}10`,
  },
  surchargeCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  surchargeCheckActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  surchargeOptionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  surchargeOptionDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 1,
  },
  surchargeOptionPrice: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  surchargeTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  surchargeTotalLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  surchargeTotalAmount: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  surchargeSheetActions: { gap: 10, marginTop: 4 },
  surchargeSkipBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  surchargeSkipBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  surchargeConfirmBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: "center",
  },
  surchargeConfirmBtnDisabled: {
    backgroundColor: Colors.border,
  },
  surchargeConfirmBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.navy,
  },
  surchargeConfirmBtnTextDisabled: {
    color: Colors.textMuted,
  },
});
