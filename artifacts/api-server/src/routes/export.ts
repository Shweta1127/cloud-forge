import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { componentsTable, connectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ExportProjectParams, ExportProjectBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseComponent(c: typeof componentsTable.$inferSelect) {
  return {
    ...c,
    config: JSON.parse(c.config || "{}") as Record<string, unknown>,
    positionX: parseFloat(c.positionX),
    positionY: parseFloat(c.positionY),
  };
}

function generateTerraform(
  components: ReturnType<typeof parseComponent>[],
  connections: (typeof connectionsTable.$inferSelect)[],
  provider: string
): string {
  const lines: string[] = [];
  lines.push(`# CloudForge - Generated Terraform Configuration`);
  lines.push(`# Provider: ${provider.toUpperCase()}`);
  lines.push(``);

  if (provider === "aws" || provider === "multi") {
    lines.push(`terraform {`);
    lines.push(`  required_providers {`);
    lines.push(`    aws = {`);
    lines.push(`      source  = "hashicorp/aws"`);
    lines.push(`      version = "~> 5.0"`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`provider "aws" {`);
    lines.push(`  region = "${(components[0]?.config as Record<string, string>)?.region || "us-east-1"}"`);
    lines.push(`}`);
    lines.push(``);
  }

  for (const comp of components) {
    const cfg = comp.config as Record<string, unknown>;
    const safeName = comp.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    switch (comp.type) {
      case "vpc":
        lines.push(`resource "aws_vpc" "${safeName}" {`);
        lines.push(`  cidr_block           = "${cfg.cidr || "10.0.0.0/16"}"`);
        lines.push(`  enable_dns_support   = true`);
        lines.push(`  enable_dns_hostnames = true`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      case "subnet":
        lines.push(`resource "aws_subnet" "${safeName}" {`);
        lines.push(`  cidr_block        = "${cfg.cidr || "10.0.1.0/24"}"`);
        lines.push(`  availability_zone = "${cfg.az || "us-east-1a"}"`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      case "ec2":
        lines.push(`resource "aws_instance" "${safeName}" {`);
        lines.push(`  ami           = "${cfg.ami || "ami-0c55b159cbfafe1f0"}"`);
        lines.push(`  instance_type = "${cfg.instanceType || "t3.micro"}"`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      case "rds":
        lines.push(`resource "aws_db_instance" "${safeName}" {`);
        lines.push(`  engine         = "${cfg.engine || "postgres"}"`);
        lines.push(`  engine_version = "${cfg.engineVersion || "15.3"}"`);
        lines.push(`  instance_class = "${cfg.instanceClass || "db.t3.micro"}"`);
        lines.push(`  allocated_storage = ${cfg.storage || 20}`);
        lines.push(`  identifier     = "${safeName}"`);
        lines.push(`  username       = "${cfg.username || "admin"}"`);
        lines.push(`  password       = var.db_password`);
        lines.push(`  skip_final_snapshot = true`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      case "s3":
        lines.push(`resource "aws_s3_bucket" "${safeName}" {`);
        lines.push(`  bucket = "${cfg.bucketName || safeName + "-bucket"}"`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      case "elb":
        lines.push(`resource "aws_lb" "${safeName}" {`);
        lines.push(`  name               = "${safeName}-lb"`);
        lines.push(`  internal           = ${cfg.internal || false}`);
        lines.push(`  load_balancer_type = "${cfg.lbType || "application"}"`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      case "eks":
        lines.push(`resource "aws_eks_cluster" "${safeName}" {`);
        lines.push(`  name     = "${safeName}"`);
        lines.push(`  version  = "${cfg.version || "1.28"}"`);
        lines.push(`  role_arn = var.eks_role_arn`);
        lines.push(`  vpc_config {`);
        lines.push(`    subnet_ids = var.subnet_ids`);
        lines.push(`  }`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      case "lambda":
        lines.push(`resource "aws_lambda_function" "${safeName}" {`);
        lines.push(`  function_name = "${safeName}"`);
        lines.push(`  runtime       = "${cfg.runtime || "nodejs20.x"}"`);
        lines.push(`  handler       = "${cfg.handler || "index.handler"}"`);
        lines.push(`  role          = var.lambda_role_arn`);
        lines.push(`  filename      = "${safeName}.zip"`);
        lines.push(`  tags = { Name = "${comp.name}" }`);
        lines.push(`}`);
        break;
      default:
        lines.push(`# Component: ${comp.name} (type: ${comp.type})`);
        lines.push(`# Manual configuration required`);
        break;
    }
    lines.push(``);
  }

  if (connections.length > 0) {
    lines.push(`# Security group rules derived from connections`);
    for (const conn of connections) {
      const src = components.find((c) => c.id === conn.sourceComponentId);
      const tgt = components.find((c) => c.id === conn.targetComponentId);
      if (src && tgt) {
        lines.push(`# ${src.name} -> ${tgt.name} (${conn.connectionType || "network"})`);
      }
    }
  }

  return lines.join("\n");
}

function generateCloudFormation(
  components: ReturnType<typeof parseComponent>[],
): string {
  const resources: Record<string, unknown> = {};

  for (const comp of components) {
    const cfg = comp.config as Record<string, unknown>;
    const logicalId = comp.name.replace(/[^a-zA-Z0-9]/g, "");

    switch (comp.type) {
      case "vpc":
        resources[`${logicalId}VPC`] = {
          Type: "AWS::EC2::VPC",
          Properties: {
            CidrBlock: cfg.cidr || "10.0.0.0/16",
            EnableDnsSupport: true,
            EnableDnsHostnames: true,
            Tags: [{ Key: "Name", Value: comp.name }],
          },
        };
        break;
      case "ec2":
        resources[`${logicalId}Instance`] = {
          Type: "AWS::EC2::Instance",
          Properties: {
            ImageId: cfg.ami || "ami-0c55b159cbfafe1f0",
            InstanceType: cfg.instanceType || "t3.micro",
            Tags: [{ Key: "Name", Value: comp.name }],
          },
        };
        break;
      case "s3":
        resources[`${logicalId}Bucket`] = {
          Type: "AWS::S3::Bucket",
          Properties: {
            BucketName: cfg.bucketName || undefined,
            Tags: [{ Key: "Name", Value: comp.name }],
          },
        };
        break;
      default:
        resources[`${logicalId}Resource`] = {
          Type: `Custom::${comp.type}`,
          Properties: { Name: comp.name, Config: cfg },
        };
    }
  }

  const template = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "CloudForge Generated CloudFormation Template",
    Resources: resources,
  };

  return JSON.stringify(template, null, 2);
}

function generateKubernetes(components: ReturnType<typeof parseComponent>[]): string {
  const manifests: unknown[] = [];

  for (const comp of components) {
    const cfg = comp.config as Record<string, unknown>;
    if (comp.type === "eks" || comp.type === "aks" || comp.type === "gke") {
      manifests.push({
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: { name: comp.name.toLowerCase().replace(/\s+/g, "-"), labels: { app: comp.name } },
        spec: {
          replicas: cfg.replicas || 2,
          selector: { matchLabels: { app: comp.name } },
          template: {
            metadata: { labels: { app: comp.name } },
            spec: {
              containers: [
                {
                  name: comp.name.toLowerCase().replace(/\s+/g, "-"),
                  image: cfg.image || "nginx:latest",
                  ports: [{ containerPort: cfg.port || 80 }],
                  resources: {
                    requests: { cpu: cfg.cpuRequest || "100m", memory: cfg.memRequest || "128Mi" },
                    limits: { cpu: cfg.cpuLimit || "500m", memory: cfg.memLimit || "512Mi" },
                  },
                },
              ],
            },
          },
        },
      });
    }
  }

  if (manifests.length === 0) {
    manifests.push({
      apiVersion: "v1",
      kind: "Namespace",
      metadata: { name: "cloudforge-app" },
    });
  }

  return manifests.map((m) => JSON.stringify(m, null, 2)).join("\n---\n");
}

function generateYaml(
  components: ReturnType<typeof parseComponent>[],
  connections: (typeof connectionsTable.$inferSelect)[],
): string {
  const output: Record<string, unknown> = {
    version: "1.0",
    infrastructure: {
      components: components.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        provider: c.provider,
        config: c.config,
        position: { x: c.positionX, y: c.positionY },
      })),
      connections: connections.map((c) => ({
        id: c.id,
        from: c.sourceComponentId,
        to: c.targetComponentId,
        type: c.connectionType || "network",
        label: c.label,
      })),
    },
  };
  return JSON.stringify(output, null, 2)
    .replace(/^{/, "---")
    .replace(/}$/, "")
    .replace(/"([^"]+)":/g, "$1:");
}

router.post("/projects/:projectId/export", async (req, res) => {
  try {
    const { projectId } = ExportProjectParams.parse(req.params);
    const body = ExportProjectBody.parse(req.body);

    const components = await db
      .select()
      .from(componentsTable)
      .where(eq(componentsTable.projectId, projectId));
    const connections = await db
      .select()
      .from(connectionsTable)
      .where(eq(connectionsTable.projectId, projectId));

    const parsed = components.map(parseComponent);

    let content = "";
    let filename = "";
    const fmt = body.format;

    switch (fmt) {
      case "terraform":
        content = generateTerraform(parsed, connections, "aws");
        filename = "main.tf";
        break;
      case "cloudformation":
        content = generateCloudFormation(parsed);
        filename = "cloudformation.json";
        break;
      case "kubernetes":
        content = generateKubernetes(parsed);
        filename = "manifests.json";
        break;
      default:
        content = generateYaml(parsed, connections);
        filename = "infrastructure.yaml";
    }

    res.json({ format: fmt, content, filename });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to export project" });
  }
});

export default router;
