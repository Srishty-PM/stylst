import { Upload, Loader2, Check, X, Sparkles, ArrowRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAddClosetItem, uploadClosetImage } from '@/hooks/useClosetItems';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFreemiumGates } from '@/hooks/useFreemiumGates';
import UpgradeModal from '@/components/UpgradeModal';

interface AnalyzedItem {
  index: number;
  file: File;
  preview: string;
  image_url?: string;
  name: string;
  category: string;
  colors: string[];
  brand: string | null;
  confidence: number;
  needs_review: boolean;
  status: 'pending' | 'analyzing' | 'ready' | 'review' | 'cleaning' | 'done' | 'error';
  error?: string;
}

const VALID_CATEGORIES = CATEGORIES.filter(c => c !== 'All').map(c => c.toLowerCase());

const AddClosetItem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addItem = useAddClosetItem();
  const { canAddClosetItem, closetRemaining, closetLimit } = useFreemiumGates();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [step, setStep] = useState<'upload' | 'analyzing' | 'review' | 'saving'>('upload');
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files;
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    const newItems: AnalyzedItem[] = arr.map((file, i) => ({
      index: items.length + i,
      file,
      preview: URL.createObjectURL(file),
      name: '',
      category: '',
      colors: [],
      brand: null,
      confidence: 0,
      needs_review: true,
      status: 'pending',
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter(item => item.index !== index));
  };

  const handleAnalyze = async () => {
    if (!canAddClosetItem) {
      setShowUpgrade(true);
      return;
    }
    if (!user || items.length === 0) return;
    setStep('analyzing');

    // Step 1: Upload all images to storage
    const updatedItems = [...items];
    for (let i = 0; i < updatedItems.length; i++) {
      updatedItems[i] = { ...updatedItems[i], status: 'analyzing' };
      setItems([...updatedItems]);

      try {
        const imageUrl = await uploadClosetImage(user.id, updatedItems[i].file);
        updatedItems[i] = { ...updatedItems[i], image_url: imageUrl };
      } catch (err: any) {
        updatedItems[i] = { ...updatedItems[i], status: 'error', error: err.message };
      }
      setItems([...updatedItems]);
    }

    // Step 2: Analyze all images with AI
    const imageUrls = updatedItems
      .filter(item => item.image_url && item.status !== 'error')
      .map(item => item.image_url!);

    if (imageUrls.length === 0) {
      setStep('review');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-clothing', {
        body: { image_urls: imageUrls },
      });

      if (error) throw error;

      const results = data.results || [];
      let urlIndex = 0;
      for (let i = 0; i < updatedItems.length; i++) {
        if (updatedItems[i].status === 'error') continue;
        const result = results[urlIndex];
        urlIndex++;
        if (result) {
          updatedItems[i] = {
            ...updatedItems[i],
            name: result.name || '',
            category: result.category || '',
            colors: result.colors || [],
            brand: result.brand || null,
            confidence: result.confidence || 0,
            needs_review: result.needs_review || false,
            status: result.needs_review ? 'review' : 'ready',
          };
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      for (let i = 0; i < updatedItems.length; i++) {
        if (updatedItems[i].status !== 'error') {
          updatedItems[i] = { ...updatedItems[i], status: 'review', needs_review: true };
        }
      }
    }

    setItems([...updatedItems]);
    setStep('review');
  };

  const updateItem = (index: number, updates: Partial<AnalyzedItem>) => {
    setItems(prev =>
      prev.map(item =>
        item.index === index ? { ...item, ...updates, needs_review: false, status: 'ready' } : item
      )
    );
  };

  const allReady = items.every(item => item.status === 'ready' || item.status === 'done' || item.status === 'error');

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);
    setStep('saving');

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      if (updatedItems[i].status === 'error' || updatedItems[i].status === 'done') continue;
      updatedItems[i] = { ...updatedItems[i], status: 'cleaning' };
      setItems([...updatedItems]);

      let finalUrl = updatedItems[i].image_url!;

      // Step 3: Background removal
      try {
        const { data: cleanData, error: cleanError } = await supabase.functions.invoke('remove-background', {
          body: { image_url: finalUrl, user_id: user.id },
        });
        if (!cleanError && cleanData?.cleaned_url) {
          finalUrl = cleanData.cleaned_url;
        }
      } catch (err) {
        console.error('Background removal failed, using original:', err);
      }

      // Step 4: Save to database
      try {
        await addItem.mutateAsync({
          user_id: user.id,
          name: updatedItems[i].name,
          category: updatedItems[i].category,
          image_url: finalUrl,
          colors: updatedItems[i].colors,
          brand: updatedItems[i].brand,
        });
        updatedItems[i] = { ...updatedItems[i], status: 'done', image_url: finalUrl };
      } catch (err: any) {
        updatedItems[i] = { ...updatedItems[i], status: 'error', error: err.message };
      }
      setItems([...updatedItems]);
    }

    setSaving(false);
    const successCount = updatedItems.filter(i => i.status === 'done').length;
    toast({
      title: `${successCount} item${successCount !== 1 ? 's' : ''} added!`,
      description: 'Your closet has been updated with AI-cleaned photos.',
    });
    setTimeout(() => navigate('/closet'), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step !== 'upload' && (
            <Button variant="ghost" size="icon" onClick={() => step === 'review' ? setStep('upload') : null} disabled={step === 'saving'}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="font-display text-2xl font-bold text-foreground">Add to Closet</h1>
        </div>
        <Link to="/closet" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {['Upload', 'AI Analysis', 'Review & Save'].map((s, i) => {
          const stepIndex = step === 'upload' ? 0 : step === 'analyzing' ? 1 : 2;
          return (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= stepIndex ? 'bg-accent' : 'bg-border'}`} />
              <p className={`text-[10px] mt-1 tracking-wide uppercase ${i <= stepIndex ? 'text-accent' : 'text-muted-foreground'}`}>{s}</p>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-accent/50 transition-colors">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Tap to upload your clothes</p>
                <p className="text-xs text-muted-foreground mt-1">Select multiple photos · JPG, PNG, WebP · Max 5MB each</p>
              </div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </label>

            {items.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''} selected</p>
                  <label className="text-xs text-accent font-medium cursor-pointer hover:underline">
                    + Add more
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map(item => (
                    <div key={item.index} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img src={item.preview} alt={`Upload ${item.index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeItem(item.index)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-foreground/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-background" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Button className="w-full" disabled={items.length === 0} onClick={handleAnalyze}>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze with AI
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* STEP 2: Analyzing */}
        {step === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-accent mx-auto mb-4 animate-pulse" />
              <h2 className="font-display text-xl font-light text-foreground mb-2">AI is analyzing your clothes</h2>
              <p className="text-sm text-muted-foreground">Detecting categories, colors, and brands…</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {items.map(item => (
                <div key={item.index} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                    {item.status === 'analyzing' && <Loader2 className="w-6 h-6 text-background animate-spin" />}
                    {item.status === 'ready' && <Check className="w-6 h-6 text-green-400" />}
                    {item.status === 'review' && <Badge className="bg-amber-500 text-white">Review</Badge>}
                    {item.status === 'error' && <X className="w-6 h-6 text-red-400" />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 3: Review */}
        {(step === 'review' || step === 'saving') && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {items.filter(i => i.status !== 'error').length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No items to review. Try uploading again.</p>
              </div>
            ) : (
              <>
                {/* Items needing review first */}
                {items.some(i => i.needs_review && i.status === 'review') && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Needs your input
                    </h3>
                    {items.filter(i => i.status === 'review').map(item => (
                      <ReviewCard key={item.index} item={item} onUpdate={updateItem} />
                    ))}
                  </div>
                )}

                {/* Ready items */}
                {items.some(i => i.status === 'ready' || i.status === 'cleaning' || i.status === 'done') && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Ready to save
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {items.filter(i => ['ready', 'cleaning', 'done'].includes(i.status)).map(item => (
                        <div key={item.index} className="relative bg-card rounded-lg border border-border overflow-hidden">
                          <div className="aspect-square">
                            <img src={item.image_url || item.preview} alt={item.name} className="w-full h-full object-cover" />
                            {item.status === 'cleaning' && (
                              <div className="absolute inset-0 bg-foreground/40 flex flex-col items-center justify-center">
                                <Loader2 className="w-5 h-5 text-background animate-spin mb-1" />
                                <span className="text-[10px] text-background uppercase tracking-wider">Cleaning</span>
                              </div>
                            )}
                            {item.status === 'done' && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{item.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!allReady || saving}
                  onClick={handleSaveAll}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cleaning & saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Clean & Save {items.filter(i => i.status === 'ready').length} Items
                    </>
                  )}
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!canAddClosetItem && (
        <Card className="border-warning/30 bg-warning/5 mt-4">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Free tier limit reached ({closetLimit} items)</p>
              <p className="text-xs text-muted-foreground">Upgrade for unlimited closet items.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowUpgrade(true)}>Upgrade</Button>
          </CardContent>
        </Card>
      )}

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        reason={`You've reached the free tier limit (${closetLimit} items). Upgrade to add unlimited items.`}
      />
    </div>
  );
};

/** Card for items that need manual categorization */
const ReviewCard = ({
  item,
  onUpdate,
}: {
  item: AnalyzedItem;
  onUpdate: (index: number, updates: Partial<AnalyzedItem>) => void;
}) => {
  const [name, setName] = useState(item.name || '');
  const [category, setCategory] = useState(item.category || '');

  const handleConfirm = () => {
    if (!name.trim() || !category) return;
    onUpdate(item.index, { name: name.trim(), category });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 bg-card rounded-lg border border-amber-200 p-4"
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
        <img src={item.image_url || item.preview} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Item name"
          className="h-8 text-sm"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {VALID_CATEGORIES.map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 text-xs" disabled={!name.trim() || !category} onClick={handleConfirm}>
          <Check className="w-3 h-3 mr-1" />
          Confirm
        </Button>
      </div>
    </motion.div>
  );
};

export default AddClosetItem;
