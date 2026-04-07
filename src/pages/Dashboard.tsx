import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useInspirations } from '@/hooks/useInspirations';
import { useLooks } from '@/hooks/useLooks';
import { useScheduledOutfits } from '@/hooks/useScheduledOutfits';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Layers, Sparkles, CalendarDays, ShirtIcon, Heart, ImageIcon, Check, Plane } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { usePageView } from '@/hooks/useAnalytics';

const Dashboard = () => {
  usePageView('dashboard');
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const { data: closetItems } = useClosetItems();
  const { data: inspirations } = useInspirations();
  const { data: looks } = useLooks();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekEnd = format(addDays(today, 7), 'yyyy-MM-dd');
  const { data: scheduledThisWeek } = useScheduledOutfits(todayStr, weekEnd);
  const { data: scheduledToday } = useScheduledOutfits(todayStr, todayStr);

  const closetCount = closetItems?.length ?? 0;
  const looksCount = looks?.length ?? 0;
  const inspoCount = inspirations?.length ?? 0;
  const scheduledCount = scheduledThisWeek?.length ?? 0;

  // Get today's outfit
  const todayOutfit = scheduledToday?.[0];
  const todayLook = todayOutfit ? looks?.find(l => l.id === todayOutfit.matched_look_id) : null;
  const todayItems = todayLook
    ? todayLook.closet_item_ids.map(id => closetItems?.find(i => i.id === id)).filter(Boolean)
    : [];

  // Time-based greeting
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const quickActions = [
    { label: 'Add to Closet', to: '/closet/add', icon: Plus },
    { label: 'Add Inspiration', to: '/inspiration/add', icon: ImageIcon },
    { label: 'Match Outfit', to: '/inspiration', icon: Layers },
    { label: 'Plan Week', to: '/calendar', icon: CalendarDays },
  ];

  // Upcoming trips
  const hasTrips = false; // Will be dynamic once user has trips

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">{greeting}, {firstName}!</h1>
        <p className="text-muted-foreground mt-1">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </motion.div>

      {/* Today's Outfit */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {todayLook ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Today's Outfit</p>
              <div className="flex gap-3">
                {todayItems.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 w-20 shrink-0">
                    {todayItems.slice(0, 4).map((item: any, idx: number) => (
                      <div key={idx} className="aspect-square rounded overflow-hidden">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{todayLook.name}</p>
                  {todayLook.occasion && (
                    <Badge variant="secondary" className="text-[10px] mt-1">{todayLook.occasion}</Badge>
                  )}
                  {todayOutfit?.was_worn && (
                    <Badge className="bg-success/15 text-success text-[10px] mt-1 ml-1">
                      <Check className="w-3 h-3 mr-0.5" /> Worn
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Link to={`/looks/${todayLook.id}`} className="flex-1">
                  <Button size="sm" className="w-full">View Outfit</Button>
                </Link>
                <Link to="/calendar" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">Choose Different</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-foreground mb-1">No outfit planned for today</p>
              <p className="text-xs text-muted-foreground mb-3">Pick something from your looks!</p>
              <Link to="/calendar">
                <Button size="sm" variant="outline">Schedule an Outfit</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Closet Items', value: closetCount, icon: ShirtIcon, to: '/closet' },
          { label: 'Inspiration', value: inspoCount, icon: ImageIcon, to: '/inspiration' },
          { label: 'Saved Looks', value: looksCount, icon: Heart, to: '/looks' },
          { label: 'Scheduled', value: scheduledCount, icon: CalendarDays, to: '/calendar', sub: 'Next 7 days' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 + 0.1 }}>
            <Link to={s.to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(a => (
          <Link key={a.to} to={a.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <a.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{a.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Looks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Recent Looks</h2>
          <Link to="/looks" className="text-sm text-primary font-medium">View all</Link>
        </div>
        {looks && looks.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {looks.slice(0, 5).map(look => {
              const items = look.closet_item_ids.map(id => closetItems?.find(i => i.id === id)).filter(Boolean);
              return (
                <Link key={look.id} to={`/looks/${look.id}`} className="flex-shrink-0 w-48">
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    {items.length > 0 && (
                      <div className="grid grid-cols-2 aspect-[4/3]">
                        {items.slice(0, 4).map((item: any, idx: number) => (
                          <img key={idx} src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ))}
                      </div>
                    )}
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-foreground truncate">{look.name}</p>
                      <div className="flex gap-1 mt-1">
                        {look.occasion && <Badge variant="secondary" className="text-[10px]">{look.occasion}</Badge>}
                        {look.created_by_ai && <Badge className="bg-primary/10 text-primary text-[10px]">AI</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              No looks yet. <Link to="/inspiration" className="text-primary font-medium hover:underline">Create your first look</Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Latest Inspiration */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Latest Inspiration</h2>
          <Link to="/inspiration" className="text-sm text-primary font-medium">View all</Link>
        </div>
        {inspirations && inspirations.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {inspirations.slice(0, 8).map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/inspiration/${item.id}`}>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden relative group">
                    <img src={item.image_url} alt={item.description || 'Inspiration'} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                      <Badge variant="secondary" className="text-[10px]">
                        <Sparkles className="w-3 h-3 mr-1" /> Match This
                      </Badge>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              No inspiration yet. <Link to="/inspiration/add" className="text-primary font-medium hover:underline">Add some looks you love</Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Freemium Banner */}
      {profile?.subscription_tier === 'free' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Free plan: 20 items, 3 matches/mo</p>
              <p className="text-xs text-muted-foreground">Upgrade for unlimited everything.</p>
            </div>
            <Button size="sm" variant="outline">Upgrade</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
