import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Dumbbell, Utensils, TrendingUp, Camera, Settings, User, LogOut, Menu, X, Zap
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { label: "Treino", icon: Dumbbell, page: "Workout" },
  { label: "Dieta", icon: Utensils, page: "Diet" },
  { label: "Progresso", icon: TrendingUp, page: "Progress" },
  { label: "Refeição", icon: Camera, page: "MealAnalysis" },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  const loadProfile = () => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) {
        base44.entities.UserProfile.filter({ user_email: u.email }).then(profiles => {
          if (profiles.length > 0) setProfile(profiles[0]);
        });
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadProfile();
    window.addEventListener("profile-updated", loadProfile);
    return () => window.removeEventListener("profile-updated", loadProfile);
  }, []);

  const publicPages = ["Onboarding", "Landing"];
  if (publicPages.includes(currentPageName)) return <>{children}</>;

  const primaryColor = profile?.primary_color || "#00D4AA";
  const theme = profile?.theme || "dark";
  const isLight = theme === "light" || (theme === "auto" && window.matchMedia?.("(prefers-color-scheme: light)").matches);

  const themeVars = isLight ? {
    "--bg-dark": "#F0F2F5",
    "--bg-card": "#FFFFFF",
    "--bg-surface": "#E8EAED",
    "--border-color": "rgba(0,0,0,0.08)",
    "--text-primary": "#111118",
    "--text-secondary": "#4A4A5A",
    "--text-muted": "#8A8A9A",
  } : {
    "--bg-dark": "#0A0A0F",
    "--bg-card": "#111118",
    "--bg-surface": "#16161F",
    "--border-color": "rgba(255,255,255,0.07)",
    "--text-primary": "#F0F0F5",
    "--text-secondary": "#8A8A9A",
    "--text-muted": "#4A4A5A",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-dark)", color: "var(--text-primary)", "--primary": primaryColor, "--primary-dark": `${primaryColor}cc`, ...themeVars }}>
      <style>{`
        .nav-active { color: ${primaryColor} !important; }
        .nav-active .nav-dot { background: ${primaryColor}; display: block; }
        .btn-primary { background: ${primaryColor}; }
        .btn-primary:hover { opacity: 0.9; }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 z-50"
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border-color)" }}>
        <div className="p-6 flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
            <Zap size={16} color="#000" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>YForge Fit</span>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map(item => {
            const active = currentPageName === item.page;
            return (
              <Link key={item.page} to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 group ${active ? "nav-active" : ""}`}
                style={{
                  background: active ? `${primaryColor}15` : "transparent",
                  color: active ? primaryColor : "var(--text-secondary)"
                }}>
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full nav-dot" style={{ background: primaryColor }} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "var(--border-color)" }}>
          <Link to={createPageUrl("Settings")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all`}
            style={{ color: currentPageName === "Settings" ? primaryColor : "var(--text-secondary)" }}>
            <Settings size={18} />
            <span className="text-sm font-medium">Configurações</span>
          </Link>
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{ background: `${primaryColor}30`, color: primaryColor }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : (user.full_name || user.email || "U")[0].toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {profile?.nickname || user.full_name?.split(" ")[0] || "Usuário"}
                </p>
              </div>
              <button onClick={() => base44.auth.logout()} style={{ color: "var(--text-muted)" }}
                className="hover:opacity-70 transition-opacity">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
            <Zap size={14} color="#000" />
          </div>
          <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>YForge Fit</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "var(--text-secondary)" }}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div className="absolute left-0 top-0 h-full w-64 p-4 pt-16"
            style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border-color)" }}
            onClick={e => e.stopPropagation()}>
            {navItems.map(item => {
              const active = currentPageName === item.page;
              return (
                <Link key={item.page} to={createPageUrl(item.page)}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl mb-1"
                  style={{ background: active ? `${primaryColor}15` : "transparent", color: active ? primaryColor : "var(--text-secondary)" }}>
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            <Link to={createPageUrl("Settings")} onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl mt-2"
              style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)" }}>
              <Settings size={18} />
              <span className="text-sm font-medium">Configurações</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex pb-safe"
        style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border-color)" }}>
        {navItems.map(item => {
          const active = currentPageName === item.page;
          return (
            <Link key={item.page} to={createPageUrl(item.page)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
              style={{ color: active ? primaryColor : "var(--text-muted)" }}>
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}