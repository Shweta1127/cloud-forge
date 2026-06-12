import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderKanban, LayoutTemplate, Zap } from "lucide-react";

const nav = [
  { href: "/",          Icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects",  Icon: FolderKanban,    label: "Projects"  },
  { href: "/templates", Icon: LayoutTemplate,  label: "Templates" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isEditor = location.startsWith("/editor/");

  if (isEditor) return <>{children}</>;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <aside style={{
        width: 52,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: 12,
        gap: 2,
        background: "var(--panel)",
        borderRight: "1px solid var(--border)",
        flexShrink: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          width: 32,
          height: 32,
          background: "linear-gradient(135deg, var(--accent2), var(--accent))",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          marginBottom: 16,
          flexShrink: 0,
        }}>☁</div>

        {nav.map(({ href, Icon, label }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-${label.toLowerCase()}`}
              title={label}
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                color: active ? "var(--accent)" : "var(--text3)",
                background: active ? "rgba(0,212,255,0.1)" : "transparent",
                border: active ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}
            >
              <Icon size={18} />
            </Link>
          );
        })}

        <div style={{ flex: 1 }} />

        <div style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text3)",
        }}>
          <Zap size={16} />
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
