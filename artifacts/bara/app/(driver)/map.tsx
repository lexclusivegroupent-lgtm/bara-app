import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { JobCard, Job } from "@/components/JobCard";
import { DriverMapView } from "@/components/DriverMapView";

export default function DriverMapScreen() {
  const { user, token, updateUser, activeMode, setActiveMode } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  async function handleAccept(jobId: number) {
    setAccepting(jobId);
    setErrorMsg(null);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.city}>{user?.city}</Text>
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
              onAccept={() => handleAccept(item.id)}
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
                <MaterialCommunityIcons name="clipboard-search-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>{t("noJobsArea")}</Text>
                <Text style={styles.emptySubtext}>{t("jobsAppear")}</Text>
              </View>
            )
          }
        />
      </View>

      <BottomNav />
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
    paddingTop: 40,
    gap: 8,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
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
});
