import { NavLink, useLocation } from "react-router-dom";
import { Home, Swords, Trophy, ShoppingBag, Star, User } from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/play", icon: Swords, label: "Play" },
  { to: "/tournaments", icon: Trophy, label: "Tourneys" },
  { to: "/store", icon: ShoppingBag, label: "Store" },
  { to: "/season", icon: Star, label: "Season" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide nav during active match
  if (location.pathname.startsWith("/match")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 safe-bottom">
      <div className="mx-auto flex h-20 max-w-md items-center justify-around rounded-[28px] border border-border bg-card/90 px-2 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`tab-item ${isActive ? "active" : ""}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
