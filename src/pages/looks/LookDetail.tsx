import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLook, useDeleteLook, useToggleFavorite } from '@/hooks/useLooks';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useAddScheduledOutfit } from '@/hooks/useScheduledOutfits';
import { useAuth } from '@/contexts/AuthContext';
import { useMissingThumbnails } from '@/hooks/useMissingThumbnails';
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
  ArrowLeft, CalendarDays, CalendarPlus, Heart, Trash2, Loader2, Check,
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

  return (
    <div className="space-y-6 pb-8">
      <Link to="/looks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Looks
      </Link>

      {/* Hero: inspiration image or first item */}
      {look.inspiration_id ? (
        <div className="rounded-xl overflow-hidden bg-muted/30 shadow-sm">
          {ownedItems.length > 0 && (
            <div className="grid grid-cols-2 gap-1 max-w-md mx-auto">
              {ownedItems.slice(0, 4).map((item, idx) => (
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
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden bg-muted/30 shadow-sm max-w-md mx-auto">
          {ownedItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-1">
              {ownedItems.slice(0, 4).map((item, idx) => (
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
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center space-y-2">
                <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Your original look</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Title & Meta */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="font-display text-2xl font-bold text-foreground">{look.name}</h1>
            <button onClick={handleToggleFav}>
              <Heart className={`w-5 h-5 transition-colors ${look.is_favorite ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {look.occasion && <Badge variant="secondary">{look.occasion}</Badge>}
            {look.season && <Badge variant="outline">{look.season}</Badge>}
            {look.created_by_ai && <Badge className="bg-accent/15 text-accent"><Sparkles className="w-3 h-3 mr-1" />AI Generated</Badge>}
            {!look.inspiration_id && <Badge variant="outline" className="text-muted-foreground">Manual</Badge>}
          </div>

          {/* Completeness */}
          {totalItems > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Your Outfit: {ownedItems.length}/{totalItems} items</span>
                <span>{completionPct}% complete</span>
              </div>
              <Progress value={completionPct} className="h-1.5" />
            </div>
          )}

          {look.notes && <p className="text-sm text-muted-foreground">{look.notes}</p>}
          <p className="text-xs text-muted-foreground">
            Created {new Date(look.created_at).toLocaleDateString()}
            {look.times_worn != null && look.times_worn > 0
              ? ` · Worn ${look.times_worn} time${look.times_worn > 1 ? 's' : ''}`
              : ' · Never worn'}
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleWearToday}>
          Wear Today
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setShowSchedule(true)}>
          <CalendarPlus className="w-4 h-4 mr-1" /> Schedule
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleteLook.isPending}>
          {deleteLook.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />} Delete Look
        </Button>
      </div>

      {/* Owned Items */}
      {ownedItems.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            Your Items
            <Badge variant="secondary" className="text-xs">{ownedItems.length}</Badge>
          </h2>
          <div className="space-y-2">
            {ownedItems.map(item => (
              <Link key={item!.id} to={`/closet/${item!.id}`}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="relative">
                      <img src={item!.image_url_cleaned || item!.image_url} alt={item!.name} className="w-12 h-12 rounded-lg object-contain bg-muted" style={{ imageOrientation: 'from-image' }} />
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-accent-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item!.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item!.category}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item!.times_worn > 0 ? `Worn ${item!.times_worn}×` : 'Never worn'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Missing Items */}
      <MissingItemsSection items={missingItems} />

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary" />
              Schedule This Outfit
            </DialogTitle>
            <DialogDescription>
              Pick a day to wear "{look.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">When?</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSchedule} disabled={addSchedule.isPending}>
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
      <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        To Complete This Look
        <Badge variant="outline" className="text-xs text-muted-foreground">{items.length}</Badge>
      </h2>
      <div className="space-y-2">
        {items.map((mi, i) => {
          const Icon = categoryIcon(mi.category);
          const thumb = thumbnails[i];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="border-dashed border-muted-foreground/30">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-[80px] h-[80px] rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {thumb ? (
                      <img src={thumb} alt={mi.name} className="w-full h-full object-contain" />
                    ) : (
                      <Icon className="w-8 h-8 text-muted-foreground/50 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{mi.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{mi.category}</p>
                    {mi.description && <p className="text-xs text-muted-foreground mt-1">{mi.description}</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LookDetail;
