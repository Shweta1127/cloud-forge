import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetRecentProjects, useListProjects, useListTemplates, useCreateProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListProjectsQueryKey, getGetRecentProjectsQueryKey } from "@workspace/api-client-react";
import { Plus, FolderOpen, Box, GitBranch, LayoutTemplate, ArrowRight, Layers, Cpu, Database, Server } from "lucide-react";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/lib/cloud-components";

function ProviderBadge({ provider }: { provider: string }) {
  const color = PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
  const label = PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider.toUpperCase();
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>
      {label}
    </span>
  );
}

function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("aws");
  const [description, setDescription] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const createProject = useCreateProject({
    mutation: {
      onSuccess: (project) => {
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetRecentProjectsQueryKey() });
        onClose();
        setName(""); setDescription(""); setProvider("aws");
        setLocation(`/editor/${project.id}`);
      },
      onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>New Infrastructure Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input id="proj-name" data-testid="input-project-name" placeholder="My Infrastructure" value={name} onChange={(e) => setName(e.target.value)} className="bg-background border-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Input id="proj-desc" data-testid="input-project-description" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background border-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Cloud Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger data-testid="select-provider" className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws">Amazon Web Services (AWS)</SelectItem>
                <SelectItem value="azure">Microsoft Azure</SelectItem>
                <SelectItem value="gcp">Google Cloud Platform (GCP)</SelectItem>
                <SelectItem value="multi">Multi-Cloud</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-project">Cancel</Button>
          <Button data-testid="button-create-project" disabled={!name.trim() || createProject.isPending}
            onClick={() => createProject.mutate({ data: { name: name.trim(), description: description || undefined, provider } })}>
            {createProject.isPending ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const projects = useListProjects();
  const recent = useGetRecentProjects();
  const templates = useListTemplates();

  const stats = [
    { label: "Total Projects", value: projects.data?.length ?? 0, icon: FolderOpen, color: "text-primary" },
    { label: "Components", value: projects.data?.reduce((s, p) => s + p.componentCount, 0) ?? 0, icon: Box, color: "text-accent" },
    { label: "Connections", value: projects.data?.reduce((s, p) => s + p.connectionCount, 0) ?? 0, icon: GitBranch, color: "text-chart-3" },
    { label: "Templates", value: templates.data?.length ?? 0, icon: LayoutTemplate, color: "text-chart-4" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Design, validate, and deploy cloud infrastructure</p>
        </div>
        <Button data-testid="button-new-project" onClick={() => setNewProjectOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-card border border-border ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{projects.isLoading ? <Skeleton className="h-7 w-10" /> : value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1" data-testid="link-all-projects">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        {recent.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : !recent.data?.length ? (
          <Card className="bg-card border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No projects yet</p>
              <Button size="sm" onClick={() => setNewProjectOpen(true)} data-testid="button-create-first">
                <Plus className="w-4 h-4 mr-1" /> Create your first project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recent.data.map((project) => (
              <Link key={project.id} href={`/editor/${project.id}`}>
                <Card data-testid={`card-project-${project.id}`} className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-primary" />
                      </div>
                      <ProviderBadge provider={project.provider} />
                    </div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors truncate">{project.name}</h3>
                    {project.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.description}</p>}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Box className="w-3 h-3" />{project.componentCount}</span>
                      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{project.connectionCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Templates quick access */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Start from a Template</h2>
          <Link href="/templates">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1" data-testid="link-all-templates">
              All templates <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        {templates.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.data?.slice(0, 3).map((tpl) => {
              const icons: Record<string, typeof Server> = { web_app: Server, serverless: Cpu, microservices: Layers, data_pipeline: Database, kubernetes: Box };
              const Icon = icons[tpl.category] ?? Server;
              return (
                <Link key={tpl.id} href="/templates">
                  <Card data-testid={`card-template-${tpl.id}`} className="bg-card border-border hover:border-accent/40 transition-colors cursor-pointer group">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm group-hover:text-accent transition-colors truncate">{tpl.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <ProviderBadge provider={tpl.provider} />
                          <span className="text-xs text-muted-foreground">{tpl.componentCount} components</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </div>
  );
}
