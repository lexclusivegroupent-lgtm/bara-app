import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";

const PLACEHOLDER_TEXTS = {
  sv: {
    title: "Hämta från Blocket eller Facebook",
    subtitle: "Snabb väg för att boka en hämtning",
    inputLabel: "Klistra in länk eller annonstext",
    inputPlaceholder: "https://www.blocket.se/... eller textinnehåll från annons",
    extractBtn: "Extrahera information",
    extracting: "Extraherar...",
    savedAddresses: "Sparade adresser",
    homeAddress: "Hem",
    workAddress: "Jobb",
    useAddress: "Använd denna adress",
    continueToJob: "Fortsätt till jobbformulär",
    noAddresses: "Ingen adress sparad ännu",
    homeAddressHint: "Din hemadress för snabbare val",
    workAddressHint: "Din jobbadress för snabbare val",
  },
  en: {
    title: "Pickup from Blocket or Facebook",
    subtitle: "Quick way to book a pickup",
    inputLabel: "Paste link or listing text",
    inputPlaceholder: "https://www.blocket.se/... or ad text content",
    extractBtn: "Extract information",
    extracting: "Extracting...",
    savedAddresses: "Saved addresses",
    homeAddress: "Home",
    workAddress: "Work",
    useAddress: "Use this address",
    continueToJob: "Continue to job form",
    noAddresses: "No address saved yet",
    homeAddressHint: "Your home address for quick selection",
    workAddressHint: "Your work address for quick selection",
  },
};

interface ExtractedInfo {
  title?: string;
  description?: string;
  address?: string;
  price?: number;
}

export default function BlocketFastFlowScreen() {
  const { token } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isSv = lang === "sv";
  const t = PLACEHOLDER_TEXTS[isSv ? "sv" : "en"];

  const [input, setInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedInfo | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Array<{ label: string; address: string }>>([]);

  async function handleExtract() {
    if (!input.trim()) {
      Alert.alert(isSv ? "Klistra in data" : "Paste content", isSv ? "Ange länk eller text" : "Enter link or text");
      return;
    }

    setExtracting(true);
    try {
      // Simple extraction logic (would be more sophisticated in production)
      // Extract title, description, and any address info from the input text
      const lines = input.split("\n");
      const extracted: ExtractedInfo = {
        title: lines[0] || "Item from listing",
        description: lines.slice(1, 4).join(" ") || "Item to be picked up",
      };

      // Try to extract price if present
      const priceMatch = input.match(/(\d{2,}\s*(?:kr|sek))/i);
      if (priceMatch) {
        const price = parseInt(priceMatch[1]);
        if (!isNaN(price)) extracted.price = price;
      }

      setExtracted(extracted);
      Alert.alert(isSv ? "Framgång" : "Success", isSv ? "Information extraherad" : "Information extracted");
    } catch (e) {
      Alert.alert(isSv ? "Fel" : "Error", isSv ? "Kunde inte extrahera information" : "Could not extract information");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveAddress(label: string, address: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label, address }),
      });

      if (res.ok) {
        setSavedAddresses([...savedAddresses, { label, address }]);
        Alert.alert(isSv ? "Sparad" : "Saved", isSv ? "Adress sparad" : "Address saved");
      }
    } catch (e) {
      Alert.alert(isSv ? "Fel" : "Error", isSv ? "Kunde inte spara adress" : "Could not save address");
    }
  }

  function handleContinueToJob() {
    if (!extracted) {
      Alert.alert(isSv ? "Extrahera först" : "Extract first", isSv ? "Extrahera information innan du fortsätter" : "Extract information first");
      return;
    }

    // Navigate to job creation with pre-filled data
    router.push({
      pathname: "/(customer)/post-job",
      params: {
        itemDescription: extracted.title || extracted.description || "",
        priceTotal: extracted.price ? extracted.price.toString() : "",
        source: "blocket-fast-flow",
      },
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={Colors.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.inputLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.inputPlaceholder}
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            value={input}
            onChangeText={setInput}
            editable={!extracting}
          />
          <TouchableOpacity
            style={[styles.extractButton, extracting && styles.extractButtonDisabled]}
            onPress={handleExtract}
            disabled={extracting}
            activeOpacity={0.85}
          >
            {extracting ? (
              <ActivityIndicator size="small" color={Colors.navy} />
            ) : (
              <>
                <Feather name="zap" size={16} color={Colors.navy} />
                <Text style={styles.extractButtonText}>{t.extractBtn}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Extracted Info */}
        {extracted && (
          <View style={[styles.section, styles.extractedSection]}>
            <Text style={styles.sectionTitle}>{extracted.title}</Text>
            <Text style={styles.extractedDesc}>{extracted.description}</Text>
            {extracted.price && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Estimated price:</Text>
                <Text style={styles.priceValue}>{extracted.price} kr</Text>
              </View>
            )}
          </View>
        )}

        {/* Saved Addresses */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.savedAddresses}</Text>
          {savedAddresses.length === 0 ? (
            <Text style={styles.noAddressesText}>{t.noAddresses}</Text>
          ) : (
            savedAddresses.map((addr, idx) => (
              <TouchableOpacity key={idx} style={styles.addressCard} activeOpacity={0.7}>
                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>{addr.label}</Text>
                  <Text style={styles.addressValue}>{addr.address}</Text>
                </View>
                <Feather name="check-circle" size={16} color={Colors.success} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Continue Button */}
        {extracted && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueToJob}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>{t.continueToJob}</Text>
            <Feather name="arrow-right" size={18} color={Colors.navy} />
          </TouchableOpacity>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 16 }} />
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${Colors.gold}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  content: { padding: 20, gap: 16 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: `${Colors.text}08`,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  extractButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  extractButtonDisabled: { opacity: 0.6 },
  extractButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  extractedSection: { backgroundColor: `${Colors.gold}08`, borderColor: `${Colors.gold}30` },
  extractedDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priceLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.gold },
  noAddressesText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 16,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: `${Colors.navy}08`,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressContent: { flex: 1 },
  addressLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  addressValue: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  continueButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  continueButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
});
