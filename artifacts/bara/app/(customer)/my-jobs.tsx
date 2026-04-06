import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { JobCard, Job } from "@/components/JobCard";

export default function MyJobsScreen() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const { data: jobs, isLoading, refetch, isRefetching } = useQuery<Job[]>({
    queryKey: ["myJobs", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = await safeJson(res);
      return all.filter((j: Job) => j.customerId === user?.id);
    },
    enabled: !!token && !!user,
  });

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <Text style={styles.title}>{t("myJobsTitle")}</Text>
        <Text style={styles.subtitle}>{jobs?.length || 0} {t("total")}</Text>
      </View>

      <FlatList
        data={jobs || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => router.push({ pathname: "/(customer)/job-status", params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refetch}
            tintColor={Colors.gold}
          />
        }
        scrollEnabled={!!(jobs && jobs.length > 0)}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("loading")}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛋️</Text>
              <Text style={styles.emptyTitle}>{t("noJobsYet")}</Text>
              <Text style={styles.emptySubtext}>
                {"Lägg upp ditt första jobb och få hjälp inom timmar.\nPost your first job and get help within hours."}
              </Text>
              <TouchableOpacity
                style={styles.postBtn}
                onPress={() => router.push("/(customer)/home")}
                activeOpacity={0.85}
              >
                <Text style={styles.postBtnText}>
                  {t("postAJob")}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

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
    alignItems: "center",
  },
  postBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.navy },
});
