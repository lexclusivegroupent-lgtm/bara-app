import React from "react";
import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.navy },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="map" options={{ animation: "fade" }} />
      <Stack.Screen name="active-job" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="earnings" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="job-complete" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="rate" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="edit-profile" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
