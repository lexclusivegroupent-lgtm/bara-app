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
      <Stack.Screen name="map" />
      <Stack.Screen name="active-job" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="job-complete" />
      <Stack.Screen name="rate" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}
