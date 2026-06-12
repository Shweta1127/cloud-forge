import { useState, useEffect } from "react";
import { useUpdateComponent, getListComponentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getComponentDef, PROVIDER_COLORS } from "@/lib/cloud-components";

const TERRAFORM_RESOURCE: Record<string, string> = {
  vpc: "aws_vpc", subnet: "aws_subnet", ec2: "aws_instance",
  rds: "aws_db_instance", s3: "aws_s3_bucket", elb: "aws_lb",
  eks: "aws_eks_cluster", lambda: "aws_lambda_function",
  apigateway: "aws_api_gateway_rest_api", cloudfront: "aws_cloudfront_distribution",
  route53: "aws_route53_zone", sqs: "aws_sqs_queue", sns: "aws_sns_topic",
  iam: "aws_iam_role", nat_gateway: "aws_nat_gateway",
  internet_gateway: "aws_internet_gateway", security_group: "aws_security_group",
  virtual_network: "azurerm_virtual_network", vm: "azurerm_linux_virtual_machine",
  sql_database: "azurerm_mssql_database", blob_storage: "azurerm_storage_account",
  aks: "azurerm_kubernetes_cluster", functions: "azurerm_function_app",
  app_gateway: "azurerm_application_gateway", key_vault: "azurerm_key_vault",
  gke: "google_container_cluster", cloud_sql: "google_sql_database_instance",
  cloud_storage: "google_storage_bucket", cloud_functions: "google_cloudfunctions_function",
  cloud_run: "google_cloud_run_service", bigquery: "google_bigquery_dataset",
  pub_sub: "google_pubsub_topic", load_balancer: "google_compute_forwarding_rule",
};

interface SelectedNode {
  id: string;
  data: {
    type: string;
    provider: string;
    name: string;
    config: Record<string, unknown>;
  };
  position: { x: number; y: number };
}

interface PropertiesPanelProps {
  node: SelectedNode | null;
  projectId: number;
  onClose: () => void;
  onNameChange: (nodeId: string, name: string) => void;
}

const LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: "1.5px",
  color: "var(--text3)", textTransform: "uppercase", marginBottom: 6,
  display: "block", fontFamily: "var(--app-font-sans)",
};

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
  borderRadius: 5, padding: "6px 8px", color: "var(--text)",
  fontFamily: "var(--app-font-mono)", fontSize: 11, outline: "none",
  transition: "border-color 0.15s",
};

export default function PropertiesPanel({ node, projectId, onClose, onNameChange }: PropertiesPanelProps) {
  const [name, setName] = useState(node?.data.name ?? "");
  const [config, setConfig] = useState<Record<string, unknown>>(node?.data.config ?? {});
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const updateComponent = useUpdateComponent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListComponentsQueryKey(projectId) });
        setDirty(false);
        toast({ title: "Component saved" });
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    },
  });

  useEffect(() => {
    if (node) {
      setName(node.data.name);
      setConfig(node.data.config ?? {});
      setDirty(false);
    }
  }, [node?.id]);

  if (!node) {
    return (
      <div style={{
        width: 280, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 8, textAlign: "center", padding: 24,
        background: "var(--panel)", borderLeft: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>⚙</div>
        <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>
          Select a component
        </div>
        <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--app-font-mono)" }}>
          to configure it
        </div>
      </div>
    );
  }

  const def = getComponentDef(node.data.type);
  const color = PROVIDER_COLORS[node.data.provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
  const componentId = parseInt(node.id);
  const terraformRes = TERRAFORM_RESOURCE[node.data.type] ?? node.data.type;

  const save = () => {
    if (isNaN(componentId)) return;
    onNameChange(node.id, name);
    updateComponent.mutate({ projectId, componentId, data: { name, config } });
  };

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  return (
    <div style={{
      width: 280, display: "flex", flexDirection: "column", height: "100%",
      background: "var(--panel)", borderLeft: "1px solid var(--border)", flexShrink: 0, overflow: "hidden",
    }}>
      {/* Component identity */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 16, fontWeight: 700,
            background: `${color}18`, color, border: `1px solid ${color}30`,
            fontFamily: "var(--app-font-sans)", flexShrink: 0,
          }}>
            {def?.label.charAt(0) ?? "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--app-font-sans)", color: "var(--text)", lineHeight: 1.2 }}>
              {def?.label ?? node.data.type}
            </div>
            <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--app-font-mono)", marginTop: 2 }}>
              {terraformRes}
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-properties"
            style={{
              width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "1px solid var(--border)", borderRadius: 4,
              color: "var(--text3)", cursor: "pointer", fontSize: 12, transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "var(--danger)"; (e.target as HTMLElement).style.color = "var(--danger)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; (e.target as HTMLElement).style.color = "var(--text3)"; }}
          >✕</button>
        </div>
      </div>

      {/* Scrollable config */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <span style={LABEL}>Display Name</span>
          <input
            data-testid="input-component-name"
            value={name}
            onChange={e => { setName(e.target.value); setDirty(true); }}
            style={INPUT}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Provider + Type row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>Provider</span>
            <div style={{
              fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 4,
              border: `1px solid ${color}40`, background: `${color}12`, color,
              fontFamily: "var(--app-font-sans)",
            }}>
              {node.data.provider.toUpperCase()}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>Type</span>
            <div style={{
              fontSize: 10, fontWeight: 600, padding: "4px 8px", borderRadius: 4,
              border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)",
              fontFamily: "var(--app-font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {node.data.type}
            </div>
          </div>
        </div>

        {/* Config fields */}
        {Object.entries(config).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span style={LABEL}>Configuration</span>
            {Object.entries(config).map(([key, value]) => {
              if (typeof value === "boolean") {
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                    <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--app-font-sans)" }}>{key}</span>
                    <div
                      onClick={() => updateConfig(key, !value)}
                      style={{
                        width: 32, height: 18, background: value ? "var(--accent2)" : "var(--border2)",
                        borderRadius: 9, position: "relative", cursor: "pointer", transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", width: 12, height: 12, background: "white",
                        borderRadius: "50%", top: 3, left: value ? 17 : 3, transition: "left 0.2s",
                      }} />
                    </div>
                  </div>
                );
              }
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <span style={{ ...LABEL, letterSpacing: "0.5px", textTransform: "none", fontSize: 10, marginBottom: 4 }}>
                    {key}
                  </span>
                  <input
                    data-testid={`config-${key}`}
                    value={String(value ?? "")}
                    onChange={e => {
                      const v = typeof value === "number" ? Number(e.target.value) : e.target.value;
                      updateConfig(key, v);
                    }}
                    style={INPUT}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save button */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)" }}>
        <button
          data-testid="button-save-component"
          onClick={save}
          disabled={!dirty || updateComponent.isPending}
          style={{
            width: "100%", padding: "7px 0",
            background: dirty ? "var(--accent2)" : "transparent",
            border: `1px solid ${dirty ? "var(--accent2)" : "var(--border)"}`,
            borderRadius: 6, color: dirty ? "white" : "var(--text3)",
            fontSize: 11, fontWeight: 700, cursor: dirty ? "pointer" : "default",
            fontFamily: "var(--app-font-sans)", letterSpacing: "0.3px",
            transition: "all 0.15s", opacity: updateComponent.isPending ? 0.7 : 1,
          }}
        >
          {updateComponent.isPending ? "Saving..." : dirty ? "↗ Save Changes" : "✓ Saved"}
        </button>
      </div>
    </div>
  );
}
