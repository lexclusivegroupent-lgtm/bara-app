import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, formatSEK, getStatusColor, getStatusLabel, formatDate } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { JobCard, Job } from "@/components/JobCard";

export default function CustomerHome() {
  const { user, token, activeMode, setActiveMode } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const { data: jobs, isLoading, refetch, isRefetching } = useQuery<Job[]>({
    queryKey: ["customerJobs", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = await safeJson(res);
      return all.filter((j: Job) => j.customerId === user?.id);
    },
    enabled: !!token && !!user,
    refetchInterval: 30000,
  });

  const activeJobs = jobs?.filter((j) => j.status !== "completed" && j.status !== "cancelled") || [];
  const firstName = user?.fullName?.split(" ")[0] || "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 18 ? t("goodAfternoon") : t("goodEvening");

  function handleSwitchMode(mode: "customer" | "driver") {
    setActiveMode(mode);
    if (mode === "driver") router.replace("/(driver)/map");
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <View>
          <Text style={styles.greeting}>{greeting}, {firstName}</Text>
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
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refetch}
            tintColor={Colors.gold}
          />
        }
      >
        <View style={styles.freeBanner}>
          <Feather name="gift" size={14} color={Colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.freeBannerText}>{t("freeBanner")}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("newJob")}</Text>
        <View style={styles.serviceCards}>
          <ServiceCard
            icon="sofa"
            title={t("furnitureTransport")}
            subtitle={t("pickupDropoff")}
            onPress={() => router.push({ pathname: "/(customer)/post-job", params: { type: "furniture_transport" } })}
          />
          <ServiceCard
            icon="package-variant"
            title={t("bulkyDelivery")}
            subtitle={t("largeItems")}
            onPress={() => router.push({ pathname: "/(customer)/post-job", params: { type: "bulky_delivery" } })}
          />
          <ServiceCard
            icon="delete-sweep"
            title={t("junkTrash")}
            subtitle={t("homePickup")}
            onPress={() => router.push({ pathname: "/(customer)/post-job", params: { type: "junk_pickup" } })}
          />
        </View>

        {activeJobs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("activeJobs")}</Text>
            <View style={styles.jobsList}>
              {activeJobs.map((job, index) => (
                <Animated.View key={job.id} entering={FadeInDown.delay(index * 80)}>
                  <JobCard
                    job={job}
                    onPress={() => router.push({ pathname: "/(customer)/job-status", params: { id: job.id } })}
                  />
                </Animated.View>
              ))}
            </View>
          </>
        )}

        {isLoading && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>{t("loadingJobs")}</Text>
          </View>
        )}

        {!isLoading && activeJobs.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="truck-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{t("noActiveJobs")}</Text>
            <Text style={styles.emptySubtext}>{t("postFirstJob")}</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

function ServiceCard({ icon, title, subtitle, onPress }: { icon: any; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.serviceIconBg}>
        <MaterialCommunityIcons name={icon} size={32} color={Colors.gold} />
      </View>
      <Text style={styles.serviceCardTitle}>{title}</Text>
      <Text style={styles.serviceCardSubtitle}>{subtitle}</Text>
      <View style={styles.serviceArrow}>
        <Feather name="arrow-right" size={14} color={Colors.gold} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerRight: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  modePill: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  modeBtnActive: { backgroundColor: Colors.gold },
  modeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  modeBtnTextActive: { color: Colors.navy },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  serviceCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceIconBg: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  serviceCardTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 3,
  },
  serviceCardSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  serviceArrow: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  jobsList: {
    gap: 12,
  },
  loadingCard: {
    padding: 24,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  freeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
    marginBottom: 16,
  },
  freeBannerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
    lineHeight: 18,
  },
});
