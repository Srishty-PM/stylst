import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInspirations } from '@/hooks/useInspirations';
import { useAutoMatch, AutoMatchResult, MissingItem } from '@/hooks/useAutoMatch';
import { useAddScheduledOutfit } from '@/hooks/useScheduledOutfits';
import { useClosetItems } from '@/hooks/useClosetItems';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sparkles, Loader2, ArrowLeft, Check, CalendarPlus, ShoppingBag,
  HelpCircle, ChevronRight, Save, ArrowLeftRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ItemSwapSheet from '@/components/ItemSwapSheet';
import ShoppingSheet from '@/components/ShoppingSheet';

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

  // Swap state: track overridden items by index
  const [swappedItems, setSwappedItems] = useState<Record<number, string>>({});
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  // Shopping state
  const [shoppingItem, setShoppingItem] = useState<MissingItem | null>(null);

  // Schedule dialog state
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
      // Show schedule prompt
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
      toast({ title: '📅 Scheduled!', description: `Outfit planned for ${format(new Date(scheduleDate + 'T00:00:00'), 'MMMM d, yyyy')}` });
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
        <Link to="/inspiration" className="text-accent hover:underline text-sm mt-2 block">Back to Inspiration</Link>
      </div>
    );
  }

  // Resolve matched items with swaps applied
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
  const totalItems = matchedItems.length + missingItems.length;
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

      {/* Inspiration Image */}
      <div className="rounded-2xl overflow-hidden shadow-lg bg-muted/30">
        <img
          src={inspiration.image_url}
          alt={inspiration.description || 'Fashion inspiration'}
          className="w-full max-h-[300px] object-contain"
        />
      </div>

      {inspiration.description && (
        <p className="text-sm text-muted-foreground">{inspiration.description}</p>
      )}

      {/* Analyze Button - shown when no results yet */}
      {pageState === 'idle' && (
        <Button className="w-full" size="lg" onClick={handleAnalyze}>
          <Sparkles className="w-5 h-5 mr-2" />
          Match From My Closet
        </Button>
      )}

      {/* Analyzing State */}
      {pageState === 'analyzing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 space-y-4"
        >
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <div>
            <p className="font-display text-lg font-semibold text-foreground">Analyzing your inspiration...</p>
            <p className="text-sm text-muted-foreground mt-1">Matching items from your closet</p>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {(pageState === 'results' || pageState === 'saving' || pageState === 'saved') && matchResult && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Look Name & Meta */}
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-foreground">{matchResult.match_name}</h2>
              <div className="flex flex-wrap gap-2">
                {matchResult.occasion && <Badge variant="secondary">{matchResult.occasion}</Badge>}
                {matchResult.season && <Badge variant="outline">{matchResult.season}</Badge>}
                <Badge variant="outline" className="text-muted-foreground">
                  {matchedItems.length} matched · {missingItems.length} missing
                </Badge>
              </div>
            </div>

            {/* Reasoning */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm text-foreground leading-relaxed">{matchResult.reasoning}</p>
              </CardContent>
            </Card>

            {/* Items Grid */}
            <div>
              <h3 className="font-display text-base font-semibold text-foreground mb-3">
                Outfit Items ({totalItems})
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {/* Matched Items */}
                {matchedItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => setSwapIndex(i)}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden border-2 border-accent/30 shadow-sm relative group">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-1.5 right-1.5">
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-3 h-3 text-accent-foreground" />
                          </div>
                        </div>
                        <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-5 h-5 rounded-full bg-background/80 flex items-center justify-center">
                            <ArrowLeftRight className="w-3 h-3 text-foreground" />
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                          <p className="text-[11px] text-white font-medium truncate">{item.name}</p>
                        </div>
                      </div>
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize truncate">{item.category}</p>
                  </motion.div>
                ))}

                {/* Missing Items */}
                {missingItems.map((item, i) => (
                  <motion.div
                    key={`missing-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (matchedItems.length + i) * 0.08 }}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => setShoppingItem(item)}
                    >
                      <div className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex flex-col items-center justify-center gap-2 relative group hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer overflow-hidden">
                        {item.thumbnail_url ? (
                          <>
                            <img
                              src={item.thumbnail_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                              <p className="text-[11px] text-white font-medium truncate">{item.name}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
                            <p className="text-[11px] text-muted-foreground font-medium text-center px-2 leading-tight group-hover:text-foreground transition-colors">
                              {item.name}
                            </p>
                          </>
                        )}
                        <div className="absolute bottom-2 inset-x-0 flex justify-center">
                          <Badge variant="outline" className="text-[9px] gap-1 bg-background/80">
                            <ShoppingBag className="w-2.5 h-2.5" />
                            Buy
                          </Badge>
                        </div>
                      </div>
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize truncate">{item.category}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Save Outfit Button */}
            {pageState === 'results' && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleSaveOutfit}
                disabled={matchedItems.length < 1}
              >
                <Save className="w-5 h-5 mr-2" />
                Save This Outfit
              </Button>
            )}

            {pageState === 'saving' && (
              <Button className="w-full" size="lg" disabled>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving outfit...
              </Button>
            )}

            {pageState === 'saved' && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/looks')}>
                  View Looks
                </Button>
                <Button className="flex-1" onClick={() => setShowSchedule(true)}>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Schedule It
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary" />
              Schedule This Outfit?
            </DialogTitle>
            <DialogDescription>
              Pick a day to wear "{matchResult?.match_name}". We'll remind you!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">When do you want to wear this?</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowSchedule(false);
                navigate('/looks');
              }}
            >
              Skip for now
            </Button>
            <Button
              className="flex-1"
              onClick={handleSchedule}
              disabled={addSchedule.isPending}
            >
              {addSchedule.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CalendarPlus className="w-4 h-4 mr-1" />
              )}
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
            toast({ title: 'Item swapped!', description: 'Tap "Save This Outfit" to keep your changes.' });
          }
        }}
      />

      {/* Shopping Sheet */}
      <ShoppingSheet
        open={shoppingItem !== null}
        onOpenChange={(open) => { if (!open) setShoppingItem(null); }}
        item={shoppingItem}
      />
    </div>
  );
};

export default InspirationDetail;
