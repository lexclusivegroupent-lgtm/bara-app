import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { formatSEK, formatDate, getStatusColor, getStatusLabel, type JobType, JOB_TYPE_ICONS } from "@/constants/config";
import { StarRating } from "@/components/StarRating";

const JOB_LABELS_SV: Record<string, string> = {
  blocket_pickup: "Blocket hämtning",
  facebook_pickup: "Facebook Marketplace",
  small_furniture: "Liten möbel",
  office_items: "Kontorsföremål",
  children_items: "Barnprylar",
  electronics: "Elektronik",
  other_small: "Övrigt litet",
  // Legacy types
  furniture_transport: "Möbeltransport",
  bulky_delivery: "Tungvaror",
  junk_pickup: "Skräp & sopor",
};

const JOB_LABELS_EN: Record<string, string> = {
  blocket_pickup: "Blocket Pickup",
  facebook_pickup: "Facebook Marketplace",
  small_furniture: "Small Furniture",
  office_items: "Office Items",
  children_items: "Children's Items",
  electronics: "Electronics",
  other_small: "Other Small Items",
  // Legacy types
  furniture_transport: "Furniture Transport",
  bulky_delivery: "Bulky Delivery",
  junk_pickup: "Junk Pickup",
};

const JOB_ICONS: Record<string, string> = {
  blocket_pickup: "tag-outline",
  facebook_pickup: "store-outline",
  small_furniture: "chair-rolling",
  office_items: "briefcase-outline",
  children_items: "baby-carriage",
  electronics: "laptop",
  other_small: "package-variant-closed",
  // Legacy types
  furniture_transport: "sofa",
  bulky_delivery: "truck-outline",
  junk_pickup: "delete-sweep",
};

function getJobIcon(jobType: string): string {
  return JOB_ICONS[jobType] ?? "package-variant-closed";
}

function getJobLabel(jobType: string, lang: "sv" | "en" = "sv"): string {
  const map = lang === "sv" ? JOB_LABELS_SV : JOB_LABELS_EN;
  return map[jobType] ?? jobType;
}

export interface Job {
  id: number;
  customerId: number;
  driverId?: number | null;
  jobType: string;
  status: "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled" | "cancelled_by_customer" | "disputed";
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  homeAddress?: string | null;
  itemDescription: string;
  preferredTime: string;
  distanceKm?: number | null;
  priceTotal: number;
  driverPayout: number;
  platformFee: number;
  customerPrice?: number | null;
  cancellationFee?: number | null;
  rating?: number | null;
  paymentStatus?: "unpaid" | "paid";
  city?: string | null;
  createdAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  photosCustomer?: string[];
  photosPickup?: string[];
  photosDropoff?: string[];
  customer?: any;
  driver?: any;
}

interface Props {
  job: Job;
  onPress?: () => void;
  showAcceptButton?: boolean;
  onAccept?: () => void;
  isAccepting?: boolean;
  showDriverEarnings?: boolean;
}

export function JobCard({ job, onPress, showAcceptButton, onAccept, isAccepting, showDriverEarnings }: Props) {
  const statusColor = getStatusColor(job.status);
  const icon = getJobIcon(job.jobType);
  const labelSV = getJobLabel(job.jobType, "sv");
  const labelEN = getJobLabel(job.jobType, "en");

  const safePrice = job.priceTotal ?? 0;
  const safeDriverPayout = job.driverPayout ?? 0;
  const safePreferredTime = job.preferredTime ?? job.createdAt ?? null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={styles.cardHeader}>
        <View style={styles.jobIcon}>
          <MaterialCommunityIcons
            name={icon as any}
            size={22}
            color={Colors.gold}
          />
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobType} numberOfLines={1}>{labelSV} / {labelEN}</Text>
          <Text style={styles.itemDesc} numberOfLines={1}>{job.itemDescription || "—"}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(job.status)}</Text>
        </View>
      </View>

      {job.driver ? (
        <View style={styles.driverRow}>
          <Feather name="user" size={12} color={Colors.textMuted} />
          <Text style={styles.driverName} numberOfLines={1}>{job.driver.fullName ?? "Driver"}</Text>
          <StarRating
            rating={job.driver.rating != null ? Number(job.driver.rating) : null}
            totalJobs={job.driver.totalJobs ?? 0}
            size={12}
            showNew
            showCount={false}
          />
        </View>
      ) : null}

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Feather name="clock" size={12} color={Colors.textMuted} />
          <Text style={styles.footerMeta}>{safePreferredTime ? formatDate(safePreferredTime) : "—"}</Text>
        </View>
        {job.distanceKm != null && job.distanceKm > 0 && (
          <View style={styles.footerLeft}>
            <Feather name="map" size={12} color={Colors.textMuted} />
            <Text style={styles.footerMeta}>{job.distanceKm} km</Text>
          </View>
        )}
        <View style={styles.priceSection}>
          {showDriverEarnings ? (
            <View style={styles.earningsContainer}>
              <Text style={styles.earningsBig}>{formatSEK(safeDriverPayout)}</Text>
              <Text style={styles.earningsLabel}>Du tjänar / You earn</Text>
              <Text style={styles.totalSmall}>{formatSEK(job.customerPrice ?? safePrice)} totalt</Text>
              {job.customerPrice != null && job.customerPrice !== safePrice && (
                <Text style={styles.suggestedLabel}>
                  Föreslagen {formatSEK(safePrice)}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatSEK(job.customerPrice ?? safePrice)}</Text>
            </View>
          )}
        </View>
      </View>

      {job.status === "cancelled_by_customer" && job.cancellationFee != null && (
        <View style={styles.compensationBanner}>
          <Feather name="shield" size={13} color={Colors.success} />
          <Text style={styles.compensationText}>
            Cancellation compensation: {formatSEK(job.cancellationFee)}
          </Text>
        </View>
      )}

      {showAcceptButton && (
        <TouchableOpacity
          style={[styles.acceptBtn, isAccepting && styles.acceptBtnDisabled]}
          onPress={isAccepting ? undefined : onAccept}
          activeOpacity={0.85}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={Colors.navy} />
          ) : (
            <>
              <Text style={styles.acceptBtnText}>Accept Job</Text>
              <Feather name="check" size={15} color={Colors.navy} />
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    gap: 12,
  },
  jobIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  jobInfo: {
    flex: 1,
    gap: 3,
  },
  jobType: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  itemDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  driverName: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  priceSection: {
    marginLeft: "auto" as any,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    textAlign: "right",
  },
  earningsContainer: {
    alignItems: "flex-end",
  },
  earningsBig: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    textAlign: "right",
  },
  earningsLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
    opacity: 0.8,
  },
  totalSmall: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "right",
  },
  suggestedLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textDecorationLine: "line-through",
    textAlign: "right",
  },
  compensationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  compensationText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  acceptBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
});
