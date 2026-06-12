import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COMPONENT_ICONS, COMPONENT_LABELS, PROVIDER_COLORS, PROVIDER_LABELS } from "@/constants/cloud-components";
import { useColors } from "@/hooks/useColors";

interface Component {
  id: number;
  type: string;
  provider: string;
  name: string;
  config: Record<string, unknown>;
}

interface ComponentItemProps {
  component: Component;
  showProvider?: boolean;
}

export function ComponentItem({ component, showProvider = false }: ComponentItemProps) {
  const colors = useColors();
  const icon = COMPONENT_ICONS[component.type] ?? "⚙️";
  const label = COMPONENT_LABELS[component.type] ?? component.type;
  const providerColor = PROVIDER_COLORS[component.provider] ?? colors.primary;
  const providerLabel = PROVIDER_LABELS[component.provider] ?? component.provider.toUpperCase();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: providerColor + "18" }]}>
        <Text style={styles.emoji}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{component.name}</Text>
        <Text style={[styles.type, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      {showProvider && (
        <View style={[styles.badge, { backgroundColor: providerColor + "22", borderColor: providerColor + "44" }]}>
          <Text style={[styles.badgeText, { color: providerColor }]}>{providerLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  type: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
