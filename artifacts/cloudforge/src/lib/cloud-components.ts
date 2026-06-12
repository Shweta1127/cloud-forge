export type CloudProvider = "aws" | "azure" | "gcp";

export interface ComponentDef {
  type: string;
  label: string;
  provider: CloudProvider;
  color: string;
  description: string;
  defaultConfig: Record<string, unknown>;
  icon: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

export const PROVIDER_COLORS: Record<CloudProvider, string> = {
  aws: "#FF9900",
  azure: "#0078D4",
  gcp: "#4285F4",
};

export const PROVIDER_LABELS: Record<CloudProvider, string> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
};

export const CLOUD_COMPONENTS: ComponentDef[] = [
  // ── AWS ──────────────────────────────────────────────────────
  { type: "vpc",              label: "VPC",            provider: "aws", color: "#FF9900", icon: "🌐", description: "Virtual Private Cloud",       defaultConfig: { cidr: "10.0.0.0/16", region: "us-east-1" } },
  { type: "subnet",           label: "Subnet",         provider: "aws", color: "#FF9900", icon: "🔷", description: "Network subnet",              defaultConfig: { cidr: "10.0.1.0/24", az: "us-east-1a", type: "public" } },
  { type: "ec2",              label: "EC2",            provider: "aws", color: "#FF9900", icon: "🖥",  description: "Virtual machine",            defaultConfig: { instanceType: "t3.micro", ami: "ami-0c55b159cbfafe1f0", region: "us-east-1" } },
  { type: "rds",              label: "RDS",            provider: "aws", color: "#a855f7", icon: "🗄",  description: "Managed database",           defaultConfig: { engine: "postgres", engineVersion: "15.3", instanceClass: "db.t3.micro", storage: 20, multiAz: false } },
  { type: "s3",               label: "S3",             provider: "aws", color: "#3cc880", icon: "🪣", description: "Object storage",             defaultConfig: { bucketName: "", versioning: false, encryption: "AES256" } },
  { type: "elb",              label: "Load Balancer",  provider: "aws", color: "#00aeff", icon: "⚖",  description: "Application load balancer",  defaultConfig: { lbType: "application", internal: false } },
  { type: "eks",              label: "EKS",            provider: "aws", color: "#FF9900", icon: "⎈",  description: "Kubernetes cluster",         defaultConfig: { version: "1.28", nodeType: "t3.large", desiredNodes: 3, minNodes: 2, maxNodes: 10 } },
  { type: "lambda",           label: "Lambda",         provider: "aws", color: "#FF9900", icon: "λ",  description: "Serverless function",        defaultConfig: { runtime: "nodejs20.x", memorySize: 256, timeout: 30, handler: "index.handler" } },
  { type: "apigateway",       label: "API Gateway",    provider: "aws", color: "#FF9900", icon: "🔗", description: "REST API gateway",           defaultConfig: { stage: "prod", endpointType: "REGIONAL" } },
  { type: "cloudfront",       label: "CloudFront",     provider: "aws", color: "#FF9900", icon: "🚀", description: "CDN distribution",           defaultConfig: { priceClass: "PriceClass_100", httpVersion: "http2" } },
  { type: "route53",          label: "Route 53",       provider: "aws", color: "#FF9900", icon: "📡", description: "DNS service",               defaultConfig: { hostedZoneType: "public" } },
  { type: "sqs",              label: "SQS",            provider: "aws", color: "#ff6b35", icon: "📨", description: "Message queue",             defaultConfig: { visibilityTimeout: 30, messageRetention: 86400, fifo: false } },
  { type: "sns",              label: "SNS",            provider: "aws", color: "#ff6b35", icon: "📢", description: "Notification service",       defaultConfig: { protocol: "https" } },
  { type: "iam",              label: "IAM",            provider: "aws", color: "#e8c000", icon: "👤", description: "Identity management",        defaultConfig: { type: "role" } },
  { type: "nat_gateway",      label: "NAT Gateway",    provider: "aws", color: "#FF9900", icon: "🔄", description: "Network address translation", defaultConfig: { connectivity: "public" } },
  { type: "internet_gateway", label: "Internet GW",    provider: "aws", color: "#FF9900", icon: "🌍", description: "Internet connectivity",      defaultConfig: {} },
  { type: "security_group",   label: "Security Group", provider: "aws", color: "#e8c000", icon: "🛡",  description: "Firewall rules",            defaultConfig: { description: "Security group" } },

  // ── Azure ─────────────────────────────────────────────────────
  { type: "virtual_network", label: "Virtual Network",  provider: "azure", color: "#0078D4", icon: "🌐", description: "Azure VNet",              defaultConfig: { addressSpace: "10.0.0.0/16", region: "eastus" } },
  { type: "vm",              label: "Virtual Machine",  provider: "azure", color: "#0078D4", icon: "🖥",  description: "Azure VM",              defaultConfig: { size: "Standard_B2s", os: "Linux", region: "eastus" } },
  { type: "sql_database",    label: "Azure SQL",        provider: "azure", color: "#a855f7", icon: "🗄",  description: "Managed SQL database",  defaultConfig: { tier: "Standard", dtu: 20, backupRetention: 7 } },
  { type: "blob_storage",    label: "Blob Storage",     provider: "azure", color: "#3cc880", icon: "🪣", description: "Azure blob storage",     defaultConfig: { replication: "LRS", tier: "Hot" } },
  { type: "aks",             label: "AKS",              provider: "azure", color: "#0078D4", icon: "⎈",  description: "Azure Kubernetes",       defaultConfig: { nodeSize: "Standard_D2_v2", nodeCount: 3, version: "1.28" } },
  { type: "functions",       label: "Azure Functions",  provider: "azure", color: "#0078D4", icon: "ƒ",  description: "Serverless functions",   defaultConfig: { runtime: "node", version: "20" } },
  { type: "app_gateway",     label: "App Gateway",      provider: "azure", color: "#0078D4", icon: "⚖",  description: "Application gateway",   defaultConfig: { sku: "Standard_v2", capacity: 2 } },
  { type: "key_vault",       label: "Key Vault",        provider: "azure", color: "#e8c000", icon: "🔑", description: "Secret management",      defaultConfig: { sku: "standard" } },

  // ── GCP ───────────────────────────────────────────────────────
  { type: "gke",             label: "GKE",             provider: "gcp", color: "#4285F4", icon: "⎈",  description: "Google Kubernetes",       defaultConfig: { version: "1.28", machineType: "e2-standard-4", nodeCount: 3 } },
  { type: "cloud_sql",       label: "Cloud SQL",       provider: "gcp", color: "#a855f7", icon: "🗄",  description: "Managed database",       defaultConfig: { database: "postgres", tier: "db-n1-standard-1" } },
  { type: "cloud_storage",   label: "Cloud Storage",   provider: "gcp", color: "#3cc880", icon: "🪣", description: "Object storage",          defaultConfig: { storageClass: "STANDARD", location: "US" } },
  { type: "cloud_functions", label: "Cloud Functions", provider: "gcp", color: "#4285F4", icon: "ƒ",  description: "Serverless functions",    defaultConfig: { runtime: "nodejs20", memory: 256, timeout: 60 } },
  { type: "cloud_run",       label: "Cloud Run",       provider: "gcp", color: "#4285F4", icon: "🐳", description: "Container platform",      defaultConfig: { minInstances: 0, maxInstances: 100, memory: "512Mi", cpu: "1" } },
  { type: "bigquery",        label: "BigQuery",        provider: "gcp", color: "#4285F4", icon: "📊", description: "Data warehouse",          defaultConfig: { location: "US", partitioning: "DAY" } },
  { type: "pub_sub",         label: "Pub/Sub",         provider: "gcp", color: "#ff6b35", icon: "📨", description: "Message queue",           defaultConfig: { messageRetention: "7d", ackDeadline: 30 } },
  { type: "load_balancer",   label: "Load Balancer",   provider: "gcp", color: "#00aeff", icon: "⚖",  description: "Cloud load balancer",    defaultConfig: { type: "EXTERNAL" } },
];

export function getComponentDef(type: string): ComponentDef | undefined {
  return CLOUD_COMPONENTS.find((c) => c.type === type);
}

export const COMPONENT_GROUPS: Record<string, ComponentDef[]> = {
  aws: CLOUD_COMPONENTS.filter((c) => c.provider === "aws"),
  azure: CLOUD_COMPONENTS.filter((c) => c.provider === "azure"),
  gcp: CLOUD_COMPONENTS.filter((c) => c.provider === "gcp"),
};

export const CONNECTION_TYPES = [
  { value: "network", label: "Network" },
  { value: "dependency", label: "Dependency" },
  { value: "data_flow", label: "Data Flow" },
  { value: "security", label: "Security" },
];

export const EXPORT_FORMATS = [
  { value: "terraform", label: "Terraform (.tf)", ext: ".tf" },
  { value: "cloudformation", label: "CloudFormation (.json)", ext: ".json" },
  { value: "kubernetes", label: "Kubernetes Manifests", ext: ".json" },
  { value: "yaml", label: "Infrastructure YAML", ext: ".yaml" },
];
