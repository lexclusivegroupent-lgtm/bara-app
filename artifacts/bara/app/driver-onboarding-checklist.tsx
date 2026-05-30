import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

type CheckItem = {
  id: string;
  titleEN: string;
  titleSV: string;
  descEN: string;
  descSV: string;
  linked?: boolean;
  linkLabelEN?: string;
  linkLabelSV?: string;
  linkRoute?: string;
};

const CHECKLIST: CheckItem[] = [
  {
    id: "agreement",
    titleEN: "Driver agreement signed",
    titleSV: "Föraravtal signerat",
    descEN: "You have read and accepted the Bära carrier agreement.",
    descSV: "Du har läst och godkänt Bäras uppdragstagaravtal.",
    linked: true,
    linkLabelEN: "Read agreement",
    linkLabelSV: "Läs avtal",
    linkRoute: "/driver-agreement",
  },
  {
    id: "dac7",
    titleEN: "Skatteverket reporting consent (DAC7)",
    titleSV: "Samtycke till Skatteverket-rapportering (DAC7)",
    descEN: "EU law requires Bära to report your earnings annually. Provide your personnummer.",
    descSV: "EU-lag kräver att Bära rapporterar dina inkomster årligen. Ange ditt personnummer.",
    linked: true,
    linkLabelEN: "Give consent",
    linkLabelSV: "Ge samtycke",
    linkRoute: "/dac7-consent",
  },
  {
    id: "ftax",
    titleEN: "F-tax (F-skatt) registration",
    titleSV: "F-skatteregistrering",
    descEN: "You are registered as an F-tax holder with Skatteverket.",
    descSV: "Du är registrerad som F-skatteinnehavare hos Skatteverket.",
    linked: true,
    linkLabelEN: "Add in profile",
    linkLabelSV: "Lägg till i profil",
    linkRoute: "/(driver)/edit-profile",
  },
  {
    id: "vehicle",
    titleEN: "I have my own vehicle",
    titleSV: "Jag har ett eget fordon",
    descEN: "Regular car, SUV, estate or car with roof box — fits small items.",
    descSV: "Vanlig bil, SUV, kombi eller bil med takbox — passar för små föremål.",
  },
  {
    id: "lifting",
    titleEN: "I can safely lift up to 15 kg",
    titleSV: "Jag kan säkert lyfta upp till 15 kg",
    descEN: "Bära jobs involve items up to 15 kg. You must be able to handle them safely.",
    descSV: "Bära-jobb involverar föremål upp till 15 kg. Du måste kunna hantera dem säkert.",
  },
  {
    id: "prohibited",
    titleEN: "I understand prohibited items",
    titleSV: "Jag förstår förbjudna föremål",
    descEN: "No waste, hazardous materials, items over 15 kg or full household moves.",
    descSV: "Inget avfall, farliga material, föremål över 15 kg eller hela hemmaflytt.",
  },
  {
    id: "contractor",
    titleEN: "I am an independent contractor",
    titleSV: "Jag är en oberoende uppdragstagare",
    descEN: "I am not an employee of Bära. I set my own hours and choose my own jobs.",
    descSV: "Jag är inte anställd av Bära. Jag sätter mina egna tider och väljer mina jobb.",
  },
];

export default function DriverOnboardingChecklistScreen() {
  const { user, token, updateUser } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    return {
      agreement: !!user?.driverAgreementAccepted,
      dac7: !!user?.dac7Consented,
      ftax: !!user?.ftaxRegistered,
      vehicle: false,
      lifting: false,
      prohibited: false,
      contractor: false,
    };
  });

  const allChecked = CHECKLIST.every((item) => checked[item.id]);

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleComplete() {
    if (!allChecked) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/complete-driver-onboarding`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await safeJson(res);
      if (res.ok) {
        updateUser(data);
        router.replace("/(driver)/map");
      }
    } catch {}
    setLoading(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Feather name="clipboard" size={22} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isSv ? "Driver-setup" : "Driver Setup"}
          </Text>
          <Text style={styles.subtitle}>
            {isSv ? "Bekräfta att du uppfyller alla krav" : "Confirm you meet all requirements"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {isSv
            ? "Innan du kan acceptera jobb behöver du bekräfta följande punkter. Vissa krav fylls i automatiskt om de redan är uppfyllda."
            : "Before you can accept jobs, please confirm the following. Some items are pre-filled if already complete."}
        </Text>

        {CHECKLIST.map((item) => {
          const isChecked = checked[item.id];
          const isLocked = (item.id === "agreement" && !!user?.driverAgreementAccepted)
            || (item.id === "dac7" && !!user?.dac7Consented)
            || (item.id === "ftax" && !!user?.ftaxRegistered);
          return (
            <View key={item.id} style={[styles.checkCard, isChecked && styles.checkCardChecked]}>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => !isLocked && toggle(item.id)}
                activeOpacity={isLocked ? 1 : 0.8}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Feather name="check" size={14} color={Colors.navy} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, isChecked && styles.itemTitleChecked]}>
                    {isSv ? item.titleSV : item.titleEN}
                  </Text>
                  <Text style={styles.itemDesc}>
                    {isSv ? item.descSV : item.descEN}
                  </Text>
                </View>
              </TouchableOpacity>

              {item.linked && !isChecked && (
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => router.push(item.linkRoute as any)}
                  activeOpacity={0.8}
                >
                  <Feather name="external-link" size={13} color={Colors.gold} />
                  <Text style={styles.linkBtnText}>
                    {isSv ? item.linkLabelSV : item.linkLabelEN}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.completeBtn, !allChecked && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={!allChecked || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.navy} />
            : (
              <>
                <Feather name="check-circle" size={18} color={allChecked ? Colors.navy : Colors.textMuted} />
                <Text style={[styles.completeBtnText, !allChecked && styles.completeBtnTextDisabled]}>
                  {isSv ? "Slutför setup och börja ta jobb" : "Complete setup and start accepting jobs"}
                </Text>
              </>
            )
          }
        </TouchableOpacity>

        {!allChecked && (
          <Text style={styles.remainingNote}>
            {isSv
              ? `${Object.values(checked).filter(Boolean).length} / ${CHECKLIST.length} bekräftade`
              : `${Object.values(checked).filter(Boolean).length} / ${CHECKLIST.length} confirmed`}
          </Text>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 56, height: 56, justifyContent: "center", alignItems: "center" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${Colors.gold}40`,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  content: { padding: 20, gap: 12 },
  intro: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 4,
  },
  checkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  checkCardChecked: {
    borderColor: `${Colors.gold}50`,
    backgroundColor: `${Colors.gold}08`,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    marginBottom: 3,
  },
  itemTitleChecked: { color: Colors.text },
  itemDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 18,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 2,
  },
  linkBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  completeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  completeBtnDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  completeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.navy,
  },
  completeBtnTextDisabled: { color: Colors.textMuted },
  remainingNote: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginTop: -4,
  },
});
