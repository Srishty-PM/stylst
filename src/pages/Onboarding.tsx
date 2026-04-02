import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, ArrowLeft, Upload, Sparkles, Loader2, Check, X,
  ImageIcon, ShirtIcon, ChevronLeft, Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddInspiration, uploadInspirationImage } from '@/hooks/useInspirations';
import { useAddClosetItem, uploadClosetImage } from '@/hooks/useClosetItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/lib/mock-data';

const VALID_CATEGORIES = CATEGORIES.filter(c => c !== 'All').map(c => c.toLowerCase());
const COLOR_OPTIONS = ['Black','White','Gray','Navy','Blue','Red','Green','Yellow','Orange','Pink','Purple','Brown','Beige','Cream'];

type Step = 'welcome' | 'inspiration' | 'closet' | 'processing' | 'review' | 'review-summary' | 'matching' | 'results' | 'done';

interface ClosetUpload {
  id: number; file: File; preview: string; imageUrl?: string;
  name: string; category: string; colors: string[]; brand: string | null;
  confidence: number; needsReview: boolean;
  status: 'pending' | 'uploading' | 'ready' | 'review' | 'error' | 'skipped';
}

interface MatchResult {
  lookName: string; occasion: string; itemIds: string[]; itemNames: string[];
  inspirationId: string; reasoning: string;
}

const STEP_MAP: Record<number, Step> = { 0:'welcome', 1:'inspiration', 2:'closet', 3:'review', 4:'matching', 5:'results' };
const STEP_PROGRESS: Record<Step, number> = { welcome:0, inspiration:25, closet:50, processing:50, review:50, 'review-summary':50, matching:75, results:100, done:100 };

