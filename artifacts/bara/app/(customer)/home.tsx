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
import { BASE_URL, formatSEK, formatDate, type JobType, JOB_TYPE_ICONS } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { JobCard, Job } from "@/components/JobCard";

type Category = {
  type: JobType;
  labelSV: string;
  labelEN: string;
  icon: string;
};

const CATEGORIES: Category[] = [
  { type: "blocket_pickup", labelSV: "Blocket hämtning", labelEN: "Blocket Pickup", icon: "tag-outline" },
  { type: "facebook_pickup", labelSV: "Facebook Marketplace", labelEN: "Facebook Marketplace", icon: "store-outline" },
  { type: "small_furniture", labelSV: "Liten möbel", labelEN: "Small Furniture", icon: "chair-rolling" },
  { type: "office_items", labelSV: "Kontorsföremål", labelEN: "Office Items", icon: "briefcase-outline" },
  { type: "children_items", labelSV: "Barnprylar", labelEN: "Children's Items", icon: "baby-carriage" },
  { type: "electronics", labelSV: "Elektronik", labelEN: "Electronics", icon: "laptop" },
  { type: "other_small", labelSV: "Övrigt litet", labelEN: "Other Small", icon: "package-variant-closed" },
];

export default function CustomerHome() {
  const { user, token, activeMode, setActiveMode } = useAuth();
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
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
        {/* Top banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBannerLeft}>
            <Text style={styles.heroBannerTitle}>
              {isSv ? "Litet föremål?" : "Small item?"}
            </Text>
            <Text style={styles.heroBannerSub}>
              {isSv
                ? "Vi hämtar vad som helst som ryms i en vanlig bil — från 99 kr."
                : "We pick up anything that fits in a regular car — from 99 SEK."}
            </Text>
          </View>
          <View style={styles.heroPriceBadge}>
            <Text style={styles.heroPriceFrom}>{isSv ? "från" : "from"}</Text>
            <Text style={styles.heroPriceAmount}>99 kr</Text>
          </View>
        </View>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          <FeaturePill icon="car" text={isSv ? "Vilken bil" : "Any car"} />
          <FeaturePill icon="clock" text={isSv ? "30 min" : "30 min"} />
          <FeaturePill icon="shield" text={isSv ? "Verifierade" : "Verified"} />
        </View>

        <Text style={styles.sectionTitle}>{t("newJob")}</Text>

        {/* 2-column category grid */}
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.type}
              style={styles.categoryCard}
              onPress={() => router.push({ pathname: "/(customer)/post-job", params: { type: cat.type } })}
              activeOpacity={0.78}
            >
              <View style={styles.categoryIconBg}>
                <MaterialCommunityIcons name={cat.icon as any} size={26} color={Colors.gold} />
              </View>
              <Text style={styles.categoryLabel}>{isSv ? cat.labelSV : cat.labelEN}</Text>
              <View style={styles.categoryArrow}>
                <Feather name="arrow-right" size={12} color={Colors.gold} />
              </View>
            </TouchableOpacity>
          ))}
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
            <MaterialCommunityIcons name="package-variant-closed" size={36} color={Colors.textMuted} />
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

function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featurePill}>
      <Feather name={icon as any} size={12} color={Colors.gold} />
      <Text style={styles.featurePillText}>{text}</Text>
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
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroBannerLeft: { flex: 1, paddingRight: 12 },
  heroBannerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  heroBannerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 18,
  },
  heroPriceBadge: {
    backgroundColor: `${Colors.gold}20`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
  },
  heroPriceFrom: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.gold,
  },
  heroPriceAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
  },
  featurePillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: "48%",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 18,
  },
  categoryArrow: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  jobsList: { gap: 12 },
  loadingCard: { padding: 24, alignItems: "center" },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  emptyCard: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
});
