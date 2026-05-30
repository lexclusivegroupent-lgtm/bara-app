import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width: W, height: H } = Dimensions.get("window");
const COLORS = ["#C9A84C", "#E8C97A", "#4CAF82", "#4A9EE8", "#E87A2A", "#FFFFFF", "#F5F0E8"];
const N = 48;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  color: string;
  size: number;
  wide: boolean;
}

export function Confetti({ active }: { active: boolean }) {
  const particles = useRef<Particle[]>(
    Array.from({ length: N }, () => {
      const size = 5 + Math.random() * 9;
      return {
        x: new Animated.Value(Math.random() * W),
        y: new Animated.Value(-30),
        opacity: new Animated.Value(0),
        rotate: new Animated.Value(0),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size,
        wide: Math.random() > 0.5,
      };
    })
  ).current;

  useEffect(() => {
    if (!active) return;
    const anims = particles.map((p, i) => {
      p.x.setValue(Math.random() * W);
      p.y.setValue(-30 - Math.random() * 40);
      p.opacity.setValue(1);
      p.rotate.setValue(0);
      const duration = 1800 + Math.random() * 1400;
      return Animated.sequence([
        Animated.delay(i * 35),
        Animated.parallel([
          Animated.timing(p.y, {
            toValue: H + 40,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: 720 + Math.random() * 720,
            duration: duration * 0.9,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
            Animated.delay(duration - 700),
            Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });
    Animated.parallel(anims).start();
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: p.wide ? p.size * 1.8 : p.size,
            height: p.size,
            borderRadius: p.size / 5,
            backgroundColor: p.color,
            opacity: p.opacity,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              {
                rotate: p.rotate.interpolate({
                  inputRange: [0, 720],
                  outputRange: ["0deg", "720deg"],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
