import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClosetItem, useDeleteClosetItem, useUpdateClosetItem } from '@/hooks/useClosetItems';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Check, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  ready: 'bg-success text-success-foreground',
  needs_wash: 'bg-warning text-warning-foreground',
  at_dry_cleaner: 'bg-primary text-primary-foreground',
  needs_repair: 'bg-destructive text-destructive-foreground',
};

const ClosetItemDetail = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { data: item, isLoading } = useClosetItem(itemId);
  const deleteItem = useDeleteClosetItem();
  const updateItem = useUpdateClosetItem();

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-muted-foreground mx-auto animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Item not found.</p>
        <Link to="/closet"><Button variant="outline" className="mt-4">Back to Closet</Button></Link>
      </div>
    );
  }

  const costPerWear = item.purchase_price && item.times_worn > 0
    ? (Number(item.purchase_price) / item.times_worn).toFixed(2)
    : null;

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id);
      toast({ title: 'Deleted', description: `${item.name} removed from your closet.` });
      navigate('/closet');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleMarkWorn = async () => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        times_worn: item.times_worn + 1,
        last_worn_date: new Date().toISOString().split('T')[0],
      });
      toast({ title: 'Updated', description: `${item.name} marked as worn.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

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
            <div><span className="text-muted-foreground">Tags</span><p className="font-semibold text-foreground">{item.tags?.join(', ') || '—'}</p></div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleMarkWorn} disabled={updateItem.isPending}>
              {updateItem.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Mark as Worn
            </Button>
            <Button variant="outline" size="icon" className="text-destructive" onClick={handleDelete} disabled={deleteItem.isPending}>
              {deleteItem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClosetItemDetail;
