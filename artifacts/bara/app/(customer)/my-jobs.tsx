import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { JobCard, Job } from "@/components/JobCard";
import { JobCardSkeleton } from "@/components/Skeleton";

export default function MyJobsScreen() {
  const { user, token } = useAuth();
  const { t, lang } = useLanguage();
  const isSv = lang === "sv";
  const insets = useSafeAreaInsets();

  const { data: jobs, isLoading, isError, refetch, isRefetching } = useQuery<Job[]>({
    queryKey: ["myJobs", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || "Failed to load jobs");
      if (!Array.isArray(data)) return [];
      return data.filter((j: Job) => j.customerId === user?.id);
    },
    enabled: !!token && !!user,
    retry: 2,
  });

  const safeJobs = Array.isArray(jobs) ? jobs : [];

  const renderItem = useCallback(({ item, index }: { item: Job; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <View style={{ gap: 8 }}>
        <JobCard
          job={item}
          onPress={() => router.push({ pathname: "/(customer)/job-status", params: { id: item.id } })}
        />
        {item.status === "completed" && (
          <TouchableOpacity
            style={receiptBtnStyle}
            onPress={() => router.push({ pathname: "/(customer)/receipt", params: { id: item.id } })}
            activeOpacity={0.85}
          >
            <Feather name="file-text" size={13} color={Colors.gold} />
            <Text style={receiptBtnTextStyle}>{t("viewReceipt")}</Text>
            <Feather name="chevron-right" size={13} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  ), [t]);

  const keyExtractor = useCallback((item: Job) => item.id.toString(), []);

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <Text style={styles.title}>{t("myJobsTitle")}</Text>
        <Text style={styles.subtitle}>{safeJobs.length} {t("total")}</Text>
      </View>

      {isError ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={44} color={Colors.error} />
          <Text style={styles.errorTitle}>
            {isSv ? "Det gick inte att ladda dina jobb." : "Could not load your jobs."}
          </Text>
          <Text style={styles.errorSubtext}>
            {isSv ? "Försök igen." : "Please try again."}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.85}>
            <Feather name="refresh-cw" size={14} color={Colors.navy} />
            <Text style={styles.retryBtnText}>{isSv ? "Försök igen" : "Retry"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={safeJobs}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={[styles.listContent, safeJobs.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: 12, paddingHorizontal: 20, paddingTop: 8 }}>
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📦</Text>
                <Text style={styles.emptyTitle}>{t("noJobsYet")}</Text>
                <Text style={styles.emptySubtext}>
                  {isSv
                    ? "Lägg upp ditt första jobb och få hjälp inom 30 minuter."
                    : "Post your first job and get help within 30 minutes."}
                </Text>
                <TouchableOpacity
                  style={styles.postBtn}
                  onPress={() => router.push("/(customer)/home")}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={16} color={Colors.navy} />
                  <Text style={styles.postBtnText}>{t("postAJob")}</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  listContent: {
    padding: 20,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubtext: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  postBtn: {
    marginTop: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  postBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.navy },
});

const receiptBtnStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 8,
  backgroundColor: Colors.surface,
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: `${Colors.gold}30`,
};

const receiptBtnTextStyle = {
  flex: 1,
  fontSize: 13,
  fontFamily: "Inter_500Medium",
  color: Colors.gold,
} as const;
