import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/lib/mock-data';
import { useClosetItems } from '@/hooks/useClosetItems';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, ShirtIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageView } from '@/hooks/useAnalytics';

const statusColors: Record<string, string> = {
  ready: 'bg-success text-success-foreground',
  needs_wash: 'bg-warning text-warning-foreground',
  at_dry_cleaner: 'bg-primary text-primary-foreground',
  needs_repair: 'bg-destructive text-destructive-foreground',
};

const Closet = () => {
  const [category, setCategory] = useState('All');
  const { data: items = [], isLoading } = useClosetItems(category);
  usePageView('closet');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">My Closet</h1>
        <Link to="/closet/add">
          <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-muted-foreground mx-auto animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <ShirtIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">Your closet is empty</p>
          <p className="text-muted-foreground mb-4">Let's add your first item!</p>
          <Link to="/closet/add"><Button>Add Item</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/closet/${item.id}`}>
                <Card className="overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="aspect-square relative">
                    <img src={item.image_url_cleaned || item.image_url} alt={item.name} className="w-full h-full object-contain bg-muted" loading="lazy" style={{ imageOrientation: 'from-image' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-sm font-medium text-primary-foreground truncate">{item.name}</p>
                    </div>
                    <Badge className={`absolute top-2 right-2 text-[10px] ${statusColors[item.status]}`}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.category} · Worn {item.times_worn}×</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Closet;
