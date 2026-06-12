import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCreateProject } from "@workspace/api-client-react";

const PROVIDERS = [
  { id: "aws", label: "AWS", color: "#FF9900", desc: "Amazon Web Services" },
  { id: "azure", label: "Azure", color: "#0078D4", desc: "Microsoft Azure" },
  { id: "gcp", label: "GCP", color: "#4285F4", desc: "Google Cloud Platform" },
  { id: "multi", label: "Multi", color: "#00d4ff", desc: "Multi-cloud" },
];

export default function NewProjectScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("aws");

  const { mutateAsync: createProject, isPending } = useCreateProject();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a project name");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const project = await createProject({
        data: {
          name: name.trim(),
          description: description.trim() || null,
          provider,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/project/${project.id}`);
    } catch {
      Alert.alert("Error", "Failed to create project. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>New Project</Text>
        <TouchableOpacity
          style={[
            styles.createBtn,
            {
              backgroundColor: name.trim() ? colors.primary : colors.muted,
              opacity: isPending ? 0.6 : 1,
            },
          ]}
          onPress={handleCreate}
          disabled={isPending || !name.trim()}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.createBtnText,
              { color: name.trim() ? colors.primaryForeground : colors.textTertiary },
            ]}
          >
            {isPending ? "Creating..." : "Create"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>PROJECT NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.panel, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Production API"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION <Text style={{ color: colors.textTertiary }}>(optional)</Text></Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.panel, borderColor: colors.border, color: colors.text }]}
            placeholder="Describe your infrastructure..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CLOUD PROVIDER</Text>
          <View style={styles.providerGrid}>
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.providerOption,
                    {
                      backgroundColor: active ? p.color + "22" : colors.panel,
                      borderColor: active ? p.color : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setProvider(p.id);
                  }}
                  activeOpacity={0.8}
                >
                  {active && (
                    <View style={styles.checkmark}>
                      <Feather name="check" size={10} color={p.color} />
                    </View>
                  )}
                  <Text style={[styles.providerLabel, { color: active ? p.color : colors.text }]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.providerDesc, { color: colors.textTertiary }]}>
                    {p.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: "700" },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: { fontSize: 15, fontWeight: "600" },
  content: { padding: 20, gap: 24 },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  providerOption: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 4,
    position: "relative",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  providerLabel: { fontSize: 16, fontWeight: "800" },
  providerDesc: { fontSize: 11 },
});
