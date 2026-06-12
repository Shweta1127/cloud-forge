import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { TemplateCard } from "@/components/TemplateCard";
import { useColors } from "@/hooks/useColors";
import { useListTemplates } from "@workspace/api-client-react";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "web_app", label: "Web App" },
  { id: "microservices", label: "Microservices" },
  { id: "serverless", label: "Serverless" },
  { id: "data_pipeline", label: "Data" },
  { id: "kubernetes", label: "Kubernetes" },
  { id: "networking", label: "Networking" },
];

export default function TemplatesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: templates, isLoading } = useListTemplates();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const filtered =
    activeCategory === "all"
      ? (templates ?? [])
      : (templates ?? []).filter((t) => t.category === activeCategory);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Templates</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Prebuilt architecture blueprints
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={[styles.categoryScroll, { borderBottomColor: colors.border }]}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(cat.id);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primaryForeground : colors.textSecondary },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: botPad + 100 },
            !filtered.length && { flex: 1 },
          ]}
          renderItem={({ item }) => (
            <TemplateCard
              template={item}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/template/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="layers"
              title="No templates"
              message={
                activeCategory === "all"
                  ? "No templates available yet"
                  : `No templates in this category`
              }
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13 },
  categoryScroll: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryRow: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    padding: 20,
  },
});
