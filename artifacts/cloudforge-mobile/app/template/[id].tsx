import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
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

import { COMPONENT_ICONS, COMPONENT_LABELS, PROVIDER_COLORS, PROVIDER_LABELS } from "@/constants/cloud-components";
import { useColors } from "@/hooks/useColors";
import { useCreateProject, useGetTemplate } from "@workspace/api-client-react";
import { useRouter as useRouterBase } from "expo-router";

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: template, isLoading } = useGetTemplate({ templateId: Number(id) });
  const { mutateAsync: createProject, isPending } = useCreateProject();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Template not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginTop: 8 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const providerColor = PROVIDER_COLORS[template.provider] ?? colors.primary;
  const providerLabel = PROVIDER_LABELS[template.provider] ?? template.provider.toUpperCase();

  const handleUse = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Use Template",
      `Create a new project from "${template.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create Project",
          onPress: async () => {
            try {
              const project = await createProject({
                data: {
                  name: template.name,
                  description: template.description,
                  provider: template.provider,
                },
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace(`/project/${project.id}`);
            } catch {
              Alert.alert("Error", "Failed to create project from template");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Template
        </Text>
        <TouchableOpacity
          style={[styles.useBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 }]}
          onPress={handleUse}
          disabled={isPending}
          activeOpacity={0.8}
        >
          <Text style={[styles.useBtnText, { color: colors.primaryForeground }]}>
            {isPending ? "Creating..." : "Use"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.text }]}>{template.name}</Text>
          <View style={[styles.badge, { backgroundColor: providerColor + "22", borderColor: providerColor + "44" }]}>
            <Text style={[styles.badgeText, { color: providerColor }]}>{providerLabel}</Text>
          </View>
        </View>

        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {template.description}
        </Text>

        {template.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {template.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Components ({template.components.length})
          </Text>
          {(template.components as Array<{ type?: string; name?: string; provider?: string }>).map((comp, i) => {
            const type = comp.type ?? "custom";
            const icon = COMPONENT_ICONS[type] ?? "⚙️";
            const label = COMPONENT_LABELS[type] ?? type;
            const pColor = PROVIDER_COLORS[comp.provider ?? template.provider] ?? colors.primary;
            return (
              <View key={i} style={[styles.compRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.compIcon, { backgroundColor: pColor + "18" }]}>
                  <Text style={styles.emoji}>{icon}</Text>
                </View>
                <View style={styles.compInfo}>
                  <Text style={[styles.compName, { color: colors.text }]} numberOfLines={1}>
                    {comp.name ?? label}
                  </Text>
                  <Text style={[styles.compType, { color: colors.mutedForeground }]}>{label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
  useBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  useBtnText: { fontSize: 15, fontWeight: "600" },
  content: { padding: 20, gap: 16 },
  titleRow: { gap: 8 },
  name: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: "500" },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  compRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 18 },
  compInfo: { flex: 1 },
  compName: { fontSize: 14, fontWeight: "600" },
  compType: { fontSize: 12, marginTop: 1 },
});
