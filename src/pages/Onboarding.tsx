import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight, Upload, Sparkles, Loader2, Check, X,
  CalendarDays, ImageIcon, ShirtIcon, ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddInspiration, uploadInspirationImage } from '@/hooks/useInspirations';
import { useAddClosetItem, uploadClosetImage } from '@/hooks/useClosetItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/lib/mock-data';

const VALID_CATEGORIES = CATEGORIES.filter(c => c !== 'All').map(c => c.toLowerCase());

type Step = 'welcome' | 'inspiration' | 'closet' | 'analyzing' | 'review' | 'matching' | 'calendar' | 'done';

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
  status: 'pending' | 'uploading' | 'ready' | 'review' | 'error';
}

interface MatchResult {
  lookName: string;
  occasion: string;
  itemIds: string[];
  itemNames: string[];
  inspirationId: string;
  reasoning: string;
}

const Onboarding = () => {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const addInspo = useAddInspiration();
  const addClosetItem = useAddClosetItem();

  const [step, setStep] = useState<Step>('welcome');

  // Inspiration state
  const [inspoFiles, setInspoFiles] = useState<File[]>([]);
  const [inspoPreviews, setInspoPreviews] = useState<string[]>([]);
  const [inspoUploading, setInspoUploading] = useState(false);
  const [uploadedInspoIds, setUploadedInspoIds] = useState<{ id: string; image_url: string }[]>([]);

  // Closet state
  const [closetItems, setClosetItems] = useState<ClosetUpload[]>([]);
  const [closetSaving, setClosetSaving] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);

  // Match state
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  const stepIndex = ['welcome', 'inspiration', 'closet', 'analyzing', 'review', 'matching', 'calendar', 'done'].indexOf(step);

  // -- Inspiration handlers --
  const handleInspoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files);
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
        const result = await addInspo.mutateAsync({
          user_id: user.id,
          image_url: imageUrl,
        });
        ids.push({ id: result.id, image_url: imageUrl });
      } catch (err: any) {
        console.error('Inspo upload error:', err);
      }
    }
    setUploadedInspoIds(ids);
    setInspoUploading(false);
    setStep('closet');
  };

  // -- Closet handlers --
  const handleClosetFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files);
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
    setStep('analyzing');

    const updated = [...closetItems];

    // Upload all images
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'uploading' };
      setClosetItems([...updated]);
      try {
        const imageUrl = await uploadClosetImage(user.id, updated[i].file);
        updated[i] = { ...updated[i], imageUrl };
      } catch (err: any) {
        updated[i] = { ...updated[i], status: 'error' };
      }
      setClosetItems([...updated]);
    }

    // AI analysis
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
    setStep('review');
  };

  const updateClosetItem = (id: number, updates: Partial<ClosetUpload>) => {
    setClosetItems(prev =>
      prev.map(i => i.id === id ? { ...i, ...updates, needsReview: false, status: 'ready' as const } : i)
    );
  };

  const allClosetReady = closetItems.every(i => i.status === 'ready' || i.status === 'error');

  const handleSaveCloset = async () => {
    if (!user) return;
    setClosetSaving(true);
    const ids: string[] = [];

    for (const item of closetItems) {
      if (item.status !== 'ready') continue;

      // Background removal
      let finalUrl = item.imageUrl!;
      try {
        const { data } = await supabase.functions.invoke('remove-background', {
          body: { image_url: finalUrl, user_id: user.id },
        });
        if (data?.cleaned_url) finalUrl = data.cleaned_url;
      } catch {}

      // Save
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

    // Now auto-match
    if (uploadedInspoIds.length > 0 && ids.length > 0) {
      setStep('matching');
      setMatchLoading(true);
      const allMatches: MatchResult[] = [];

      for (const inspo of uploadedInspoIds.slice(0, 3)) {
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
      setMatchLoading(false);
      setStep(allMatches.length > 0 ? 'calendar' : 'done');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {['Inspiration', 'Closet', 'AI Match', 'Calendar'].map((label, i) => {
            const active = i <= Math.min(Math.floor(stepIndex / 2), 3);
            return (
              <div key={label} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${active ? 'bg-accent' : 'bg-border'}`} />
                <p className={`text-[9px] mt-1 uppercase tracking-widest ${active ? 'text-accent' : 'text-muted-foreground'}`}>{label}</p>
              </div>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">

              {/* WELCOME */}
              {step === 'welcome' && (
                <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center">
                  <Sparkles className="w-12 h-12 text-accent mx-auto" />
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-2">Welcome to Stylst!</h2>
                    <p className="text-muted-foreground text-sm">Let's set up your personal stylist in 4 simple steps.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      { icon: ImageIcon, label: 'Upload inspiration', desc: 'Add looks you love' },
                      { icon: ShirtIcon, label: 'Add your closet', desc: 'Photograph your clothes' },
                      { icon: Sparkles, label: 'AI matches', desc: 'We recreate your inspo' },
                      { icon: CalendarDays, label: 'Plan your week', desc: 'Schedule your outfits' },
                    ].map(item => (
                      <div key={item.label} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                        <item.icon className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" onClick={() => setStep('inspiration')}>
                    Let's Go <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* INSPIRATION UPLOAD */}
              {step === 'inspiration' && (
                <motion.div key="inspo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={goBack}>
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">Upload Inspiration</h2>
                      <p className="text-xs text-muted-foreground">Add photos of looks you love — from Instagram, Pinterest, magazines.</p>
                    </div>
                  </div>

                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">Tap to upload inspiration photos</p>
                      <p className="text-xs text-muted-foreground mt-1">Select multiple · JPG, PNG, WebP</p>
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleInspoFiles} />
                  </label>

                  {inspoPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {inspoPreviews.map((url, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            className="absolute top-1 right-1 w-5 h-5 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setInspoFiles(prev => prev.filter((_, idx) => idx !== i));
                              setInspoPreviews(prev => prev.filter((_, idx) => idx !== i));
                            }}
                          >
                            <X className="w-3 h-3 text-background" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep('closet')}>
                      Skip
                    </Button>
                    <Button className="flex-1" disabled={inspoFiles.length === 0 || inspoUploading} onClick={handleUploadInspo}>
                      {inspoUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      {inspoUploading ? 'Uploading...' : `Upload ${inspoFiles.length} photo${inspoFiles.length !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* CLOSET UPLOAD */}
              {step === 'closet' && (
                <motion.div key="closet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={goBack}>
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">Add Your Clothes</h2>
                      <p className="text-xs text-muted-foreground">Photograph your wardrobe items. AI will categorize and clean them.</p>
                    </div>
                  </div>

                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors">
                      <ShirtIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">Tap to upload clothing photos</p>
                      <p className="text-xs text-muted-foreground mt-1">Select multiple · AI will auto-detect everything</p>
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleClosetFiles} />
                  </label>

                  {closetItems.length > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">{closetItems.length} item{closetItems.length !== 1 ? 's' : ''}</p>
                        <label className="text-xs text-accent font-medium cursor-pointer hover:underline">
                          + Add more
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleClosetFiles} />
                        </label>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {closetItems.map(item => (
                          <div key={item.id} className="aspect-square rounded-lg overflow-hidden relative group">
                            <img src={item.preview} alt="" className="w-full h-full object-cover" />
                            <button
                              className="absolute top-1 right-1 w-5 h-5 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setClosetItems(prev => prev.filter(i => i.id !== item.id))}
                            >
                              <X className="w-3 h-3 text-background" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <Button className="w-full" disabled={closetItems.length === 0} onClick={handleAnalyzeCloset}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze with AI <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* ANALYZING */}
              {step === 'analyzing' && (
                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-4">
                  <Sparkles className="w-10 h-10 text-accent mx-auto animate-pulse" />
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-1">AI is analyzing your clothes</h2>
                    <p className="text-sm text-muted-foreground">Detecting categories, colors, and brands…</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {closetItems.map(item => (
                      <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                          {item.status === 'uploading' && <Loader2 className="w-5 h-5 text-background animate-spin" />}
                          {item.status === 'ready' && <Check className="w-5 h-5 text-green-400" />}
                          {item.status === 'review' && <span className="text-[10px] text-amber-300 font-bold">REVIEW</span>}
                          {item.status === 'error' && <X className="w-5 h-5 text-red-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* REVIEW */}
              {step === 'review' && (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-1">Review Your Items</h2>
                    <p className="text-xs text-muted-foreground">Confirm AI detections or fix anything it missed.</p>
                  </div>

                  {closetItems.filter(i => i.status === 'review').length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Needs your input
                      </p>
                      {closetItems.filter(i => i.status === 'review').map(item => (
                        <div key={item.id} className="flex gap-3 p-3 bg-card border border-amber-200 rounded-lg">
                          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                            <img src={item.imageUrl || item.preview} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <Input
                              defaultValue={item.name}
                              placeholder="Item name"
                              className="h-7 text-xs"
                              onBlur={e => updateClosetItem(item.id, { name: e.target.value })}
                            />
                            <Select defaultValue={item.category} onValueChange={v => updateClosetItem(item.id, { name: item.name || 'Unnamed Item', category: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                              <SelectContent>
                                {VALID_CATEGORIES.map(c => (
                                  <SelectItem key={c} value={c} className="capitalize text-xs">{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {closetItems.filter(i => i.status === 'ready').length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Ready
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {closetItems.filter(i => i.status === 'ready').map(item => (
                          <div key={item.id} className="rounded-lg overflow-hidden bg-card border border-border">
                            <div className="aspect-square">
                              <img src={item.imageUrl || item.preview} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-2">
                              <p className="text-[10px] font-medium text-foreground truncate">{item.name}</p>
                              <p className="text-[9px] text-muted-foreground capitalize">{item.category}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button className="w-full" disabled={!allClosetReady || closetSaving} onClick={handleSaveCloset}>
                    {closetSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cleaning & saving...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Clean, Save & Match</>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* MATCHING */}
              {step === 'matching' && (
                <motion.div key="matching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-8">
                  <Sparkles className="w-10 h-10 text-accent mx-auto animate-pulse" />
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-1">Creating outfit matches</h2>
                    <p className="text-sm text-muted-foreground">AI is matching your inspiration with your closet…</p>
                  </div>
                </motion.div>
              )}

              {/* CALENDAR / RESULTS */}
              {step === 'calendar' && (
                <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="text-center">
                    <CalendarDays className="w-10 h-10 text-accent mx-auto mb-3" />
                    <h2 className="font-display text-xl font-bold text-foreground mb-1">Your AI-Matched Looks</h2>
                    <p className="text-xs text-muted-foreground">Here's what Stylst created from your inspiration + closet. Schedule them from your calendar!</p>
                  </div>

                  <div className="space-y-3">
                    {matches.map((m, i) => (
                      <div key={i} className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-foreground">{m.lookName}</p>
                          {m.occasion && <Badge variant="secondary" className="text-[10px] capitalize">{m.occasion}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{m.reasoning}</p>
                        <div className="flex flex-wrap gap-1">
                          {m.itemNames.map((name, j) => (
                            <Badge key={j} variant="outline" className="text-[10px]">{name}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full" onClick={handleFinish}>
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* DONE (no matches case) */}
              {step === 'done' && (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-4">
                  <Check className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-2">You're all set!</h2>
                    <p className="text-sm text-muted-foreground">
                      {savedItemIds.length > 0
                        ? `${savedItemIds.length} items added to your closet with AI-cleaned photos.`
                        : 'Your account is ready. Start adding items from your dashboard.'
                      }
                    </p>
                  </div>
                  <Button className="w-full" onClick={handleFinish}>
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
