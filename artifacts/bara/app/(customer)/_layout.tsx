import React from "react";
import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.navy },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="home" options={{ animation: "fade" }} />
      <Stack.Screen name="my-jobs" options={{ animation: "fade" }} />
      <Stack.Screen name="post-job" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="job-status" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="receipt" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="rate" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="edit-profile" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
