import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, componentsTable, connectionsTable } from "@workspace/db";
import {
  parseTerraform,
  findReferences,
  mapResourceType,
  computeLayout,
} from "../lib/terraform-parser.js";
const router: IRouter = Router();

router.post("/import/terraform", async (req, res) => {
  try {
    const content: unknown = req.body?.content;
    const projectName: unknown = req.body?.projectName;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const parsed = parseTerraform(content);

    if (parsed.resources.length === 0) {
      return res.status(422).json({
        error: "No Terraform resource blocks found in the provided content",
      });
    }

    // Build resource fullName → index map
    const fullNames = parsed.resources.map((r) => `${r.type}.${r.name}`);

    // Detect edges from references
    type Edge = { from: string; to: string };
    const edges: Edge[] = [];
    for (const r of parsed.resources) {
      const me = `${r.type}.${r.name}`;
      const refs = findReferences(r.body, parsed.resources).filter(
        (ref) => ref !== me
      );
      for (const ref of refs) {
        edges.push({ from: ref, to: me });
      }
    }

    // Compute layout
    const positions = computeLayout(fullNames, edges);

    // Determine project name
    const name =
      (typeof projectName === "string" && projectName.trim()) ||
      `Imported Terraform (${new Date().toLocaleDateString()})`;

    // Create the project
    const [project] = await db
      .insert(projectsTable)
      .values({
        name,
        description: `Imported from Terraform — ${parsed.resources.length} resources detected`,
        provider: parsed.detectedProvider,
      })
      .returning();

    // Insert components
    const idMap = new Map<string, number>(); // fullName → DB id
    for (const r of parsed.resources) {
      const fullName = `${r.type}.${r.name}`;
      const pos = positions.get(fullName) ?? { x: 100, y: 100 };
      const [comp] = await db
        .insert(componentsTable)
        .values({
          projectId: project.id,
          type: mapResourceType(r.type),
          provider: parsed.detectedProvider === "multi"
            ? r.type.startsWith("aws_") ? "aws"
              : r.type.startsWith("azurerm_") ? "azure"
              : r.type.startsWith("google_") ? "gcp"
              : "aws"
            : parsed.detectedProvider,
          name: r.name,
          config: JSON.stringify({ tfType: r.type }),
          positionX: String(pos.x),
          positionY: String(pos.y),
        })
        .returning();
      idMap.set(fullName, comp.id);
    }

    // Insert connections (deduplicated)
    const connSet = new Set<string>();
    let connectionCount = 0;
    for (const { from, to } of edges) {
      const key = `${from}→${to}`;
      if (connSet.has(key)) continue;
      connSet.add(key);
      const srcId = idMap.get(from);
      const tgtId = idMap.get(to);
      if (srcId == null || tgtId == null) continue;
      await db.insert(connectionsTable).values({
        projectId: project.id,
        sourceComponentId: srcId,
        targetComponentId: tgtId,
        connectionType: "dependency",
      });
      connectionCount++;
    }

    return res.status(201).json({
      project: { ...project, componentCount: parsed.resources.length, connectionCount },
      componentCount: parsed.resources.length,
      connectionCount,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to import Terraform" });
  }
});

export default router;
