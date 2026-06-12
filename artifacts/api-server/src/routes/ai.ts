import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { componentsTable, connectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AiChatBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are CloudForge AI, an expert cloud infrastructure architect assistant. 
You help users design, validate, and optimize cloud infrastructure architectures for AWS, Azure, and GCP.

You can:
- Suggest best practices for cloud architecture
- Recommend components to add or remove
- Explain infrastructure patterns (3-tier, microservices, serverless, etc.)
- Help with IaC (Terraform, CloudFormation, Kubernetes)
- Identify security misconfigurations
- Estimate costs and suggest optimizations
- Explain networking concepts (VPCs, subnets, security groups, etc.)

Keep responses concise and actionable. When suggesting specific components, mention their type and provider.`;

router.post("/ai/chat", async (req, res) => {
  try {
    const body = AiChatBody.parse(req.body);

    let contextInfo = "";
    if (body.projectId) {
      const components = await db
        .select()
        .from(componentsTable)
        .where(eq(componentsTable.projectId, body.projectId));
      const connections = await db
        .select()
        .from(connectionsTable)
        .where(eq(connectionsTable.projectId, body.projectId));

      if (components.length > 0) {
        contextInfo = `\n\nCurrent project has ${components.length} components: ${components
          .map((c) => `${c.name} (${c.type}/${c.provider})`)
          .join(", ")}. ${connections.length} connections between them.`;
      }
    }

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT + contextInfo },
    ];

    if (body.history) {
      for (const h of body.history) {
        messages.push({
          role: h.role as "user" | "assistant",
          content: h.content,
        });
      }
    }

    messages.push({ role: "user", content: body.message });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1024,
      messages,
    });

    const responseText = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

    // Extract actionable suggestions (simple heuristic)
    const suggestions: string[] = [];
    const suggestionMatches = responseText.match(/- (.{10,80})/g);
    if (suggestionMatches) {
      suggestions.push(...suggestionMatches.slice(0, 3).map((s) => s.replace(/^- /, "")));
    }

    res.json({ message: responseText, suggestions: suggestions.length > 0 ? suggestions : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

export default router;
