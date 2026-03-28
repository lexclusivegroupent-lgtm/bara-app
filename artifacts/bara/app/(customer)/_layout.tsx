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
      <Stack.Screen name="home" />
      <Stack.Screen name="post-job" />
      <Stack.Screen name="my-jobs" />
      <Stack.Screen name="job-status" />
      <Stack.Screen name="rate" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}
