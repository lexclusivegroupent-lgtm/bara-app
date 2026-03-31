import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";

export default function DriverSettingsScreen() {
  const { user, token, logout, updateUser, setActiveMode } = useAuth();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const insets = useSafeAreaInsets();

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  }

  async function toggleAvailability() {
    try {
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: !user?.isAvailable }),
      });
      const data = await safeJson(res);
      if (res.ok) updateUser(data);
    } catch {}
  }

  function handleSwitchToCustomer() {
    setActiveMode("customer");
    router.replace("/(customer)/home");
  }

  async function handleUpgradeToCustomer() {
    Alert.alert(
      "Also post jobs as a Customer?",
      "You'll be able to post jobs and get items carried for you too.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Enable",
          onPress: async () => {
            setUpgradeLoading(true);
            try {
              const res = await fetch(`${BASE_URL}/api/users/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role: "both" }),
              });
              const data = await safeJson(res);
              if (!res.ok) throw new Error(data.error || "Upgrade failed");
              updateUser(data);
              Alert.alert("Done!", "You can now switch between Customer and Driver mode.");
            } catch (e: any) {
              Alert.alert("Error", e.message || "Could not upgrade account.");
            } finally {
              setUpgradeLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Feather name="user" size={28} color={Colors.gold} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>
                {user?.city} • {user?.role === "both" ? "Driver Mode" : "Driver"}
              </Text>
            </View>
          </View>
        </View>

        {user?.role === "both" && (
          <TouchableOpacity style={styles.switchModeCard} onPress={handleSwitchToCustomer} activeOpacity={0.85}>
            <View style={styles.switchModeLeft}>
              <View style={styles.switchModeIcon}>
                <Feather name="home" size={18} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.switchModeTitle}>Switch to Customer Mode</Text>
                <Text style={styles.switchModeSubtext}>Post and track jobs</Text>
              </View>
            </View>
            <Feather name="arrow-right" size={16} color={Colors.gold} />
          </TouchableOpacity>
        )}

        {user?.rating && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Feather name="star" size={16} color={Colors.gold} />
              <Text style={styles.statValue}>{Number(user.rating).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="briefcase" size={16} color={Colors.gold} />
              <Text style={styles.statValue}>{user.totalJobs}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Driver Status</Text>
          <View style={styles.availabilityRow}>
            <View>
              <Text style={styles.rowLabel}>Available for Jobs</Text>
              <Text style={styles.rowSubtext}>Accept new job requests</Text>
            </View>
            <Switch
              value={!!user?.isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: Colors.border, true: `${Colors.success}60` }}
              thumbColor={user?.isAvailable ? Colors.success : Colors.textMuted}
            />
          </View>
          {user?.vehicleDescription && (
            <View style={styles.vehicleRow}>
              <Feather name="truck" size={14} color={Colors.textMuted} />
              <Text style={styles.vehicleText}>{user.vehicleDescription}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account Type</Text>
          {user?.role === "both" ? (
            <View style={styles.accountTypeRow}>
              <View style={styles.accountTypeIconWrap}>
                <Feather name="check-circle" size={18} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountTypeTitle}>Customer and Driver</Text>
                <Text style={styles.accountTypeSubtext}>You can post jobs and earn money carrying items</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeRow}
              onPress={handleUpgradeToCustomer}
              disabled={upgradeLoading}
              activeOpacity={0.8}
            >
              <View style={styles.accountTypeIconWrap}>
                <Feather name="home" size={18} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>Also post jobs as a Customer</Text>
                <Text style={styles.upgradeSubtext}>Use Bära to get items carried for you too</Text>
              </View>
              {upgradeLoading
                ? <ActivityIndicator size="small" color={Colors.gold} />
                : <Feather name="chevron-right" size={16} color={Colors.textMuted} />}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <SettingsRow icon="edit-2" label="Edit Profile" onPress={() => router.push("/(driver)/edit-profile")} />
          <SettingsRow icon="bell" label="Notifications" onPress={() => router.push("/notifications")} />
        </View>

        <View style={styles.aboutSection}>
          <View style={styles.aboutHeader}>
            <MaterialCommunityIcons name="information-outline" size={16} color={Colors.gold} />
            <Text style={styles.aboutTitle}>About Bära</Text>
          </View>
          <Text style={styles.aboutText}>
            Bära connects customers across Sweden with drivers like you for on-demand furniture transport and junk pickup. Simple, fast, and trustworthy.
          </Text>
          <Text style={styles.aboutTextSV}>
            Bära kopplar ihop kunder i Sverige med förare som du för möbeltransport och skräphämtning. Enkelt, snabbt och pålitligt.
          </Text>
          <View style={styles.aboutFreeBadge}>
            <Feather name="gift" size={12} color={Colors.gold} />
            <Text style={[styles.aboutFreeBadgeText, { color: Colors.gold }]}>No platform fees during launch · Inga plattformsavgifter under lansering</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Legal</Text>
          <SettingsRow icon="file-text" label="Terms of Service" onPress={() => router.push("/terms")} />
          <SettingsRow icon="shield" label="Privacy Policy" onPress={() => router.push("/privacy")} />
          <SettingsRow icon="truck" label="Driver Terms" onPress={() => router.push("/driver-terms")} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Privacy & Data</Text>
          <SettingsRow icon="download" label="Request Data Export" onPress={() => router.push("/privacy")} />
          <SettingsRow icon="trash-2" label="Request Account Deletion" onPress={() => router.push("/privacy")} danger />
        </View>

        <View style={styles.section}>
          <SettingsRow icon="log-out" label="Log Out" onPress={handleLogout} danger />
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 16 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

function SettingsRow({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Feather name={icon} size={16} color={danger ? Colors.error : Colors.textMuted} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {!danger && <Feather name="chevron-right" size={16} color={Colors.textMuted} />}
    </TouchableOpacity>
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
  content: { padding: 20, gap: 16 },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${Colors.gold}40`,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  profileBadge: {
    backgroundColor: `${Colors.gold}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  profileBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.gold },
  switchModeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
  },
  switchModeLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchModeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  switchModeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  switchModeSubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  aboutSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  aboutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  aboutTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  aboutText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  aboutTextSV: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    fontStyle: "italic",
    lineHeight: 17,
  },
  aboutFreeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: `${Colors.gold}25`,
    marginTop: 2,
  },
  aboutFreeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: { backgroundColor: `${Colors.error}20` },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  rowLabelDanger: { color: Colors.error },
  rowSubtext: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  accountTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  accountTypeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.success}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  accountTypeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  accountTypeSubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  upgradeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  upgradeSubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  vehicleText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
