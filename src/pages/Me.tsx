import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Heart, Settings, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Me() {
  const { profile } = useAuth();
  const entries = [
    { to: '/try-on', title: 'My avatar & fitting room', subtitle: 'Create your likeness and preview outfits', icon: UserRound },
    { to: '/looks', title: 'Saved looks', subtitle: 'Your outfits, all together', icon: Heart },
    { to: '/calendar', title: 'Outfit calendar', subtitle: 'Plan what to wear', icon: CalendarDays },
    { to: '/settings', title: 'Settings', subtitle: 'Account, preferences and privacy', icon: Settings },
  ];
  return <div className="space-y-7"><header><p className="text-xs uppercase tracking-[0.2em] text-primary">Your corner of STYLST</p><h1 className="font-display text-4xl mt-2">{profile?.full_name?.split(' ')[0] || 'Me'}</h1></header><div className="divide-y rounded-xl border border-border bg-card">{entries.map(entry => <Link key={entry.to} to={entry.to} className="flex items-center gap-4 p-5 hover:bg-secondary/20"><entry.icon className="w-5 h-5 text-primary shrink-0" /><div className="flex-1"><h2 className="text-xl">{entry.title}</h2><p className="text-sm text-muted-foreground">{entry.subtitle}</p></div><ArrowRight className="w-4 h-4" /></Link>)}</div></div>;
}
