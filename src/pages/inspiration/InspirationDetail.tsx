import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInspirations } from '@/hooks/useInspirations';
import { useAutoMatch, AutoMatchResult } from '@/hooks/useAutoMatch';
import { useAddScheduledOutfit } from '@/hooks/useScheduledOutfits';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useMissingThumbnails } from '@/hooks/useMissingThumbnails';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sparkles, Loader2, ArrowLeft, Check, CalendarPlus, Shirt,
  Footprints, Watch, ShoppingBag as BagIcon, ArrowLeftRight, Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ItemSwapSheet from '@/components/ItemSwapSheet';
import type { MissingItem } from '@/hooks/useAutoMatch';

const categoryIcon = (category: string) => {
  const c = category?.toLowerCase() || '';
  if (c.includes('shoe') || c.includes('boot') || c.includes('sneaker') || c.includes('flat')) return Footprints;
  if (c.includes('bag') || c.includes('purse') || c.includes('clutch')) return BagIcon;
  if (c.includes('accessor') || c.includes('jewel') || c.includes('watch') || c.includes('belt')) return Watch;
  return Shirt;
};

type PageState = 'idle' | 'analyzing' | 'results' | 'saving' | 'saved';

const InspirationDetail = () => {
  const { inspirationId } = useParams<{ inspirationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: inspirations = [] } = useInspirations();
  const autoMatch = useAutoMatch();
  const addSchedule = useAddScheduledOutfit();
  const { data: closetItems = [] } = useClosetItems();

  const inspiration = inspirations.find(i => i.id === inspirationId);

  const [pageState, setPageState] = useState<PageState>('idle');
  const [matchResult, setMatchResult] = useState<AutoMatchResult | null>(null);
  const [swappedItems, setSwappedItems] = useState<Record<number, string>>({});
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [savedLookId, setSavedLookId] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!inspirationId) return;
    setPageState('analyzing');
    try {
      const result = await autoMatch.mutateAsync({
        inspiration_id: inspirationId,
        save_look: false,
      });
      setMatchResult(result);
      setPageState('results');
    } catch (err: any) {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
      setPageState('idle');
    }
  };

  const handleSaveOutfit = async () => {
    if (!inspirationId || !matchResult) return;
    setPageState('saving');
    try {
      const result = await autoMatch.mutateAsync({
        inspiration_id: inspirationId,
        save_look: true,
      });
      setMatchResult(result);
      setSavedLookId(result.look?.id || null);
      setPageState('saved');
      toast({ title: '✓ Outfit saved!', description: result.match_name });
      setShowSchedule(true);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
      setPageState('results');
    }
  };

  const handleSchedule = async () => {
    if (!savedLookId || !user) return;
    try {
      await addSchedule.mutateAsync({
        user_id: user.id,
        matched_look_id: savedLookId,
        scheduled_date: scheduleDate,
        event_name: matchResult?.match_name || 'Outfit',
      });
      toast({ title: '📅 Scheduled!', description: `Planned for ${format(new Date(scheduleDate + 'T00:00:00'), 'MMMM d, yyyy')}` });
      setShowSchedule(false);
      navigate('/looks');
    } catch (err: any) {
      toast({ title: 'Schedule failed', description: err.message, variant: 'destructive' });
    }
  };

  if (!inspiration) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Inspiration not found.</p>
        <Link to="/inspiration" className="text-primary hover:underline text-sm mt-2 block">Back to Inspiration</Link>
      </div>
    );
  }

  const matchedItems = (matchResult?.matched_items || []).map((original, i) => {
    const swapId = swappedItems[i];
    if (!swapId) return original;
    const swapped = closetItems.find(c => c.id === swapId);
    if (!swapped) return original;
    return {
      id: swapped.id,
      name: swapped.name,
      category: swapped.category,
      image_url: swapped.image_url_cleaned || swapped.image_url,
      colors: swapped.colors,
    };
  });
  const missingItems = matchResult?.missing_items || [];
  const thumbnails = useMissingThumbnails(missingItems);
  const totalItems = matchedItems.length + missingItems.length;
  const matchedCount = matchedItems.length;
  const completionPct = totalItems > 0 ? Math.round((matchedCount / totalItems) * 100) : 100;
  const usedItemIds = matchedItems.map(m => m.id);
  const swapTarget = swapIndex !== null ? matchedItems[swapIndex] : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inspiration')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">Inspiration Detail</h1>
      </div>

      {/* Split layout when results available */}
      {(pageState === 'results' || pageState === 'saving' || pageState === 'saved') && matchResult ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Inspiration */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em]">Inspiration</p>
            <div className="rounded-sm overflow-hidden bg-muted/30 border border-border">
              <img
                src={inspiration.image_url}
                alt={inspiration.description || 'Fashion inspiration'}
                className="w-full max-h-[500px] object-contain"
                style={{ imageOrientation: 'from-image' }}
              />
            </div>
          </div>

          {/* Right: Match results */}
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Title */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-1">Your Match</p>
                <h2 className="font-display text-2xl font-bold text-foreground">{matchResult.match_name}</h2>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {matchResult.occasion && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] border border-foreground/20 px-3 py-1 rounded-sm text-foreground">
                    {matchResult.occasion}
                  </span>
                )}
                {matchResult.season && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] border border-foreground/20 px-3 py-1 rounded-sm text-foreground">
                    {matchResult.season}
                  </span>
                )}
              </div>

              {/* Completeness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase tracking-wider">
                  <span>{matchedCount}/{totalItems} items matched</span>
                  <span>{completionPct}%</span>
                </div>
                <Progress value={completionPct} className="h-1" />
              </div>

              {/* Matched Items Grid */}
              <div className="grid grid-cols-3 gap-2">
                {matchedItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <button className="w-full text-left" onClick={() => setSwapIndex(i)}>
                      <div className="aspect-square rounded-sm overflow-hidden border border-accent/30 relative group">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain bg-muted"
                          style={{ imageOrientation: 'from-image' }}
                          loading="lazy"
                        />
                        <div className="absolute top-1 right-1">
                          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-accent-foreground" />
                          </div>
                        </div>
                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-4 h-4 rounded-full bg-background/80 flex items-center justify-center">
                            <ArrowLeftRight className="w-2.5 h-2.5 text-foreground" />
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-4">
                          <p className="text-[10px] text-white font-medium truncate">{item.name}</p>
                        </div>
                      </div>
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize truncate">{item.category}</p>
                  </motion.div>
                ))}
              </div>

              {/* Missing Items */}
              {missingItems.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-2">Complete the look</p>
                  <div className="divide-y divide-border">
                    {missingItems.map((mi, i) => {
                      const Icon = categoryIcon(mi.category);
                      const thumb = thumbnails[i];
                      return (
                        <div key={i} className="flex items-center gap-3 py-2.5">
                          <div className="w-14 h-14 rounded-sm bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                            {thumb ? (
                              <img src={thumb} alt={mi.name} className="w-full h-full object-contain" />
                            ) : (
                              <Icon className="w-6 h-6 text-muted-foreground/40 animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{mi.name}</p>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{mi.category}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Note - editorial quote */}
              <div className="border-l-2 border-primary pl-4 py-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em] mb-1">AI Styling Note</p>
                <p className="font-display text-base italic text-foreground leading-relaxed">{matchResult.reasoning}</p>
              </div>

              {/* Actions */}
              {pageState === 'results' && (
                <Button
                  className="w-full uppercase tracking-wider text-[12px] font-semibold"
                  size="lg"
                  onClick={handleSaveOutfit}
                  disabled={matchedItems.length < 1}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to Looks
                </Button>
              )}

              {pageState === 'saving' && (
                <Button className="w-full uppercase tracking-wider text-[12px] font-semibold" size="lg" disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </Button>
              )}

              {pageState === 'saved' && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 uppercase tracking-wider text-[12px]" onClick={() => navigate('/looks')}>
                    View Looks
                  </Button>
                  <Button className="flex-1 uppercase tracking-wider text-[12px]" onClick={() => setShowSchedule(true)}>
                    <CalendarPlus className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <>
          {/* Inspiration Image - full width when no results */}
          <div className="rounded-sm overflow-hidden bg-muted/30 border border-border">
            <img
              src={inspiration.image_url}
              alt={inspiration.description || 'Fashion inspiration'}
              className="w-full max-h-[400px] object-contain"
              style={{ imageOrientation: 'from-image' }}
            />
          </div>

          {/* Analyze Button */}
          {pageState === 'idle' && (
            <Button className="w-full uppercase tracking-wider text-[12px] font-semibold" size="lg" onClick={handleAnalyze}>
              <Sparkles className="w-5 h-5 mr-2" />
              Match From My Closet
            </Button>
          )}

          {/* Analyzing State */}
          {pageState === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="relative mx-auto w-16 h-16">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">Analyzing your inspiration...</p>
                <p className="text-sm text-muted-foreground mt-2">Matching items from your closet</p>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Schedule This Outfit</DialogTitle>
            <DialogDescription>Pick a day to wear "{matchResult?.match_name}".</DialogDescription>
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
            <Button variant="outline" className="flex-1 uppercase tracking-wider text-[12px]" onClick={() => { setShowSchedule(false); navigate('/looks'); }}>
              Skip
            </Button>
            <Button className="flex-1 uppercase tracking-wider text-[12px]" onClick={handleSchedule} disabled={addSchedule.isPending}>
              {addSchedule.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-1" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Swap Sheet */}
      <ItemSwapSheet
        open={swapIndex !== null}
        onOpenChange={(open) => { if (!open) setSwapIndex(null); }}
        currentItem={swapTarget}
        closetItems={closetItems}
        usedItemIds={usedItemIds}
        onSwap={(newId) => {
          if (swapIndex !== null) {
            setSwappedItems(prev => ({ ...prev, [swapIndex]: newId }));
            setSwapIndex(null);
            toast({ title: 'Item swapped!', description: 'Tap "Save to Looks" to keep your changes.' });
          }
        }}
      />
    </div>
  );
};

export default InspirationDetail;
