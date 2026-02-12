import { Link } from 'react-router-dom';
import { MOCK_LOOKS, MOCK_CLOSET_ITEMS } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const Looks = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">My Looks</h1>
        <Link to="/match"><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Create</Button></Link>
      </div>

      {MOCK_LOOKS.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No outfits yet</p>
          <p className="text-muted-foreground mb-4">Create your first matched look!</p>
          <Link to="/match"><Button>Create Outfit</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_LOOKS.map((look, i) => {
            const items = look.closet_item_ids.map(id => MOCK_CLOSET_ITEMS.find(x => x.id === id)).filter(Boolean);
            return (
              <motion.div key={look.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Link to={`/looks/${look.id}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-2 aspect-[4/3]">
                      {items.slice(0, 4).map((item, idx) => (
                        <img key={idx} src={item!.image_url} alt={item!.name} className="w-full h-full object-cover" />
                      ))}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{look.name}</p>
                          <div className="flex gap-1.5 mt-1">
                            {look.occasion && <Badge variant="secondary" className="text-[10px]">{look.occasion}</Badge>}
                            {look.season && <Badge variant="outline" className="text-[10px]">{look.season}</Badge>}
                            {look.created_by_ai && <Badge className="bg-accent/15 text-accent text-[10px]">AI</Badge>}
                          </div>
                        </div>
                        {look.is_favorite && <Heart className="w-4 h-4 text-accent fill-accent" />}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Looks;
