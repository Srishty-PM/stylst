import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ImageIcon, Loader2, Trash2, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInspirations, useDeleteInspiration } from '@/hooks/useInspirations';
import { toast } from '@/hooks/use-toast';
import AutoMatchDialog from '@/components/AutoMatchDialog';

const Inspiration = () => {
  const [tab, setTab] = useState('all');
  const navigate = useNavigate();
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

  const handleMatch = (e: React.MouseEvent, item: { id: string; image_url: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setAutoMatchItem(item);
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
              <div
                className="relative rounded-sm overflow-hidden group break-inside-avoid cursor-pointer"
                onClick={() => navigate(`/inspiration/${item.id}`)}
              >
                <img src={item.image_url} alt={item.description || 'Fashion inspiration'} className="w-full object-cover" loading="lazy" />

                {/* Always-visible Match button - bottom overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-10">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-sm text-[12px] font-semibold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                      onClick={(e) => handleMatch(e, { id: item.id, image_url: item.image_url })}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Match
                    </button>
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-sm bg-white/10 hover:bg-destructive/80 text-white transition-colors"
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={deleteInspo.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Desktop hover overlay with large button */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-sm text-[14px] font-semibold uppercase tracking-wider flex items-center gap-2 transition-all transform scale-90 group-hover:scale-100 pointer-events-auto shadow-lg"
                    onClick={(e) => handleMatch(e, { id: item.id, image_url: item.image_url })}
                  >
                    <Sparkles className="w-5 h-5" />
                    Match This Look
                  </button>
                </div>

                {/* Source badge */}
                {item.source_url && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-medium uppercase tracking-wider bg-white/80 text-foreground px-1.5 py-0.5 rounded-sm">Link</span>
                  </div>
                )}
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
          autoStart
        />
      )}
    </div>
  );
};

export default Inspiration;
