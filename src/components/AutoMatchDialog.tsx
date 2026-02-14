import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, CalendarPlus, Check, ArrowRight, Shirt, Footprints, Watch, ShoppingBag as BagIcon, X } from 'lucide-react';
import { useAutoMatch, AutoMatchResult } from '@/hooks/useAutoMatch';
import { useMissingThumbnails } from '@/hooks/useMissingThumbnails';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { MissingItem } from '@/hooks/useAutoMatch';

const categoryIcon = (category: string) => {
  const c = category?.toLowerCase() || '';
  if (c.includes('shoe') || c.includes('boot') || c.includes('sneaker') || c.includes('flat')) return Footprints;
  if (c.includes('bag') || c.includes('purse') || c.includes('clutch')) return BagIcon;
  if (c.includes('accessor') || c.includes('jewel') || c.includes('watch') || c.includes('belt')) return Watch;
  return Shirt;
};

const MissingItemCard = ({ item, index }: { item: MissingItem; index: number; thumbnail?: string }) => {
  const Icon = categoryIcon(item.category);
  const thumbnails = useMissingThumbnails([item]);
  const thumb = thumbnails[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      className="flex items-center gap-3 py-2"
    >
      <div className="w-14 h-14 rounded-sm bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
        {thumb ? (
          <img src={thumb} alt={item.name} className="w-full h-full object-contain" />
        ) : (
          <Icon className="w-6 h-6 text-muted-foreground/40 animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.category}</p>
      </div>
    </motion.div>
  );
};

interface AutoMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspirationId: string;
  inspirationImage: string;
  autoStart?: boolean;
}

const AutoMatchDialog = ({ open, onOpenChange, inspirationId, inspirationImage, autoStart = false }: AutoMatchDialogProps) => {
  const navigate = useNavigate();
  const autoMatch = useAutoMatch();
  const [step, setStep] = useState<'confirm' | 'processing' | 'result'>(autoStart ? 'processing' : 'confirm');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [result, setResult] = useState<AutoMatchResult | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Auto-start matching when dialog opens with autoStart
  useEffect(() => {
    if (open && autoStart && !hasStarted) {
      setHasStarted(true);
      handleMatch();
    }
  }, [open, autoStart]);

  const handleMatch = async () => {
    setStep('processing');
    try {
      const res = await autoMatch.mutateAsync({
        inspiration_id: inspirationId,
        save_look: true,
      });
      setResult(res);
      setStep('result');
    } catch (err: any) {
      toast({ title: 'Auto-match failed', description: err.message, variant: 'destructive' });
      setStep('confirm');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(autoStart ? 'processing' : 'confirm');
      setResult(null);
      setHasStarted(false);
      setShowScheduleInput(false);
    }, 300);
  };

  const matchedCount = result?.matched_items?.length || 0;
  const missingCount = result?.missing_items?.length || 0;
  const totalCount = matchedCount + missingCount;
  const completionPct = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 border-border">
        {/* Confirm step - only shown if not autoStart */}
        {step === 'confirm' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-foreground">Match This Look</h2>
            </div>
            <div className="rounded-sm overflow-hidden bg-muted max-h-64">
              <img src={inspirationImage} alt="Inspiration" className="w-full max-h-64 object-contain" style={{ imageOrientation: 'from-image' }} />
            </div>
            <p className="text-sm text-muted-foreground">AI will analyze this inspiration and find the best matches from your closet.</p>
            <Button className="w-full" size="lg" onClick={handleMatch}>
              <Sparkles className="w-5 h-5 mr-2" />
              MATCH MY CLOSET
            </Button>
          </div>
        )}

        {/* Processing - split screen with inspiration visible */}
        {step === 'processing' && (
          <div className="grid md:grid-cols-2 min-h-[400px]">
            {/* Left: Inspiration */}
            <div className="bg-muted/30 flex items-center justify-center p-6 border-r border-border">
              <img
                src={inspirationImage}
                alt="Inspiration"
                className="w-full max-h-[400px] object-contain rounded-sm"
                style={{ imageOrientation: 'from-image' }}
              />
            </div>
            {/* Right: Processing animation */}
            <div className="flex items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-6"
              >
                <div className="relative mx-auto w-16 h-16">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold text-foreground">Analyzing your look...</p>
                  <p className="text-sm text-muted-foreground mt-2">Matching items from your closet</p>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Result - editorial split-screen */}
        {step === 'result' && result && (
          <div className="grid md:grid-cols-2 max-h-[85vh]">
            {/* Left: Inspiration */}
            <div className="bg-muted/20 border-r border-border p-6 flex flex-col">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-3">Inspiration</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <img
                  src={inspirationImage}
                  alt="Inspiration"
                  className="w-full max-h-[500px] object-contain rounded-sm"
                  style={{ imageOrientation: 'from-image' }}
                />
              </div>
            </div>

            {/* Right: Match results */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Header */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-1">Your Match</p>
                <h2 className="font-display text-2xl font-bold text-foreground">{result.look?.name || result.match_name}</h2>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {(result.look?.occasion || result.occasion) && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] border border-foreground/20 px-3 py-1 rounded-sm text-foreground">
                    {result.look?.occasion || result.occasion}
                  </span>
                )}
                {(result.look?.season || result.season) && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] border border-foreground/20 px-3 py-1 rounded-sm text-foreground">
                    {result.look?.season || result.season}
                  </span>
                )}
                {result.scheduled_outfit && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] bg-primary text-primary-foreground px-3 py-1 rounded-sm">
                    📅 {format(new Date(result.scheduled_outfit.scheduled_date + 'T00:00:00'), 'MMM d')}
                  </span>
                )}
              </div>

              {/* Completeness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase tracking-wider">
                  <span>{matchedCount}/{totalCount} items matched</span>
                  <span>{completionPct}%</span>
                </div>
                <Progress value={completionPct} className="h-1" />
              </div>

              {/* Matched Items Grid */}
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {result.matched_items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <div className="aspect-square rounded-sm overflow-hidden border border-accent/30 relative group">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain bg-muted"
                          style={{ imageOrientation: 'from-image' }}
                          loading="lazy"
                        />
                        <div className="absolute top-1.5 right-1.5">
                          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-accent-foreground" />
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-4">
                          <p className="text-[10px] text-white font-medium truncate">{item.name}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Missing Items */}
              {result.missing_items.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-2">Complete the look</p>
                  <div className="divide-y divide-border">
                    {result.missing_items.map((mi, i) => (
                      <MissingItemCard key={i} item={mi} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Styling Note - editorial quote */}
              <div className="border-l-2 border-primary pl-4 py-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em] mb-1">AI Styling Note</p>
                <p className="font-display text-base italic text-foreground leading-relaxed">{result.reasoning}</p>
              </div>

              {/* Schedule inline */}
              <AnimatePresence>
                {showScheduleInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Schedule for</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={e => setScheduledDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          toast({ title: '📅 Scheduled!', description: `Planned for ${format(new Date(scheduledDate + 'T00:00:00'), 'MMMM d')}` });
                          handleClose();
                          navigate('/looks');
                        }}
                      >
                        Confirm
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  {result.look && (
                    <Button className="flex-1 uppercase tracking-wider text-[12px] font-semibold" onClick={() => navigate(`/looks/${result.look!.id}`)}>
                      View Look <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 uppercase tracking-wider text-[12px] font-semibold"
                    onClick={() => setShowScheduleInput(!showScheduleInput)}
                  >
                    <CalendarPlus className="w-4 h-4 mr-1" /> Schedule
                  </Button>
                </div>
                <button
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                  onClick={handleClose}
                >
                  Skip →
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AutoMatchDialog;
