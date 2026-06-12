import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/constants/cloud-components";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  web_app: "globe",
  microservices: "grid",
  serverless: "zap",
  data_pipeline: "database",
  kubernetes: "layers",
  networking: "wifi",
};

const CATEGORY_LABELS: Record<string, string> = {
  web_app: "Web App",
  microservices: "Microservices",
  serverless: "Serverless",
  data_pipeline: "Data Pipeline",
  kubernetes: "Kubernetes",
  networking: "Networking",
};

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  provider: string;
  componentCount: number;
  tags: string[];
}

interface TemplateCardProps {
  template: Template;
  onPress: () => void;
}

export function TemplateCard({ template, onPress }: TemplateCardProps) {
  const colors = useColors();
  const providerColor = PROVIDER_COLORS[template.provider] ?? colors.primary;
  const providerLabel = PROVIDER_LABELS[template.provider] ?? template.provider.toUpperCase();
  const categoryIcon = CATEGORY_ICONS[template.category] ?? "layers";
  const categoryLabel = CATEGORY_LABELS[template.category] ?? template.category;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Fixed-height banner */}
      <View
        style={[
          styles.banner,
          { backgroundColor: providerColor + "14", borderBottomColor: providerColor + "25" },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: providerColor + "20", borderColor: providerColor + "40" }]}>
          <Feather name={categoryIcon} size={24} color={providerColor} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {template.name}
        </Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
          {template.description}
        </Text>

        <View style={styles.meta}>
          <View style={[styles.badge, { backgroundColor: providerColor + "22", borderColor: providerColor + "44" }]}>
            <Text style={[styles.badgeText, { color: providerColor }]}>{providerLabel}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{categoryLabel}</Text>
          </View>
          <Text style={[styles.count, { color: colors.textTertiary }]}>
            {template.componentCount} components
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const BANNER_H = 88;
const BODY_H = 120;

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    height: BANNER_H + BODY_H,
  },
  banner: {
    height: BANNER_H,
    borderBottomWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    height: BODY_H,
    padding: 14,
    overflow: "hidden",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  count: {
    fontSize: 12,
    marginLeft: "auto",
  },
});
