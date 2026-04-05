import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { StarRating } from "@/components/StarRating";
import { BASE_URL, formatSEK, formatDate } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { Job } from "@/components/JobCard";
import { BottomNav } from "@/components/BottomNav";

export default function EarningsScreen() {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["driverEarnings", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs?status=completed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all: Job[] = await safeJson(res);
      return all.filter((j) => j.driverId === user?.id);
    },
    enabled: !!token && !!user?.id,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthJobs = jobs.filter((j) => new Date(j.completedAt || j.createdAt) >= startOfMonth);

    const totalEarned = jobs.reduce((sum, j) => sum + j.driverPayout, 0);
    const thisMonthEarned = thisMonthJobs.reduce((sum, j) => sum + j.driverPayout, 0);
    const avgPerJob = jobs.length > 0 ? totalEarned / jobs.length : 0;

    return { totalEarned, thisMonthEarned, avgPerJob, count: jobs.length, thisMonthCount: thisMonthJobs.length };
  }, [jobs]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("myEarnings")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Driver rating card */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingCardLeft}>
              <Feather name="award" size={18} color={Colors.gold} />
              <View>
                <Text style={styles.ratingCardLabel}>{t("yourRating")}</Text>
                {user?.rating ? (
                  <StarRating rating={Number(user.rating)} totalJobs={user.totalJobs} size={16} showNew showCount />
                ) : (
                  <Text style={styles.ratingCardNew}>{t("noRatingsYet")}</Text>
                )}
              </View>
            </View>
            <View style={styles.ratingCardRight}>
              <Text style={styles.ratingJobCount}>{stats.count}</Text>
              <Text style={styles.ratingJobLabel}>{t("jobsDone")}</Text>
            </View>
          </View>

          {/* Summary cards */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="trending-up"
              label={t("allTime")}
              value={formatSEK(Math.round(stats.totalEarned))}
              sub={`${stats.count} ${t("jobsDone").toLowerCase()}`}
            />
            <StatCard
              icon="calendar"
              label={t("thisMonth")}
              value={formatSEK(Math.round(stats.thisMonthEarned))}
              sub={`${stats.thisMonthCount} ${t("jobsDone").toLowerCase()}`}
            />
          </View>
          <View style={styles.avgCard}>
            <View style={styles.avgLeft}>
              <Feather name="bar-chart-2" size={18} color={Colors.gold} />
              <Text style={styles.avgLabel}>{t("avgPerJob")}</Text>
            </View>
            <Text style={styles.avgValue}>{stats.count > 0 ? formatSEK(Math.round(stats.avgPerJob)) : "—"}</Text>
          </View>

          {/* Per-job history */}
          <Text style={styles.sectionTitle}>{t("earningsHistory")}</Text>

          {jobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="inbox" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>{t("noEarningsYet")}</Text>
              <Text style={styles.emptySub}>{t("startAcceptingJobs")}</Text>
            </View>
          ) : (
            jobs.map((job) => (
              <EarningsRow key={job.id} job={job} t={t} />
            ))
          )}

          <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 90 }} />
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

function StatCard({ icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Feather name={icon} size={18} color={Colors.gold} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function EarningsRow({ job, t }: { job: Job; t: (k: any) => string }) {
  const typeIcons: Record<string, string> = {
    furniture_transport: "package",
    bulky_delivery: "box",
    junk_pickup: "trash-2",
  };
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={(typeIcons[job.jobType] || "briefcase") as any} size={16} color={Colors.gold} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {job.pickupAddress || job.homeAddress || job.city}
        </Text>
        <Text style={styles.rowDate}>{formatDate(job.completedAt || job.createdAt)}</Text>
      </View>
      <Text style={styles.rowPayout}>{formatSEK(Math.round(job.driverPayout))}</Text>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14 },
  ratingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
  },
  ratingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingCardLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ratingCardNew: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  ratingCardRight: {
    alignItems: "flex-end",
  },
  ratingJobCount: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  ratingJobLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  statsGrid: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "flex-start",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  statSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  avgCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avgLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avgLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  avgValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.gold },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  rowDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  rowPayout: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.gold },
});
