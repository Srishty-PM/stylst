import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Heart, ImagePlus, Sparkles, UserRound } from 'lucide-react';

export default function StyleStart({ closetCount, inspirationCount }: { closetCount: number; inspirationCount: number }) {
  return <section aria-labelledby="style-start-heading" className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-5">
    <div><p className="text-xs tracking-[0.18em] uppercase text-primary">Your style, made simple</p><h2 id="style-start-heading" className="text-3xl mt-2">What are we dressing for?</h2><p className="text-sm text-muted-foreground mt-2">Start with a look you love, or find a new way to wear what you own.</p></div>
    <div className="grid sm:grid-cols-2 gap-3">
      <Link to={inspirationCount ? '/inspiration' : '/inspiration/add'} className="rounded-xl border border-border p-4 hover:border-primary focus-visible:outline-primary space-y-2"><ImagePlus className="w-5 h-5 text-primary" /><h3 className="text-xl">Recreate a look</h3><p className="text-sm text-muted-foreground">Choose inspiration. Find your closet matches. Shop only what’s missing.</p><span className="inline-flex items-center gap-2 text-sm font-medium">{inspirationCount ? 'Choose a saved look' : 'Add your first inspiration'}<ArrowRight className="w-4 h-4" /></span></Link>
      <Link to={closetCount ? '/ai-stylist' : '/closet/add'} className="rounded-xl border border-border p-4 hover:border-primary focus-visible:outline-primary space-y-2"><Sparkles className="w-5 h-5 text-primary" /><h3 className="text-xl">Create something new</h3><p className="text-sm text-muted-foreground">Tell your stylist the occasion and explore ideas for your wardrobe.</p><span className="inline-flex items-center gap-2 text-sm font-medium">{closetCount ? 'Style my wardrobe' : 'Add a piece to get started'}<ArrowRight className="w-4 h-4" /></span></Link>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm"><Link to="/looks" className="inline-flex gap-2 items-center min-h-11"><Heart className="w-4 h-4" />Saved looks</Link><Link to="/calendar" className="inline-flex gap-2 items-center min-h-11"><CalendarDays className="w-4 h-4" />Plan my week</Link><Link to="/try-on" className="inline-flex gap-2 items-center min-h-11"><UserRound className="w-4 h-4" />My fitting room</Link></div>
  </section>;
}
