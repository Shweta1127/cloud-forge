import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider").notNull().default("aws"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const componentsTable = pgTable("components", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  config: text("config").notNull().default("{}"),
  positionX: text("position_x").notNull().default("0"),
  positionY: text("position_y").notNull().default("0"),
  width: text("width"),
  height: text("height"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComponentSchema = createInsertSchema(componentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type Component = typeof componentsTable.$inferSelect;

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  sourceComponentId: integer("source_component_id").notNull().references(() => componentsTable.id, { onDelete: "cascade" }),
  targetComponentId: integer("target_component_id").notNull().references(() => componentsTable.id, { onDelete: "cascade" }),
  label: text("label"),
  connectionType: text("connection_type"),
  sourceHandle: text("source_handle"),
  targetHandle: text("target_handle"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(connectionsTable).omit({ id: true, createdAt: true });
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connectionsTable.$inferSelect;

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  provider: text("provider").notNull(),
  tags: text("tags").notNull().default("[]"),
  components: text("components").notNull().default("[]"),
  connections: text("connections").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({ id: true, createdAt: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
