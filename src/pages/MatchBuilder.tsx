import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, OCCASIONS } from '@/lib/mock-data';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useAddLook } from '@/hooks/useLooks';
import { useAuth } from '@/contexts/AuthContext';
import { useFreemiumGates } from '@/hooks/useFreemiumGates';
import UpgradeModal from '@/components/UpgradeModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

const MatchBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: closetItems = [] } = useClosetItems();
  const addLook = useAddLook();
  const { canCreateLook, looksRemaining, looksLimit } = useFreemiumGates();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState('All');
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');

  const items = closetItems.filter(
    i => (category === 'All' || i.category.toLowerCase() === category.toLowerCase()) && i.status === 'ready'
  );

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 8 ? [...prev, id] : prev);

  const handleSave = async () => {
    if (!user) return;
    if (!canCreateLook) {
      setShowUpgrade(true);
      return;
    }
    try {
      await addLook.mutateAsync({
        user_id: user.id,
        name,
        closet_item_ids: selected,
        occasion: occasion || null,
        notes: notes || null,
      });
      toast({ title: 'Outfit saved!', description: `${name} has been added to your looks.` });
      navigate('/looks');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Build an Outfit</h1>

      <div className="flex gap-2 mb-2">
        {['Select Items', 'Details'].map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>

      {step === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No ready items in this category. Add items to your closet first.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map(item => {
                const isSelected = selected.includes(item.id);
                return (
                  <button key={item.id} onClick={() => toggle(item.id)} className="relative text-left">
                    <div className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${isSelected ? 'border-accent' : 'border-transparent'}`}>
                      <img src={item.image_url_cleaned || item.image_url} alt={item.name} className="w-full h-full object-contain bg-muted" loading="lazy" style={{ imageOrientation: 'from-image' }} />
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-3 h-3 text-accent-foreground" />
                      </div>
                    )}
                    <p className="text-xs text-foreground mt-1 truncate">{item.name}</p>
                  </button>
                );
              })}
            </div>
          )}

          {selected.length > 0 && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{selected.length} item{selected.length > 1 ? 's' : ''} selected</span>
                <Button size="sm" disabled={selected.length < 2} onClick={() => setStep(1)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {selected.slice(0, 4).map(id => {
              const item = closetItems.find(i => i.id === id);
              return item ? (
                <div key={id} className="aspect-square rounded-lg overflow-hidden">
                  <img src={item.image_url_cleaned || item.image_url} alt={item.name} className="w-full h-full object-contain bg-muted" style={{ imageOrientation: 'from-image' }} />
                </div>
              ) : null;
            })}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Outfit Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Casual Friday" />
            </div>
            <div className="space-y-2">
              <Label>Occasion</Label>
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger><SelectValue placeholder="Select occasion" /></SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map(o => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this outfit..." />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button className="flex-1" disabled={!name || addLook.isPending} onClick={handleSave}>
              {addLook.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {addLook.isPending ? 'Saving...' : 'Save Outfit'}
            </Button>
          </div>
        </motion.div>
      )}

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        reason={`You've used your ${looksLimit} free manual outfits this month. Upgrade for unlimited.`}
      />
    </div>
  );
};

export default MatchBuilder;
