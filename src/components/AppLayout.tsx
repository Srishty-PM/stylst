import { NavLink, useLocation } from 'react-router-dom';
import { Home, ShirtIcon, Layers, Heart, CalendarDays, Sparkles, Settings, LogOut, Plane } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/closet', icon: ShirtIcon, label: 'Closet' },
  { to: '/inspiration', icon: Sparkles, label: 'Inspo' },
  { to: '/looks', icon: Heart, label: 'Looks' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
];

const sidebarItems = [
  ...bottomNavItems,
  { to: '/trips', icon: Plane, label: 'My Trips' },
  { to: '/ai-stylist', icon: Sparkles, label: 'AI Stylist' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 border-r border-border bg-card px-4 py-8">
        <div className="flex items-center gap-3 mb-10 px-3">
          <h1 className="font-display text-2xl tracking-tight text-foreground">Stylst</h1>
        </div>
        <nav className="flex-1 space-y-0.5">
          {sidebarItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium tracking-wide uppercase transition-colors duration-200',
                  isActive
                    ? 'text-primary border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground border-l-2 border-transparent'
                )
              }
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-6 mt-4">
          <div className="px-3 mb-3">
            <p className="text-sm font-medium text-foreground truncate">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors duration-200 w-full"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-40">
        <h1 className="font-display text-xl tracking-tight text-foreground">Stylst</h1>
        <div className="text-xs text-muted-foreground tracking-wide uppercase">{profile?.full_name}</div>
      </header>

      {/* Main content */}
      <main className="lg:pl-60 pb-20 lg:pb-6">
        <div className="max-w-5xl mx-auto px-6 py-8 lg:px-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map(item => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-0.5 py-1 px-3">
                <item.icon className={cn('w-6 h-6 transition-colors duration-200', isActive ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1.5} />
                <span className={cn('text-[10px] font-medium tracking-widest uppercase', isActive ? 'text-primary' : 'text-muted-foreground')}>
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
