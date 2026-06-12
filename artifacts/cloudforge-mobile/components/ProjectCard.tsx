import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/constants/cloud-components";
import { useColors } from "@/hooks/useColors";

interface Project {
  id: number;
  name: string;
  description?: string | null;
  provider: string;
  componentCount: number;
  connectionCount: number;
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onDelete?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ProjectCard({ project, onPress, onDelete }: ProjectCardProps) {
  const colors = useColors();
  const providerColor = PROVIDER_COLORS[project.provider] ?? colors.primary;
  const providerLabel = PROVIDER_LABELS[project.provider] ?? project.provider.toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <View style={[styles.providerBadge, { backgroundColor: providerColor + "22", borderColor: providerColor + "44" }]}>
          <Text style={[styles.providerText, { color: providerColor }]}>{providerLabel}</Text>
        </View>
        <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>{timeAgo(project.updatedAt)}</Text>
      </View>

      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{project.name}</Text>

      {project.description ? (
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
          {project.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Feather name="box" size={12} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {project.componentCount} {project.componentCount === 1 ? "component" : "components"}
          </Text>
        </View>
        <View style={styles.stat}>
          <Feather name="git-merge" size={12} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {project.connectionCount} {project.connectionCount === 1 ? "connection" : "connections"}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  providerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  deleteBtn: {
    marginLeft: "auto",
    padding: 4,
  },
});