const Onboarding = () => {
  const { user, profile, completeOnboarding, updateOnboardingStep } = useAuth();
  const navigate = useNavigate();
  const addInspo = useAddInspiration();
  const addClosetItem = useAddClosetItem();

  const initialStep = STEP_MAP[profile?.onboarding_step ?? 0] || 'welcome';
  const [step, setStep] = useState<Step>(initialStep);

  const [inspoFiles, setInspoFiles] = useState<File[]>([]);
  const [inspoPreviews, setInspoPreviews] = useState<string[]>([]);
  const [inspoUploading, setInspoUploading] = useState(false);
  const [uploadedInspoIds, setUploadedInspoIds] = useState<{ id: string; image_url: string }[]>([]);

  const [closetItems, setClosetItems] = useState<ClosetUpload[]>([]);
  const [closetSaving, setClosetSaving] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);

  const [reviewIndex, setReviewIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [reviewStats, setReviewStats] = useState({ confirmed: 0, edited: 0, skipped: 0 });
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editColors, setEditColors] = useState<string[]>([]);
  const [editBrand, setEditBrand] = useState('');

  const [matches, setMatches] = useState<MatchResult[]>([]);

  // Handlers
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
      } catch (err) { console.error('Inspo upload error:', err); }
    }
    setUploadedInspoIds(ids);
    setInspoUploading(false);
    toast({ title: `${ids.length} inspiration photos added` });
    await updateOnboardingStep(2);
    setStep('closet');
  };

  const handleClosetFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files).slice(0, 50);
    const newItems: ClosetUpload[] = arr.map((file, i) => ({
      id: Date.now() + i, file, preview: URL.createObjectURL(file),
      name: '', category: '', colors: [], brand: null,
      confidence: 0, needsReview: true, status: 'pending',
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
      try { updated[i] = { ...updated[i], imageUrl: await uploadClosetImage(user.id, updated[i].file) }; }
      catch { updated[i] = { ...updated[i], status: 'error' }; }
      setClosetItems([...updated]);
    }
    const urls = updated.filter(i => i.imageUrl && i.status !== 'error').map(i => i.imageUrl!);
    if (urls.length > 0) {
      try {
        const { data } = await supabase.functions.invoke('analyze-clothing', { body: { image_urls: urls } });
        const results = data?.results || [];
        let urlIdx = 0;
        for (let i = 0; i < updated.length; i++) {
          if (updated[i].status === 'error') continue;
          const r = results[urlIdx++];
          if (r) {
            updated[i] = { ...updated[i], name: r.name||'', category: r.category||'', colors: r.colors||[],
              brand: r.brand||null, confidence: r.confidence||0, needsReview: r.needs_review||false,
              status: r.needs_review ? 'review' : 'ready' };
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

  const reviewableItems = closetItems.filter(i => i.status !== 'error' && i.status !== 'skipped');
  const currentReviewItem = reviewableItems[reviewIndex];
  const readyCount = closetItems.filter(i => i.status === 'ready').length;

  const confirmItem = () => {
    if (!currentReviewItem) return;
    setClosetItems(prev => prev.map(i => i.id === currentReviewItem.id ? { ...i, status: 'ready' as const, needsReview: false } : i));
    setReviewStats(s => ({ ...s, confirmed: s.confirmed + 1 }));
    setEditMode(false);
    if (reviewIndex >= reviewableItems.length - 1) setStep('review-summary');
    else setReviewIndex(prev => prev + 1);
  };

  const saveEditedItem = (updates: Partial<ClosetUpload>) => {
    if (!currentReviewItem) return;
    setClosetItems(prev => prev.map(i => i.id === currentReviewItem.id ? { ...i, ...updates, status: 'ready' as const, needsReview: false } : i));
    setReviewStats(s => ({ ...s, edited: s.edited + 1 }));
    setEditMode(false);
    if (reviewIndex >= reviewableItems.length - 1) setStep('review-summary');
    else setReviewIndex(prev => prev + 1);
  };

  const skipItem = () => {
    if (!currentReviewItem) return;
    setClosetItems(prev => prev.map(i => i.id === currentReviewItem.id ? { ...i, status: 'skipped' as const } : i));
    setReviewStats(s => ({ ...s, skipped: s.skipped + 1 }));
    setEditMode(false);
    const remaining = closetItems.filter(i => i.status !== 'error' && i.status !== 'skipped' && i.id !== currentReviewItem.id);
    if (reviewIndex >= remaining.length) setStep('review-summary');
  };

  const startEdit = () => {
    if (!currentReviewItem) return;
    setEditName(currentReviewItem.name);
    setEditCategory(currentReviewItem.category);
    setEditColors(currentReviewItem.colors);
    setEditBrand(currentReviewItem.brand || '');
    setEditMode(true);
  };

  const handleSaveAndMatch = async () => {
    if (!user) return;
    setClosetSaving(true);
    const ids: string[] = [];
    for (const item of closetItems) {
      if (item.status !== 'ready') continue;
      let finalUrl = item.imageUrl!;
      try {
        const { data } = await supabase.functions.invoke('remove-background', { body: { image_url: finalUrl } });
        if (data?.cleaned_url) finalUrl = data.cleaned_url;
      } catch {}
      try {
        const result = await addClosetItem.mutateAsync({ user_id: user.id, name: item.name, category: item.category, image_url: finalUrl, colors: item.colors, brand: item.brand });
        ids.push(result.id);
      } catch (err) { console.error('Save error:', err); }
    }
    setSavedItemIds(ids);
    setClosetSaving(false);
    if (uploadedInspoIds.length > 0 && ids.length > 0) {
      setStep('matching');
      const allMatches: MatchResult[] = [];
      for (const inspo of uploadedInspoIds.slice(0, 5)) {
        try {
          const { data } = await supabase.functions.invoke('auto-match', { body: { inspiration_id: inspo.id, user_id: user.id } });
          if (data?.look) allMatches.push({ lookName: data.look.name, occasion: data.look.occasion||'', itemIds: data.look.closet_item_ids||[], itemNames: data.look.item_names||[], inspirationId: inspo.id, reasoning: data.look.reasoning||'' });
        } catch (err) { console.error('Match error:', err); }
      }
      setMatches(allMatches);
      await updateOnboardingStep(5);
      setStep(allMatches.length > 0 ? 'results' : 'done');
    } else { setStep('done'); }
  };

  const handleFinish = async () => { await completeOnboarding(); navigate('/dashboard'); };

  const goBack = () => {
    if (step === 'inspiration') setStep('welcome');
    else if (step === 'closet') setStep('inspiration');
    else if (step === 'review') setStep('closet');
  };

  const processingProgress = closetItems.length > 0
    ? Math.round((closetItems.filter(i => i.status !== 'pending' && i.status !== 'uploading').length / closetItems.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      {step !== 'welcome' && (
        <div className="px-6 pt-6 pb-2 max-w-lg mx-auto w-full">
          <Progress value={STEP_PROGRESS[step]} className="h-1" />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">

            {/* WELCOME */}
            {step === 'welcome' && (
              <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-10">
                <div className="space-y-3">
                  <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">Welcome to Stylst</h1>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">Your AI personal stylist. Upload inspiration, digitize your closet, get matched outfits.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  {[
                    { emoji: '📸', title: 'Inspiration', desc: 'Upload outfit ideas' },
                    { emoji: '👗', title: 'Closet', desc: 'Photograph your clothes' },
                    { emoji: '✨', title: 'AI Match', desc: 'Auto-create outfits' },
                    { emoji: '📅', title: 'Schedule', desc: 'Plan what to wear' },
                  ].map(s => (
                    <div key={s.title} className="p-4 rounded-lg bg-card border border-border">
                      <span className="text-2xl">{s.emoji}</span>
                      <p className="text-sm font-semibold text-foreground mt-2">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Button className="w-full" size="lg" onClick={async () => { await updateOnboardingStep(1); setStep('inspiration'); }}>
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={handleFinish}>
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}

            {/* INSPIRATION */}
            {step === 'inspiration' && (
              <motion.div key="inspo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Add Inspiration</h2>
                  <p className="text-sm text-muted-foreground mt-1">Upload outfit photos you love</p>
                </div>

                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/40 transition-colors">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Tap to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Up to 100 images</p>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleInspoFiles} />
                </label>

                {inspoPreviews.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{inspoPreviews.length} selected</p>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {inspoPreviews.map((url, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {!inspoUploading && (
                            <button className="absolute top-1 right-1 w-5 h-5 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => { setInspoFiles(prev => prev.filter((_, idx) => idx !== i)); setInspoPreviews(prev => prev.filter((_, idx) => idx !== i)); }}>
                              <X className="w-3 h-3 text-background" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={async () => { await updateOnboardingStep(2); setStep('closet'); }}>
                    Skip
                  </Button>
                  <Button className="flex-1" disabled={inspoFiles.length === 0 || inspoUploading} onClick={handleUploadInspo}>
                    {inspoUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {inspoUploading ? 'Uploading...' : 'Continue'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* CLOSET */}
            {step === 'closet' && (
              <motion.div key="closet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Upload Your Closet</h2>
                  <p className="text-sm text-muted-foreground mt-1">Snap photos of your clothes — AI handles the rest</p>
                </div>

                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/40 transition-colors">
                    <ShirtIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Tap to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">1-50 items · One item per photo</p>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleClosetFiles} />
                </label>

                {closetItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">{closetItems.length} items</p>
                      <label className="text-xs text-primary cursor-pointer hover:underline">
                        Add more <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleClosetFiles} />
                      </label>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto">
                      {closetItems.map(item => (
                        <div key={item.id} className="aspect-square rounded-lg overflow-hidden relative group">
                          <img src={item.preview} alt="" className="w-full h-full object-cover" />
                          <button className="absolute top-0.5 right-0.5 w-4 h-4 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setClosetItems(prev => prev.filter(i => i.id !== item.id))}>
                            <X className="w-2.5 h-2.5 text-background" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full" disabled={closetItems.length === 0} onClick={handleAnalyzeCloset}>
                  <Sparkles className="w-4 h-4 mr-2" /> Analyze with AI
                </Button>
              </motion.div>
            )}

            {/* PROCESSING */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
                <Sparkles className="w-10 h-10 text-primary mx-auto animate-pulse" />
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Analyzing...</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {closetItems.filter(i => i.status !== 'pending' && i.status !== 'uploading').length} of {closetItems.length} items
                  </p>
                </div>
                <Progress value={processingProgress} className="h-1.5 max-w-xs mx-auto" />
              </motion.div>
            )}

            {/* REVIEW */}
            {step === 'review' && currentReviewItem && (
              <motion.div key={`review-${currentReviewItem.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-foreground">Review Items</h2>
                  <span className="text-xs text-muted-foreground">{reviewIndex + 1} / {reviewableItems.length}</span>
                </div>

                {/* Card */}
                <div className="rounded-lg overflow-hidden border border-border bg-card">
                  <div className="aspect-[3/4] max-h-64 bg-muted">
                    <img src={currentReviewItem.imageUrl || currentReviewItem.preview} alt={currentReviewItem.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="p-4 space-y-3">
                    {currentReviewItem.confidence < 0.75 && (
                      <p className="text-xs text-amber-500">Low confidence — please review</p>
                    )}

                    {editMode ? (
                      <div className="space-y-3">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Item name" className="h-9" />
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                          <SelectContent>
                            {VALID_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-1">
                          {editColors.map(c => (
                            <Badge key={c} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => setEditColors(prev => prev.filter(x => x !== c))}>{c} ×</Badge>
                          ))}
                          <Select onValueChange={v => { if (!editColors.includes(v)) setEditColors(prev => [...prev, v]); }}>
                            <SelectTrigger className="h-7 w-20 text-[10px]"><SelectValue placeholder="+ Color" /></SelectTrigger>
                            <SelectContent>
                              {COLOR_OPTIONS.filter(c => !editColors.includes(c)).map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="Brand (optional)" className="h-9" />
                        <Button className="w-full" size="sm" onClick={() => saveEditedItem({ name: editName, category: editCategory, colors: editColors, brand: editBrand || null })}>
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{currentReviewItem.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{currentReviewItem.category}</p>
                        </div>
                        {currentReviewItem.colors.length > 0 && (
                          <div className="flex gap-1">
                            {currentReviewItem.colors.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={confirmItem}><Check className="w-3.5 h-3.5 mr-1" /> Confirm</Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={startEdit}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                        </div>
                        <button className="text-xs text-muted-foreground hover:text-foreground w-full text-center" onClick={skipItem}>Skip</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Nav dots */}
                <div className="flex justify-center gap-1">
                  {reviewableItems.slice(0, 12).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === reviewIndex ? 'bg-primary' : i < reviewIndex ? 'bg-primary/30' : 'bg-border'}`} />
                  ))}
                  {reviewableItems.length > 12 && <span className="text-[9px] text-muted-foreground ml-1">+{reviewableItems.length - 12}</span>}
                </div>
              </motion.div>
            )}

            {/* REVIEW SUMMARY */}
            {step === 'review-summary' && (
              <motion.div key="review-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-8">
                <Check className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Review Complete</h2>
                  <p className="text-sm text-muted-foreground mt-2">{readyCount} items ready</p>
                </div>

                <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                  <span>✓ {reviewStats.confirmed}</span>
                  <span>✏️ {reviewStats.edited}</span>
                  {reviewStats.skipped > 0 && <span>⏭ {reviewStats.skipped}</span>}
                </div>

                <Button className="w-full" size="lg" disabled={closetSaving} onClick={handleSaveAndMatch}>
                  {closetSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </motion.div>
            )}

            {/* MATCHING */}
            {step === 'matching' && (
              <motion.div key="matching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
                <Sparkles className="w-10 h-10 text-primary mx-auto animate-pulse" />
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Creating Outfits...</h2>
                  <p className="text-sm text-muted-foreground mt-2">Matching inspiration to your closet</p>
                </div>
              </motion.div>
            )}

            {/* RESULTS */}
            {step === 'results' && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground">Your Outfits Are Ready</h2>
                  <p className="text-sm text-muted-foreground mt-2">{matches.length} looks created</p>
                </div>

                <div className="space-y-3">
                  {matches.map((m, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{m.lookName}</p>
                        {m.occasion && <Badge variant="secondary" className="text-[10px] capitalize">{m.occasion}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground italic">"{m.reasoning}"</p>
                      <div className="flex flex-wrap gap-1">
                        {m.itemNames.map((name, j) => <Badge key={j} variant="outline" className="text-[10px]">{name}</Badge>)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  📸 {uploadedInspoIds.length} inspiration · 👗 {savedItemIds.length} items · ✨ {matches.length} outfits
                </div>

                <Button className="w-full" size="lg" onClick={handleFinish}>
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* DONE */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
                <Check className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">You're all set</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {savedItemIds.length > 0 ? `${savedItemIds.length} items in your closet` : 'Start adding items from your dashboard'}
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
    </div>
  );
};

export default Onboarding;
