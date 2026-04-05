import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function isFontRegistrationConflict(error: unknown): boolean {
  if (!error) return false;
  const msg = String((error as any)?.message ?? error);
  return (
    msg.includes("CTFontManagerError") ||
    msg.includes("code 104") ||
    msg.includes("already registered") ||
    msg.includes("font registration")
  );
}

function NotificationNavigator() {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Handle taps on notifications while app is running or in background
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const screen = data?.screen as string | undefined;
      const jobId = data?.jobId as number | undefined;

      if (!screen || !jobId) return;

      // Small delay so the navigator is ready
      setTimeout(() => {
        if (screen === "customer-job") {
          router.push(`/(customer)/job-status?id=${jobId}` as any);
        } else if (screen === "driver-job") {
          router.push("/(driver)/active-job" as any);
        }
      }, 300);
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <NotificationNavigator />
      <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.navy },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
    ...MaterialCommunityIcons.font,
  });

  const nonFatalError = fontError && isFontRegistrationConflict(fontError);
  const ready = fontsLoaded || nonFatalError || !!fontError;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LanguageProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </LanguageProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
