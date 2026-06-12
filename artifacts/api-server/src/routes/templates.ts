import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { templatesTable, projectsTable, componentsTable, connectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetTemplateParams } from "@workspace/api-zod";

const router: IRouter = Router();

// List templates
router.get("/templates", async (req, res) => {
  try {
    const templates = await db.select().from(templatesTable);
    res.json(
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        provider: t.provider,
        componentCount: (JSON.parse(t.components) as unknown[]).length,
        tags: JSON.parse(t.tags),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list templates" });
  }
});

// Get template detail
router.get("/templates/:templateId", async (req, res) => {
  try {
    const { templateId } = GetTemplateParams.parse(req.params);
    const [template] = await db
      .select()
      .from(templatesTable)
      .where(eq(templatesTable.id, templateId));
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json({
      ...template,
      components: JSON.parse(template.components),
      connections: JSON.parse(template.connections),
      tags: JSON.parse(template.tags),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get template" });
  }
});

// Use template — creates a project with all components and connections copied in
router.post("/templates/:templateId/use", async (req, res) => {
  try {
    const { templateId } = GetTemplateParams.parse(req.params);
    const [template] = await db
      .select()
      .from(templatesTable)
      .where(eq(templatesTable.id, templateId));
    if (!template) return res.status(404).json({ error: "Template not found" });

    type TplComponent = {
      type: string;
      provider: string;
      name: string;
      positionX: number;
      positionY: number;
      config?: Record<string, unknown>;
    };
    type TplConnection = {
      sourceIndex: number;
      targetIndex: number;
      label?: string;
      connectionType?: string;
    };

    const tplComponents: TplComponent[] = JSON.parse(template.components);
    const tplConnections: TplConnection[] = JSON.parse(template.connections);

    // Create the project
    const [project] = await db
      .insert(projectsTable)
      .values({
        name: `${template.name} (copy)`,
        description: template.description,
        provider: template.provider,
      })
      .returning();

    // Insert components and build index → DB id map
    const idMap: number[] = [];
    for (const c of tplComponents) {
      const [comp] = await db
        .insert(componentsTable)
        .values({
          projectId: project.id,
          type: c.type,
          provider: c.provider,
          name: c.name,
          positionX: String(c.positionX ?? 100),
          positionY: String(c.positionY ?? 100),
          config: JSON.stringify(c.config ?? {}),
        })
        .returning();
      idMap.push(comp.id);
    }

    // Insert connections using the index map
    let connectionCount = 0;
    for (const conn of tplConnections) {
      const srcId = idMap[conn.sourceIndex];
      const tgtId = idMap[conn.targetIndex];
      if (srcId == null || tgtId == null) continue;
      await db.insert(connectionsTable).values({
        projectId: project.id,
        sourceComponentId: srcId,
        targetComponentId: tgtId,
        label: conn.label ?? null,
        connectionType: conn.connectionType ?? "network",
      });
      connectionCount++;
    }

    return res.status(201).json({
      project: {
        ...project,
        componentCount: tplComponents.length,
        connectionCount,
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to use template" });
  }
});

export default router;
