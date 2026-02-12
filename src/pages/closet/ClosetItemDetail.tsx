import { useParams, Link } from 'react-router-dom';
import { MOCK_CLOSET_ITEMS, MOCK_LOOKS } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Check, Edit2, Trash2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  ready: 'bg-success text-success-foreground',
  needs_wash: 'bg-warning text-warning-foreground',
  at_dry_cleaner: 'bg-primary text-primary-foreground',
  needs_repair: 'bg-destructive text-destructive-foreground',
};

const ClosetItemDetail = () => {
  const { itemId } = useParams();
  const item = MOCK_CLOSET_ITEMS.find(i => i.id === itemId);

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Item not found.</p>
        <Link to="/closet"><Button variant="outline" className="mt-4">Back to Closet</Button></Link>
      </div>
    );
  }

  const looks = MOCK_LOOKS.filter(l => l.closet_item_ids.includes(item.id));
  const costPerWear = item.purchase_price && item.times_worn > 0
    ? (item.purchase_price / item.times_worn).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      <Link to="/closet" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Closet
      </Link>

      <div className="rounded-xl overflow-hidden aspect-square max-w-md mx-auto">
        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{item.name}</h1>
              <p className="text-muted-foreground capitalize">{item.category}{item.brand ? ` · ${item.brand}` : ''}</p>
            </div>
            <Badge className={statusColors[item.status]}>{item.status.replace('_', ' ')}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Times worn</span><p className="font-semibold text-foreground">{item.times_worn}</p></div>
            <div><span className="text-muted-foreground">Purchase price</span><p className="font-semibold text-foreground">{item.purchase_price ? `£${item.purchase_price}` : '—'}</p></div>
            {costPerWear && <div><span className="text-muted-foreground">Cost per wear</span><p className="font-semibold text-accent">£{costPerWear}</p></div>}
            <div><span className="text-muted-foreground">Tags</span><p className="font-semibold text-foreground">{item.tags.join(', ') || '—'}</p></div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1"><Check className="w-4 h-4 mr-1" /> Mark as Worn</Button>
            <Button variant="outline" size="icon"><Edit2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {looks.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Appears in {looks.length} outfit{looks.length > 1 ? 's' : ''}</h2>
          <div className="grid grid-cols-2 gap-3">
            {looks.map(look => (
              <Link key={look.id} to={`/looks/${look.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-foreground">{look.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{look.occasion}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosetItemDetail;
