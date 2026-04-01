import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  Home,
  Settings2,
  ShoppingBag,
  Star,
  Swords,
  Trophy,
  User,
  Users,
} from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/play", icon: Swords, label: "Play" },
  { to: "/tournaments", icon: Trophy, label: "Tourneys" },
  { to: "/store", icon: ShoppingBag, label: "Store" },
  { to: "/season", icon: Star, label: "Season" },
  { to: "/friends", icon: Users, label: "Friends" },
  { to: "/notifications", icon: Bell, label: "Alerts" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings2, label: "Settings" },
];

export default function BottomNav({
  friendsBadge = 0,
  notificationsBadge = 0,
}: {
  friendsBadge?: number;
  notificationsBadge?: number;
}) {
  const location = useLocation();

  if (location.pathname.startsWith("/match")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 safe-bottom md:px-6">
      <div className="nav-dock mx-auto grid w-full max-w-6xl grid-cols-9 items-center gap-1 p-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(to);
          const badgeCount =
            to === "/friends"
              ? friendsBadge
              : to === "/notifications"
                ? notificationsBadge
                : 0;

          return (
            <NavLink
              key={to}
              to={to}
              className={`tab-item relative ${isActive ? "active" : ""}`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {badgeCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black leading-none text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
              </span>
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
