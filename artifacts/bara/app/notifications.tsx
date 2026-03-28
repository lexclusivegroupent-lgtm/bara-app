import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { BASE_URL, formatDate } from "@/constants/config";
import { safeJson } from "@/utils/api";
import { Job } from "@/components/JobCard";

interface Notification {
  id: string;
  icon: string;
  iconSet: "feather" | "mci";
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
  jobId?: number;
}

function buildNotifications(jobs: Job[], userId: number, activeMode: "customer" | "driver"): Notification[] {
  const notifs: Notification[] = [];

  for (const job of jobs) {
    if (activeMode === "customer" && job.customerId === userId) {
      if (job.status === "accepted") {
        notifs.push({
          id: `accepted-${job.id}`,
          icon: "check-circle",
          iconSet: "feather",
          iconColor: Colors.statusAccepted,
          title: "Driver assigned to your job",
          subtitle: `A driver has accepted your job: "${job.itemDescription}"`,
          time: job.acceptedAt || job.createdAt,
          jobId: job.id,
        });
      }
      if (job.status === "in_progress") {
        notifs.push({
          id: `progress-${job.id}`,
          icon: "truck-fast",
          iconSet: "mci",
          iconColor: Colors.orange,
          title: "Your job is in progress",
          subtitle: `Driver is en route for: "${job.itemDescription}"`,
          time: job.acceptedAt || job.createdAt,
          jobId: job.id,
        });
      }
      if (job.status === "completed") {
        notifs.push({
          id: `completed-${job.id}`,
          icon: "check-circle",
          iconSet: "feather",
          iconColor: Colors.success,
          title: "Job completed",
          subtitle: `Your job has been completed: "${job.itemDescription}"`,
          time: job.completedAt || job.createdAt,
          jobId: job.id,
        });
      }
    }

    if (activeMode === "driver" && job.status === "pending") {
      notifs.push({
        id: `available-${job.id}`,
        icon: "briefcase",
        iconSet: "feather",
        iconColor: Colors.gold,
        title: "New job available",
        subtitle: `New ${job.jobType === "furniture_transport" ? "furniture transport" : "junk pickup"} job in your area`,
        time: job.createdAt,
        jobId: job.id,
      });
    }
  }

  return notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
}

export default function NotificationsScreen() {
  const { user, token, activeMode } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: jobs, isLoading, refetch, isRefetching } = useQuery<Job[]>({
    queryKey: ["notifJobs", user?.id, activeMode],
    queryFn: async () => {
      const params = activeMode === "driver"
        ? `?city=${encodeURIComponent(user?.city || "")}&status=pending`
        : "";
      const res = await fetch(`${BASE_URL}/api/jobs${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = await safeJson(res);
      if (activeMode === "customer") {
        return all.filter((j: Job) => j.customerId === user?.id);
      }
      return all;
    },
    enabled: !!token && !!user,
  });

  const notifications = buildNotifications(jobs || [], user?.id || 0, activeMode);

  return (
    <View style={[styles.container, { backgroundColor: Colors.navy }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.notifCard}
            activeOpacity={item.jobId ? 0.75 : 1}
            onPress={() => {
              if (!item.jobId) return;
              if (activeMode === "customer") {
                router.push({ pathname: "/(customer)/job-status", params: { id: item.jobId } });
              } else {
                router.push({ pathname: "/(driver)/active-job", params: { id: item.jobId } });
              }
            }}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.iconColor}18` }]}>
              {item.iconSet === "feather" ? (
                <Feather name={item.icon as any} size={18} color={item.iconColor} />
              ) : (
                <MaterialCommunityIcons name={item.icon as any} size={18} color={item.iconColor} />
              )}
            </View>
            <View style={styles.notifText}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifSubtitle} numberOfLines={2}>{item.subtitle}</Text>
              <Text style={styles.notifTime}>{formatDate(item.time)}</Text>
            </View>
            {item.jobId && <Feather name="chevron-right" size={14} color={Colors.textMuted} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="bell" size={32} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>
                {activeMode === "customer"
                  ? "Job updates will appear here once you post a job"
                  : "New job alerts will appear here"}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  listContent: { padding: 16, flexGrow: 1 },
  separator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifText: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  notifSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
