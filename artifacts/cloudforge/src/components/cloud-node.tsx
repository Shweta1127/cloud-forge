import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { getComponentDef, PROVIDER_COLORS } from "@/lib/cloud-components";

export interface CloudNodeData {
  type: string;
  provider: string;
  name: string;
  config: Record<string, unknown>;
}

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

// Icon background colors that match each category/icon
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

function CloudNode({ data, selected }: NodeProps) {
  const nodeData = data as CloudNodeData;
  const def = getComponentDef(nodeData.type);
  const providerColor = PROVIDER_COLORS[nodeData.provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
  const iconColor = def?.color ?? providerColor;
  const label = def?.label ?? nodeData.type;
  const icon = def?.icon ?? label.charAt(0);
  const terraformRes = TERRAFORM_RESOURCE[nodeData.type] ?? nodeData.type;
  const iconBg = ICON_BG[nodeData.type] ?? `${iconColor}18`;

  const configEntries = Object.entries(nodeData.config ?? {}).slice(0, 3);

  const handleStyle = {
    background: "var(--bg3)",
    border: `2px solid var(--border2)`,
    width: 10,
    height: 10,
  };

  const selectedStyle = selected
    ? { borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(0,212,255,0.2), 0 0 20px rgba(0,212,255,0.15)" }
    : { borderColor: "var(--border2)" };

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1.5px solid var(--border2)",
        borderRadius: 10,
        minWidth: 160,
        position: "relative",
        ...selectedStyle,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <Handle type="source" position={Position.Top}    id="top"    style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left}   id="left"   style={handleStyle} />
      <Handle type="source" position={Position.Right}  id="right"  style={handleStyle} />

      {/* Provider badge */}
      <div
        style={{
          position: "absolute",
          top: -7,
          right: 8,
          fontSize: 8,
          fontWeight: 700,
          padding: "2px 5px",
          borderRadius: 3,
          letterSpacing: "0.5px",
          background: `${providerColor}22`,
          color: providerColor,
          border: `1px solid ${providerColor}44`,
          fontFamily: "var(--app-font-sans)",
        }}
      >
        {nodeData.provider.toUpperCase()}
      </div>

      <div style={{ padding: "10px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {/* Icon box with service logo */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: iconBg,
              color: iconColor,
              fontSize: 16,
              flexShrink: 0,
              border: `1px solid ${iconColor}30`,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.2,
              maxWidth: 110,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--app-font-sans)",
            }}>
              {String(nodeData.name)}
            </div>
            <div style={{
              fontSize: 9,
              color: "var(--text3)",
              fontFamily: "var(--app-font-mono)",
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 110,
            }}>
              {terraformRes}
            </div>
          </div>
        </div>

        {/* Config key-value pairs */}
        {configEntries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
            {configEntries.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 9,
                  padding: "2px 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--text3)", fontFamily: "var(--app-font-mono)" }}>{k}</span>
                <span style={{
                  color: "var(--accent)",
                  fontFamily: "var(--app-font-mono)",
                  fontSize: 8,
                  maxWidth: 80,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {String(v).slice(0, 16)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CloudNode);
