import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/navigation";
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
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
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
    // ISO week starts on Monday
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const thisMonthJobs = jobs.filter((j) => new Date(j.completedAt || j.createdAt) >= startOfMonth);
    const thisWeekJobs = jobs.filter((j) => new Date(j.completedAt || j.createdAt) >= startOfWeek);

    const totalEarned = jobs.reduce((sum, j) => sum + j.driverPayout, 0);
    const thisMonthEarned = thisMonthJobs.reduce((sum, j) => sum + j.driverPayout, 0);
    const thisWeekEarned = thisWeekJobs.reduce((sum, j) => sum + j.driverPayout, 0);
    const avgPerJob = jobs.length > 0 ? totalEarned / jobs.length : 0;

    return {
      totalEarned, thisMonthEarned, thisWeekEarned,
      avgPerJob, count: jobs.length,
      thisMonthCount: thisMonthJobs.length,
      thisWeekCount: thisWeekJobs.length,
    };
  }, [jobs]);

  async function handleExportCsv() {
    if (jobs.length === 0) return;
    const header = "Job ID,Date,Type,Address,Payout (SEK)";
    const rows = jobs.map((j) => {
      const date = new Date(j.completedAt || j.createdAt).toLocaleDateString("sv-SE");
      const type = j.jobType.replace(/_/g, " ");
      const address = (j.pickupAddress || j.homeAddress || j.city || "").replace(/,/g, " ");
      return `${j.id},${date},${type},"${address}",${Math.round(j.driverPayout)}`;
    });
    const csv = [header, ...rows].join("\n");
    try {
      await Share.share({ message: csv, title: "Bära Earnings.csv" });
    } catch {
      Alert.alert("", t("csvShared"));
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={safeBack} style={styles.backBtn}>
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
          {/* F-tax warning: shown when earnings approach or exceed threshold */}
          {!user?.ftaxRegistered && (user?.annualEarnings ?? 0) > 700 && (
            <TouchableOpacity
              style={styles.ftaxWarning}
              onPress={() => router.push("/(driver)/edit-profile")}
              activeOpacity={0.85}
            >
              <Feather name="alert-triangle" size={14} color="#E05252" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ftaxWarningTitle}>
                  {isSv ? "F-skatt krävs snart" : "F-tax registration required soon"}
                </Text>
                <Text style={styles.ftaxWarningSub}>
                  {isSv
                    ? "Dina intäkter närmar sig 1 000 kr. Registrera F-skatt i din profil för att fortsätta acceptera jobb."
                    : "Your earnings are approaching 1,000 SEK. Add your F-tax number in your profile to keep accepting jobs."}
                </Text>
              </View>
              <Feather name="chevron-right" size={14} color="#E05252" />
            </TouchableOpacity>
          )}

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
          <StatCard
            icon="clock"
            label={t("thisWeek")}
            value={formatSEK(Math.round(stats.thisWeekEarned))}
            sub={`${stats.thisWeekCount} ${t("jobsDone").toLowerCase()}`}
            wide
          />
          <View style={styles.avgCard}>
            <View style={styles.avgLeft}>
              <Feather name="bar-chart-2" size={18} color={Colors.gold} />
              <Text style={styles.avgLabel}>{t("avgPerJob")}</Text>
            </View>
            <Text style={styles.avgValue}>{stats.count > 0 ? formatSEK(Math.round(stats.avgPerJob)) : "—"}</Text>
          </View>

          {/* CSV export */}
          {jobs.length > 0 && (
            <TouchableOpacity
              style={styles.csvBtn}
              onPress={handleExportCsv}
              activeOpacity={0.85}
            >
              <Feather name="download" size={15} color={Colors.navy} />
              <Text style={styles.csvBtnText}>{t("exportCsv")}</Text>
            </TouchableOpacity>
          )}

          {/* Tax responsibility card — replaces hobby income framing ⚖️ */}
          <TouchableOpacity
            style={styles.taxCard}
            onPress={() => router.push("/tax-info")}
            activeOpacity={0.85}
          >
            <View style={styles.taxCardHeader}>
              <Feather name="alert-circle" size={15} color={Colors.gold} />
              <Text style={styles.taxCardTitle}>
                {isSv ? "Skatt & ansvar" : "Tax & Responsibility"}
              </Text>
              <Feather name="chevron-right" size={14} color={Colors.gold} />
            </View>
            <Text style={styles.taxCardBody}>
              {isSv
                ? "All inkomst från Bära är skattepliktig från första kronan. Du ansvarar för att deklarera och betala egenavgifter. Sätt undan 30–35% av varje utbetalning."
                : "All income from Bära is taxable from the first krona. You are responsible for declaring earnings and paying egenavgifter. Set aside 30–35% of each payment."}
            </Text>
          </TouchableOpacity>

          {/* Hourly rate & weekly goal */}
          {stats.count > 0 && (
            <View style={styles.insightsRow}>
              <View style={styles.insightCard}>
                <Feather name="clock" size={16} color={Colors.gold} />
                <Text style={styles.insightLabel}>
                  {isSv ? "Senaste 7 dagarna" : "Last 7 days"}
                </Text>
                <Text style={styles.insightValue}>
                  {stats.thisWeekEarned > 0
                    ? `~${formatSEK(Math.round(stats.thisWeekEarned / Math.max(stats.thisWeekCount, 1) / 0.5))} /h`
                    : "—"}
                </Text>
                <Text style={styles.insightSub}>{isSv ? "ca SEK/timme" : "approx SEK/hr"}</Text>
              </View>
              <View style={styles.insightCard}>
                <Feather name="target" size={16} color={Colors.gold} />
                <Text style={styles.insightLabel}>
                  {isSv ? "Veckamål 1 000 kr" : "Weekly goal 1,000 SEK"}
                </Text>
                <Text style={styles.insightValue}>
                  {Math.max(0, Math.ceil((1000 - stats.thisWeekEarned) / 150))} {isSv ? "jobb" : "jobs"}
                </Text>
                <Text style={styles.insightSub}>
                  {stats.thisWeekEarned >= 1000
                    ? (isSv ? "Mål uppnått! 🎉" : "Goal reached! 🎉")
                    : (isSv ? "kvar denna vecka" : "left this week")}
                </Text>
              </View>
            </View>
          )}

          {/* Per-job history */}
          <Text style={styles.sectionTitle}>{t("earningsHistory")}</Text>

          {jobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={styles.emptyTitle}>{t("noEarningsYet")}</Text>
              <Text style={styles.emptySub}>{t("noEarningsYetSub")}</Text>
            </View>
          ) : (
            jobs.map((job) => (
              <EarningsRow key={job.id} job={job} t={t} />
            ))
          )}

          <TouchableOpacity
            style={styles.safetyLink}
            onPress={() => router.push("/insurance-safety")}
            activeOpacity={0.8}
          >
            <Feather name="shield" size={14} color={Colors.textMuted} />
            <Text style={styles.safetyLinkText}>
              {isSv ? "Försäkring och säkerhet" : "Insurance & Safety"}
            </Text>
            <Feather name="chevron-right" size={13} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* ⚖️ Contractor disclaimer — requires Swedish legal review before launch */}
          <View style={styles.contractorNote}>
            <Feather name="info" size={12} color={Colors.textMuted} />
            <Text style={styles.contractorNoteText}>
              {isSv
                ? "Bära är en teknologiplattform. Bärare är oberoende uppdragstagare, inte anställda hos Bära."
                : "Bära is a technology platform. Carriers are independent contractors, not employees of Bära."}
            </Text>
          </View>

          <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 90 }} />
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

