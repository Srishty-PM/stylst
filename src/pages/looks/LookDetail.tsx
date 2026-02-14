import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLook, useDeleteLook, useToggleFavorite } from '@/hooks/useLooks';
import { useClosetItems } from '@/hooks/useClosetItems';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CalendarDays, Heart, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const LookDetail = () => {
  const { lookId } = useParams();
  const navigate = useNavigate();
  const { data: look, isLoading } = useLook(lookId);
  const { data: closetItems = [] } = useClosetItems();
  const deleteLook = useDeleteLook();
  const toggleFav = useToggleFavorite();

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-muted-foreground mx-auto animate-spin" />
      </div>
    );
  }

  if (!look) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Look not found.</p>
        <Link to="/looks"><Button variant="outline" className="mt-4">Back to Looks</Button></Link>
      </div>
    );
  }

  const items = look.closet_item_ids.map(id => closetItems.find(x => x.id === id)).filter(Boolean);

  const handleDelete = async () => {
    try {
      await deleteLook.mutateAsync(look.id);
      toast({ title: 'Deleted', description: `${look.name} removed.` });
      navigate('/looks');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleFav = async () => {
    await toggleFav.mutateAsync({ id: look.id, is_favorite: !look.is_favorite });
  };

  return (
    <div className="space-y-6">
      <Link to="/looks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Looks
      </Link>

      <div className="grid grid-cols-2 gap-2 max-w-md mx-auto rounded-xl overflow-hidden">
        {items.slice(0, 4).map((item, idx) => (
          <div key={idx} className="aspect-square bg-muted">
            <img
              src={item!.image_url_cleaned || item!.image_url}
              alt={item!.name}
              className="w-full h-full object-contain"
              style={{ imageOrientation: 'from-image' }}
            />
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="font-display text-2xl font-bold text-foreground">{look.name}</h1>
            <button onClick={handleToggleFav}>
              <Heart className={`w-5 h-5 transition-colors ${look.is_favorite ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {look.occasion && <Badge variant="secondary">{look.occasion}</Badge>}
            {look.season && <Badge variant="outline">{look.season}</Badge>}
            {look.created_by_ai && <Badge className="bg-accent/15 text-accent">AI Generated</Badge>}
          </div>
          {look.notes && <p className="text-sm text-muted-foreground">{look.notes}</p>}
          <p className="text-sm text-muted-foreground">Created {new Date(look.created_at).toLocaleDateString()}</p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete} disabled={deleteLook.isPending}>
              {deleteLook.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />} Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Items in This Outfit</h2>
          <div className="space-y-2">
            {items.map(item => (
              <Link key={item!.id} to={`/closet/${item!.id}`}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <img src={item!.image_url_cleaned || item!.image_url} alt={item!.name} className="w-12 h-12 rounded-lg object-contain bg-muted" style={{ imageOrientation: 'from-image' }} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item!.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item!.category}</p>
                    </div>
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

export default LookDetail;
