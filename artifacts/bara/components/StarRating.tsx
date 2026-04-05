import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface StarRatingProps {
  rating?: number | null;
  totalJobs?: number | null;
  size?: number;
  showNew?: boolean;
  showCount?: boolean;
}

export function StarRating({ rating, totalJobs, size = 14, showNew = true, showCount = true }: StarRatingProps) {
  if (!rating) {
    if (!showNew) return null;
    return (
      <View style={styles.row}>
        <View style={[styles.newBadge]}>
          <Text style={[styles.newText, { fontSize: size - 2 }]}>NEW</Text>
        </View>
      </View>
    );
  }

  const filled = Math.floor(rating);
  const hasHalf = rating - filled >= 0.5;
  const empty = 5 - filled - (hasHalf ? 1 : 0);

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {Array.from({ length: filled }).map((_, i) => (
          <MaterialCommunityIcons key={`f${i}`} name="star" size={size} color={Colors.gold} />
        ))}
        {hasHalf && (
          <MaterialCommunityIcons name="star-half-full" size={size} color={Colors.gold} />
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <MaterialCommunityIcons key={`e${i}`} name="star-outline" size={size} color={Colors.gold} />
        ))}
      </View>
      <Text style={[styles.ratingText, { fontSize: size - 1 }]}>{rating.toFixed(1)}</Text>
      {showCount && totalJobs != null && totalJobs > 0 && (
        <Text style={[styles.countText, { fontSize: size - 2 }]}>({totalJobs})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stars: {
    flexDirection: "row",
    gap: 1,
  },
  ratingText: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  countText: {
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  newBadge: {
    backgroundColor: `${Colors.gold}22`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${Colors.gold}44`,
  },
  newText: {
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    letterSpacing: 0.5,
  },
});
