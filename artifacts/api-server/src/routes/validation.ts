import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { componentsTable, connectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ValidateProjectParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/projects/:projectId/validate", async (req, res) => {
  try {
    const { projectId } = ValidateProjectParams.parse(req.params);

    const components = await db
      .select()
      .from(componentsTable)
      .where(eq(componentsTable.projectId, projectId));
    const connections = await db
      .select()
      .from(connectionsTable)
      .where(eq(connectionsTable.projectId, projectId));

    const issues: Array<{ severity: string; componentId: number | null; message: string; code: string }> = [];
    const suggestions: Array<{ type: string; message: string; componentId: number | null }> = [];

    for (const comp of components) {
      const cfg = JSON.parse(comp.config || "{}") as Record<string, unknown>;

      // Validate CIDR ranges
      if ((comp.type === "vpc" || comp.type === "subnet") && cfg.cidr) {
        const cidr = cfg.cidr as string;
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        if (!cidrRegex.test(cidr)) {
          issues.push({
            severity: "error",
            componentId: comp.id,
            message: `Invalid CIDR range "${cidr}" on ${comp.name}`,
            code: "INVALID_CIDR",
          });
        }
      }

      // Check for public database exposure
      if (comp.type === "rds" || comp.type === "sql_database" || comp.type === "cloud_sql") {
        const isPublic = cfg.publiclyAccessible === true || cfg.publicAccess === true;
        const hasConnToLb = connections.some(
          (c) =>
            (c.sourceComponentId === comp.id || c.targetComponentId === comp.id) &&
            components.find((x) => x.id === (c.sourceComponentId === comp.id ? c.targetComponentId : c.sourceComponentId))?.type === "elb"
        );
        if (isPublic) {
          issues.push({
            severity: "error",
            componentId: comp.id,
            message: `Database "${comp.name}" is publicly accessible — this is a security risk`,
            code: "PUBLIC_DATABASE_EXPOSURE",
          });
        }
        if (hasConnToLb) {
          issues.push({
            severity: "warning",
            componentId: comp.id,
            message: `Database "${comp.name}" is directly connected to a load balancer — use an application tier instead`,
            code: "DIRECT_DB_LB_CONNECTION",
          });
        }
      }

      // Check Lambda memory
      if (comp.type === "lambda" || comp.type === "functions" || comp.type === "cloud_functions") {
        const mem = cfg.memorySize as number;
        if (mem && mem > 3008) {
          issues.push({
            severity: "error",
            componentId: comp.id,
            message: `Lambda "${comp.name}" memory ${mem}MB exceeds maximum (3008MB)`,
            code: "LAMBDA_MEMORY_EXCEEDED",
          });
        }
      }

      // EC2 suggestions
      if (comp.type === "ec2" || comp.type === "vm") {
        suggestions.push({
          type: "high_availability",
          message: `Consider placing "${comp.name}" in multiple Availability Zones for HA`,
          componentId: comp.id,
        });
        const instanceType = cfg.instanceType as string;
        if (instanceType && instanceType.startsWith("t3.micro")) {
          suggestions.push({
            type: "cost",
            message: `"${comp.name}" uses t3.micro — consider Reserved Instances for production workloads`,
            componentId: comp.id,
          });
        }
      }
    }

    // Check for missing load balancer
    const hasEc2 = components.some((c) => c.type === "ec2");
    const hasLb = components.some((c) => c.type === "elb" || c.type === "app_gateway" || c.type === "load_balancer");
    if (hasEc2 && !hasLb) {
      suggestions.push({
        type: "high_availability",
        message: "Consider adding a Load Balancer in front of your EC2 instances for high availability",
        componentId: null,
      });
    }

    // Check for missing backup/replication
    const hasDbs = components.filter((c) => ["rds", "sql_database", "cloud_sql"].includes(c.type));
    for (const db_ of hasDbs) {
      const cfg = JSON.parse(db_.config || "{}") as Record<string, unknown>;
      if (!cfg.multiAz && !cfg.backupRetentionPeriod) {
        suggestions.push({
          type: "high_availability",
          message: `Enable Multi-AZ and automated backups on "${db_.name}" for production resilience`,
          componentId: db_.id,
        });
      }
    }

    // Security group check
    const hasIam = components.some((c) => c.type === "iam");
    if (!hasIam && components.length > 2) {
      suggestions.push({
        type: "security",
        message: "Add IAM roles and policies to enforce least-privilege access across your infrastructure",
        componentId: null,
      });
    }

    res.json({
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      suggestions,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to validate project" });
  }
});

export default router;
