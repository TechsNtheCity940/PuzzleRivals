import { NavLink, useLocation } from "react-router-dom";
import { Home, Swords, Trophy, ShoppingBag, Star, User, Users } from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/play", icon: Swords, label: "Play" },
  { to: "/tournaments", icon: Trophy, label: "Tourneys" },
  { to: "/store", icon: ShoppingBag, label: "Store" },
  { to: "/season", icon: Star, label: "Season" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/friends", icon: Users, label: "Friends" },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide nav during active match
  if (location.pathname.startsWith("/match")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 safe-bottom md:px-6">
      <div className="nav-dock mx-auto grid w-full max-w-5xl grid-cols-7 items-center gap-1 p-2">
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
