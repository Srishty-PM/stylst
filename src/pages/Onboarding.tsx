import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, ArrowLeft, Upload, Sparkles, Loader2, Check, X,
  CalendarDays, ImageIcon, ShirtIcon, ChevronLeft, ChevronRight, Eye, Pencil, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddInspiration, uploadInspirationImage } from '@/hooks/useInspirations';
import { useAddClosetItem, uploadClosetImage } from '@/hooks/useClosetItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/lib/mock-data';

const VALID_CATEGORIES = CATEGORIES.filter(c => c !== 'All').map(c => c.toLowerCase());

const COLOR_OPTIONS = [
  'Black', 'White', 'Gray', 'Navy', 'Blue', 'Red', 'Green',
  'Yellow', 'Orange', 'Pink', 'Purple', 'Brown', 'Beige', 'Cream',
];

type Step = 'welcome' | 'inspiration' | 'closet' | 'processing' | 'review' | 'review-summary' | 'matching' | 'results' | 'done';

interface ClosetUpload {
  id: number;
  file: File;
  preview: string;
  imageUrl?: string;
  name: string;
  category: string;
  colors: string[];
  brand: string | null;
  confidence: number;
  needsReview: boolean;
  status: 'pending' | 'uploading' | 'ready' | 'review' | 'error' | 'skipped';
}

interface MatchResult {
  lookName: string;
  occasion: string;
  itemIds: string[];
  itemNames: string[];
  inspirationId: string;
  reasoning: string;
}

const STEP_MAP: Record<number, Step> = {
  0: 'welcome',
  1: 'inspiration',
  2: 'closet',
  3: 'review',
  4: 'matching',
  5: 'results',
};

const STEP_PROGRESS: Record<Step, number> = {
  welcome: 0,
  inspiration: 25,
  closet: 50,
  processing: 50,
  review: 50,
  'review-summary': 50,
  matching: 75,
  results: 100,
  done: 100,
};

const STEP_LABELS: Record<Step, string> = {
  welcome: 'Welcome',
  inspiration: 'Step 1 of 4',
  closet: 'Step 2 of 4',
  processing: 'Step 2 of 4',
  review: 'Step 2 of 4',
  'review-summary': 'Step 2 of 4',
  matching: 'Step 3 of 4',
  results: 'Step 4 of 4',
  done: 'Complete',
};

