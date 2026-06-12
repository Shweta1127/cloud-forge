import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  componentsTable,
  connectionsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  GetProjectStatsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseComponent(c: typeof componentsTable.$inferSelect) {
  return {
    ...c,
    config: JSON.parse(c.config || "{}"),
    positionX: parseFloat(c.positionX),
    positionY: parseFloat(c.positionY),
    width: c.width ? parseFloat(c.width) : null,
    height: c.height ? parseFloat(c.height) : null,
  };
}

function parseConnection(c: typeof connectionsTable.$inferSelect) {
  return {
    ...c,
    connectionType: c.connectionType ?? null,
    label: c.label ?? null,
  };
}

// List all projects
router.get("/projects", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt));
    const result = await Promise.all(
      projects.map(async (p) => {
        const [compCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(componentsTable)
          .where(eq(componentsTable.projectId, p.id));
        const [connCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(connectionsTable)
          .where(eq(connectionsTable.projectId, p.id));
        return {
          ...p,
          componentCount: compCount?.count ?? 0,
          connectionCount: connCount?.count ?? 0,
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// Recent projects
router.get("/projects/recent", async (req, res) => {
  try {
    const projects = await db
      .select()
      .from(projectsTable)
      .orderBy(desc(projectsTable.updatedAt))
      .limit(5);
    const result = await Promise.all(
      projects.map(async (p) => {
        const [compCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(componentsTable)
          .where(eq(componentsTable.projectId, p.id));
        const [connCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(connectionsTable)
          .where(eq(connectionsTable.projectId, p.id));
        return {
          ...p,
          componentCount: compCount?.count ?? 0,
          connectionCount: connCount?.count ?? 0,
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get recent projects" });
  }
});

// Get project by ID
router.get("/projects/:projectId", async (req, res) => {
  try {
    const { projectId } = GetProjectParams.parse(req.params);
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));
    if (!project) return res.status(404).json({ error: "Project not found" });

    const components = await db
      .select()
      .from(componentsTable)
      .where(eq(componentsTable.projectId, projectId));
    const connections = await db
      .select()
      .from(connectionsTable)
      .where(eq(connectionsTable.projectId, projectId));

    res.json({
      ...project,
      components: components.map(parseComponent),
      connections: connections.map(parseConnection),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get project" });
  }
});

// Create project
router.post("/projects", async (req, res) => {
  try {
    const body = CreateProjectBody.parse(req.body);
    const [project] = await db
      .insert(projectsTable)
      .values({
        name: body.name,
        description: body.description ?? null,
        provider: body.provider,
      })
      .returning();
    res.status(201).json({ ...project, componentCount: 0, connectionCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Update project
router.put("/projects/:projectId", async (req, res) => {
  try {
    const { projectId } = UpdateProjectParams.parse(req.params);
    const body = UpdateProjectBody.parse(req.body);
    const [project] = await db
      .update(projectsTable)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.provider && { provider: body.provider }),
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, projectId))
      .returning();
    if (!project) return res.status(404).json({ error: "Project not found" });
    const [compCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(componentsTable)
      .where(eq(componentsTable.projectId, projectId));
    const [connCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectionsTable)
      .where(eq(connectionsTable.projectId, projectId));
    res.json({
      ...project,
      componentCount: compCount?.count ?? 0,
      connectionCount: connCount?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// Delete project
router.delete("/projects/:projectId", async (req, res) => {
  try {
    const { projectId } = DeleteProjectParams.parse(req.params);
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Get project stats
router.get("/projects/:projectId/stats", async (req, res) => {
  try {
    const { projectId } = GetProjectStatsParams.parse(req.params);
    const components = await db
      .select()
      .from(componentsTable)
      .where(eq(componentsTable.projectId, projectId));
    const connections = await db
      .select()
      .from(connectionsTable)
      .where(eq(connectionsTable.projectId, projectId));

    const componentsByType: Record<string, number> = {};
    const componentsByProvider: Record<string, number> = {};
    for (const c of components) {
      componentsByType[c.type] = (componentsByType[c.type] ?? 0) + 1;
      componentsByProvider[c.provider] = (componentsByProvider[c.provider] ?? 0) + 1;
    }

    res.json({
      totalComponents: components.length,
      totalConnections: connections.length,
      componentsByType,
      componentsByProvider,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
