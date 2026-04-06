import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";

type CarrierType = "vehicle" | "walker";

export default function SettingsScreen() {
  const { user, token, logout, setActiveMode, updateUser } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const insets = useSafeAreaInsets();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [carrierType, setCarrierType] = useState<CarrierType>("vehicle");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleDeleteAccount() {
    Alert.alert(t("deleteAccountTitle"), t("deleteAccountConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteAccountBtn"),
        style: "destructive",
        onPress: async () => {
          setDeletingAccount(true);
          try {
            const res = await fetch(`${BASE_URL}/api/users/account`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await safeJson(res);
            if (!res.ok) throw new Error(data.error || "Failed to delete");
            await logout();
            Alert.alert(t("accountDeleted"), t("accountDeletedMsg"));
            router.replace("/");
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete account.");
          } finally {
            setDeletingAccount(false);
          }
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert(t("logOutTitle"), t("logOutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logOut"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  }

  function handleSwitchToDriver() {
    setActiveMode("driver");
    router.replace("/(driver)/map");
  }

  async function handleUpgradeToDriver() {
    if (carrierType === "vehicle" && !vehicleDescription.trim()) {
      Alert.alert(t("missingInfo"), t("pleaseDescribeVehicle"));
      return;
    }
    setUpgradeLoading(true);
    try {
      const body: Record<string, any> = { role: "both" };
      if (vehicleDescription.trim()) body.vehicleDescription = vehicleDescription.trim();
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Upgrade failed");
      updateUser(data);
      setShowUpgradeModal(false);
      Alert.alert(t("nowDriver"), t("canNowSwitch"));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not upgrade account.");
    } finally {
      setUpgradeLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <Text style={styles.title}>{t("settingsTitle")}</Text>
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
                {user?.city} • {user?.role === "both" ? t("customerModeBadge") : t("customer")}
              </Text>
            </View>
          </View>
        </View>

        {user?.role === "both" && (
          <TouchableOpacity style={styles.switchModeCard} onPress={handleSwitchToDriver} activeOpacity={0.85}>
            <View style={styles.switchModeLeft}>
              <View style={styles.switchModeIcon}>
                <Feather name="truck" size={18} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.switchModeTitle}>{t("switchToDriver")}</Text>
                <Text style={styles.switchModeSubtext}>{t("switchToDriverSub")}</Text>
              </View>
            </View>
            <Feather name="arrow-right" size={16} color={Colors.gold} />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("accountType")}</Text>
          {user?.role === "both" ? (
            <View style={styles.accountTypeRow}>
              <View style={styles.accountTypeIconWrap}>
                <Feather name="check-circle" size={18} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountTypeTitle}>{t("customerAndDriver")}</Text>
                <Text style={styles.accountTypeSubtext}>{t("customerAndDriverSub")}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.upgradeRow} onPress={() => setShowUpgradeModal(true)} activeOpacity={0.8}>
              <View style={styles.accountTypeIconWrap}>
                <Feather name="truck" size={18} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>{t("becomeDriver")}</Text>
                <Text style={styles.upgradeSubtext}>{t("becomeDriverSub")}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("account")}</Text>
          <SettingsRow icon="edit-2" label={t("editProfile")} onPress={() => router.push("/(customer)/edit-profile")} />
          <SettingsRow icon="bell" label={t("notifications")} onPress={() => router.push("/notifications")} />
        </View>

        {/* Language toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("language")}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === "sv" && styles.langBtnActive]}
              onPress={() => setLang("sv")}
              activeOpacity={0.8}
            >
              <Text style={[styles.langBtnText, lang === "sv" && styles.langBtnTextActive]}>Svenska</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
              onPress={() => setLang("en")}
              activeOpacity={0.8}
            >
              <Text style={[styles.langBtnText, lang === "en" && styles.langBtnTextActive]}>English</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.aboutSection}>
          <View style={styles.aboutHeader}>
            <MaterialCommunityIcons name="information-outline" size={16} color={Colors.gold} />
            <Text style={styles.aboutTitle}>{t("aboutBara")}</Text>
          </View>
          <Text style={styles.aboutText}>{t("aboutTextSV")}</Text>
          <View style={styles.aboutFreeBadge}>
            <Feather name="gift" size={12} color={Colors.success} />
            <Text style={styles.aboutFreeBadgeText}>{t("freeLaunchBadge")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("legal")}</Text>
          <SettingsRow icon="file-text" label={t("termsOfServiceRow")} onPress={() => router.push("/terms")} />
          <SettingsRow icon="shield" label={t("privacyPolicy")} onPress={() => router.push("/privacy")} />
          <SettingsRow icon="lock" label={lang === "sv" ? "Data & integritet" : "Data & Privacy"} onPress={() => router.push("/data-privacy")} />
          <SettingsRow icon="shield" label={lang === "sv" ? "Försäkring & säkerhet" : "Insurance & Safety"} onPress={() => router.push("/insurance-safety")} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("privacyData")}</Text>
          <SettingsRow icon="headphones" label={t("contactSupport")} onPress={() => router.push("/support")} />
          <SettingsRow icon="download" label={t("requestDataExport")} onPress={() => router.push("/data-privacy")} />
          <SettingsRow icon="trash-2" label={t("deleteAccount")} onPress={handleDeleteAccount} danger />
        </View>

        <View style={styles.section}>
          <SettingsRow icon="log-out" label={t("logOut")} onPress={handleLogout} danger />
        </View>

        <View style={styles.versionBlock}>
          <Text style={styles.versionText}>{t("appVersion")}</Text>
          <Text style={styles.copyrightText}>{t("appCopyright")}</Text>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 16 }} />
      </ScrollView>

      <BottomNav />

      <Modal visible={showUpgradeModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("becomeDriverModal")}</Text>
              <TouchableOpacity onPress={() => setShowUpgradeModal(false)} style={styles.modalClose}>
                <Feather name="x" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t("becomeDriverModalSub")}</Text>

            <Text style={styles.fieldLabel}>{t("howCarry")}</Text>
            <View style={styles.carrierRow}>
              {([["vehicle", "truck", t("withVehicle")], ["walker", "user", t("onFoot")]] as const).map(([type, icon, label]) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.carrierOption, carrierType === type && styles.carrierOptionActive]}
                  onPress={() => setCarrierType(type)}
                  activeOpacity={0.8}
                >
                  <Feather name={icon as any} size={18} color={carrierType === type ? Colors.navy : Colors.textMuted} />
                  <Text style={[styles.carrierLabel, carrierType === type && styles.carrierLabelActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              {carrierType === "vehicle" ? t("vehicleDescRequired") : t("additionalInfo")}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={carrierType === "vehicle" ? "e.g. Volvo V70, trailer, van..." : "e.g. cargo bike, backpack..."}
              placeholderTextColor={Colors.textMuted}
              value={vehicleDescription}
              onChangeText={setVehicleDescription}
            />

            <TouchableOpacity
              style={[styles.upgradeBtn, upgradeLoading && styles.disabled]}
              onPress={handleUpgradeToDriver}
              disabled={upgradeLoading}
              activeOpacity={0.85}
            >
              {upgradeLoading
                ? <ActivityIndicator color={Colors.navy} />
                : <Text style={styles.upgradeBtnText}>{t("startDriving")}</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  langRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  langBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  langBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  langBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  langBtnTextActive: {
    color: Colors.navy,
  },
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
  aboutFreeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.success}18`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
    marginTop: 2,
  },
  aboutFreeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  modalClose: { padding: 4 },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 20,
    marginTop: -8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: -8,
  },
  carrierRow: { flexDirection: "row", gap: 12 },
  carrierOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  carrierOptionActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  carrierLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  carrierLabelActive: { color: Colors.navy, fontFamily: "Inter_600SemiBold" },
  modalInput: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  versionBlock: {
    alignItems: "center" as const,
    paddingVertical: 20,
    gap: 4,
  },
  versionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  copyrightText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.border,
  },
  upgradeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  disabled: { opacity: 0.6 },
  upgradeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.navy },
});
