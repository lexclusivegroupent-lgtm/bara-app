import React, { useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ style }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.bone, animStyle, style]} />;
}

export function JobCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton style={styles.iconBox} />
        <View style={styles.lines}>
          <Skeleton style={styles.titleLine} />
          <Skeleton style={styles.subtitleLine} />
        </View>
        <Skeleton style={styles.badgePill} />
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Skeleton style={styles.footerLine} />
        <Skeleton style={styles.priceLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  titleLine: {
    height: 13,
    width: 140,
    borderRadius: 7,
  },
  subtitleLine: {
    height: 10,
    width: 90,
    borderRadius: 5,
  },
  badgePill: {
    height: 22,
    width: 64,
    borderRadius: 11,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLine: {
    height: 10,
    width: 80,
    borderRadius: 5,
  },
  priceLine: {
    height: 14,
    width: 56,
    borderRadius: 7,
  },
});
