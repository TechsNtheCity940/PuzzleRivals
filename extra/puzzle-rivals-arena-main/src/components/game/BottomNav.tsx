import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, ShoppingBag, User } from 'lucide-react';

const TABS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { path: '/shop', icon: ShoppingBag, label: 'Shop' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {TABS.map(tab => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all active:scale-90 ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-hud font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
