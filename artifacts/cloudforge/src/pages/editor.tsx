import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, addEdge, type Node, type Edge,
  type Connection, BackgroundVariant, ReactFlowProvider, ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  useGetProject, useCreateComponent, useDeleteComponent,
  useCreateConnection, useDeleteConnection, useValidateProject,
  useExportProject, getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import CloudNode from "@/components/cloud-node";
import ComponentPalette from "@/components/component-palette";
import PropertiesPanel from "@/components/properties-panel";
import AiChat from "@/components/ai-chat";
import { PROVIDER_COLORS, PROVIDER_LABELS, EXPORT_FORMATS, type ComponentDef } from "@/lib/cloud-components";

const nodeTypes = { cloudNode: CloudNode };

// ── History action types ──────────────────────────────────────
type HistoryAction =
  | { type: "ADD_NODE";    node: Node;  componentId: number }
  | { type: "DELETE_NODE"; node: Node;  componentId: number; compData: { type: string; provider: string; name: string; config: Record<string, unknown>; positionX: number; positionY: number } }
  | { type: "ADD_EDGE";    edge: Edge;  connectionId: number; sourceId: number; targetId: number }
  | { type: "DELETE_EDGE"; edge: Edge;  connectionId: number; sourceId: number; targetId: number };

// ── Shared button styles ──────────────────────────────────────
const BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
  borderRadius: 6, border: "1px solid var(--border2)", background: "var(--bg3)",
  color: "var(--text2)", fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600,
  cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.3px",
};
const BTN_PRIMARY: React.CSSProperties = {
  ...BTN, background: "var(--accent2)", borderColor: "var(--accent2)", color: "white",
};
const BTN_ICON: React.CSSProperties = {
  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 6, border: "1px solid var(--border2)", background: "var(--bg3)",
  color: "var(--text2)", fontFamily: "var(--app-font-sans)", fontSize: 14,
  cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
};

