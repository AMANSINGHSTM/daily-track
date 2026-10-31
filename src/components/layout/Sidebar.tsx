import {
  Activity,
  BarChart3,
  BookOpenText,
  CalendarCheck2,
  ChartNoAxesCombined,
  CircleDot,
  Command,
  LayoutDashboard,
  ListChecks,
  Settings2,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/activities", label: "Activities", icon: ListChecks },
  { to: "/tracker", label: "Daily tracker", icon: CalendarCheck2 },
  { to: "/challenges", label: "30-day challenges", icon: Activity },
  { to: "/journal", label: "Daily journal", icon: BookOpenText },
  { to: "/analytics", label: "Progress analytics", icon: ChartNoAxesCombined },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar() {
  return (
    <>
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="nav-caption">Workspace</div>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span className="local-indicator"><CircleDot size={14} /> Your data stays on this device</span>
          <span className="sidebar-version"><Command size={13} /> GROWTH / 01</span>
        </div>
      </aside>
      <div className="mobile-topbar">
        <Brand compact />
        <span className="mobile-private"><CircleDot size={12} /> Local workspace</span>
      </div>
      <nav className="mobile-nav" aria-label="Main navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `mobile-nav-link${isActive ? " mobile-nav-link-active" : ""}`}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? " brand-compact" : ""}`}>
      <span className="brand-mark"><Sparkles size={17} strokeWidth={1.9} /></span>
      <span className="brand-copy">
        <strong>My Growth</strong>
        <span>Dashboard</span>
      </span>
      <BarChart3 className="brand-chart" size={17} />
    </div>
  );
}