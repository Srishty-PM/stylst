import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, CalendarPlus, ArrowRight, Info } from 'lucide-react';
import { useAutoMatch, AutoMatchResult } from '@/hooks/useAutoMatch';
import { useMissingThumbnails } from '@/hooks/useMissingThumbnails';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { MissingItem } from '@/hooks/useAutoMatch';

const MissingItemsCollage = ({ items }: { items: MissingItem[] }) => {
  const thumbnails = useMissingThumbnails(items);
  if (!items.length) return null;

  return (
    <div className="flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-md grid grid-cols-2 gap-3 auto-rows-auto">
        {items.map((item, i) => {
          const thumb = thumbnails[i];
          const isLarge = i < 2;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-card rounded-sm overflow-hidden border border-border flex flex-col items-center justify-center ${isLarge ? 'aspect-[3/4]' : 'aspect-square'}`}
            >
              {thumb ? (
                <img src={thumb} alt={item.name} className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center space-y-1 p-3">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/10 mx-auto flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-muted-foreground/40 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[100px]">{item.name}</p>
                  </div>
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 border-border bg-background">
        {/* Confirm */}
        {step === 'confirm' && (
          <div className="p-8 space-y-6">
            <h2 className="font-display text-2xl font-semibold text-foreground">Match This Look</h2>
            <div className="rounded-sm overflow-hidden bg-muted max-h-64">
              <img src={inspirationImage} alt="Inspiration" className="w-full max-h-64 object-contain" style={{ imageOrientation: 'from-image' }} />
            </div>
            <Button className="w-full" size="lg" onClick={handleMatch}>
              <Sparkles className="w-5 h-5 mr-2" /> MATCH MY CLOSET
            </Button>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="flex items-center justify-center min-h-[400px] p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
              <div className="relative mx-auto w-16 h-16">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">Styling your look...</p>
                <p className="text-sm text-muted-foreground mt-2">Matching items from your closet</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Result — clean collage layout */}
        {step === 'result' && result && (
          <div className="max-h-[85vh] overflow-y-auto">
            {/* Tabs: Matched / Missing */}
            <Tabs defaultValue="matched" className="w-full">
              <div className="sticky top-0 z-10 bg-background border-b border-border px-6 pt-5 pb-0">
                <h2 className="font-display text-xl font-bold text-foreground mb-1">{result.look?.name || result.match_name}</h2>
                {(result.look?.occasion || result.occasion) && (
                  <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em] mb-3">
                    {[result.look?.occasion || result.occasion, result.look?.season || result.season].filter(Boolean).join(' · ')}
                  </p>
                )}
                <TabsList className="w-full bg-transparent p-0 h-auto gap-0 border-b-0">
                  <TabsTrigger
                    value="matched"
                    className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[12px] uppercase tracking-wider font-semibold pb-2"
                  >
                    Your Items ({matchedCount})
                  </TabsTrigger>
                  {missingCount > 0 && (
                    <TabsTrigger
                      value="missing"
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[12px] uppercase tracking-wider font-semibold pb-2"
                    >
                      Missing ({missingCount})
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* Matched items collage */}
              <TabsContent value="matched" className="mt-0">
                <div className="flex flex-col items-center px-4 py-6">
                  <div className="w-full max-w-md grid grid-cols-2 gap-3 auto-rows-auto">
                    {result.matched_items.map((item, i) => {
                      const isLarge = i < 2;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`bg-card rounded-sm overflow-hidden border border-border ${isLarge ? 'aspect-[3/4]' : 'aspect-square'}`}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain p-1"
                            style={{ imageOrientation: 'from-image' }}
                            loading="lazy"
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground mt-5 flex items-center gap-1.5">
                    {totalCount} items suggested <Info className="w-3.5 h-3.5" />
                  </p>
                </div>

                {/* AI note */}
                {result.reasoning && (
                  <div className="px-6 pb-4">
                    <div className="border-l-2 border-primary pl-4 py-1">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em] mb-1">Styling Note</p>
                      <p className="font-display text-sm italic text-foreground leading-relaxed">{result.reasoning}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Missing items collage */}
              {missingCount > 0 && (
                <TabsContent value="missing" className="mt-0">
                  <MissingItemsCollage items={result.missing_items} />
                </TabsContent>
              )}
            </Tabs>

            {/* Schedule inline */}
            <AnimatePresence>
              {showScheduleInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 space-y-2 overflow-hidden"
                >
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Schedule for</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} className="flex-1" />
                    <Button size="sm" onClick={() => { toast({ title: '📅 Scheduled!', description: `Planned for ${format(new Date(scheduledDate + 'T00:00:00'), 'MMMM d')}` }); handleClose(); navigate('/looks'); }}>
                      Confirm
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="px-6 py-5 space-y-2 border-t border-border">
              <div className="flex gap-2">
                {result.look && (
                  <Button className="flex-1 uppercase tracking-wider text-[12px] font-semibold" onClick={() => { handleClose(); navigate(`/looks/${result.look!.id}`); }}>
                    Save to Looks <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <Button variant="outline" className="flex-1 uppercase tracking-wider text-[12px] font-semibold" onClick={() => setShowScheduleInput(!showScheduleInput)}>
                  <CalendarPlus className="w-4 h-4 mr-1" /> Schedule
                </Button>
              </div>
              <button className="w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider py-1" onClick={handleClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AutoMatchDialog;
