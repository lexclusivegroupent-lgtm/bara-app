import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/navigation";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

export default function Dac7ConsentScreen() {
  const { token, user, updateUser } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";

  const [personnummer, setPersonnummer] = useState(user?.personnummer || "");
  const [fullLegalName, setFullLegalName] = useState(user?.fullLegalName || user?.fullName || "");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = consented && personnummer.trim().length >= 10 && fullLegalName.trim().length > 2;

  async function handleConsent() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/users/dac7-consent`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personnummer: personnummer.trim(),
          fullLegalName: fullLegalName.trim(),
          registeredAddress: registeredAddress.trim() || null,
          bankAccountNumber: bankAccountNumber.trim() || null,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setError(data.error || "Failed to save consent"); return; }
      updateUser(data);
      router.replace("/driver-onboarding-checklist");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={safeBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Feather name="file-text" size={22} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isSv ? "Skatteverket-rapportering" : "Skatteverket Reporting"}
          </Text>
          <Text style={styles.subtitle}>DAC7 ⚖️</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.infoCard}>
          <Text style={styles.infoBody}>
            {isSv
              ? "Enligt EU-direktiv DAC7 är Bära skyldigt att rapportera dina inkomster till Skatteverket en gång per år. Detta inkluderar ditt namn, personnummer och totala inkomster via Bära."
              : "Under EU directive DAC7, Bära is required to report your earnings to Skatteverket once per year. This includes your name, personal identity number, and total earnings via Bära."}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>{isSv ? "Fullständigt juridiskt namn *" : "Full legal name *"}</Text>
          <TextInput
            style={styles.input}
            value={fullLegalName}
            onChangeText={setFullLegalName}
            placeholder={isSv ? "Förnamn Efternamn" : "First Last"}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>{isSv ? "Personnummer *" : "Personal identity number *"}</Text>
          <TextInput
            style={styles.input}
            value={personnummer}
            onChangeText={setPersonnummer}
            placeholder="YYYYMMDD-XXXX"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
            autoComplete="off"
          />

          <Text style={styles.fieldLabel}>{isSv ? "Folkbokföringsadress" : "Registered address"}</Text>
          <TextInput
            style={styles.input}
            value={registeredAddress}
            onChangeText={setRegisteredAddress}
            placeholder={isSv ? "Gatuadress, Postnummer Ort" : "Street address, Postcode City"}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.fieldLabel}>{isSv ? "Bankkontonummer (för utbetalningar)" : "Bank account number (for payouts)"}</Text>
          <TextInput
            style={styles.input}
            value={bankAccountNumber}
            onChangeText={setBankAccountNumber}
            placeholder={isSv ? "Clearingnr-Kontonr" : "Clearing-Account"}
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
            autoComplete="off"
          />
        </View>

        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setConsented(!consented)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, consented && styles.checkboxChecked]}>
            {consented && <Feather name="check" size={14} color={Colors.navy} />}
          </View>
          <Text style={styles.consentLabel}>
            {isSv
              ? "Jag förstår att Bära är skyldigt att rapportera mina inkomster till Skatteverket enligt DAC7-direktivet, och jag samtycker till att mina uppgifter ovan används för detta ändamål."
              : "I understand that Bära is required to report my earnings to Skatteverket under the DAC7 directive, and I consent to my details above being used for this purpose."}
          </Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={14} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleConsent}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.navy} />
            : <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
                {isSv ? "Bekräfta och fortsätt" : "Confirm and continue"}
              </Text>
          }
        </TouchableOpacity>

        <Text style={styles.legalNote}>
          {isSv
            ? "⚖️ Dina uppgifter behandlas säkert och delas enbart med Skatteverket som krävs av lag. Kräver juridisk granskning."
            : "⚖️ Your data is handled securely and shared only with Skatteverket as required by law. Requires legal review."}
        </Text>

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
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, marginTop: 2 },
  content: { padding: 20, gap: 14 },
  infoCard: {
    backgroundColor: `${Colors.gold}12`,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
  },
  infoBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  input: {
    backgroundColor: Colors.navy,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
  checkboxChecked: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  consentLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.error}15`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.error },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.navy },
  submitBtnTextDisabled: { color: Colors.textMuted },
  legalNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 17,
    textAlign: "center",
  },
});
