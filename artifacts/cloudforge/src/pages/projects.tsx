import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListProjects,
  useCreateProject,
  useDeleteProject,
  getListProjectsQueryKey,
  getGetRecentProjectsQueryKey,
  useImportTerraform,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Trash2,
  ExternalLink,
  FolderOpen,
  Box,
  GitBranch,
  Layers,
  Upload,
  FileCode,
  X,
} from "lucide-react";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/lib/cloud-components";

function ProviderBadge({ provider }: { provider: string }) {
  const color =
    PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
  const label =
    PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ??
    provider.toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
      style={{
        borderColor: `${color}40`,
        background: `${color}15`,
        color,
      }}
    >
      {label}
    </span>
  );
}

function detectProvider(content: string): string {
  const aws = (content.match(/\baws_/g) ?? []).length;
  const azure = (content.match(/\bazurerm_/g) ?? []).length;
  const gcp = (content.match(/\bgoogle_/g) ?? []).length;
  const providers = [aws, azure, gcp].filter((n) => n > 0).length;
  if (providers > 1) return "multi";
  if (aws > 0) return "aws";
  if (azure > 0) return "azure";
  if (gcp > 0) return "gcp";
  return "aws";
}

function NewProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("aws");
  const [description, setDescription] = useState("");
  const [tfFile, setTfFile] = useState<File | null>(null);
  const [tfContent, setTfContent] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetRecentProjectsQueryKey() });
  };

  const createProject = useCreateProject({
    mutation: {
      onSuccess: (project) => {
        invalidate();
        handleClose();
        setLocation(`/editor/${project.id}`);
      },
      onError: () =>
        toast({ title: "Failed to create project", variant: "destructive" }),
    },
  });

  const importTf = useImportTerraform({
    mutation: {
      onSuccess: (result) => {
        invalidate();
        handleClose();
        toast({
          title: "Terraform imported",
          description: `${result.componentCount} components · ${result.connectionCount} connections`,
        });
        setLocation(`/editor/${result.project.id}`);
      },
      onError: () =>
        toast({
          title: "Import failed — check your .tf file",
          variant: "destructive",
        }),
    },
  });

  const isPending = createProject.isPending || importTf.isPending;

  const handleClose = () => {
    setName("");
    setDescription("");
    setProvider("aws");
    setTfFile(null);
    setTfContent(null);
    setDragging(false);
    onClose();
  };

  const handleFile = async (f: File) => {
    if (!f.name.endsWith(".tf") && !f.name.endsWith(".tfvars")) {
      toast({
        title: "Please upload a .tf Terraform file",
        variant: "destructive",
      });
      return;
    }
    const text = await f.text();
    setTfFile(f);
    setTfContent(text);
    if (!name.trim()) {
      setName(f.name.replace(/\.tf(vars)?$/, ""));
    }
    const detected = detectProvider(text);
    setProvider(detected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const removeFile = () => {
    setTfFile(null);
    setTfContent(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (tfFile && tfContent) {
      importTf.mutate({
        data: {
          content: tfContent,
          projectName: trimmedName,
        },
      });
    } else {
      createProject.mutate({
        data: {
          name: trimmedName,
          description: description || undefined,
          provider,
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>New Infrastructure Project</DialogTitle>
          <DialogDescription>
            Start from scratch or import an existing Terraform configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input
              id="proj-name"
              data-testid="input-project-name"
              placeholder="My Infrastructure"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Input
              id="proj-desc"
              data-testid="input-project-desc"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background"
              disabled={!!tfFile}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cloud Provider</Label>
            <Select
              value={provider}
              onValueChange={setProvider}
              disabled={!!tfFile}
            >
              <SelectTrigger
                data-testid="select-provider"
                className="bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws">Amazon Web Services (AWS)</SelectItem>
                <SelectItem value="azure">Microsoft Azure</SelectItem>
                <SelectItem value="gcp">Google Cloud Platform (GCP)</SelectItem>
                <SelectItem value="multi">Multi-Cloud</SelectItem>
              </SelectContent>
            </Select>
            {!!tfFile && (
              <p className="text-xs text-muted-foreground">
                Auto-detected from Terraform file
              </p>
            )}
          </div>

          {/* Terraform file section */}
          <div className="space-y-1.5">
            <Label>
              Terraform File{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>

            {!tfFile ? (
              <div
                className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragging
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--border) 80%, transparent)",
                  background: dragging ? "rgba(0,212,255,0.05)" : "transparent",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <FileCode className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs font-medium">
                  Drop a{" "}
                  <code className="text-primary font-mono">.tf</code> file to
                  auto-generate diagram
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  or click to browse
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".tf,.tfvars"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
                style={{
                  borderColor: "rgba(0,212,255,0.3)",
                  background: "rgba(0,212,255,0.06)",
                }}
              >
                <FileCode className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tfFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(tfFile.size / 1024).toFixed(1)} KB · diagram will be
                    auto-generated
                  </p>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            data-testid="button-create-project"
            disabled={!name.trim() || isPending}
            onClick={handleSubmit}
            className="gap-2"
          >
            {isPending ? (
              tfFile ? (
                "Importing..."
              ) : (
                "Creating..."
              )
            ) : tfFile ? (
              <>
                <Upload className="w-3.5 h-3.5" /> Create & Generate Diagram
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  projectId,
  projectName,
  open,
  onClose,
}: {
  projectId: number;
  projectName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const deleteProject = useDeleteProject({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetRecentProjectsQueryKey() });
        onClose();
        toast({ title: "Project deleted" });
      },
      onError: () =>
        toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{projectName}</strong> and all
            its components. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            data-testid="button-confirm-delete"
            disabled={deleteProject.isPending}
            onClick={() => deleteProject.mutate({ projectId })}
          >
            {deleteProject.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const [newOpen, setNewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const projects = useListProjects();

  const filtered = projects.data?.filter((p) => {
    const matchSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchProvider =
      providerFilter === "all" || p.provider === providerFilter;
    return matchSearch && matchProvider;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your infrastructure designs
          </p>
        </div>
        <Button
          data-testid="button-new-project"
          onClick={() => setNewOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger
            data-testid="select-filter-provider"
            className="w-40 bg-background"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="aws">AWS</SelectItem>
            <SelectItem value="azure">Azure</SelectItem>
            <SelectItem value="gcp">GCP</SelectItem>
            <SelectItem value="multi">Multi-Cloud</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {projects.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !filtered?.length ? (
        <Card className="bg-card border-dashed border-border">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <FolderOpen className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search || providerFilter !== "all"
                ? "No projects match your filters"
                : "No projects yet"}
            </p>
            {!search && providerFilter === "all" && (
              <Button
                size="sm"
                onClick={() => setNewOpen(true)}
                data-testid="button-create-first"
              >
                <Plus className="w-4 h-4 mr-1" /> Create first project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project.id}
              data-testid={`card-project-${project.id}`}
              className="bg-card border-border hover:border-primary/30 transition-colors group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ProviderBadge provider={project.provider} />
                    <button
                      data-testid={`button-delete-project-${project.id}`}
                      onClick={() =>
                        setDeleteTarget({ id: project.id, name: project.name })
                      }
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Box className="w-3 h-3" />
                    {project.componentCount} components
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {project.connectionCount} connections
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <Link href={`/editor/${project.id}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full gap-2 text-muted-foreground hover:text-foreground"
                      data-testid={`button-open-project-${project.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Editor
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
      {deleteTarget && (
        <DeleteDialog
          projectId={deleteTarget.id}
          projectName={deleteTarget.name}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
