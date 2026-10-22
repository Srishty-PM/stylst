import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeShopCategory, type ShopCurrency } from '@/lib/shop-catalogue';
import type { MissingItem } from '@/hooks/useAutoMatch';
import ShopBrowser from './ShopBrowser';

/** One collection per missing piece, with a shared per-piece budget rather than a pretend cross-retailer basket. */
export default function ShopLookSheet({ open, onOpenChange, items, lookName }: { open: boolean; onOpenChange: (open: boolean) => void; items: MissingItem[]; lookName: string }) {
  const [index, setIndex] = useState(0);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<ShopCurrency>('GBP');
  const item = items[Math.min(index, items.length - 1)];
  const cap = Number(budget);
  const validBudget = budget.trim() !== '' && Number.isFinite(cap) && cap >= 0 && cap <= 100000;
  if (!item) return null;
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]"><div className="max-w-4xl mx-auto space-y-5">
    <SheetHeader className="text-left pr-6"><SheetTitle className="font-display text-3xl flex gap-2 items-center"><ShoppingBag className="w-5 h-5" />Complete your look</SheetTitle><SheetDescription>Find the missing pieces for {lookName}. Keep the pieces you already own.</SheetDescription></SheetHeader>
    <div className="flex gap-2 overflow-x-auto py-1" aria-label="Missing pieces">{items.map((piece, i) => <button type="button" key={`${piece.name}:${i}`} onClick={() => setIndex(i)} aria-pressed={i === index} className={`shrink-0 min-h-11 rounded-full border px-4 text-sm ${i === index ? 'bg-foreground text-background' : 'bg-background'}`}>{piece.name}</button>)}</div>
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-secondary/30 p-4"><div className="space-y-2 flex-1 min-w-32"><Label htmlFor="look-piece-budget">Maximum per piece (optional)</Label><Input id="look-piece-budget" type="number" min="0" max="100000" step="1" placeholder="Any budget" value={budget} onChange={event => setBudget(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="look-piece-currency">Currency</Label><select id="look-piece-currency" value={currency} onChange={event => setCurrency(event.target.value as ShopCurrency)} className="block rounded border bg-background min-h-10 px-3 text-sm"><option>GBP</option><option>USD</option><option>EUR</option></select></div><p className="w-full text-xs text-muted-foreground">Your limit follows you between pieces. Prices are filtered in the chosen currency, with no currency conversion.</p></div>
    <h3 className="font-display text-2xl">Find your {item.name}</h3>
    <ShopBrowser key={`${index}:${item.name}`} initialQuery={item.name} initialCategory={normalizeShopCategory(item.category)} enabled={open} budgetLimit={{ currency, max: validBudget ? cap : undefined }} />
  </div></SheetContent></Sheet>;
}
