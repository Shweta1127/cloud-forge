import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProjectCard } from "@/components/ProjectCard";
import { useColors } from "@/hooks/useColors";
import { useGetRecentProjects, useListProjects } from "@workspace/api-client-react";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: allProjects, isLoading: loadingAll } = useListProjects();
  const { data: recentProjects, isLoading: loadingRecent, refetch } = useGetRecentProjects();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const totalProjects = allProjects?.length ?? 0;
  const totalComponents = allProjects?.reduce((sum, p) => sum + p.componentCount, 0) ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Good to see you</Text>
          <View style={styles.logoRow}>
            <Feather name="cloud" size={22} color={colors.primary} />
            <Text style={[styles.appName, { color: colors.text }]}>CloudForge</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/project/new");
          }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{loadingAll ? "—" : totalProjects}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Projects</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{loadingAll ? "—" : totalComponents}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Components</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Feather name="check-circle" size={22} color={colors.success} style={styles.statIcon} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Projects</Text>
        {loadingRecent ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : !recentProjects?.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Feather name="folder" size={28} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No projects yet</Text>
            <Text style={[styles.emptyMsg, { color: colors.mutedForeground }]}>
              Create your first infrastructure project to get started
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/project/new");
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>New Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {recentProjects.slice(0, 4).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/project/${project.id}`);
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/project/new");
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="plus-circle" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>New Project</Text>
            <Text style={[styles.quickSub, { color: colors.textTertiary }]}>From scratch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/templates");
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#0088ff22" }]}>
              <Feather name="layers" size={20} color="#0088ff" />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>Browse Templates</Text>
            <Text style={[styles.quickSub, { color: colors.textTertiary }]}>Prebuilt stacks</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: { fontSize: 13, marginBottom: 2 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  appName: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statIcon: { marginBottom: 0 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  list: { gap: 10 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyMsg: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "600" },
  quickRow: { flexDirection: "row", gap: 10 },
  quickCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickLabel: { fontSize: 13, fontWeight: "700" },
  quickSub: { fontSize: 11 },
});
