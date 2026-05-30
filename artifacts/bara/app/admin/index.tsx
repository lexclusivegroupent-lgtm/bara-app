import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/navigation";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";

import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, formatSEK } from "@/constants/config";
import { safeJson } from "@/utils/api";

type Period = "daily" | "weekly" | "monthly";

interface RevenuePoint { label: string; revenue: number; jobs: number; }
interface Carrier { id: number; fullName: string; totalJobs: number; earnings: number; rating: number | null; city: string; }
interface AdminStats {
  totalRevenue: number;
  totalJobs: number;
  activeDrivers: number;
  pendingJobs: number;
  revenueChart: RevenuePoint[];
  topCarriers: Carrier[];
  dac7: { total: number; consented: number; nearThreshold: number; overThreshold: number; };
  vat: { threshold: number; driversNear: number; };
}

function BarChart({ data, period }: { data: RevenuePoint[]; period: Period }) {
  const W = 320;
  const H = 120;
  const padL = 36;
  const padB = 24;
  const padT = 8;
  const chartW = W - padL - 8;
  const chartH = H - padB - padT;

  if (!data.length) return null;
  const maxRev = Math.max(...data.map(d => d.revenue), 1);
  const barW = Math.max(4, (chartW / data.length) * 0.65);
  const gap = chartW / data.length;

  return (
    <Svg width={W} height={H}>
      {/* Y axis lines */}
      {[0, 0.5, 1].map((ratio) => {
        const y = padT + chartH - ratio * chartH;
        return (
          <React.Fragment key={ratio}>
            <Line x1={padL} y1={y} x2={W - 8} y2={y} stroke={Colors.border} strokeWidth={1} strokeDasharray="4 4" />
            <SvgText
              x={padL - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill={Colors.textMuted}
            >
              {ratio === 0 ? "0" : formatSEK(Math.round(maxRev * ratio))}
            </SvgText>
          </React.Fragment>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = Math.max(2, (d.revenue / maxRev) * chartH);
        const x = padL + gap * i + (gap - barW) / 2;
        const y = padT + chartH - barH;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={Colors.gold}
              opacity={0.85}
            />
            {data.length <= 12 && (
              <SvgText
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={9}
                fill={Colors.textMuted}
              >
                {d.label}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, color ? { backgroundColor: `${color}18`, borderColor: `${color}30` } : null]}>
        <Feather name={icon as any} size={16} color={color || Colors.gold} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(1, value / Math.max(max, 1));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("weekly");

  const { data: stats, isLoading, isError, refetch, isRefetching } = useQuery<AdminStats>({
    queryKey: ["adminStats", period],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unauthorized or unavailable");
      return safeJson(res);
    },
    enabled: !!token,
    retry: 1,
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: "daily", label: "Dag" },
    { key: "weekly", label: "Vecka" },
    { key: "monthly", label: "Månad" },
  ];

  if (!user) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.errorText}>Inte inloggad</Text>
        <TouchableOpacity onPress={() => router.replace("/login")} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Logga in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={safeBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Bära — intern statistik</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
        }
      >
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.gold} size="large" />
            <Text style={styles.loadingText}>Laddar statistik…</Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>Kunde inte ladda admin-statistik.</Text>
            <Text style={styles.errorSub}>Kontrollera att du har admin-behörighet och att servern kör /api/admin/stats.</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Feather name="refresh-cw" size={14} color={Colors.gold} />
              <Text style={styles.retryBtnText}>Försök igen</Text>
            </TouchableOpacity>
          </View>
        )}

        {stats && (
          <>
            {/* KPI row */}
            <View style={styles.kpiRow}>
              <StatCard icon="dollar-sign" label="Total intäkt" value={formatSEK(stats.totalRevenue)} sub="alla tider" />
              <StatCard icon="package" label="Jobb totalt" value={stats.totalJobs.toString()} sub="alla tider" />
              <StatCard icon="users" label="Aktiva bärare" value={stats.activeDrivers.toString()} color={Colors.success} />
              <StatCard icon="clock" label="Väntande jobb" value={stats.pendingJobs.toString()} color={Colors.orange} />
            </View>

            {/* Revenue chart */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Intäkter</Text>
                  <Text style={styles.cardSub}>Plattformsavgifter per period</Text>
                </View>
                <View style={styles.periodTabs}>
                  {PERIODS.map(p => (
                    <TouchableOpacity
                      key={p.key}
                      style={[styles.periodTab, period === p.key && styles.periodTabActive]}
                      onPress={() => setPeriod(p.key)}
                    >
                      <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart data={stats.revenueChart} period={period} />
              </ScrollView>
              {stats.revenueChart.length > 0 && (
                <View style={styles.chartSummaryRow}>
                  <Text style={styles.chartSummaryLabel}>
                    Totalt ({period === "daily" ? "dag" : period === "weekly" ? "vecka" : "mån"}):
                  </Text>
                  <Text style={styles.chartSummaryValue}>
                    {formatSEK(stats.revenueChart.reduce((s, d) => s + d.revenue, 0))}
                  </Text>
                  <Text style={[styles.chartSummaryLabel, { marginLeft: 12 }]}>
                    {stats.revenueChart.reduce((s, d) => s + d.jobs, 0)} jobb
                  </Text>
                </View>
              )}
            </View>

            {/* Carrier leaderboard */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Bärar-topplista</Text>
                  <Text style={styles.cardSub}>Top {stats.topCarriers.length} bärare</Text>
                </View>
                <View style={styles.medalBadge}>
                  <Feather name="award" size={14} color={Colors.gold} />
                </View>
              </View>
              {stats.topCarriers.map((carrier, i) => (
                <View key={carrier.id} style={[styles.leaderRow, i < stats.topCarriers.length - 1 && styles.leaderRowBorder]}>
                  <View style={[styles.rankBadge, i === 0 && styles.rankBadge1, i === 1 && styles.rankBadge2, i === 2 && styles.rankBadge3]}>
                    <Text style={[styles.rankText, i < 3 && { color: Colors.navy }]}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderName}>{carrier.fullName}</Text>
                    <Text style={styles.leaderCity}>{carrier.city}</Text>
                  </View>
                  <View style={styles.leaderStats}>
                    <Text style={styles.leaderJobs}>{carrier.totalJobs} jobb</Text>
                    <Text style={styles.leaderEarnings}>{formatSEK(carrier.earnings)}</Text>
                    {carrier.rating != null && (
                      <Text style={styles.leaderRating}>⭐ {Number(carrier.rating).toFixed(1)}</Text>
                    )}
                  </View>
                </View>
              ))}
              {stats.topCarriers.length === 0 && (
                <Text style={styles.emptyText}>Inga bärare ännu</Text>
              )}
            </View>

            {/* DAC7 compliance widget */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>DAC7-efterlevnad</Text>
                  <Text style={styles.cardSub}>EU-direktivet om plattformsrapportering</Text>
                </View>
                <View style={[styles.complianceChip, stats.dac7.consented === stats.dac7.total && styles.complianceChipGreen]}>
                  <Feather name="shield" size={12} color={stats.dac7.consented === stats.dac7.total ? Colors.success : Colors.orange} />
                  <Text style={[styles.complianceChipText, stats.dac7.consented === stats.dac7.total && { color: Colors.success }]}>
                    {stats.dac7.consented}/{stats.dac7.total} godkända
                  </Text>
                </View>
              </View>
              <View style={styles.dac7Row}>
                <View style={styles.dac7Stat}>
                  <Text style={styles.dac7Value}>{stats.dac7.consented}</Text>
                  <Text style={styles.dac7Label}>Samtyckt</Text>
                </View>
                <View style={styles.dac7Stat}>
                  <Text style={[styles.dac7Value, { color: Colors.orange }]}>{stats.dac7.total - stats.dac7.consented}</Text>
                  <Text style={styles.dac7Label}>Saknar samtycke</Text>
                </View>
                <View style={styles.dac7Stat}>
                  <Text style={[styles.dac7Value, { color: Colors.error }]}>{stats.dac7.overThreshold}</Text>
                  <Text style={styles.dac7Label}>Över tröskeln</Text>
                </View>
                <View style={styles.dac7Stat}>
                  <Text style={[styles.dac7Value, { color: Colors.gold }]}>{stats.dac7.nearThreshold}</Text>
                  <Text style={styles.dac7Label}>Nära tröskel</Text>
                </View>
              </View>
              <ProgressBar
                value={stats.dac7.consented}
                max={stats.dac7.total}
                color={Colors.success}
              />
              <Text style={styles.progressNote}>
                {Math.round((stats.dac7.consented / Math.max(stats.dac7.total, 1)) * 100)}% av bärarna har lämnat DAC7-samtycke
              </Text>
            </View>

            {/* VAT threshold progress */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Momströskel (€2 500/år)</Text>
                  <Text style={styles.cardSub}>Bärare nära Skatteverkets rapporteringsgräns</Text>
                </View>
                <View style={[styles.complianceChip, { backgroundColor: `${Colors.error}12`, borderColor: `${Colors.error}30` }]}>
                  <Feather name="alert-triangle" size={12} color={Colors.error} />
                  <Text style={[styles.complianceChipText, { color: Colors.error }]}>
                    {stats.vat.driversNear} bärare
                  </Text>
                </View>
              </View>
              <View style={styles.vatRow}>
                <View style={styles.dac7Stat}>
                  <Text style={[styles.dac7Value, { color: Colors.gold }]}>{stats.vat.driversNear}</Text>
                  <Text style={styles.dac7Label}>Nära tröskel</Text>
                </View>
                <View style={styles.dac7Stat}>
                  <Text style={styles.dac7Value}>{stats.dac7.overThreshold}</Text>
                  <Text style={styles.dac7Label}>Över €2 500</Text>
                </View>
              </View>
              <ProgressBar
                value={stats.vat.driversNear}
                max={stats.activeDrivers}
                color={Colors.orange}
              />
              <Text style={styles.progressNote}>
                Bärare som tjänar mer än €2 500/år rapporteras automatiskt till Skatteverket via DAC7.
              </Text>
            </View>

            {/* Analytics events */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Plattforms-KPI:er</Text>
              <Text style={styles.cardSub}>Nyckeltal för lanseringsuppföljning</Text>
              <View style={styles.kpiTable}>
                {[
                  { label: "Konvertering job-post → accepterat", value: stats.totalJobs > 0 ? `${Math.min(99, Math.round(((stats.totalJobs - stats.pendingJobs) / stats.totalJobs) * 100))}%` : "–" },
                  { label: "Snittintäkt per jobb", value: stats.totalJobs > 0 ? formatSEK(Math.round(stats.totalRevenue / stats.totalJobs)) : "–" },
                  { label: "Aktiva bärare / totalt", value: `${stats.activeDrivers} / ${stats.dac7.total}` },
                  { label: "DAC7-samtycke rate", value: stats.dac7.total > 0 ? `${Math.round((stats.dac7.consented / stats.dac7.total) * 100)}%` : "–" },
                  { label: "Väntande jobb just nu", value: stats.pendingJobs.toString() },
                ].map((row, i) => (
                  <View key={i} style={[styles.kpiRow2, i % 2 === 0 && styles.kpiRowAlt]}>
                    <Text style={styles.kpiRowLabel}>{row.label}</Text>
                    <Text style={styles.kpiRowValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
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
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  refreshBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "flex-end" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  center: { alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  errorCard: {
    backgroundColor: `${Colors.error}12`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  errorText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.error, textAlign: "center" },
  errorSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 18 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.gold}18`,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.gold },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: `${Colors.gold}18`,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.gold },
  statSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  periodTabs: { flexDirection: "row", backgroundColor: Colors.navy, borderRadius: 9, padding: 2, borderWidth: 1, borderColor: Colors.border },
  periodTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  periodTabActive: { backgroundColor: Colors.gold },
  periodTabText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  periodTabTextActive: { color: Colors.navy },
  chartSummaryRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  chartSummaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  chartSummaryValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.gold, marginLeft: 6 },
  leaderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  leaderRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rankBadge: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: Colors.navy,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  rankBadge1: { backgroundColor: "#FFD700", borderColor: "#E5C200" },
  rankBadge2: { backgroundColor: "#C0C0C0", borderColor: "#A8A8A8" },
  rankBadge3: { backgroundColor: "#CD7F32", borderColor: "#B86E22" },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textMuted },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  leaderCity: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  leaderStats: { alignItems: "flex-end", gap: 1 },
  leaderJobs: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  leaderEarnings: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.gold },
  leaderRating: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", paddingVertical: 12 },
  dac7Row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vatRow: { flexDirection: "row", gap: 8 },
  dac7Stat: {
    flex: 1, minWidth: 70,
    backgroundColor: Colors.navy,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dac7Value: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  dac7Label: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 2 },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.navy,
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 16 },
  complianceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.orange}15`,
    borderWidth: 1,
    borderColor: `${Colors.orange}30`,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  complianceChipGreen: {
    backgroundColor: `${Colors.success}15`,
    borderColor: `${Colors.success}30`,
  },
  complianceChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.orange },
  medalBadge: {
    width: 32, height: 32,
    borderRadius: 9,
    backgroundColor: `${Colors.gold}18`,
    borderWidth: 1,
    borderColor: `${Colors.gold}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiTable: { gap: 0, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  kpiRow2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  kpiRowAlt: { backgroundColor: Colors.navy },
  kpiRowLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, flex: 1, lineHeight: 16 },
  kpiRowValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text, marginLeft: 8 },
});
