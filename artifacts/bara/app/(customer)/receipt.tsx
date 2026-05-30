import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { safeBack } from "@/utils/navigation";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, formatSEK, formatDate, getJobTypeLabel } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { Job } from "@/components/JobCard";

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();
  const [resending, setResending] = useState(false);

  const { data: job, isLoading, isError } = useQuery<Job>({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || "Failed to load job");
      return data;
    },
    enabled: !!token && !!id,
  });

  async function handleResend() {
    if (!id || resending) return;
    setResending(true);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${id}/resend-receipt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || "Failed");
      Alert.alert(t("receiptTitle"), t("receiptEmailSent"));
    } catch (err: any) {
      Alert.alert(t("error"), err?.message || t("errorUnknown"));
    } finally {
      setResending(false);
    }
  }

  function handleOpenBrowser() {
    const url = `${BASE_URL}/api/jobs/${id}/receipt`;
    Linking.openURL(url).catch(() =>
      Alert.alert(t("error"), t("errorUnknown"))
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  if (isError || !job || job.status !== "completed") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={safeBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("receiptTitle")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🧾</Text>
          <Text style={styles.emptyTitle}>{t("receiptNotFound")}</Text>
          <Text style={styles.emptySub}>{t("receiptNotFoundSub")}</Text>
        </View>
      </View>
    );
  }

  const finalPrice = job.customerPrice ?? job.priceTotal;
  const hasDiscount = job.discountAmount != null && job.discountAmount > 0;
  const jobRef = `#${String(job.id).padStart(6, "0")}`;
  const completedDate = formatDate(job.completedAt || job.createdAt);
  const serviceLabel = getJobTypeLabel(job.jobType) || job.jobType.replace(/_/g, " ");

  const driverName = (job as any).driver?.fullName ?? (isSv ? "Okänd förare" : "Unknown driver");
  const driverRating = (job as any).driver?.rating;

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.headerRow, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={safeBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("receiptTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Receipt card */}
        <View style={styles.card}>
          {/* Top badge */}
          <View style={styles.completedBadge}>
            <Feather name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.completedBadgeText}>
              {isSv ? "Slutförd" : "Completed"}
            </Text>
          </View>

          {/* Job ref */}
          <Text style={styles.jobRef}>{jobRef}</Text>
          <Text style={styles.jobDate}>{completedDate}</Text>

          <View style={styles.divider} />

          {/* Service */}
          <Row label={t("serviceType")} value={serviceLabel} />

          {/* Addresses */}
          {job.pickupAddress ? (
            <Row
              label={isSv ? "Upphämtning" : "Pickup"}
              value={job.pickupAddress}
              icon="map-pin"
            />
          ) : null}
          {job.dropoffAddress ? (
            <Row
              label={isSv ? "Avlämning" : "Drop-off"}
              value={job.dropoffAddress}
              icon="navigation"
            />
          ) : null}
          {job.homeAddress && !job.pickupAddress ? (
            <Row
              label={isSv ? "Adress" : "Address"}
              value={job.homeAddress}
              icon="home"
            />
          ) : null}
          {job.distanceKm != null && job.distanceKm > 0 ? (
            <Row
              label={t("receiptDistanceLabel")}
              value={`${job.distanceKm.toFixed(1)} km`}
              icon="activity"
            />
          ) : null}

          <View style={styles.divider} />

          {/* Driver */}
          <View style={styles.driverRow}>
            <View style={styles.driverIcon}>
              <Feather name="user" size={16} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t("receiptDriverLabel")}</Text>
              <Text style={styles.rowValue}>{driverName}</Text>
              {driverRating != null && (
                <Text style={styles.driverRating}>
                  {"★".repeat(Math.round(Number(driverRating)))}{"☆".repeat(5 - Math.round(Number(driverRating)))} {Number(driverRating).toFixed(1)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Price breakdown */}
          <Text style={styles.sectionLabel}>{t("receiptPriceBreakdown")}</Text>
          {hasDiscount ? (
            <>
              <PriceRow
                label={t("receiptSubtotal")}
                value={formatSEK(Math.round(job.priceTotal))}
              />
              <PriceRow
                label={t("receiptDiscount")}
                value={`-${formatSEK(Math.round(job.discountAmount!))}`}
                accent
              />
            </>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("receiptTotal")}</Text>
            <Text style={styles.totalValue}>{formatSEK(Math.round(finalPrice))}</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.85}
        >
          {resending ? (
            <ActivityIndicator color={Colors.navy} size="small" />
          ) : (
            <Feather name="mail" size={16} color={Colors.navy} />
          )}
          <Text style={styles.primaryBtnText}>
            {resending ? t("resending") : t("resendReceiptEmail")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleOpenBrowser}
          activeOpacity={0.85}
        >
          <Feather name="external-link" size={16} color={Colors.text} />
          <Text style={styles.secondaryBtnText}>{t("openReceiptBrowser")}</Text>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === "web" ? 32 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: string;
}) {
  return (
    <View style={styles.infoRow}>
      {icon ? (
        <Feather name={icon as any} size={14} color={Colors.textMuted} style={{ marginTop: 2 }} />
      ) : (
        <View style={{ width: 14 }} />
      )}
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function PriceRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, accent && { color: Colors.success }]}>{label}</Text>
      <Text style={[styles.priceValue, accent && { color: Colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 52, textAlign: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 56, height: 56, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  content: { padding: 20, gap: 14 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: `${Colors.success}18`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.success}40`,
  },
  completedBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  jobRef: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  jobDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: -4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  rowLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  driverIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  driverRating: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.gold,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  priceValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  primaryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  secondaryBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
