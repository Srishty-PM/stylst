import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ImageIcon, Loader2, Trash2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInspirations, useDeleteInspiration } from '@/hooks/useInspirations';
import { toast } from '@/hooks/use-toast';
import AutoMatchDialog from '@/components/AutoMatchDialog';

const Inspiration = () => {
  const [tab, setTab] = useState('all');
  const { data: items = [], isLoading } = useInspirations();
  const deleteInspo = useDeleteInspiration();
  const [autoMatchItem, setAutoMatchItem] = useState<{ id: string; image_url: string } | null>(null);

  const filtered = tab === 'all' ? items :
    tab === 'url' ? items.filter(i => i.source_url) :
    items.filter(i => !i.source_url);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteInspo.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Inspiration removed.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Inspiration</h1>
        <Link to="/inspiration/add">
          <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="uploads" className="flex-1">Uploads</TabsTrigger>
          <TabsTrigger value="url" className="flex-1">Links</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-muted-foreground mx-auto animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No inspiration yet</p>
          <p className="text-muted-foreground mb-4">Upload photos to get started.</p>
          <Link to="/inspiration/add"><Button>Add Inspiration</Button></Link>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <div className="relative rounded-xl overflow-hidden group break-inside-avoid">
                <img src={item.image_url} alt={item.description || 'Fashion inspiration'} className="w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1">
                    {item.source_url && <Badge variant="secondary" className="text-[10px]">Link</Badge>}
                    {item.description && <Badge variant="outline" className="text-[10px] max-w-[120px] truncate">{item.description}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAutoMatchItem({ id: item.id, image_url: item.image_url })}
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> Auto
                    </Button>
                    <Link to={`/match/${item.id}`}>
                      <Button size="sm" variant="secondary">Manual</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={deleteInspo.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {autoMatchItem && (
        <AutoMatchDialog
          open={!!autoMatchItem}
          onOpenChange={(open) => !open && setAutoMatchItem(null)}
          inspirationId={autoMatchItem.id}
          inspirationImage={autoMatchItem.image_url}
        />
      )}
    </div>
  );
};

export default Inspiration;
