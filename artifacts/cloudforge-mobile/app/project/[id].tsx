import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ComponentItem } from "@/components/ComponentItem";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/constants/cloud-components";
import { useColors } from "@/hooks/useColors";
import { useGetProject } from "@workspace/api-client-react";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(false);

  const { data: project, isLoading, error } = useGetProject({ projectId: Number(id) });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.text }]}>Project not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontSize: 15, marginTop: 8 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const providerColor = PROVIDER_COLORS[project.provider] ?? colors.primary;
  const providerLabel = PROVIDER_LABELS[project.provider] ?? project.provider.toUpperCase();
  const displayedComponents = showAll ? project.components : project.components.slice(0, 8);

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(String(project.id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", `Project ID ${project.id} copied to clipboard`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
            {project.name}
          </Text>
          <View style={[styles.providerBadge, { backgroundColor: providerColor + "22", borderColor: providerColor + "44" }]}>
            <Text style={[styles.providerText, { color: providerColor }]}>{providerLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={handleCopyId}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="copy" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {project.description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {project.description}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{project.components.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Components</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{project.connections.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.warn }]}>#{project.id}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ID</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Components</Text>
          {project.components.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="box" size={24} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No components yet
              </Text>
            </View>
          ) : (
            <>
              {displayedComponents.map((comp) => (
                <ComponentItem key={comp.id} component={comp} showProvider />
              ))}
              {project.components.length > 8 && !showAll && (
                <TouchableOpacity
                  style={[styles.showMoreBtn, { borderTopColor: colors.border }]}
                  onPress={() => setShowAll(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.showMoreText, { color: colors.primary }]}>
                    Show {project.components.length - 8} more
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Connections</Text>
          {project.connections.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="git-merge" size={24} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No connections yet
              </Text>
            </View>
          ) : (
            project.connections.slice(0, 10).map((conn) => {
              const src = project.components.find((c) => c.id === conn.sourceComponentId);
              const tgt = project.components.find((c) => c.id === conn.targetComponentId);
              return (
                <View key={conn.id} style={[styles.connRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.connLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {src?.name ?? `#${conn.sourceComponentId}`}
                  </Text>
                  <Feather name="arrow-right" size={12} color={colors.textTertiary} />
                  <Text style={[styles.connLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {tgt?.name ?? `#${conn.targetComponentId}`}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Feather name="monitor" size={16} color={colors.textTertiary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Open on desktop to edit the canvas, drag components, and draw connections
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: { fontSize: 16, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 2 },
  headerCenter: { flex: 1, gap: 4 },
  projectName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  providerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  providerText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  moreBtn: { padding: 4 },
  scrollContent: { padding: 20, gap: 16 },
  description: { fontSize: 14, lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 0,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  empty: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: { fontSize: 13 },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  showMoreText: { fontSize: 14, fontWeight: "600" },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  connLabel: { flex: 1, fontSize: 13 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
