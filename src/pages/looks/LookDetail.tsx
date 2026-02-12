import { useParams, Link } from 'react-router-dom';
import { MOCK_LOOKS, MOCK_CLOSET_ITEMS } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CalendarDays, Check, Copy, Edit2, Heart, Trash2 } from 'lucide-react';

const LookDetail = () => {
  const { lookId } = useParams();
  const look = MOCK_LOOKS.find(l => l.id === lookId);

  if (!look) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Look not found.</p>
        <Link to="/looks"><Button variant="outline" className="mt-4">Back to Looks</Button></Link>
      </div>
    );
  }

  const items = look.closet_item_ids.map(id => MOCK_CLOSET_ITEMS.find(x => x.id === id)).filter(Boolean);

  return (
    <div className="space-y-6">
      <Link to="/looks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Looks
      </Link>

      <div className="grid grid-cols-2 gap-2 max-w-md mx-auto rounded-xl overflow-hidden">
        {items.slice(0, 4).map((item, idx) => (
          <div key={idx} className="aspect-square">
            <img src={item!.image_url} alt={item!.name} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="font-display text-2xl font-bold text-foreground">{look.name}</h1>
            {look.is_favorite && <Heart className="w-5 h-5 text-accent fill-accent" />}
          </div>
          <div className="flex gap-2 flex-wrap">
            {look.occasion && <Badge variant="secondary">{look.occasion}</Badge>}
            {look.season && <Badge variant="outline">{look.season}</Badge>}
            {look.created_by_ai && <Badge className="bg-accent/15 text-accent">AI Generated</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Created {look.created_at}</p>

          <div className="grid grid-cols-2 gap-2">
            <Button><CalendarDays className="w-4 h-4 mr-1" /> Schedule</Button>
            <Button variant="outline"><Check className="w-4 h-4 mr-1" /> Worn Today</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1"><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
            <Button variant="outline" size="sm" className="flex-1"><Copy className="w-3 h-3 mr-1" /> Duplicate</Button>
            <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">Items in This Outfit</h2>
        <div className="space-y-2">
          {items.map(item => (
            <Link key={item!.id} to={`/closet/${item!.id}`}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <img src={item!.image_url} alt={item!.name} className="w-12 h-12 rounded-lg object-cover" />
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
    </div>
  );
};

export default LookDetail;
