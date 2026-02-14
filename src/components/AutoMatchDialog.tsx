import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CalendarPlus, Check, ArrowRight } from 'lucide-react';
import { useAutoMatch, AutoMatchResult } from '@/hooks/useAutoMatch';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface AutoMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspirationId: string;
  inspirationImage: string;
}

const AutoMatchDialog = ({ open, onOpenChange, inspirationId, inspirationImage }: AutoMatchDialogProps) => {
  const navigate = useNavigate();
  const autoMatch = useAutoMatch();
  const [step, setStep] = useState<'confirm' | 'processing' | 'result'>('confirm');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [result, setResult] = useState<AutoMatchResult | null>(null);

  const handleMatch = async () => {
    setStep('processing');
    try {
      const res = await autoMatch.mutateAsync({
        inspiration_id: inspirationId,
        scheduled_date: addToCalendar ? scheduledDate : undefined,
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
      setStep('confirm');
      setResult(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Auto-Match Outfit
              </DialogTitle>
              <DialogDescription>
                AI will analyze this inspiration and pick the best items from your closet to recreate the look.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl overflow-hidden max-h-48">
              <img src={inspirationImage} alt="Inspiration" className="w-full object-cover" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-cal"
                  checked={addToCalendar}
                  onChange={e => setAddToCalendar(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="add-cal" className="text-sm font-medium cursor-pointer">
                  <CalendarPlus className="w-4 h-4 inline mr-1" />
                  Add to calendar
                </Label>
              </div>

              {addToCalendar && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Schedule for</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              )}
            </div>

            <Button className="w-full" onClick={handleMatch}>
              <Sparkles className="w-4 h-4 mr-2" />
              Match My Closet
            </Button>
          </>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-accent mx-auto animate-spin" />
            <div>
              <p className="font-medium text-foreground">Analyzing inspiration...</p>
              <p className="text-sm text-muted-foreground mt-1">Matching with your closet items</p>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-accent" />
                Look Created!
              </DialogTitle>
              <DialogDescription>{result.look?.name || result.match_name}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-2">
              {result.matched_items.map(item => (
                <div key={item.id} className="space-y-1">
                  <div className="aspect-square rounded-lg overflow-hidden">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain bg-muted" style={{ imageOrientation: 'from-image' }} />
                  </div>
                  <p className="text-xs text-foreground truncate">{item.name}</p>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground">{result.reasoning}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(result.look?.occasion || result.occasion) && <Badge variant="secondary">{result.look?.occasion || result.occasion}</Badge>}
              {(result.look?.season || result.season) && <Badge variant="outline">{result.look?.season || result.season}</Badge>}
              {result.scheduled_outfit && (
                <Badge variant="default">
                  <CalendarPlus className="w-3 h-3 mr-1" />
                  {format(new Date(result.scheduled_outfit.scheduled_date + 'T00:00:00'), 'MMM d')}
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Done</Button>
              {result.look ? (
                <Button className="flex-1" onClick={() => navigate(`/looks/${result.look!.id}`)}>
                  View Look <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleClose}>
                  Great! <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AutoMatchDialog;
