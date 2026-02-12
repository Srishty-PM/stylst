import { NavLink, useLocation } from 'react-router-dom';
import { Home, ShirtIcon, Layers, Heart, CalendarDays, Sparkles, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/closet', icon: ShirtIcon, label: 'Closet' },
  { to: '/match', icon: Layers, label: 'Match' },
  { to: '/looks', icon: Heart, label: 'Looks' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
];

const sidebarItems = [
  ...bottomNavItems,
  { to: '/inspiration', icon: Sparkles, label: 'Inspiration' },
  { to: '/ai-stylist', icon: Sparkles, label: 'AI Stylist' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 border-r border-border bg-card px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-primary mb-8 px-3">Stylst</h1>
        <nav className="flex-1 space-y-1">
          {sidebarItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <div className="px-3 mb-3">
            <p className="text-sm font-medium text-foreground truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-40">
        <h1 className="font-display text-xl font-bold text-primary">Stylst</h1>
        <div className="text-sm text-muted-foreground">{user?.full_name}</div>
      </header>

      {/* Main content */}
      <main className="lg:pl-60 pb-20 lg:pb-6">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map(item => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-0.5 py-1 px-3">
                <item.icon className={cn('w-5 h-5', isActive ? 'text-accent' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-medium', isActive ? 'text-accent' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
