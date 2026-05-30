import React from "react";
import { TouchableOpacity, StyleProp, ViewStyle, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface Props {
  onPress?: () => void;
  /** Applied to the outer Animated.View — sets layout, bg, border, borderRadius, padding */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  haptic?: boolean;
  scaleDown?: number;
  disabled?: boolean;
}

/**
 * Drop-in replacement for View + TouchableOpacity that springs on press.
 * Put all visual + layout styles (including width/height/bg/border) in `style`.
 * The inner TouchableOpacity fills the container with flex:1 so children
 * render naturally inside it.
 */
export function PressableScale({
  onPress,
  style,
  children,
  haptic = true,
  scaleDown = 0.96,
  disabled = false,
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(scaleDown, { damping: 15, stiffness: 400 });
    if (haptic && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }

  return (
    <Animated.View style={[style, animStyle]}>
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1 }}
        activeOpacity={1}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
