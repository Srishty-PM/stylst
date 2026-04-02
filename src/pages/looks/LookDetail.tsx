import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLook, useDeleteLook, useToggleFavorite } from '@/hooks/useLooks';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useAddScheduledOutfit } from '@/hooks/useScheduledOutfits';
import { useAuth } from '@/contexts/AuthContext';
import { useMissingThumbnails } from '@/hooks/useMissingThumbnails';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, CalendarPlus, Heart, Trash2, Loader2,
  Sparkles, ImageIcon, Info,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { MissingItem } from '@/hooks/useAutoMatch';

/* ── Collage grid for items ─────────────────────────── */
const ItemCollage = ({ items, linkPrefix }: { items: { id: string; name: string; image_url: string; image_url_cleaned?: string | null }[]; linkPrefix?: string }) => (
  <div className="flex flex-col items-center px-2 py-6">
    <div className="w-full max-w-md grid grid-cols-2 gap-3 auto-rows-auto">
      {items.map((item, i) => {
        const isLarge = i < 2;
        const img = (item as any).image_url_cleaned || item.image_url;
        const inner = (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-sm overflow-hidden border border-border ${isLarge ? 'aspect-[3/4]' : 'aspect-square'}`}
          >
            <img src={img} alt={item.name} className="w-full h-full object-contain p-1" style={{ imageOrientation: 'from-image' }} loading="lazy" />
          </motion.div>
        );
        return linkPrefix ? <Link key={item.id} to={`${linkPrefix}${item.id}`}>{inner}</Link> : <div key={item.id}>{inner}</div>;
      })}
    </div>
  </div>
);

/* ── Missing items collage with lazy thumbnails ─────── */
const MissingCollage = ({ items }: { items: MissingItem[] }) => {
  const thumbnails = useMissingThumbnails(items);
  if (!items.length) return null;

  return (
    <div className="flex flex-col items-center px-2 py-6">
      <div className="w-full max-w-md grid grid-cols-2 gap-3 auto-rows-auto">
        {items.map((item, i) => {
          const thumb = thumbnails[i];
          const isLarge = i < 2;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`bg-card rounded-sm overflow-hidden border border-border flex items-center justify-center ${isLarge ? 'aspect-[3/4]' : 'aspect-square'}`}
            >
              {thumb ? (
                <img src={thumb} alt={item.name} className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center space-y-1 p-3">
                  <div className="w-8 h-8 rounded-full bg-muted-foreground/10 mx-auto flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-muted-foreground/40 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[100px]">{item.name}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground mt-5 flex items-center gap-1.5">
        {items.length} item{items.length > 1 ? 's' : ''} needed <Info className="w-3.5 h-3.5" />
      </p>
    </div>
  );
};

/* ── Main component ─────────────────────────────────── */
const LookDetail = () => {
  const { lookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: look, isLoading } = useLook(lookId);
  const { data: closetItems = [] } = useClosetItems();
  const deleteLook = useDeleteLook();
  const toggleFav = useToggleFavorite();
  const addSchedule = useAddScheduledOutfit();

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: inspiration } = useQuery({
    queryKey: ['inspiration', look?.inspiration_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inspiration')
        .select('image_url, source_url')
        .eq('id', look!.inspiration_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!look?.inspiration_id,
  });

  if (isLoading) {
    return <div className="text-center py-16"><Loader2 className="w-8 h-8 text-muted-foreground mx-auto animate-spin" /></div>;
  }
  if (!look) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Look not found.</p>
        <Link to="/looks"><Button variant="outline" className="mt-4">Back to Looks</Button></Link>
      </div>
    );
  }

  const ownedItems = look.closet_item_ids.map(id => closetItems.find(x => x.id === id)).filter(Boolean) as any[];
  const missingItems: MissingItem[] = (look as any).missing_items || [];
  const totalItems = ownedItems.length + missingItems.length;
  const hasInspiration = !!look.inspiration_id && !!inspiration;

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

  const handleWearToday = () => {
    toast({ title: '👗 Marked as worn!', description: `${look.name} — looking great today!` });
  };

  const handleSchedule = async () => {
    if (!user) return;
    try {
      await addSchedule.mutateAsync({
        user_id: user.id,
        matched_look_id: look.id,
        scheduled_date: scheduleDate,
        event_name: look.name,
      });
      toast({ title: '📅 Scheduled!', description: `Planned for ${format(new Date(scheduleDate + 'T00:00:00'), 'MMMM d, yyyy')}` });
      setShowSchedule(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/looks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <button onClick={handleToggleFav} className="p-2">
          <Heart className={`w-5 h-5 transition-colors ${look.is_favorite ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
        </button>
      </div>

      {/* Title block */}
      <div className="text-center mb-2">
        <h1 className="font-display text-2xl font-bold text-foreground">{look.name}</h1>
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em] mt-1">
          {[look.occasion, look.season, look.created_by_ai && 'AI Styled'].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Tabs: Your Items / Missing / Inspiration */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="w-full bg-transparent p-0 h-auto gap-0 justify-center mb-0">
          <TabsTrigger
            value="items"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[12px] uppercase tracking-wider font-semibold pb-2 px-5"
          >
            Your Items ({ownedItems.length})
          </TabsTrigger>
          {missingItems.length > 0 && (
            <TabsTrigger
              value="missing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[12px] uppercase tracking-wider font-semibold pb-2 px-5"
            >
              Missing ({missingItems.length})
            </TabsTrigger>
          )}
          {hasInspiration && (
            <TabsTrigger
              value="inspo"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[12px] uppercase tracking-wider font-semibold pb-2 px-5"
            >
              Inspo
            </TabsTrigger>
          )}
        </TabsList>

        <div className="border-t border-border">
          {/* Your items collage */}
          <TabsContent value="items" className="mt-0">
            {ownedItems.length > 0 ? (
              <>
                <ItemCollage items={ownedItems} linkPrefix="/closet/" />
                <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1.5 -mt-2 mb-4">
                  {totalItems} items suggested <Info className="w-3.5 h-3.5" />
                </p>
              </>
            ) : (
              <div className="py-16 text-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No closet items matched</p>
              </div>
            )}
          </TabsContent>

          {/* Missing items collage */}
          {missingItems.length > 0 && (
            <TabsContent value="missing" className="mt-0">
              <MissingCollage items={missingItems} />
            </TabsContent>
          )}

          {/* Inspiration reference */}
          {hasInspiration && (
            <TabsContent value="inspo" className="mt-0">
              <div className="flex justify-center py-6">
                <img
                  src={inspiration!.image_url}
                  alt="Inspiration"
                  className="max-h-[400px] object-contain rounded-sm"
                  style={{ imageOrientation: 'from-image' }}
                />
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* AI Note */}
      {look.notes && (
        <div className="mx-4 mt-4 border-l-2 border-primary pl-4 py-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em] mb-1">Styling Note</p>
          <p className="font-display text-sm italic text-foreground leading-relaxed">{look.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 mt-6 space-y-3">
        <div className="flex gap-2">
          <Button className="flex-1 uppercase tracking-wider text-[12px] font-semibold" onClick={handleWearToday}>
            Wear Today
          </Button>
          <Button variant="outline" className="flex-1 uppercase tracking-wider text-[12px] font-semibold" onClick={() => setShowSchedule(true)}>
            <CalendarPlus className="w-4 h-4 mr-1" /> Schedule
          </Button>
        </div>
        <button
          className="text-[12px] text-muted-foreground hover:text-destructive transition-colors uppercase tracking-wider flex items-center gap-1"
          onClick={handleDelete}
          disabled={deleteLook.isPending}
        >
          {deleteLook.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Delete
        </button>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Schedule This Outfit</DialogTitle>
            <DialogDescription>Pick a day to wear "{look.name}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">When?</Label>
              <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1 uppercase tracking-wider text-[12px]" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button className="flex-1 uppercase tracking-wider text-[12px]" onClick={handleSchedule} disabled={addSchedule.isPending}>
              {addSchedule.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-1" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LookDetail;
