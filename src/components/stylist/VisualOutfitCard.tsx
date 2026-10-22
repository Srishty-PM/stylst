import { Check, Save, Shirt, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NEXT_RELEASE_ENABLED } from '@/lib/next-release';
import type { StylistOutfit } from '@/lib/ai-stylist';

const tileClass = (count: number, index: number) => {
  if (count === 1) return 'col-span-2 row-span-2';
  if (count === 2) return 'row-span-2';
  if (count === 3 && index === 0) return 'row-span-2';
  return '';
};

export default function VisualOutfitCard({ outfit, saved, saving, onSave }: {
  outfit: StylistOutfit;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const tryOnItemIds = outfit.items
    .filter(item => ['tops', 'bottoms', 'dresses', 'outerwear'].includes(item.category.toLowerCase()))
    .map(item => item.id);
  const tryOnQuery = new URLSearchParams({ items: tryOnItemIds.join(',') });
  return <Card className="overflow-hidden border-border shadow-sm">
    <div className="grid grid-cols-2 grid-rows-2 gap-px aspect-square bg-border" aria-label={`${outfit.name} outfit photos`}>
      {outfit.items.map((item, index) => <Link key={item.id} to={`/closet/${item.id}`} className={`relative overflow-hidden bg-card ${tileClass(outfit.items.length, index)}`}>
        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-2" loading="lazy" style={{ imageOrientation: 'from-image' }} />
        <span className="absolute inset-x-1 bottom-1 rounded-sm bg-background/90 px-2 py-1 text-[10px] font-medium leading-tight line-clamp-2 backdrop-blur-sm">{item.name}</span>
      </Link>)}
    </div>
    <CardContent className="p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold leading-tight">{outfit.name}</h2>
          <span className="shrink-0 text-xs text-primary" aria-label={`${outfit.rating} out of 5 stars`}>{'★'.repeat(outfit.rating)}{'☆'.repeat(5 - outfit.rating)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{outfit.occasion}</Badge>
          <Badge variant="outline" className="text-[10px]">{outfit.season}</Badge>
          {outfit.styleInspiration && <Badge variant="outline" className="gap-1 text-[10px]"><Sparkles className="w-3 h-3" />{outfit.styleInspiration}</Badge>}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{outfit.whyItWorks}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={saved || saving} onClick={onSave} className="gap-2">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? 'Saved' : 'Save look'}
        </Button>
        {NEXT_RELEASE_ENABLED && tryOnItemIds.length ? <Button asChild className="gap-2"><Link to={`/try-on?${tryOnQuery}`}><Shirt className="w-4 h-4" />Try on</Link></Button> : <Button disabled className="gap-2"><Shirt className="w-4 h-4" />Try on</Button>}
      </div>
    </CardContent>
  </Card>;
}
