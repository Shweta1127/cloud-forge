import { useState } from "react";
import { useLocation } from "wouter";
import { useListTemplates, useGetTemplate, useUseTemplate, getListProjectsQueryKey, getGetRecentProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Layers, Server, Cpu, Database, Box, Network, ArrowRight, Play } from "lucide-react";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/lib/cloud-components";

const CATEGORY_ICONS: Record<string, typeof Server> = {
  web_app: Server, serverless: Cpu, microservices: Layers, data_pipeline: Database, kubernetes: Box, networking: Network,
};
const CATEGORY_LABELS: Record<string, string> = {
  web_app: "Web App", serverless: "Serverless", microservices: "Microservices", data_pipeline: "Data Pipeline", kubernetes: "Kubernetes", networking: "Networking",
};

function ProviderBadge({ provider }: { provider: string }) {
  const color = PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
  const label = PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider.toUpperCase();
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border" style={{ borderColor: `${color}40`, background: `${color}15`, color }}>
      {label}
    </span>
  );
}

function TemplateDetailDialog({ templateId, open, onClose }: { templateId: number; open: boolean; onClose: () => void }) {
  const template = useGetTemplate(templateId, { query: { enabled: open && !!templateId } });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const useTemplateMutation = useUseTemplate({
    mutation: {
      onSuccess: (result) => {
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetRecentProjectsQueryKey() });
        onClose();
        toast({
          title: "Project created from template",
          description: `${result.project.componentCount} components · ${result.project.connectionCount} connections`,
        });
        setLocation(`/editor/${result.project.id}`);
      },
      onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
    },
  });

  const tpl = template.data;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tpl ? tpl.name : <Skeleton className="h-6 w-48" />}
          </DialogTitle>
        </DialogHeader>
        {template.isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : tpl ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{tpl.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <ProviderBadge provider={tpl.provider} />
              <Badge variant="secondary">{CATEGORY_LABELS[tpl.category] ?? tpl.category}</Badge>
              <span className="text-xs text-muted-foreground">{tpl.componentCount} components</span>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {tpl.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{tag}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">COMPONENTS ({tpl.components?.length ?? 0})</h4>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {(tpl.components as Array<{ name: string; type: string; provider: string }>)?.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: PROVIDER_COLORS[c.provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280" }} />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button data-testid="button-use-template" disabled={!tpl || useTemplateMutation.isPending}
            onClick={() => { if (!tpl) return; useTemplateMutation.mutate({ templateId: tpl.id }); }}>
            <Play className="w-4 h-4 mr-2" />
            {useTemplateMutation.isPending ? "Creating..." : "Use Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const templates = useListTemplates();

  const categories = ["all", ...Array.from(new Set(templates.data?.map(t => t.category) ?? []))];
  const filtered = templates.data?.filter(t => selectedCategory === "all" || t.category === selectedCategory);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground mt-1">Prebuilt architecture patterns to get started quickly</p>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm"
            data-testid={`filter-${cat}`} onClick={() => setSelectedCategory(cat)} className="rounded-full">
            {cat === "all" ? "All" : CATEGORY_LABELS[cat] ?? cat}
          </Button>
        ))}
      </div>

      {templates.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((tpl) => {
            const Icon = CATEGORY_ICONS[tpl.category] ?? Server;
            return (
              <Card key={tpl.id} data-testid={`card-template-${tpl.id}`}
                className="bg-card border-border hover:border-accent/40 transition-colors cursor-pointer group"
                onClick={() => setSelectedTemplate(tpl.id)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm group-hover:text-accent transition-colors">{tpl.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <ProviderBadge provider={tpl.provider} />
                      <span className="text-xs text-muted-foreground">{tpl.componentCount} components</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tpl.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{tag}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedTemplate && (
        <TemplateDetailDialog templateId={selectedTemplate} open={!!selectedTemplate} onClose={() => setSelectedTemplate(null)} />
      )}
    </div>
  );
}
