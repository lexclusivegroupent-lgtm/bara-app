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
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";

export default function DriverRateScreen() {
  const { jobId, userId } = useLocalSearchParams<{ jobId: string; userId: string }>();
  const { token, activeMode } = useAuth();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert("Select Rating", "Please select a star rating.");
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
        body: JSON.stringify({ score: rating, comment: comment.trim() || null, ratedUserId: parseInt(userId) }),
      });
      if (!res.ok) throw new Error("Failed to submit rating");
      router.replace(activeMode === "customer" ? "/(customer)/home" : "/(driver)/map");
    } catch {
      Alert.alert("Error", "Failed to submit rating.");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.replace(activeMode === "customer" ? "/(customer)/home" : "/(driver)/map");
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
        <Text style={styles.title}>Rate the Customer</Text>
        <Text style={styles.subtitle}>Hur var din upplevelse?</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn} activeOpacity={0.7}>
              <Feather name="star" size={40} color={star <= rating ? Colors.gold : Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={styles.ratingLabel}>
            {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Great" : "Excellent"}
          </Text>
        )}

        <View style={styles.commentBox}>
          <TextInput
            style={styles.commentInput}
            placeholder="Leave a comment (optional)"
            placeholderTextColor={Colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.submitBtnText}>Submit Rating</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Skip</Text>
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
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, fontStyle: "italic", marginTop: -10 },
  stars: { flexDirection: "row", gap: 8, marginVertical: 8 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.gold, marginTop: -8 },
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
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  skipBtn: { paddingVertical: 10 },
  skipBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  disabled: { opacity: 0.7 },
});
