import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLook, useDeleteLook, useToggleFavorite } from '@/hooks/useLooks';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useAddScheduledOutfit } from '@/hooks/useScheduledOutfits';
import { useAuth } from '@/contexts/AuthContext';
import { useMissingThumbnails } from '@/hooks/useMissingThumbnails';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, CalendarPlus, Heart, Trash2, Loader2, Check,
  Shirt, Footprints, Watch, ShoppingBag as BagIcon, Sparkles, ImageIcon,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { MissingItem } from '@/hooks/useAutoMatch';

const categoryIcon = (category: string) => {
  const c = category?.toLowerCase() || '';
  if (c.includes('shoe') || c.includes('boot') || c.includes('sneaker') || c.includes('flat')) return Footprints;
  if (c.includes('bag') || c.includes('purse') || c.includes('clutch')) return BagIcon;
  if (c.includes('accessor') || c.includes('jewel') || c.includes('watch') || c.includes('belt')) return Watch;
  return Shirt;
};

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

  // Fetch inspiration image if look has inspiration_id
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

  const ownedItems = look.closet_item_ids.map(id => closetItems.find(x => x.id === id)).filter(Boolean);
  const missingItems: MissingItem[] = (look as any).missing_items || [];
  const totalItems = ownedItems.length + missingItems.length;
  const completionPct = totalItems > 0 ? Math.round((ownedItems.length / totalItems) * 100) : 100;

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

  const hasInspiration = !!look.inspiration_id && !!inspiration;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/looks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Looks
        </Link>
        <button onClick={handleToggleFav} className="p-2">
          <Heart className={`w-5 h-5 transition-colors ${look.is_favorite ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
        </button>
      </div>

      {/* Editorial Split Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Inspiration / Hero */}
        <div className="space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            {hasInspiration ? 'Inspiration' : 'Your Look'}
          </p>
          <div className="rounded-sm overflow-hidden bg-muted/30 border border-border">
            {hasInspiration ? (
              <img
                src={inspiration.image_url}
                alt="Inspiration"
                className="w-full max-h-[500px] object-contain"
                style={{ imageOrientation: 'from-image' }}
              />
            ) : ownedItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-px bg-border">
                {ownedItems.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="aspect-square bg-card">
                    <img
                      src={item!.image_url_cleaned || item!.image_url}
                      alt={item!.name}
                      className="w-full h-full object-contain"
                      style={{ imageOrientation: 'from-image' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center space-y-2">
                  <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Your original look</p>
                </div>
              </div>
            )}
          </div>
          {hasInspiration && (
            <p className="text-[11px] text-muted-foreground">
              Saved {new Date(look.created_at).toLocaleDateString()}
            </p>
          )}
          {!hasInspiration && (
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider border border-border px-2 py-0.5 rounded-sm inline-block">Manual</span>
          )}
        </div>

        {/* Right: Look details */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground leading-tight">{look.name}</h1>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {look.occasion && (
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] border border-foreground/20 px-3 py-1 rounded-sm text-foreground">
                {look.occasion}
              </span>
            )}
            {look.season && (
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] border border-foreground/20 px-3 py-1 rounded-sm text-foreground">
                {look.season}
              </span>
            )}
            {look.created_by_ai && (
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] bg-primary/10 text-primary px-3 py-1 rounded-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Styled
              </span>
            )}
          </div>

          {/* Completeness */}
          {totalItems > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase tracking-wider">
                <span>Your Outfit: {ownedItems.length}/{totalItems} items</span>
                <span>{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-1" />
            </div>
          )}

          {/* Owned Items Grid */}
          {ownedItems.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-3">Your Items</p>
              <div className="grid grid-cols-3 gap-2">
                {ownedItems.map((item, i) => (
                  <motion.div
                    key={item!.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link to={`/closet/${item!.id}`}>
                      <div className="aspect-square rounded-sm overflow-hidden border border-accent/30 relative group">
                        <img
                          src={item!.image_url_cleaned || item!.image_url}
                          alt={item!.name}
                          className="w-full h-full object-contain bg-muted"
                          style={{ imageOrientation: 'from-image' }}
                          loading="lazy"
                        />
                        <div className="absolute top-1 right-1">
                          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-accent-foreground" />
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-4">
                          <p className="text-[10px] text-white font-medium truncate">{item!.name}</p>
                        </div>
                      </div>
                    </Link>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {item!.times_worn > 0 ? `Worn ${item!.times_worn}×` : 'Never worn'}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Items */}
          <MissingItemsSection items={missingItems} />

          {/* Metadata */}
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <p>{look.times_worn != null && look.times_worn > 0 ? `Worn ${look.times_worn} time${look.times_worn > 1 ? 's' : ''}` : 'Never worn'}</p>
            <p>Created {new Date(look.created_at).toLocaleDateString()}</p>
          </div>

          {/* AI Styling Note */}
          {look.notes && (
            <div className="border-l-2 border-primary pl-4 py-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em] mb-1">AI Styling Note</p>
              <p className="font-display text-base italic text-foreground leading-relaxed">{look.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="space-y-3 pt-2">
        <div className="flex gap-2">
          <Button className="flex-1 uppercase tracking-wider text-[12px] font-semibold" onClick={handleWearToday}>
            Wear Today
          </Button>
          <Button variant="outline" className="flex-1 uppercase tracking-wider text-[12px] font-semibold" onClick={() => setShowSchedule(true)}>
            <CalendarPlus className="w-4 h-4 mr-1" /> Schedule
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="text-[12px] text-muted-foreground hover:text-destructive transition-colors uppercase tracking-wider flex items-center gap-1"
            onClick={handleDelete}
            disabled={deleteLook.isPending}
          >
            {deleteLook.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Delete
          </button>
        </div>
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
              <Input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
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

// Missing items section with lazy thumbnails
const MissingItemsSection = ({ items }: { items: MissingItem[] }) => {
  const thumbnails = useMissingThumbnails(items);
  if (!items || items.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-3">To Complete This Look</p>
      <div className="space-y-0 divide-y divide-border">
        {items.map((mi, i) => {
          const Icon = categoryIcon(mi.category);
          const thumb = thumbnails[i];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 py-3"
            >
              <div className="w-[60px] h-[60px] rounded-sm bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {thumb ? (
                  <img src={thumb} alt={mi.name} className="w-full h-full object-contain" />
                ) : (
                  <Icon className="w-6 h-6 text-muted-foreground/40 animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{mi.name}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{mi.category}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LookDetail;