function StatCard({ icon, label, value, sub, wide }: { icon: any; label: string; value: string; sub: string; wide?: boolean }) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
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
    blocket_pickup: "tag",
    facebook_pickup: "shopping-bag",
    small_furniture: "box",
    office_items: "briefcase",
    children_items: "heart",
    electronics: "cpu",
    other_small: "package",
    // Legacy
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
  backBtn: { width: 56, height: 56, justifyContent: "center", alignItems: "center" },
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
  statCardWide: {
    flex: undefined,
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
  emptyEmoji: { fontSize: 52, textAlign: "center" as const },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" as const },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" as const },
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
  ftaxWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E0525212",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0525230",
  },
  ftaxWarningTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#E05252",
    marginBottom: 2,
  },
  ftaxWarningSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#C04040",
    lineHeight: 18,
  },
  csvBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  csvBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  taxCard: {
    backgroundColor: `${Colors.gold}10`,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}35`,
    gap: 8,
  },
  taxCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taxCardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  taxCardBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 19,
  },
  insightsRow: {
    flexDirection: "row",
    gap: 10,
  },
  insightCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  insightLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textAlign: "center",
  },
  insightValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    textAlign: "center",
  },
  insightSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  contractorNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  contractorNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 16,
  },
  safetyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12,
  },
  safetyLinkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
});