function BtnHover({ style, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { style?: React.CSSProperties }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...BTN,
        ...(hov && !disabled ? { borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(0,212,255,0.05)" } : {}),
        ...(disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}),
        ...style,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    />
  );
}

function IconBtn({ title, disabled, onClick, children }: {
  title: string; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...BTN_ICON,
        ...(hov && !disabled ? { borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(0,212,255,0.05)" } : {}),
        ...(disabled ? { opacity: 0.35, cursor: "not-allowed" } : {}),
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

function EditorInner({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const project = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [zoom, setZoom] = useState(1);

  // ── Undo / Redo history ──────────────────────────────────────
  const past   = useRef<HistoryAction[]>([]);
  const future = useRef<HistoryAction[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryState = () => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  };

  const pushHistory = useCallback((action: HistoryAction) => {
    past.current.push(action);
    future.current = [];
    syncHistoryState();
  }, []);

  // ── Export / Validate state ───────────────────────────────────
  const [exportFormat, setExportFormat] = useState("terraform");
  const [exportContent, setExportContent] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);

  const validateProject  = useValidateProject();
  const exportProject    = useExportProject();
  const createComponent  = useCreateComponent();
  const deleteComponent  = useDeleteComponent();
  const createConnection = useCreateConnection();
  const deleteConnection = useDeleteConnection();

  // ── Initialise nodes/edges from project data ─────────────────
  useEffect(() => {
    if (project.data && !initialized) {
      const n: Node[] = project.data.components.map((c) => ({
        id: String(c.id), type: "cloudNode",
        position: { x: Number(c.positionX) || 0, y: Number(c.positionY) || 0 },
        data: { type: c.type, provider: c.provider, name: c.name, config: c.config as Record<string, unknown> },
      }));
      const e: Edge[] = project.data.connections.map((conn) => ({
        id: String(conn.id),
        source: String(conn.sourceComponentId), target: String(conn.targetComponentId),
        sourceHandle: conn.sourceHandle ?? undefined,
        targetHandle: conn.targetHandle ?? undefined,
        type: "smoothstep",
        label: conn.label ?? undefined, animated: conn.connectionType === "data_flow",
        style: { stroke: "rgba(0,212,255,0.45)", strokeWidth: 1.5 },
        labelStyle: { fill: "var(--text3)", fontSize: 9, fontFamily: "var(--app-font-mono)" },
        labelBgStyle: { fill: "var(--bg2)", fillOpacity: 0.9 },
      }));
      setNodes(n); setEdges(e); setInitialized(true);
    }
  }, [project.data, initialized]);

  // ── Drag & Drop ───────────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/cloudforge");
      if (!raw) return;
      const def: ComponentDef = JSON.parse(raw);
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = { x: event.clientX - bounds.left - 60, y: event.clientY - bounds.top - 40 };
      createComponent.mutate(
        { projectId, data: { type: def.type, provider: def.provider, name: def.label, config: def.defaultConfig, positionX: position.x, positionY: position.y } },
        {
          onSuccess: (comp) => {
            const newNode: Node = {
              id: String(comp.id), type: "cloudNode",
              position: { x: Number(comp.positionX), y: Number(comp.positionY) },
              data: { type: comp.type, provider: comp.provider, name: comp.name, config: comp.config as Record<string, unknown> },
            };
            setNodes((ns) => [...ns, newNode]);
            pushHistory({ type: "ADD_NODE", node: newNode, componentId: comp.id });
            qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          },
          onError: () => toast({ title: "Failed to add component", variant: "destructive" }),
        }
      );
    },
    [projectId, createComponent, qc, toast, setNodes, pushHistory]
  );

  const onPaletteDragStart = useCallback((event: React.DragEvent, def: ComponentDef) => {
    event.dataTransfer.setData("application/cloudforge", JSON.stringify(def));
    event.dataTransfer.effectAllowed = "move";
  }, []);

  // ── Connect nodes ─────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      createConnection.mutate(
        { projectId, data: { sourceComponentId: parseInt(params.source), targetComponentId: parseInt(params.target), connectionType: "network", sourceHandle: params.sourceHandle ?? null, targetHandle: params.targetHandle ?? null } },
        {
          onSuccess: (conn) => {
            const edge: Edge = {
              id: String(conn.id),
              source: String(conn.sourceComponentId),
              target: String(conn.targetComponentId),
              sourceHandle: params.sourceHandle ?? undefined,
              targetHandle: params.targetHandle ?? undefined,
              type: "smoothstep",
              animated: false,
              style: { stroke: "rgba(0,212,255,0.45)", strokeWidth: 1.5 },
            };
            setEdges((es) => addEdge(edge, es));
            pushHistory({ type: "ADD_EDGE", edge, connectionId: conn.id, sourceId: conn.sourceComponentId, targetId: conn.targetComponentId });
            qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          },
          onError: () => toast({ title: "Failed to connect components", variant: "destructive" }),
        }
      );
    },
    [projectId, createConnection, qc, toast, setEdges, pushHistory]
  );

  // ── Delete selected node ──────────────────────────────────────
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    const compId = parseInt(selectedNode.id);
    if (isNaN(compId)) return;
    const nodeData = selectedNode.data as { type: string; provider: string; name: string; config: Record<string, unknown> };
    const compData = {
      type: nodeData.type, provider: nodeData.provider, name: nodeData.name, config: nodeData.config,
      positionX: selectedNode.position.x, positionY: selectedNode.position.y,
    };
    deleteComponent.mutate(
      { projectId, componentId: compId },
      {
        onSuccess: () => {
          pushHistory({ type: "DELETE_NODE", node: selectedNode, componentId: compId, compData });
          setNodes((ns) => ns.filter((n) => n.id !== selectedNode.id));
          setEdges((es) => es.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
          setSelectedNode(null);
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        },
        onError: () => toast({ title: "Failed to delete component", variant: "destructive" }),
      }
    );
  }, [selectedNode, projectId, deleteComponent, qc, toast, setNodes, setEdges, pushHistory]);

  // ── Undo ──────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (!past.current.length) return;
    const action = past.current.pop()!;
    future.current.push(action);
    syncHistoryState();

    if (action.type === "ADD_NODE") {
      deleteComponent.mutate({ projectId, componentId: action.componentId }, {
        onSuccess: () => {
          setNodes((ns) => ns.filter((n) => n.id !== action.node.id));
          setEdges((es) => es.filter((e) => e.source !== action.node.id && e.target !== action.node.id));
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        },
        onError: () => toast({ title: "Undo failed", variant: "destructive" }),
      });
    } else if (action.type === "DELETE_NODE") {
      createComponent.mutate(
        { projectId, data: action.compData },
        {
          onSuccess: (comp) => {
            const restoredNode: Node = {
              id: String(comp.id), type: "cloudNode",
              position: { x: Number(comp.positionX), y: Number(comp.positionY) },
              data: { type: comp.type, provider: comp.provider, name: comp.name, config: comp.config as Record<string, unknown> },
            };
            setNodes((ns) => [...ns, restoredNode]);
            qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          },
          onError: () => toast({ title: "Undo failed", variant: "destructive" }),
        }
      );
    } else if (action.type === "ADD_EDGE") {
      deleteConnection.mutate({ projectId, connectionId: action.connectionId }, {
        onSuccess: () => {
          setEdges((es) => es.filter((e) => e.id !== action.edge.id));
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        },
        onError: () => toast({ title: "Undo failed", variant: "destructive" }),
      });
    } else if (action.type === "DELETE_EDGE") {
      createConnection.mutate(
        { projectId, data: { sourceComponentId: action.sourceId, targetComponentId: action.targetId, connectionType: "network" } },
        {
          onSuccess: (conn) => {
            const restoredEdge: Edge = {
              id: String(conn.id), source: String(conn.sourceComponentId), target: String(conn.targetComponentId),
              animated: false, style: { stroke: "rgba(0,212,255,0.45)", strokeWidth: 1.5 },
            };
            setEdges((es) => [...es, restoredEdge]);
            qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          },
          onError: () => toast({ title: "Undo failed", variant: "destructive" }),
        }
      );
    }
  }, [projectId, createComponent, deleteComponent, createConnection, deleteConnection, qc, toast, setNodes, setEdges]);

  // ── Redo ──────────────────────────────────────────────────────
  const redo = useCallback(() => {
    if (!future.current.length) return;
    const action = future.current.pop()!;
    past.current.push(action);
    syncHistoryState();

    if (action.type === "ADD_NODE") {
      createComponent.mutate(
        { projectId, data: action.action ?? { type: (action.node.data as any).type, provider: (action.node.data as any).provider, name: (action.node.data as any).name, config: (action.node.data as any).config, positionX: action.node.position.x, positionY: action.node.position.y } },
        {
          onSuccess: (comp) => {
            const newNode: Node = {
              id: String(comp.id), type: "cloudNode",
              position: { x: Number(comp.positionX), y: Number(comp.positionY) },
              data: { type: comp.type, provider: comp.provider, name: comp.name, config: comp.config as Record<string, unknown> },
            };
            setNodes((ns) => [...ns, newNode]);
            qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          },
          onError: () => toast({ title: "Redo failed", variant: "destructive" }),
        }
      );
    } else if (action.type === "DELETE_NODE") {
      deleteComponent.mutate({ projectId, componentId: action.componentId }, {
        onSuccess: () => {
          setNodes((ns) => ns.filter((n) => n.id !== action.node.id));
          setEdges((es) => es.filter((e) => e.source !== action.node.id && e.target !== action.node.id));
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        },
        onError: () => toast({ title: "Redo failed", variant: "destructive" }),
      });
    } else if (action.type === "ADD_EDGE") {
      createConnection.mutate(
        { projectId, data: { sourceComponentId: action.sourceId, targetComponentId: action.targetId, connectionType: "network" } },
        {
          onSuccess: (conn) => {
            const edge: Edge = {
              id: String(conn.id), source: String(conn.sourceComponentId), target: String(conn.targetComponentId),
              animated: false, style: { stroke: "rgba(0,212,255,0.45)", strokeWidth: 1.5 },
            };
            setEdges((es) => [...es, edge]);
            qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          },
          onError: () => toast({ title: "Redo failed", variant: "destructive" }),
        }
      );
    } else if (action.type === "DELETE_EDGE") {
      deleteConnection.mutate({ projectId, connectionId: action.connectionId }, {
        onSuccess: () => {
          setEdges((es) => es.filter((e) => e.id !== action.edge.id));
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        },
        onError: () => toast({ title: "Redo failed", variant: "destructive" }),
      });
    }
  }, [projectId, createComponent, deleteComponent, createConnection, deleteConnection, qc, toast, setNodes, setEdges]);

  // ── Keyboard: Delete, Ctrl+Z, Ctrl+Y/Ctrl+Shift+Z ────────────
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key === "z" && !event.shiftKey) { event.preventDefault(); undo(); return; }
      if (meta && (event.key === "y" || (event.key === "z" && event.shiftKey))) { event.preventDefault(); redo(); return; }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedNode) {
        if ((event.target as HTMLElement).tagName === "INPUT" || (event.target as HTMLElement).tagName === "TEXTAREA") return;
        deleteSelectedNode();
      }
    },
    [undo, redo, selectedNode, deleteSelectedNode]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const compId = parseInt(node.id);
      if (isNaN(compId)) return;
      fetch(`/api/projects/${projectId}/components/${compId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionX: node.position.x, positionY: node.position.y }),
      }).catch(() => {});
    },
    [projectId]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => setSelectedNode(node), []);
  const onPaneClick  = useCallback(() => setSelectedNode(null), []);

  const handleValidate = () => {
    validateProject.mutate({ projectId }, {
      onSuccess: () => setValidateOpen(true),
      onError: () => toast({ title: "Validation failed", variant: "destructive" }),
    });
  };

  const handleExport = () => {
    exportProject.mutate(
      { projectId, data: { format: exportFormat } },
      {
        onSuccess: (result) => { setExportContent(result.content); setExportOpen(true); },
        onError: () => toast({ title: "Export failed", variant: "destructive" }),
      }
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadExport = () => {
    const fmt = EXPORT_FORMATS.find(f => f.value === exportFormat);
    const blob = new Blob([exportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fmt?.ext ? `infrastructure${fmt.ext}` : "infrastructure.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validationData = validateProject.data as {
    valid: boolean;
    issues: Array<{ severity: string; message: string; code: string; componentId: number | null }>;
    suggestions: Array<{ type: string; message: string }>;
  } | undefined;

  const providerColor = PROVIDER_COLORS[project.data?.provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280";
  const providerLabel = PROVIDER_LABELS[project.data?.provider as keyof typeof PROVIDER_LABELS] ?? project.data?.provider?.toUpperCase();

  if (project.isLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--bg)", fontFamily: "var(--app-font-sans)" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <span style={{ color: "var(--text2)", fontSize: 13 }}>Loading project...</span>
      </div>
    );
  }

  if (!project.data) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "var(--bg)" }}>
        <p style={{ color: "var(--text2)", fontFamily: "var(--app-font-sans)" }}>Project not found</p>
        <Link href="/projects"><button style={BTN}>← Back to Projects</button></Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }} onKeyDown={onKeyDown} tabIndex={0}>

      {/* ─── TOP BAR ─── */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
        borderBottom: "1px solid var(--border)", background: "var(--panel)", flexShrink: 0, zIndex: 100,
      }}>
        {/* Back */}
        <Link href="/projects">
          <button data-testid="button-back" style={BTN_ICON}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = "var(--accent)"; (e.currentTarget).style.color = "var(--accent)"; }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = "var(--border2)"; (e.currentTarget).style.color = "var(--text2)"; }}
          >←</button>
        </Link>

        <div style={{ width: 1, height: 28, background: "var(--border)" }} />

        {/* Logo + name */}
        <div style={{
          width: 24, height: 24, background: "linear-gradient(135deg, var(--accent2), var(--accent))",
          borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
        }}>☁</div>

        <div style={{ fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
          {project.data.name}
        </div>

        <span style={{
          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
          background: `${providerColor}20`, color: providerColor, border: `1px solid ${providerColor}40`,
          fontFamily: "var(--app-font-sans)", letterSpacing: "0.5px",
        }}>
          {providerLabel}
        </span>

        <div style={{ width: 1, height: 28, background: "var(--border)" }} />

        {/* ── Undo / Redo buttons ── */}
        <IconBtn title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>↩</IconBtn>
        <IconBtn title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}>↪</IconBtn>

        <div style={{ flex: 1 }} />

        {/* Validate */}
        <BtnHover
          data-testid="button-validate"
          onClick={handleValidate}
          disabled={validateProject.isPending}
        >
          {validateProject.isPending ? <span style={{ fontSize: 10 }}>…</span> : <span>⊙</span>}
          Validate
        </BtnHover>

        {/* Export format + button */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <select
            data-testid="select-export-format"
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value)}
            style={{
              height: 32, padding: "0 8px", background: "var(--bg3)", border: "1px solid var(--border2)",
              borderRight: "none", borderRadius: "6px 0 0 6px", color: "var(--text2)",
              fontFamily: "var(--app-font-mono)", fontSize: 10, outline: "none", cursor: "pointer",
            }}
          >
            {EXPORT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button
            data-testid="button-export"
            onClick={handleExport}
            disabled={exportProject.isPending}
            style={{ ...BTN_PRIMARY, borderRadius: "0 6px 6px 0", height: 32, padding: "0 12px", opacity: exportProject.isPending ? 0.7 : 1 }}
          >
            {exportProject.isPending ? "…" : "↓"} Export
          </button>
        </div>
      </div>

      {/* ─── EDITOR LAYOUT ─── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ComponentPalette onDragStart={onPaletteDragStart} />

        {/* Canvas */}
        <div ref={reactFlowWrapper} style={{ flex: 1, position: "relative" }} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            onMoveEnd={(_, v) => setZoom(v.zoom)}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={null}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { stroke: "rgba(0,212,255,0.45)", strokeWidth: 1.5 },
              animated: false,
            }}
          >
            <Background
              id="grid-lines"
              variant={BackgroundVariant.Lines}
              gap={40}
              lineWidth={0.5}
              color="rgba(30,42,56,0.6)"
            />
            <Background
              id="grid-dots"
              variant={BackgroundVariant.Dots}
              gap={40}
              size={1.5}
              color="rgba(50,70,95,0.9)"
            />
            <Controls />
            <MiniMap
              nodeColor={(n) => PROVIDER_COLORS[(n.data as { provider: string }).provider as keyof typeof PROVIDER_COLORS] ?? "#6b7280"}
              maskColor="rgba(10,13,18,0.7)"
              style={{ height: 90 }}
            />
            <Panel position="top-center">
              {nodes.length === 0 && (
                <div style={{
                  background: "rgba(17,22,32,0.85)", backdropFilter: "blur(4px)",
                  border: "1px solid var(--border2)", borderRadius: 8,
                  padding: "8px 16px", fontSize: 11, color: "var(--text3)",
                  fontFamily: "var(--app-font-sans)",
                }}>
                  ☁ Drag components from the left panel to start designing
                </div>
              )}
            </Panel>
          </ReactFlow>
        </div>

        {/* Right panel */}
        <PropertiesPanel
          node={selectedNode as any}
          projectId={projectId}
          onClose={() => setSelectedNode(null)}
          onDelete={deleteSelectedNode}
          onNameChange={(nodeId, name) => {
            setNodes((ns) => ns.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, name } } : n));
          }}
        />
      </div>

      {/* ─── STATUS BAR ─── */}
      <div className="statusbar">
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
          <span>Ready</span>
        </div>
        <span>nodes: <span style={{ color: "var(--text)" }}>{nodes.length}</span></span>
        <span>connections: <span style={{ color: "var(--text)" }}>{edges.length}</span></span>
        <span>zoom: <span style={{ color: "var(--text)" }}>{Math.round(zoom * 100)}%</span></span>
        {canUndo && (
          <span style={{ color: "var(--accent)", fontSize: 9, fontFamily: "var(--app-font-mono)" }}>
            ↩ {past.current.length} action{past.current.length !== 1 ? "s" : ""} in history
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>
          provider: <span style={{ color: providerColor }}>{providerLabel}</span>
        </span>
      </div>

      {/* AI Chat */}
      <AiChat projectId={projectId} />

      {/* ─── VALIDATE MODAL ─── */}
      {validateOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "var(--panel)", border: "1px solid var(--border2)", borderRadius: 12,
            width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
          }}>
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--app-font-sans)", color: "var(--text)" }}>
                  {validationData?.valid ? "✓" : "⚠"} Validation Results
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, fontFamily: "var(--app-font-mono)" }}>
                  {validationData?.valid ? "No critical issues found" : `${validationData?.issues.length ?? 0} issue(s) detected`}
                </div>
              </div>
              <button onClick={() => setValidateOpen(false)} style={{ marginLeft: "auto", width: 28, height: 28, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text2)", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {validationData?.valid && validationData.issues.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 6, background: "rgba(0,212,136,0.08)", border: "1px solid rgba(0,212,136,0.2)", fontSize: 12, fontFamily: "var(--app-font-sans)", color: "var(--success)" }}>
                  ✓ All checks passed. Your infrastructure looks good!
                </div>
              )}
              {validationData?.issues.map((issue, i) => (
                <div key={i} style={{
                  display: "flex", gap: 8, padding: "8px 10px", borderRadius: 6, fontSize: 11, border: "1px solid",
                  background: issue.severity === "error" ? "rgba(255,68,102,0.08)" : "rgba(255,170,0,0.08)",
                  borderColor: issue.severity === "error" ? "rgba(255,68,102,0.2)" : "rgba(255,170,0,0.2)",
                }}>
                  <span style={{ flexShrink: 0, fontSize: 13 }}>{issue.severity === "error" ? "●" : "◆"}</span>
                  <div style={{ color: "var(--text2)", lineHeight: 1.4, fontFamily: "var(--app-font-sans)" }}>
                    <strong style={{ color: "var(--text)", display: "block", marginBottom: 2, textTransform: "uppercase", fontSize: 9, letterSpacing: "1px" }}>{issue.severity}</strong>
                    {issue.message}
                  </div>
                </div>
              ))}
              {(validationData?.suggestions?.length ?? 0) > 0 && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", color: "var(--text3)", textTransform: "uppercase", marginTop: 8, fontFamily: "var(--app-font-sans)" }}>Suggestions</div>
                  {validationData?.suggestions.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 6, fontSize: 11, background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", fontFamily: "var(--app-font-sans)", color: "var(--text2)" }}>
                      <span style={{ color: "var(--accent)", flexShrink: 0 }}>✦</span>
                      <div>
                        <strong style={{ color: "var(--accent)", display: "block", marginBottom: 2, fontSize: 9, letterSpacing: "1px", textTransform: "uppercase" }}>{s.type.replace(/_/g, " ")}</strong>
                        {s.message}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setValidateOpen(false)} style={BTN}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EXPORT MODAL ─── */}
      {exportOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "var(--panel)", border: "1px solid var(--border2)", borderRadius: 12,
            width: 680, maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
          }}>
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--app-font-sans)", color: "var(--text)" }}>Export Infrastructure</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, fontFamily: "var(--app-font-mono)" }}>{EXPORT_FORMATS.find(f => f.value === exportFormat)?.label}</div>
              </div>
              <button onClick={() => setExportOpen(false)} style={{ marginLeft: "auto", width: 28, height: 28, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text2)", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              <pre className="code-block">{exportContent}</pre>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setExportOpen(false)} style={BTN}>Close</button>
              <button onClick={downloadExport} style={BTN}>↓ Download</button>
              <button onClick={copyToClipboard} style={{ ...BTN, ...(copied ? { borderColor: "var(--success)", color: "var(--success)" } : {}) }}>
                {copied ? "✓ Copied" : "⎘ Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Editor() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = parseInt(projectIdParam ?? "");
  if (isNaN(projectId)) return <div style={{ padding: 32, color: "var(--text2)" }}>Invalid project</div>;
  return (
    <ReactFlowProvider>
      <EditorInner projectId={projectId} />
    </ReactFlowProvider>
  );
}
