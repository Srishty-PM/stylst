import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

const features = [
  'Unlimited closet items',
  'Pinterest board sync',
  'Unlimited outfit creation',
  '10 AI Stylist requests/month',
];

const premiumPlusFeatures = [
  'Everything in Premium',
  'Unlimited AI Stylist',
  'Instagram sync',
  'Priority support',
];

const UpgradeModal = ({ open, onOpenChange, reason }: UpgradeModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'premium_plus'>('premium');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-center">Upgrade Your Plan</DialogTitle>
        </DialogHeader>

        {reason && (
          <p className="text-sm text-muted-foreground text-center -mt-2">{reason}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Premium */}
          <button
            onClick={() => setSelectedPlan('premium')}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              selectedPlan === 'premium' ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Crown className="w-4 h-4 text-primary" />
              <p className="font-semibold text-foreground text-sm">Premium</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              £9.99<span className="text-xs font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">or £99/year (save 17%)</p>
            <div className="mt-3 space-y-1.5">
              {features.map(f => (
                <div key={f} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                  <span className="text-[11px] text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </button>

          {/* Premium+ */}
          <button
            onClick={() => setSelectedPlan('premium_plus')}
            className={`rounded-lg border-2 p-4 text-left transition-colors relative ${
              selectedPlan === 'premium_plus' ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <Badge className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[9px]">Best Value</Badge>
            <div className="flex items-center gap-1.5 mb-2">
              <Crown className="w-4 h-4 text-primary" />
              <p className="font-semibold text-foreground text-sm">Premium+</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              £14.99<span className="text-xs font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">or £149/year (save 17%)</p>
            <div className="mt-3 space-y-1.5">
              {premiumPlusFeatures.map(f => (
                <div key={f} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                  <span className="text-[11px] text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </button>
        </div>

        <Button className="w-full mt-2" onClick={() => onOpenChange(false)}>
          Upgrade to {selectedPlan === 'premium' ? 'Premium' : 'Premium+'}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">Payment integration coming soon. Contact support to upgrade.</p>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
