import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, formatDate, getJobTypeLabel, getStatusColor, JOB_TYPE_ICONS } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";

interface Lead {
  id: number;
  jobType: string;
  status: string;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  itemDescription: string;
  preferredTime: string;
  city: string;
  contactName: string | null;
  contactPhone: string | null;
  assignedAt: string | null;
  contactedAt: string | null;
  photosCustomer: string[];
  customer: { fullName: string; email: string } | null;
}

const ACTIVE_STATUSES = ["assigned", "contacted", "accepted", "arrived", "in_progress"];

export default function PartnerLeadsScreen() {
  const { user, token } = useAuth();
  const { lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data: leads, isLoading, refetch, isRefetching } = useQuery<Lead[]>({
    queryKey: ["partnerLeads", user?.id],
    queryFn: async () => {
      // The API scopes this to requests assigned to the current user
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = await safeJson(res);
      return all.filter((j: Lead & { customerId: number }) => (j as any).driverId === user?.id);
    },
    enabled: !!token && !!user,
    refetchInterval: 30000,
  });

  const activeLeads = (leads || []).filter((l) => ACTIVE_STATUSES.includes(l.status));
  const pastLeads = (leads || []).filter((l) => !ACTIVE_STATUSES.includes(l.status)).slice(0, 10);

  const respond = useCallback(async (leadId: number, action: "accept" | "decline" | "contacted", reason?: string) => {
    setActionLoading(leadId);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${leadId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reason }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed");
      refetch();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update the request.");
    } finally {
      setActionLoading(null);
    }
  }, [token, refetch]);

  function handleDecline(leadId: number) {
    Alert.alert(
      isSv ? "Tacka nej till förfrågan?" : "Decline this request?",
      isSv ? "Förfrågan går tillbaka till Bära och skickas till en annan partner." : "The request goes back to Bära and will be routed to another partner.",
      [
        { text: isSv ? "Avbryt" : "Cancel", style: "cancel" },
        { text: isSv ? "Tacka nej" : "Decline", style: "destructive", onPress: () => respond(leadId, "decline") },
      ]
    );
  }

  function statusLabel(status: string): string {
    const sv: Record<string, string> = {
      assigned: "Ny förfrågan", contacted: "Kund kontaktad", accepted: "Bokad",
      arrived: "På plats", in_progress: "Pågår", completed: "Slutförd",
      cancelled: "Avbokad", declined: "Nekad",
    };
    const en: Record<string, string> = {
      assigned: "New lead", contacted: "Customer contacted", accepted: "Booked",
      arrived: "On site", in_progress: "In progress", completed: "Completed",
      cancelled: "Cancelled", declined: "Declined",
    };
    return (isSv ? sv : en)[status] || status;
  }

  function renderLead(lead: Lead, isActive: boolean) {
    const busy = actionLoading === lead.id;
    return (
      <View key={lead.id} style={styles.leadCard}>
        <View style={styles.leadHeader}>
          <View style={styles.leadTypeRow}>
            <MaterialCommunityIcons
              name={(JOB_TYPE_ICONS[lead.jobType as keyof typeof JOB_TYPE_ICONS] || "package-variant-closed") as any}
              size={18}
              color={Colors.gold}
            />
            <Text style={styles.leadType}>{getJobTypeLabel(lead.jobType)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(lead.status)}22`, borderColor: getStatusColor(lead.status) }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(lead.status) }]}>{statusLabel(lead.status)}</Text>
          </View>
        </View>

        <Text style={styles.leadDesc} numberOfLines={2}>{lead.itemDescription}</Text>

        <View style={styles.leadDetailRow}>
          <Feather name="map-pin" size={13} color={Colors.textMuted} />
          <Text style={styles.leadDetailText} numberOfLines={1}>
            {lead.pickupAddress || lead.city}{lead.dropoffAddress ? ` → ${lead.dropoffAddress}` : ""}
          </Text>
        </View>
        <View style={styles.leadDetailRow}>
          <Feather name="clock" size={13} color={Colors.textMuted} />
          <Text style={styles.leadDetailText}>{formatDate(lead.preferredTime)}</Text>
        </View>
        {(lead.contactName || lead.customer?.fullName) && (
          <View style={styles.leadDetailRow}>
            <Feather name="user" size={13} color={Colors.textMuted} />
            <Text style={styles.leadDetailText}>
              {lead.contactName || lead.customer?.fullName}
              {lead.contactPhone ? ` · ${lead.contactPhone}` : ""}
            </Text>
          </View>
        )}

        {isActive && (
          <View style={styles.actionsRow}>
            {lead.contactPhone ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() => Linking.openURL(`tel:${lead.contactPhone}`)}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={14} color={Colors.navy} />
                <Text style={styles.callBtnText}>{isSv ? "Ring kund" : "Call customer"}</Text>
              </TouchableOpacity>
            ) : null}

            {busy ? (
              <ActivityIndicator size="small" color={Colors.gold} style={{ marginLeft: 8 }} />
            ) : (
              <>
                {lead.status === "assigned" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.secondaryBtn]}
                    onPress={() => respond(lead.id, "contacted")}
                    activeOpacity={0.8}
                  >
                    <Feather name="message-circle" size={14} color={Colors.gold} />
                    <Text style={styles.secondaryBtnText}>{isSv ? "Kontaktad" : "Contacted"}</Text>
                  </TouchableOpacity>
                )}
                {["assigned", "contacted"].includes(lead.status) && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => respond(lead.id, "accept")}
                      activeOpacity={0.8}
                    >
                      <Feather name="check" size={14} color="#fff" />
                      <Text style={styles.acceptBtnText}>{isSv ? "Acceptera" : "Accept"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn]}
                      onPress={() => handleDecline(lead.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={14} color={Colors.error} />
                    </TouchableOpacity>
                  </>
                )}
                {["accepted", "arrived", "in_progress"].includes(lead.status) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.secondaryBtn]}
                    onPress={() => router.push({ pathname: "/(driver)/active-job", params: { id: String(lead.id) } })}
                    activeOpacity={0.8}
                  >
                    <Feather name="arrow-right" size={14} color={Colors.gold} />
                    <Text style={styles.secondaryBtnText}>{isSv ? "Öppna bokning" : "Open booking"}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <View>
          <Text style={styles.title}>{isSv ? "Mina förfrågningar" : "My Leads"}</Text>
          <Text style={styles.subtitle}>
            {user?.companyName || (isSv ? "Förfrågningar tilldelade av Bära" : "Requests routed to you by Bära")}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 60 }} />
        ) : activeLeads.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="inbox-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{isSv ? "Inga aktiva förfrågningar" : "No active leads"}</Text>
            <Text style={styles.emptySub}>
              {isSv
                ? "När Bära tilldelar dig en förfrågan visas den här. Du får också en notis."
                : "When Bära routes a request to you, it shows up here. You'll also get a notification."}
            </Text>
          </View>
        ) : (
          activeLeads.map((l) => renderLead(l, true))
        )}

        {pastLeads.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{isSv ? "Historik" : "History"}</Text>
            {pastLeads.map((l) => renderLead(l, false))}
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  content: { padding: 20, gap: 12 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginTop: 12,
  },
  leadCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  leadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  leadTypeRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  leadType: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  leadDesc: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  leadDetailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  leadDetailText: { fontSize: 12, color: Colors.textMuted, flex: 1 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  callBtn: { backgroundColor: Colors.gold },
  callBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  acceptBtn: { backgroundColor: Colors.success },
  acceptBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  secondaryBtn: { borderWidth: 1, borderColor: `${Colors.gold}60`, backgroundColor: `${Colors.gold}12` },
  secondaryBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.gold },
  declineBtn: { borderWidth: 1, borderColor: `${Colors.error}60`, backgroundColor: `${Colors.error}12` },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 19 },
});
