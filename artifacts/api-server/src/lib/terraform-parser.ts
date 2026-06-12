/** Parses Terraform HCL text and extracts resources + dependency connections. */

export interface TerraformResource {
  type: string;      // e.g. "aws_vpc"
  name: string;      // e.g. "main"
  body: string;      // raw block body
}

export interface ParsedTerraform {
  resources: TerraformResource[];
  detectedProvider: "aws" | "azure" | "gcp" | "multi";
}

// ─── Resource type → CloudForge component type ───────────────────────────────

const TYPE_MAP: Record<string, string> = {
  // AWS
  aws_vpc: "vpc",
  aws_subnet: "subnet",
  aws_instance: "ec2",
  aws_db_instance: "rds",
  aws_rds_cluster: "rds",
  aws_s3_bucket: "s3",
  aws_lb: "elb",
  aws_alb: "elb",
  aws_elb: "elb",
  aws_eks_cluster: "eks",
  aws_lambda_function: "lambda",
  aws_api_gateway_rest_api: "apigateway",
  aws_apigatewayv2_api: "apigateway",
  aws_cloudfront_distribution: "cloudfront",
  aws_route53_zone: "route53",
  aws_route53_record: "route53",
  aws_sqs_queue: "sqs",
  aws_sns_topic: "sns",
  aws_iam_role: "iam",
  aws_iam_policy: "iam",
  aws_iam_user: "iam",
  aws_nat_gateway: "nat_gateway",
  aws_internet_gateway: "internet_gateway",
  aws_security_group: "security_group",
  // Azure
  azurerm_virtual_network: "virtual_network",
  azurerm_linux_virtual_machine: "vm",
  azurerm_windows_virtual_machine: "vm",
  azurerm_virtual_machine: "vm",
  azurerm_sql_server: "sql_database",
  azurerm_mssql_server: "sql_database",
  azurerm_mssql_database: "sql_database",
  azurerm_storage_account: "blob_storage",
  azurerm_kubernetes_cluster: "aks",
  azurerm_function_app: "functions",
  azurerm_linux_function_app: "functions",
  azurerm_application_gateway: "app_gateway",
  azurerm_key_vault: "key_vault",
  azurerm_virtual_network_gateway: "vnet",
  // GCP
  google_container_cluster: "gke",
  google_sql_database_instance: "cloud_sql",
  google_storage_bucket: "cloud_storage",
  google_cloudfunctions_function: "cloud_functions",
  google_cloudfunctions2_function: "cloud_functions",
  google_cloud_run_service: "cloud_run",
  google_cloud_run_v2_service: "cloud_run",
  google_bigquery_dataset: "bigquery",
  google_pubsub_topic: "pub_sub",
  google_compute_forwarding_rule: "load_balancer",
  google_compute_global_forwarding_rule: "load_balancer",
  google_compute_network: "vpc",
  google_compute_subnetwork: "subnet",
  google_compute_instance: "ec2",
};

export function mapResourceType(tfType: string): string {
  return TYPE_MAP[tfType] ?? "custom";
}

export function detectProvider(resources: TerraformResource[]): "aws" | "azure" | "gcp" | "multi" {
  const providers = new Set<string>();
  for (const r of resources) {
    if (r.type.startsWith("aws_")) providers.add("aws");
    else if (r.type.startsWith("azurerm_") || r.type.startsWith("azurestack_")) providers.add("azure");
    else if (r.type.startsWith("google_")) providers.add("gcp");
  }
  if (providers.size === 0) return "aws";
  if (providers.size === 1) return [...providers][0] as "aws" | "azure" | "gcp";
  return "multi";
}

// ─── Block extractor ──────────────────────────────────────────────────────────

function extractBlock(content: string, openBracePos: number): string {
  let depth = 0;
  let i = openBracePos;
  while (i < content.length) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return content.slice(openBracePos + 1, i);
    }
    i++;
  }
  return content.slice(openBracePos + 1);
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseTerraform(content: string): ParsedTerraform {
  // Strip comments
  const cleaned = content
    .replace(/#[^\n]*/g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");

  const resources: TerraformResource[] = [];
  const resourcePattern = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = resourcePattern.exec(cleaned)) !== null) {
    const type = match[1];
    const name = match[2];
    const openBrace = match.index + match[0].length - 1;
    const body = extractBlock(cleaned, openBrace);
    resources.push({ type, name, body });
  }

  return {
    resources,
    detectedProvider: detectProvider(resources),
  };
}

// ─── Reference detection ──────────────────────────────────────────────────────

/**
 * Given a resource's body and the full list of resources, returns the
 * fullNames (type.name) of resources that this resource references.
 */
export function findReferences(body: string, allResources: TerraformResource[]): string[] {
  const refs: string[] = [];
  for (const r of allResources) {
    const needle = `${r.type}.${r.name}`;
    if (body.includes(needle)) {
      refs.push(needle);
    }
  }
  return refs;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

/**
 * Assigns (x, y) canvas positions to resources using a simple BFS-level
 * (topological rank) layout.
 *
 * - x = column (rank) × 240
 * - y = row within column × 160
 */
export function computeLayout(
  resourceIds: string[],
  edges: Array<{ from: string; to: string }>
): Map<string, { x: number; y: number }> {
  // Build adjacency and in-degree maps
  const adj = new Map<string, Set<string>>();
  const inDeg = new Map<string, number>();
  for (const id of resourceIds) {
    adj.set(id, new Set());
    inDeg.set(id, 0);
  }
  for (const { from, to } of edges) {
    if (!adj.has(from) || !adj.has(to)) continue;
    if (!adj.get(from)!.has(to)) {
      adj.get(from)!.add(to);
      inDeg.set(to, (inDeg.get(to) ?? 0) + 1);
    }
  }

  // Kahn's algorithm for topological levels
  const level = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }

  let currentLevel = 0;
  let wave = [...queue];
  while (wave.length > 0) {
    for (const id of wave) level.set(id, currentLevel);
    const next: string[] = [];
    for (const id of wave) {
      for (const neighbor of adj.get(id) ?? []) {
        inDeg.set(neighbor, inDeg.get(neighbor)! - 1);
        if (inDeg.get(neighbor) === 0) next.push(neighbor);
      }
    }
    wave = next;
    currentLevel++;
  }

  // Fallback: any unranked nodes (cycles) go at the end
  for (const id of resourceIds) {
    if (!level.has(id)) level.set(id, currentLevel);
  }

  // Assign (x, y)
  const colCounts = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  for (const id of resourceIds) {
    const col = level.get(id) ?? 0;
    const row = colCounts.get(col) ?? 0;
    positions.set(id, { x: col * 240 + 100, y: row * 160 + 80 });
    colCounts.set(col, row + 1);
  }

  return positions;
}
