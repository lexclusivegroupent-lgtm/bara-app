import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";

export default function RateScreen() {
  const { jobId, userId } = useLocalSearchParams<{ jobId: string; userId: string }>();
  const { token, user, activeMode } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tip, setTip] = useState(0);
  const [loading, setLoading] = useState(false);
  const isCustomer = activeMode === "customer";
  const TIP_OPTIONS = [0, 10, 20, 50];

  const ratingLabels = [t("poor"), t("fair"), t("good"), t("great"), t("excellent")];

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert(t("selectRating"), t("pleaseSelectStar"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: rating, comment: comment.trim() || null, ratedUserId: parseInt(userId), tipAmount: tip > 0 ? tip : undefined }),
      });
      if (!res.ok) throw new Error("Failed to submit rating");
      router.replace(activeMode === "driver" ? "/(driver)/map" : "/(customer)/home");
    } catch (e: any) {
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.replace(activeMode === "driver" ? "/(driver)/map" : "/(customer)/home");
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.content, {
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
      }]}>
        <View style={styles.avatar}>
          <Feather name="user" size={36} color={Colors.gold} />
        </View>

        <Text style={styles.title}>{t("howWasExperience")}</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starBtn}
              activeOpacity={0.7}
            >
              <Feather
                name="star"
                size={40}
                color={star <= rating ? Colors.gold : Colors.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={styles.ratingLabel}>{ratingLabels[rating - 1]}</Text>
        )}

        <View style={styles.commentBox}>
          <TextInput
            style={styles.commentInput}
            placeholder={t("leaveComment")}
            placeholderTextColor={Colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {isCustomer && (
          <View style={styles.tipSection}>
            <Text style={styles.tipLabel}>{user?.role !== "driver" ? "Add a tip? (goes 100% to carrier)" : ""}</Text>
            <View style={styles.tipRow}>
              {TIP_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.tipBtn, tip === opt && styles.tipBtnActive]}
                  onPress={() => setTip(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tipBtnText, tip === opt && styles.tipBtnTextActive]}>
                    {opt === 0 ? "No tip" : `+${opt} kr`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.navy} />
          ) : (
            <Text style={styles.submitBtnText}>{t("submitRating")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>{t("skip")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: `${Colors.gold}40`,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  stars: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
    marginTop: -8,
  },
  commentBox: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  commentInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    minHeight: 70,
  },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.navy,
  },
  skipBtn: {
    paddingVertical: 10,
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  disabled: { opacity: 0.7 },
  tipSection: { width: "100%", gap: 8 },
  tipLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "center" },
  tipRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  tipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tipBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tipBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  tipBtnTextActive: { color: Colors.navy },
});
