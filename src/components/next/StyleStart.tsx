import { Link } from 'react-router-dom';
import { ArrowRight, Check, Heart, ImagePlus, Shirt, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StyleStart({ closetCount, inspirationCount, avatarReady = false }: { closetCount: number; inspirationCount: number; avatarReady?: boolean }) {
  const hasCloset = closetCount > 0;
  const hasInspiration = inspirationCount > 0;
  const next = !hasCloset
    ? { to: '/closet/add', label: 'Add your first closet piece', note: 'Start with the clothes you already own.' }
    : !hasInspiration
      ? { to: '/inspiration/add', label: 'Add your first inspiration', note: 'Upload, photograph or sync a look you love.' }
      : { to: '/inspiration', label: 'Choose a look to recreate', note: 'We’ll match your closet, show what is missing and let you try it on.' };
  const steps = [
    { label: 'Closet', detail: hasCloset ? `${closetCount} ${closetCount === 1 ? 'piece' : 'pieces'}` : 'Add clothing', done: hasCloset, icon: Shirt },
    { label: 'Inspiration', detail: hasInspiration ? `${inspirationCount} saved` : 'Add a look', done: hasInspiration, icon: ImagePlus },
    { label: 'Recreate', detail: hasCloset && hasInspiration ? 'Ready' : 'Next', done: false, icon: Sparkles },
    { label: 'Try on & shop', detail: avatarReady ? 'Avatar ready' : 'Avatar optional', done: avatarReady, icon: UserRound },
  ];
  return <section aria-labelledby="style-start-heading" className="rounded-2xl border border-border bg-card overflow-hidden">
    <div className="p-5 md:p-7 space-y-2"><p className="text-xs tracking-[0.18em] uppercase text-primary">Your style flow</p><h2 id="style-start-heading" className="font-display text-3xl">From closet to complete look</h2><p className="text-sm text-muted-foreground">One clear path. Pick up from where you left off.</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 border-y border-border">
      {steps.map((step, index) => <div key={step.label} className={`p-3 md:p-4 min-h-24 ${index % 2 ? 'border-l border-border' : ''} ${index > 1 ? 'border-t md:border-t-0' : ''} ${index > 0 ? 'md:border-l md:border-border' : ''}`}><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">0{index + 1}</span>{step.done ? <Check className="w-4 h-4 text-primary" /> : <step.icon className="w-4 h-4 text-muted-foreground" />}</div><p className="text-sm font-medium mt-3">{step.label}</p><p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p></div>)}
    </div>
    <div className="p-5 md:p-7 space-y-4"><p className="text-sm text-muted-foreground">{next.note}</p><Button asChild className="w-full gap-2 min-h-12"><Link to={next.to}>{next.label}<ArrowRight className="w-4 h-4" /></Link></Button><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm"><Link to="/ai-stylist" className="inline-flex gap-2 items-center min-h-11"><Sparkles className="w-4 h-4" />AI stylist</Link><Link to="/looks" className="inline-flex gap-2 items-center min-h-11"><Heart className="w-4 h-4" />Saved looks</Link>{!avatarReady && <Link to="/try-on" className="inline-flex gap-2 items-center min-h-11"><UserRound className="w-4 h-4" />Create avatar</Link>}</div></div>
  </section>;
}
