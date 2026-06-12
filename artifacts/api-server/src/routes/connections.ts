import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { connectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListConnectionsParams,
  CreateConnectionParams,
  CreateConnectionBody,
  DeleteConnectionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseConnection(c: typeof connectionsTable.$inferSelect) {
  return {
    ...c,
    connectionType: c.connectionType ?? null,
    label: c.label ?? null,
    sourceHandle: c.sourceHandle ?? null,
    targetHandle: c.targetHandle ?? null,
  };
}

// List connections
router.get("/projects/:projectId/connections", async (req, res) => {
  try {
    const { projectId } = ListConnectionsParams.parse(req.params);
    const connections = await db
      .select()
      .from(connectionsTable)
      .where(eq(connectionsTable.projectId, projectId));
    res.json(connections.map(parseConnection));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list connections" });
  }
});

// Create connection
router.post("/projects/:projectId/connections", async (req, res) => {
  try {
    const { projectId } = CreateConnectionParams.parse(req.params);
    const body = CreateConnectionBody.parse(req.body);
    const [connection] = await db
      .insert(connectionsTable)
      .values({
        projectId,
        sourceComponentId: body.sourceComponentId,
        targetComponentId: body.targetComponentId,
        label: body.label ?? null,
        connectionType: body.connectionType ?? null,
        sourceHandle: body.sourceHandle ?? null,
        targetHandle: body.targetHandle ?? null,
      })
      .returning();
    res.status(201).json(parseConnection(connection));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create connection" });
  }
});

// Delete connection
router.delete("/projects/:projectId/connections/:connectionId", async (req, res) => {
  try {
    const { projectId, connectionId } = DeleteConnectionParams.parse(req.params);
    await db
      .delete(connectionsTable)
      .where(
        and(
          eq(connectionsTable.id, connectionId),
          eq(connectionsTable.projectId, projectId)
        )
      );
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete connection" });
  }
});

export default router;
