import { useState } from "react";
import { CLOUD_COMPONENTS, PROVIDER_COLORS, type ComponentDef } from "@/lib/cloud-components";

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

// Distinct background per icon so the colored boxes look like the reference
const ICON_BG: Record<string, string> = {
  vpc: "#1a1200", subnet: "#001020", ec2: "#1a1200", rds: "#120a1a",
  s3: "#041209", elb: "#001520", eks: "#1a1200", lambda: "#1a1200",
  apigateway: "#1a1200", cloudfront: "#1a1200", route53: "#1a1200",
  sqs: "#150a00", sns: "#150a00", iam: "#1a1500", nat_gateway: "#1a1200",
  internet_gateway: "#1a1200", security_group: "#1a1500",
  virtual_network: "#000d1a", vm: "#000d1a", sql_database: "#120a1a",
  blob_storage: "#041209", aks: "#000d1a", functions: "#000d1a",
  app_gateway: "#000d1a", key_vault: "#1a1500",
  gke: "#00061a", cloud_sql: "#120a1a", cloud_storage: "#041209",
  cloud_functions: "#00061a", cloud_run: "#00061a", bigquery: "#00061a",
  pub_sub: "#150a00", load_balancer: "#001520",
};

const PROVIDERS = ["all", "aws", "azure", "gcp"] as const;
const PROVIDER_LABELS = { all: "ALL", aws: "AWS", azure: "AZ", gcp: "GCP" };

interface ComponentPaletteProps {
  onDragStart: (e: React.DragEvent, def: ComponentDef) => void;
}

export default function ComponentPalette({ onDragStart }: ComponentPaletteProps) {
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<"all" | "aws" | "azure" | "gcp">("all");

  const filtered = CLOUD_COMPONENTS.filter((c) => {
    const matchProvider = provider === "all" || c.provider === provider;
    const matchSearch = c.label.toLowerCase().includes(search.toLowerCase())
      || (TERRAFORM_RESOURCE[c.type] ?? "").includes(search.toLowerCase());
    return matchProvider && matchSearch;
  });

  const grouped: Record<string, ComponentDef[]> = {};
  for (const comp of filtered) {
    if (!grouped[comp.provider]) grouped[comp.provider] = [];
    grouped[comp.provider].push(comp);
  }

  return (
    <div style={{
      width: 220,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--panel)",
      borderRight: "1px solid var(--border)",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px 8px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "1.5px",
        color: "var(--text3)",
        textTransform: "uppercase" as const,
        borderBottom: "1px solid var(--border)",
        fontFamily: "var(--app-font-sans)",
      }}>
        Components
      </div>

      {/* Search */}
      <div style={{
        margin: "10px 10px 6px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--bg3)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "6px 10px",
      }}>
        <span style={{ color: "var(--text3)", fontSize: 11 }}>🔍</span>
        <input
          data-testid="input-component-search"
          placeholder="Search components..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontFamily: "var(--app-font-sans)",
            fontSize: 12,
            width: "100%",
          }}
        />
      </div>

      {/* Provider tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {PROVIDERS.map((p) => (
          <button
            key={p}
            data-testid={`tab-provider-${p}`}
            onClick={() => setProvider(p)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: provider === p ? "var(--accent)" : "var(--text3)",
              background: "transparent",
              border: "none",
              borderBottom: provider === p ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
              transition: "all 0.15s",
            }}
          >
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Component list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {Object.entries(grouped).map(([prov, comps]) => (
          <div key={prov}>
            {provider === "all" && (
              <div style={{
                padding: "10px 14px 4px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "1.5px",
                color: PROVIDER_COLORS[prov as keyof typeof PROVIDER_COLORS],
                textTransform: "uppercase" as const,
                fontFamily: "var(--app-font-sans)",
              }}>
                {prov}
              </div>
            )}
            {comps.map((def) => {
              const color = def.color;
              const sub = TERRAFORM_RESOURCE[def.type] ?? def.type;
              const iconBg = ICON_BG[def.type] ?? `${color}18`;
              return (
                <div
                  key={def.type}
                  data-testid={`palette-item-${def.type}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, def)}
                  title={def.description}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 12px",
                    margin: "1px 6px",
                    borderRadius: 6,
                    cursor: "grab",
                    border: "1px solid transparent",
                    transition: "all 0.12s",
                    userSelect: "none" as const,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "var(--bg3)";
                    el.style.borderColor = "var(--border)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "transparent";
                    el.style.borderColor = "transparent";
                  }}
                >
                  {/* Icon with service emoji and category color */}
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                    color,
                    background: iconBg,
                  }}>
                    {def.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "var(--app-font-sans)",
                    }}>
                      {def.label}
                    </div>
                    <div style={{
                      fontSize: 9,
                      color: "var(--text3)",
                      fontFamily: "var(--app-font-mono)",
                      marginTop: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text3)", fontSize: 11, fontFamily: "var(--app-font-sans)" }}>
            No components found
          </div>
        )}
      </div>
    </div>
  );
}
