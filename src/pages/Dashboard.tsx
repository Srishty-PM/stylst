import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_CLOSET_ITEMS, MOCK_LOOKS } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Layers, Sparkles, CalendarDays, ShirtIcon, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const quickActions = [
  { label: 'Add to Closet', to: '/closet/add', icon: Plus },
  { label: 'Match Outfit', to: '/match', icon: Layers },
  { label: 'AI Stylist', to: '/ai-stylist', icon: Sparkles },
  { label: 'Plan Week', to: '/calendar', icon: CalendarDays },
];

const Dashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">Good morning, {firstName}!</h1>
        <p className="text-muted-foreground mt-1">Sunny, 18°C — a great day for layers.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Closet Items', value: MOCK_CLOSET_ITEMS.length, icon: ShirtIcon },
          { label: 'Saved Looks', value: MOCK_LOOKS.length, icon: Heart },
          { label: 'Inspiration', value: 24, icon: Sparkles },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <s.icon className="w-5 h-5 text-accent mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(a => (
          <Link key={a.to} to={a.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <a.icon className="w-5 h-5 text-accent" />
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
          <Link to="/looks" className="text-sm text-accent font-medium">View all</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
          {MOCK_LOOKS.map(look => {
            const items = look.closet_item_ids.map(id => MOCK_CLOSET_ITEMS.find(i => i.id === id)).filter(Boolean);
            return (
              <Link key={look.id} to={`/looks/${look.id}`} className="flex-shrink-0 w-48">
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="grid grid-cols-2 aspect-square">
                    {items.slice(0, 4).map((item, idx) => (
                      <img key={idx} src={item!.image_url} alt={item!.name} className="w-full h-full object-cover" />
                    ))}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-foreground truncate">{look.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{look.occasion}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Freemium Banner */}
      {profile?.subscription_tier === 'free' && (
        <Card className="border-accent/30 bg-accent/5">
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