const Onboarding = () => {
  const { user, profile, completeOnboarding, updateOnboardingStep } = useAuth();
  const navigate = useNavigate();
  const addInspo = useAddInspiration();
  const addClosetItem = useAddClosetItem();

  const initialStep = STEP_MAP[profile?.onboarding_step ?? 0] || 'welcome';
  const [step, setStep] = useState<Step>(initialStep);

  // Inspiration state
  const [inspoFiles, setInspoFiles] = useState<File[]>([]);
  const [inspoPreviews, setInspoPreviews] = useState<string[]>([]);
  const [inspoUploading, setInspoUploading] = useState(false);
  const [uploadedInspoIds, setUploadedInspoIds] = useState<{ id: string; image_url: string }[]>([]);

  // Closet state
  const [closetItems, setClosetItems] = useState<ClosetUpload[]>([]);
  const [closetSaving, setClosetSaving] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);

  // Review state - card by card
  const [reviewIndex, setReviewIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [reviewStats, setReviewStats] = useState({ confirmed: 0, edited: 0, skipped: 0 });

  // Match state
  const [matches, setMatches] = useState<MatchResult[]>([]);

  // -- Inspiration handlers --
  const handleInspoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files).slice(0, 100);
    setInspoFiles(prev => [...prev, ...arr]);
    setInspoPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const handleUploadInspo = async () => {
    if (!user || inspoFiles.length === 0) return;
    setInspoUploading(true);
    const ids: { id: string; image_url: string }[] = [];
    for (const file of inspoFiles) {
      try {
        const imageUrl = await uploadInspirationImage(user.id, file);
        const result = await addInspo.mutateAsync({ user_id: user.id, image_url: imageUrl });
        ids.push({ id: result.id, image_url: imageUrl });
      } catch (err: any) {
        console.error('Inspo upload error:', err);
      }
    }
    setUploadedInspoIds(ids);
    setInspoUploading(false);
    toast({ title: `✓ ${ids.length} inspiration photos added!` });
    await updateOnboardingStep(2);
    setStep('closet');
  };

  // -- Closet handlers --
  const handleClosetFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files).slice(0, 50);
    const newItems: ClosetUpload[] = arr.map((file, i) => ({
      id: Date.now() + i,
      file,
      preview: URL.createObjectURL(file),
      name: '',
      category: '',
      colors: [],
      brand: null,
      confidence: 0,
      needsReview: true,
      status: 'pending',
    }));
    setClosetItems(prev => [...prev, ...newItems]);
  };

  const handleAnalyzeCloset = async () => {
    if (!user || closetItems.length === 0) return;
    await updateOnboardingStep(2);
    setStep('processing');
    const updated = [...closetItems];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'uploading' };
      setClosetItems([...updated]);
      try {
        const imageUrl = await uploadClosetImage(user.id, updated[i].file);
        updated[i] = { ...updated[i], imageUrl };
      } catch {
        updated[i] = { ...updated[i], status: 'error' };
      }
      setClosetItems([...updated]);
    }

    const urls = updated.filter(i => i.imageUrl && i.status !== 'error').map(i => i.imageUrl!);
    if (urls.length > 0) {
      try {
        const { data } = await supabase.functions.invoke('analyze-clothing', {
          body: { image_urls: urls },
        });
        const results = data?.results || [];
        let urlIdx = 0;
        for (let i = 0; i < updated.length; i++) {
          if (updated[i].status === 'error') continue;
          const r = results[urlIdx++];
          if (r) {
            updated[i] = {
              ...updated[i],
              name: r.name || '',
              category: r.category || '',
              colors: r.colors || [],
              brand: r.brand || null,
              confidence: r.confidence || 0,
              needsReview: r.needs_review || false,
              status: r.needs_review ? 'review' : 'ready',
            };
          }
        }
      } catch {
        for (let i = 0; i < updated.length; i++) {
          if (updated[i].status !== 'error') updated[i] = { ...updated[i], status: 'review', needsReview: true };
        }
      }
    }

    setClosetItems([...updated]);
    setReviewIndex(0);
    await updateOnboardingStep(3);
    setStep('review');
  };

  // -- Review card handlers --
  const reviewableItems = closetItems.filter(i => i.status !== 'error' && i.status !== 'skipped');
  const currentReviewItem = reviewableItems[reviewIndex];

  const confirmItem = () => {
    if (!currentReviewItem) return;
    setClosetItems(prev =>
      prev.map(i => i.id === currentReviewItem.id ? { ...i, status: 'ready' as const, needsReview: false } : i)
    );
    setReviewStats(s => ({ ...s, confirmed: s.confirmed + 1 }));
    setEditMode(false);
    advanceReview();
  };

  const saveEditedItem = (updates: Partial<ClosetUpload>) => {
    if (!currentReviewItem) return;
    setClosetItems(prev =>
      prev.map(i => i.id === currentReviewItem.id ? { ...i, ...updates, status: 'ready' as const, needsReview: false } : i)
    );
    setReviewStats(s => ({ ...s, edited: s.edited + 1 }));
    setEditMode(false);
    advanceReview();
  };

  const skipItem = () => {
    if (!currentReviewItem) return;
    setClosetItems(prev =>
      prev.map(i => i.id === currentReviewItem.id ? { ...i, status: 'skipped' as const } : i)
    );
    setReviewStats(s => ({ ...s, skipped: s.skipped + 1 }));
    setEditMode(false);
    // Recalculate reviewable items after skip
    const remaining = closetItems.filter(i => i.status !== 'error' && i.status !== 'skipped' && i.id !== currentReviewItem.id);
    if (reviewIndex >= remaining.length) {
      setStep('review-summary');
    }
    // Don't advance index since array shrinks
  };

  const advanceReview = () => {
    const remaining = reviewableItems.length - 1; // current one just confirmed
    if (reviewIndex >= remaining) {
      setStep('review-summary');
    } else {
      setReviewIndex(prev => prev + 1);
    }
  };

  const goToPrevReview = () => {
    if (reviewIndex > 0) setReviewIndex(prev => prev - 1);
    setEditMode(false);
  };

  // -- Save & Match --
  const handleSaveAndMatch = async () => {
    if (!user) return;
    setClosetSaving(true);
    const ids: string[] = [];

    for (const item of closetItems) {
      if (item.status !== 'ready') continue;
      let finalUrl = item.imageUrl!;
      try {
        const { data } = await supabase.functions.invoke('remove-background', {
          body: { image_url: finalUrl },
        });
        if (data?.cleaned_url) finalUrl = data.cleaned_url;
      } catch {}

      try {
        const result = await addClosetItem.mutateAsync({
          user_id: user.id,
          name: item.name,
          category: item.category,
          image_url: finalUrl,
          colors: item.colors,
          brand: item.brand,
        });
        ids.push(result.id);
      } catch (err: any) {
        console.error('Save error:', err);
      }
    }

    setSavedItemIds(ids);
    setClosetSaving(false);

    if (uploadedInspoIds.length > 0 && ids.length > 0) {
      setStep('matching');
      const allMatches: MatchResult[] = [];

      for (const inspo of uploadedInspoIds.slice(0, 5)) {
        try {
          const { data } = await supabase.functions.invoke('auto-match', {
            body: { inspiration_id: inspo.id, user_id: user.id },
          });
          if (data?.look) {
            allMatches.push({
              lookName: data.look.name,
              occasion: data.look.occasion || '',
              itemIds: data.look.closet_item_ids || [],
              itemNames: data.look.item_names || [],
              inspirationId: inspo.id,
              reasoning: data.look.reasoning || '',
            });
          }
        } catch (err) {
          console.error('Match error:', err);
        }
      }

      setMatches(allMatches);
      await updateOnboardingStep(5);
      setStep(allMatches.length > 0 ? 'results' : 'done');
    } else {
      setStep('done');
    }
  };

  const handleFinish = async () => {
    await completeOnboarding();
    navigate('/dashboard');
  };

  const goBack = () => {
    if (step === 'inspiration') setStep('welcome');
    else if (step === 'closet') setStep('inspiration');
    else if (step === 'review') setStep('closet');
  };

  // -- Edit form state for current review item --
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editColors, setEditColors] = useState<string[]>([]);
  const [editBrand, setEditBrand] = useState('');

  const startEdit = () => {
    if (!currentReviewItem) return;
    setEditName(currentReviewItem.name);
    setEditCategory(currentReviewItem.category);
    setEditColors(currentReviewItem.colors);
    setEditBrand(currentReviewItem.brand || '');
    setEditMode(true);
  };

  const readyCount = closetItems.filter(i => i.status === 'ready').length;
  const errorCount = closetItems.filter(i => i.status === 'error').length;
  const skippedCount = closetItems.filter(i => i.status === 'skipped').length;
  const processingProgress = closetItems.length > 0
    ? Math.round((closetItems.filter(i => i.status !== 'pending' && i.status !== 'uploading').length / closetItems.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Progress bar */}
        {step !== 'welcome' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{STEP_LABELS[step]}</p>
              <p className="text-xs text-muted-foreground">{STEP_PROGRESS[step]}%</p>
            </div>
            <Progress value={STEP_PROGRESS[step]} className="h-1.5" />
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ═══════ WELCOME ═══════ */}
          {step === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 text-center pt-8">
              <div>
                <h1 className="font-display text-4xl font-bold text-foreground mb-3">Welcome to Stylst! 👋</h1>
                <p className="text-muted-foreground">Let's set up your AI personal stylist in 4 easy steps</p>
              </div>

              <div className="space-y-3 text-left">
                {[
                  { icon: ImageIcon, num: 1, label: '📸 Upload Inspiration', desc: 'Add outfit ideas you love', sub: 'Pinterest saves, Instagram screenshots, or photos' },
                  { icon: ShirtIcon, num: 2, label: '👗 Upload Closet', desc: 'Photograph your clothes', sub: 'AI will auto-organize everything' },
                  { icon: Sparkles, num: 3, label: '🤖 AI Matching', desc: 'We match them for you', sub: 'AI creates outfits from what you own' },
                  { icon: CalendarDays, num: 4, label: '📅 Schedule & Wear', desc: 'Plan your outfits', sub: 'Add to calendar and wear with confidence' },
                ].map(item => (
                  <Card key={item.num} className="border-border">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">{item.label.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label.slice(2).trim()}</p>
                        <p className="text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">⏱️ Takes about 5 minutes</p>

              <Button className="w-full" size="lg" onClick={async () => { await updateOnboardingStep(1); setStep('inspiration'); }}>
                Let's Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline" onClick={handleFinish}>
                I'll do this later
              </button>
            </motion.div>
          )}

          {/* ═══════ INSPIRATION ═══════ */}
          {step === 'inspiration' && (
            <motion.div key="inspo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Upload Your Inspiration</h2>
                  <p className="text-sm text-muted-foreground">Add outfit ideas you love — from Pinterest, Instagram, magazines, or anywhere!</p>
                </div>
              </div>

              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 transition-colors">
                  <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">📸 Tap to Upload</p>
                  <p className="text-xs text-muted-foreground mt-1">or Drag Photos Here</p>
                  <p className="text-[10px] text-muted-foreground mt-2">Supports: JPG, PNG, WEBP · Max 100 images at once</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleInspoFiles} />
              </label>

              {inspoPreviews.length > 0 && (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {inspoUploading ? `Uploading: ${uploadedInspoIds.length} of ${inspoFiles.length} photos` : `${inspoPreviews.length} photos selected`}
                  </p>
                  <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                    {inspoPreviews.map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {!inspoUploading && (
                          <button
                            className="absolute top-1 right-1 w-5 h-5 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setInspoFiles(prev => prev.filter((_, idx) => idx !== i));
                              setInspoPreviews(prev => prev.filter((_, idx) => idx !== i));
                            }}
                          >
                            <X className="w-3 h-3 text-background" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={async () => { await updateOnboardingStep(2); setStep('closet'); }}>
                  Skip — I'll add later
                </Button>
                <Button className="flex-1" disabled={inspoFiles.length === 0 || inspoUploading} onClick={handleUploadInspo}>
                  {inspoUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {inspoUploading ? 'Uploading...' : 'Continue →'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══════ CLOSET UPLOAD ═══════ */}
          {step === 'closet' && (
            <motion.div key="closet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Photograph Your Closet</h2>
                  <p className="text-sm text-muted-foreground">Snap photos of your clothes. AI will organize everything automatically.</p>
                </div>
              </div>

              {/* Tips */}
              <details className="text-sm">
                <summary className="cursor-pointer text-primary font-medium">📷 Tips for best results</summary>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-4">
                  <li>✓ Lay items flat or hang them</li>
                  <li>✓ Good lighting (natural light is best)</li>
                  <li>✓ One item per photo</li>
                  <li>✓ Full item visible in frame</li>
                  <li>✗ Avoid blurry or dark photos</li>
                </ul>
              </details>

              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 transition-colors">
                  <ShirtIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">👗 Tap to Upload Closet Items</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload 1-50 items at once</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Supports: JPG, PNG, WEBP</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleClosetFiles} />
              </label>

              {closetItems.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-foreground font-medium">✓ {closetItems.length} photos uploaded successfully!</p>
                    <label className="text-xs text-primary font-medium cursor-pointer hover:underline">
                      Upload More
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleClosetFiles} />
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto">
                    {closetItems.map(item => (
                      <div key={item.id} className="aspect-square rounded-lg overflow-hidden relative group">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setClosetItems(prev => prev.filter(i => i.id !== item.id))}
                        >
                          <X className="w-2.5 h-2.5 text-background" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" disabled={closetItems.length === 0} onClick={handleAnalyzeCloset}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Process with AI →
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══════ PROCESSING ═══════ */}
          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-8">
              <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">AI is Organizing Your Closet...</h2>
                <RotatingStatus />
              </div>

              <div className="space-y-2">
                <Progress value={processingProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Processing item {closetItems.filter(i => i.status !== 'pending' && i.status !== 'uploading').length} of {closetItems.length}...
                </p>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {closetItems.slice(0, 10).map(item => (
                  <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                      {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-background animate-spin" />}
                      {item.status === 'ready' && <Check className="w-4 h-4 text-success" />}
                      {item.status === 'review' && <Pencil className="w-3.5 h-3.5 text-warning" />}
                      {item.status === 'error' && <X className="w-4 h-4 text-destructive" />}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">This usually takes about 10 seconds per item ☕</p>
            </motion.div>
          )}

          {/* ═══════ REVIEW (Tinder-style card) ═══════ */}
          {step === 'review' && currentReviewItem && (
            <motion.div key={`review-${currentReviewItem.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">Review Your Items</h2>
                <Badge variant="secondary" className="text-xs">
                  {reviewIndex + 1} / {reviewableItems.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">AI auto-tagged your clothes. Confirm or edit.</p>

              <Card className={`overflow-hidden ${currentReviewItem.confidence < 0.75 ? 'border-warning/50' : ''}`}>
                {/* Image */}
                <div className="aspect-[3/4] max-h-72 relative">
                  <img
                    src={currentReviewItem.imageUrl || currentReviewItem.preview}
                    alt={currentReviewItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">AI Confidence:</span>
                    {currentReviewItem.confidence >= 0.75 ? (
                      <Badge className="bg-success/15 text-success text-[10px]">
                        {Math.round(currentReviewItem.confidence * 100)}% confident ✓
                      </Badge>
                    ) : (
                      <Badge className="bg-warning/15 text-warning text-[10px]">
                        {Math.round(currentReviewItem.confidence * 100)}% confidence ⚠ Please review
                      </Badge>
                    )}
                  </div>

                  {editMode ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Name</label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Category</label>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                          <SelectContent>
                            {VALID_CATEGORIES.map(c => (
                              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Colors</label>
                        <div className="flex flex-wrap gap-1.5">
                          {editColors.map(c => (
                            <Badge key={c} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => setEditColors(prev => prev.filter(x => x !== c))}>
                              {c} ×
                            </Badge>
                          ))}
                          <Select onValueChange={v => { if (!editColors.includes(v)) setEditColors(prev => [...prev, v]); }}>
                            <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue placeholder="+ Add" /></SelectTrigger>
                            <SelectContent>
                              {COLOR_OPTIONS.filter(c => !editColors.includes(c)).map(c => (
                                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Brand (optional)</label>
                        <Input value={editBrand} onChange={e => setEditBrand(e.target.value)} className="h-9" placeholder="e.g. Zara" />
                      </div>
                      <Button className="w-full" onClick={() => saveEditedItem({ name: editName, category: editCategory, colors: editColors, brand: editBrand || null })}>
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    /* Display mode */
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{currentReviewItem.name || 'Unknown Item'}</p>
                        <p className="text-xs text-muted-foreground capitalize">{currentReviewItem.category || 'No category'}</p>
                      </div>
                      {currentReviewItem.colors.length > 0 && (
                        <div className="flex gap-1">
                          {currentReviewItem.colors.map(c => (
                            <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                          ))}
                        </div>
                      )}
                      {currentReviewItem.brand && (
                        <p className="text-xs text-muted-foreground">Brand: {currentReviewItem.brand}</p>
                      )}
                    </div>
                  )}

                  {!editMode && (
                    <div className="flex gap-2 pt-1">
                      <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={confirmItem}>
                        <Check className="w-4 h-4 mr-1" /> Looks Good
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={startEdit}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit Details
                      </Button>
                    </div>
                  )}

                  {!editMode && (
                    <button className="text-xs text-muted-foreground hover:text-destructive transition-colors w-full text-center" onClick={skipItem}>
                      Skip This Item
                    </button>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" disabled={reviewIndex === 0} onClick={goToPrevReview}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <div className="flex gap-1">
                  {reviewableItems.slice(0, 10).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === reviewIndex ? 'bg-primary' : i < reviewIndex ? 'bg-success' : 'bg-border'}`} />
                  ))}
                  {reviewableItems.length > 10 && <span className="text-[9px] text-muted-foreground">+{reviewableItems.length - 10}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  if (reviewIndex < reviewableItems.length - 1) {
                    setReviewIndex(prev => prev + 1);
                    setEditMode(false);
                  } else {
                    setStep('review-summary');
                  }
                }}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══════ REVIEW SUMMARY ═══════ */}
          {step === 'review-summary' && (
            <motion.div key="review-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-4">
              <Check className="w-14 h-14 text-success mx-auto" />
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">✓ Review Complete!</h2>
                <p className="text-sm text-muted-foreground">Your Closet Summary:</p>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                  <span className="text-sm text-foreground">✓ Confirmed by AI</span>
                  <span className="text-sm font-bold text-foreground">{reviewStats.confirmed}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm text-foreground">✏️ Manually edited</span>
                  <span className="text-sm font-bold text-foreground">{reviewStats.edited}</span>
                </div>
                {reviewStats.skipped > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm text-foreground">⏭ Skipped</span>
                    <span className="text-sm font-bold text-foreground">{reviewStats.skipped}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                  <span className="text-sm font-medium text-foreground">📦 Total items in closet</span>
                  <span className="text-sm font-bold text-foreground">{readyCount}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={closetSaving} onClick={handleSaveAndMatch}>
                {closetSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving & Matching...</>
                ) : (
                  <>Continue to Matching <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>

              {closetItems.filter(i => i.status === 'review').length > 0 && (
                <button className="text-xs text-primary font-medium hover:underline" onClick={() => { setReviewIndex(0); setStep('review'); }}>
                  Review Flagged Items ({closetItems.filter(i => i.status === 'review').length})
                </button>
              )}
            </motion.div>
          )}

          {/* ═══════ MATCHING ═══════ */}
          {step === 'matching' && (
            <motion.div key="matching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-8">
              <div className="relative w-20 h-20 mx-auto">
                <Sparkles className="w-12 h-12 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">Creating Your First Outfits...</h2>
                <p className="text-sm text-muted-foreground">AI is matching your inspiration to your closet</p>
              </div>
              <RotatingStatus messages={[
                'Analyzing your inspiration photos...',
                'Finding matches in your closet...',
                'Creating outfit combinations...',
                'Almost done...',
              ]} />
            </motion.div>
          )}

          {/* ═══════ RESULTS ═══════ */}
          {step === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">Your AI-Matched Outfits Are Ready! 🎉</h2>
                <p className="text-sm text-muted-foreground">
                  ✨ We found {matches.length} outfits you can wear right now!
                </p>
              </div>

              <div className="space-y-3">
                {matches.map((m, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{m.lookName}</p>
                        {m.occasion && <Badge variant="secondary" className="text-[10px] capitalize">{m.occasion}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground italic">"{m.reasoning}"</p>
                      <div className="flex flex-wrap gap-1">
                        {m.itemNames.map((name, j) => (
                          <Badge key={j} variant="outline" className="text-[10px]">{name}</Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-success font-medium">
                        {m.itemNames.length}/{m.itemNames.length} items ✓ Ready to wear!
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Stats summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center space-y-1">
                  <p className="text-sm font-semibold text-foreground">Your Stylst is Ready! ✨</p>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <span>📸 {uploadedInspoIds.length} inspiration</span>
                    <span>👗 {savedItemIds.length} closet items</span>
                    <span>✨ {matches.length} AI outfits</span>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full" size="lg" onClick={handleFinish}>
                Finish Setup & Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ═══════ DONE (no matches fallback) ═══════ */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-8">
              <Check className="w-14 h-14 text-success mx-auto" />
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">You're all set!</h2>
                <p className="text-sm text-muted-foreground">
                  {savedItemIds.length > 0
                    ? `${savedItemIds.length} items added to your closet with AI-cleaned photos.`
                    : 'Your account is ready. Start adding items from your dashboard.'
                  }
                </p>
              </div>
              <Button className="w-full" size="lg" onClick={handleFinish}>
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Rotating Status Messages ─── */
const RotatingStatus = ({ messages }: { messages?: string[] }) => {
  const defaults = [
    'Analyzing your items...',
    'Detecting categories...',
    'Identifying colors...',
    'Removing backgrounds...',
    'Almost done...',
  ];
  const msgs = messages || defaults;
  const [idx, setIdx] = useState(0);

  useState(() => {
    const timer = setInterval(() => setIdx(prev => (prev + 1) % msgs.length), 2500);
    return () => clearInterval(timer);
  });

  return (
    <p className="text-sm text-muted-foreground animate-pulse">{msgs[idx]}</p>
  );
};

export default Onboarding;
