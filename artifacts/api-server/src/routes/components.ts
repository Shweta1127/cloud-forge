import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { componentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListComponentsParams,
  CreateComponentParams,
  CreateComponentBody,
  UpdateComponentParams,
  UpdateComponentBody,
  DeleteComponentParams,
} from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

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

// List components
router.get("/projects/:projectId/components", async (req, res) => {
  try {
    const { projectId } = ListComponentsParams.parse(req.params);
    const components = await db
      .select()
      .from(componentsTable)
      .where(eq(componentsTable.projectId, projectId));
    res.json(components.map(parseComponent));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list components" });
  }
});

// Create component
router.post("/projects/:projectId/components", async (req, res) => {
  try {
    const { projectId } = CreateComponentParams.parse(req.params);
    const body = CreateComponentBody.parse(req.body);
    const [component] = await db
      .insert(componentsTable)
      .values({
        projectId,
        type: body.type,
        provider: body.provider,
        name: body.name,
        config: JSON.stringify(body.config ?? {}),
        positionX: String(body.positionX),
        positionY: String(body.positionY),
        width: body.width != null ? String(body.width) : null,
        height: body.height != null ? String(body.height) : null,
      })
      .returning();
    res.status(201).json(parseComponent(component));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create component" });
  }
});

// Update component
router.put("/projects/:projectId/components/:componentId", async (req, res) => {
  try {
    const { projectId, componentId } = UpdateComponentParams.parse(req.params);
    const body = UpdateComponentBody.parse(req.body);
    const updateData: Partial<typeof componentsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.config !== undefined) updateData.config = JSON.stringify(body.config);
    if (body.positionX !== undefined) updateData.positionX = String(body.positionX);
    if (body.positionY !== undefined) updateData.positionY = String(body.positionY);
    if (body.width !== undefined) updateData.width = body.width != null ? String(body.width) : null;
    if (body.height !== undefined) updateData.height = body.height != null ? String(body.height) : null;

    const [component] = await db
      .update(componentsTable)
      .set(updateData)
      .where(
        and(
          eq(componentsTable.id, componentId),
          eq(componentsTable.projectId, projectId)
        )
      )
      .returning();
    if (!component) return res.status(404).json({ error: "Component not found" });
    res.json(parseComponent(component));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update component" });
  }
});

// Delete component
router.delete("/projects/:projectId/components/:componentId", async (req, res) => {
  try {
    const { projectId, componentId } = DeleteComponentParams.parse(req.params);
    await db
      .delete(componentsTable)
      .where(
        and(
          eq(componentsTable.id, componentId),
          eq(componentsTable.projectId, projectId)
        )
      );
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete component" });
  }
});

export default router;
