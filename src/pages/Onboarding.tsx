import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAnalytics, usePageView } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, Sparkles, Loader2, Check, X,
  ImageIcon, ShirtIcon, ChevronLeft, Pencil, Camera as CameraIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddInspiration, uploadInspirationImage } from '@/hooks/useInspirations';
import { Link2 } from 'lucide-react';
import { useAddClosetItem, uploadClosetImage } from '@/hooks/useClosetItems';
import { usePinterestBoards, usePinterestConnect, useSyncPinterestBoard } from '@/hooks/usePinterest';
import { getPinterestSyncNotice } from '@/lib/pinterest-sync-result';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/lib/mock-data';
import { isNativePicker, takePhoto, pickFromLibrary, MAX_UPLOAD_BYTES } from '@/lib/image-picker';
import { hasAIConsent, setAIConsent, ensureAIConsent, runAIRequest, AI_DATA_DESCRIPTION } from '@/lib/ai-consent';

const VALID_CATEGORIES = CATEGORIES.filter(c => c !== 'All').map(c => c.toLowerCase());
const COLOR_OPTIONS = ['Black','White','Gray','Navy','Blue','Red','Green','Yellow','Orange','Pink','Purple','Brown','Beige','Cream'];

type Step = 'welcome' | 'inspiration' | 'closet' | 'processing' | 'review' | 'review-summary' | 'done';

interface ClosetUpload {
  id: number; file: File; preview: string; imageUrl?: string;
  name: string; category: string; colors: string[]; brand: string | null;
  confidence: number; needsReview: boolean;
  status: 'pending' | 'uploading' | 'ready' | 'review' | 'error' | 'skipped';
}

const STEP_PROGRESS: Record<Step, number> = { welcome: 0, closet: 20, processing: 30, review: 35, 'review-summary': 45, inspiration: 70, done: 100 };

const Onboarding = () => {
  const { user, profile, completeOnboarding, updateOnboardingStep } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const addInspo = useAddInspiration();
  const addClosetItem = useAddClosetItem();
  const { connect: connectPinterest, loading: pinterestLoading } = usePinterestConnect();
  const pinterestConnected = profile?.pinterest_connected ?? false;
  const { data: pinterestBoards, isLoading: pinterestBoardsLoading } = usePinterestBoards(pinterestConnected);
  const { sync: syncPinterestBoard, syncing: pinterestSyncing } = useSyncPinterestBoard();
  const { track } = useAnalytics();
  usePageView('onboarding');

  const [step, setStepRaw] = useState<Step>(profile?.onboarding_step === 2 ? 'inspiration' : profile?.onboarding_step ? 'closet' : 'welcome');
  const setStep = (s: Step) => {
    track('step_completed', { step: s });
    setStepRaw(s);
  };

  const [inspoFiles, setInspoFiles] = useState<File[]>([]);
  const [inspoPreviews, setInspoPreviews] = useState<string[]>([]);
  const [inspoUploading, setInspoUploading] = useState(false);
  const [uploadedInspoIds, setUploadedInspoIds] = useState<{ id: string; image_url: string }[]>([]);
  const [inspoUrl, setInspoUrl] = useState('');

  const [closetFiles, setClosetFiles] = useState<File[]>([]);
  const [closetPreviews, setClosetPreviews] = useState<string[]>([]);
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

  const [aiConsent, setAiConsent] = useState(() => {
    return userId ? hasAIConsent(userId) : false;
  });
  useEffect(() => {
    setAiConsent(userId ? hasAIConsent(userId) : false);
  }, [userId]);
  const toggleAiConsent = () => {
    if (!user) return;
    const next = !aiConsent;
    const saved = setAIConsent(user.id, next);
    setAiConsent(next && saved);
  };

  // Shared image helpers
  const withSizeFilter = (files: File[]) =>
    files.filter((f) => {
      if (f.size > MAX_UPLOAD_BYTES) {
        toast({ title: 'Photo too large', description: `${f.name || 'A photo'} is over 5MB and was skipped.`, variant: 'destructive' });
        return false;
      }
      return true;
    });

  const nativeCameraTo = async (add: (files: File[]) => void) => {
    try {
      const f = await takePhoto();
      if (f) add([f]);
    } catch (err: any) {
      if (err?.message && !/cancel/i.test(err.message)) toast({ title: 'Camera error', description: err.message, variant: 'destructive' });
    }
  };

  const nativeLibraryTo = async (add: (files: File[]) => void) => {
    try {
      add(await pickFromLibrary());
    } catch (err: any) {
      if (err?.message && !/cancel/i.test(err.message)) toast({ title: 'Could not open photo library', description: err.message, variant: 'destructive' });
    }
  };

  // Inspiration handlers
  const addInspoFiles = (files: File[]) => {
    const valid = withSizeFilter(files).slice(0, 100);
    if (!valid.length) return;
    setInspoFiles(prev => [...prev, ...valid]);
    setInspoPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const handleInspoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addInspoFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleUploadInspo = async () => {
    if (!user || inspoFiles.length === 0) return [];
    setInspoUploading(true);
    const ids: { id: string; image_url: string }[] = [];
    for (const file of inspoFiles) {
      try {
        const imageUrl = await uploadInspirationImage(user.id, file);
        const result = await addInspo.mutateAsync({ user_id: user.id, image_url: imageUrl });
        ids.push({ id: result.id, image_url: imageUrl });
      } catch (err) { console.error('Inspo upload error:', err); }
    }
    setUploadedInspoIds(previous => [...previous, ...ids.filter(item => !previous.some(existing => existing.id === item.id))]);
    setInspoUploading(false);
    if (ids.length > 0) toast({ title: `${ids.length} inspiration photos added` });
    return ids;
  };

  const handleSyncPinterestBoard = async (boardId: string, boardName: string) => {
    try {
      const result = await syncPinterestBoard(boardId);
      toast(getPinterestSyncNotice(boardName, result));
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveInspoUrl = async () => {
    if (!user || !inspoUrl.trim()) return;
    setInspoUploading(true);
    try {
      const result = await addInspo.mutateAsync({ user_id: user.id, image_url: inspoUrl.trim(), source_url: inspoUrl.trim() });
      setUploadedInspoIds(prev => [...prev, { id: result.id, image_url: inspoUrl.trim() }]);
      toast({ title: 'Saved!', description: 'Inspiration added from link.' });
      setInspoUrl('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setInspoUploading(false);
    }
  };

  // Closet handlers
  const addClosetFiles = (files: File[]) => {
    const valid = withSizeFilter(files).slice(0, 50);
    if (!valid.length) return;
    setClosetFiles(prev => [...prev, ...valid]);
    setClosetPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const handleClosetFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addClosetFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleAnalyzeCloset = async () => {
    if (!user || closetFiles.length === 0) return;
    if (!await ensureAIConsent(user.id)) return;
    setStep('processing');

    const items: ClosetUpload[] = closetFiles.map((file, i) => ({
      id: Date.now() + i, file, preview: URL.createObjectURL(file),
      name: '', category: '', colors: [], brand: null,
      confidence: 0, needsReview: true, status: 'pending' as const,
    }));
    const updated = [...items];

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
        const { data } = await runAIRequest(user.id, () => supabase.functions.invoke('analyze-clothing', { body: { image_urls: urls } }));
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
    await updateOnboardingStep(1);
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

  const handleSaveCloset = async () => {
    if (!user) return;
    if (!await ensureAIConsent(user.id)) return;
    setClosetSaving(true);
    const ids: string[] = [];
    for (const item of closetItems) {
      if (item.status !== 'ready') continue;
      let finalUrl = item.imageUrl!;
      try {
        const { data } = await runAIRequest(user.id, () => supabase.functions.invoke('remove-background', { body: { image_url: finalUrl } }));
        if (data?.cleaned_url) finalUrl = data.cleaned_url;
      } catch { /* Keep the original image when background cleanup is unavailable. */ }
      try {
        const result = await addClosetItem.mutateAsync({ user_id: user.id, name: item.name, category: item.category, image_url: finalUrl, colors: item.colors, brand: item.brand });
        ids.push(result.id);
      } catch (err) { console.error('Save error:', err); }
    }
    setSavedItemIds(ids);
    setClosetSaving(false);
    await updateOnboardingStep(2);
    setStep('inspiration');
  };

  const handleInspirationNext = async () => {
    if (!user) return;
    const newlyUploaded = inspoFiles.length > 0 ? await handleUploadInspo() : [];
    const inspirationIds = [...uploadedInspoIds, ...newlyUploaded]
      .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index);
    if (inspirationIds.length > 0) {
      await completeOnboarding();
      navigate(`/inspiration/${inspirationIds[0].id}?auto=1`);
    } else {
      await completeOnboarding();
      navigate('/inspiration');
    }
  };

  const handleFinish = async () => { await completeOnboarding(); navigate('/dashboard'); };

  const processingProgress = closetItems.length > 0
    ? Math.round((closetItems.filter(i => i.status !== 'pending' && i.status !== 'uploading').length / closetItems.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">Your AI personal stylist. Upload your photos, we handle the rest.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { emoji: '👗', title: 'Closet', desc: 'Upload clothes' },
                    { emoji: '📸', title: 'Inspire', desc: 'Add outfit ideas' },
                    { emoji: '✨', title: 'Match', desc: 'AI creates looks' },
                  ].map(s => (
                    <div key={s.title} className="p-4 rounded-lg bg-card border border-border">
                      <span className="text-2xl">{s.emoji}</span>
                      <p className="text-sm font-semibold text-foreground mt-2">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-card p-4 text-left space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Data sent to Google Gemini:</strong> {AI_DATA_DESCRIPTION}. Google's AI processes this data to identify clothing, clean up images, match outfits, and suggest styles. Permission applies to this account on this device. You can withdraw it in Settings to stop new requests, or skip setup and continue without AI. See our{' '}
                      <Link to="/privacy" className="underline text-foreground">Privacy Policy</Link>.
                    </p>
                    <button type="button" role="checkbox" aria-checked={aiConsent} onClick={toggleAiConsent} className="flex items-start gap-2 w-full text-left">
                      <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${aiConsent ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                        {aiConsent && <Check className="w-3 h-3 text-primary-foreground" />}
                      </span>
                      <span className="text-xs text-foreground">I am 18 or older and allow Google Gemini to process the data described above.</span>
                    </button>
                  </div>
                  <Button className="w-full" size="lg" disabled={!aiConsent} onClick={async () => { await updateOnboardingStep(1); setStep('closet'); }}>
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full" onClick={handleFinish}>
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}

            {/* INSPIRATION — All three options on one screen */}
            {step === 'inspiration' && (
              <motion.div key="inspiration" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <p className="flex items-center gap-1.5 text-sm text-primary"><Check className="w-4 h-4" /> Closet saved</p>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Add Inspiration</h2>
                  <p className="text-sm text-muted-foreground mt-1">Use any of the three ways below to save outfit ideas you love</p>
                </div>

                {/* Option 1: Upload Photos */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1 · Upload Photos</p>
                  {isNativePicker() ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button type="button" variant="outline" className="h-20 flex-col gap-1.5" onClick={() => nativeCameraTo(addInspoFiles)}>
                        <CameraIcon className="w-6 h-6 text-primary" />
                        <span className="text-sm">Take Photo</span>
                      </Button>
                      <Button type="button" variant="outline" className="h-20 flex-col gap-1.5" onClick={() => nativeLibraryTo(addInspoFiles)}>
                        <ImageIcon className="w-6 h-6 text-primary" />
                        <span className="text-sm">Photo Library</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="cursor-pointer rounded-lg border border-border p-4 text-center min-h-24 flex flex-col items-center justify-center"><CameraIcon className="w-6 h-6 text-primary mb-2" /><span className="text-sm font-medium">Take photo</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInspoFiles} /></label>
                      <label className="cursor-pointer rounded-lg border border-border p-4 text-center min-h-24 flex flex-col items-center justify-center"><ImageIcon className="w-6 h-6 text-primary mb-2" /><span className="text-sm font-medium">Upload images</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleInspoFiles} /></label>
                    </div>
                  )}
                  {inspoPreviews.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">{inspoPreviews.length} photos selected</p>
                      <div className="grid grid-cols-6 gap-1 max-h-20 overflow-y-auto">
                        {inspoPreviews.map((url, i) => (
                          <div key={i} className="aspect-square rounded overflow-hidden relative group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => { setInspoFiles(prev => prev.filter((_, idx) => idx !== i)); setInspoPreviews(prev => prev.filter((_, idx) => idx !== i)); }}>
                              <X className="w-2 h-2 text-background" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Option 2: Paste Image URL */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2 · Paste Image URL</p>
                  <div className="flex gap-2">
                    <Input
                      value={inspoUrl}
                      onChange={e => setInspoUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" disabled={!inspoUrl.trim() || inspoUploading} onClick={handleSaveInspoUrl}>
                      {inspoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Option 3: Sync Pinterest */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">3 · Sync Pinterest</p>
                  {!pinterestConnected ? <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex items-center gap-3"
                    onClick={connectPinterest}
                    disabled={pinterestLoading}
                  >
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-destructive" fill="currentColor">
                        <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.36-.72-.36-1.78c0-1.67.97-2.92 2.17-2.92 1.02 0 1.52.77 1.52 1.7 0 1.03-.66 2.58-1 4.01-.28 1.2.6 2.17 1.78 2.17 2.14 0 3.78-2.26 3.78-5.52 0-2.89-2.07-4.9-5.04-4.9-3.43 0-5.44 2.57-5.44 5.23 0 1.04.4 2.15.9 2.75a.36.36 0 0 1 .08.35l-.33 1.36c-.05.22-.18.27-.4.16-1.5-.7-2.43-2.9-2.43-4.67 0-3.8 2.76-7.3 7.96-7.3 4.17 0 7.42 2.98 7.42 6.95 0 4.15-2.61 7.49-6.24 7.49-1.22 0-2.37-.63-2.76-1.38l-.75 2.86c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Connect Pinterest</p>
                      <p className="text-xs text-muted-foreground">Import pins from your boards</p>
                    </div>
                    {pinterestLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                  </Button> : pinterestBoardsLoading ? <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div> : pinterestBoards?.length ? <div className="space-y-2">{pinterestBoards.map(board => <div key={board.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div className="min-w-0"><p className="text-sm font-medium truncate">{board.name}</p><p className="text-xs text-muted-foreground">{board.pin_count} pins</p></div><Button size="sm" variant="outline" disabled={pinterestSyncing} onClick={() => void handleSyncPinterestBoard(board.id, board.name)}>{pinterestSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sync'}</Button></div>)}</div> : <p className="text-sm text-muted-foreground">Pinterest is connected. No boards were found.</p>}
                </div>

                {/* Next button */}
                <div className="pt-2">
                  <Button className="w-full" size="lg" disabled={inspoUploading} onClick={() => void handleInspirationNext()}>
                    {inspoUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : <>Create my first look <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                  <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => setStep('done')}>Skip inspiration for now</button>
                </div>
              </motion.div>
            )}

            {/* CLOSET */}
            {step === 'closet' && (
              <motion.div key="closet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <button onClick={() => setStep('welcome')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Upload Your Closet</h2>
                  <p className="text-sm text-muted-foreground mt-1">Snap photos of your clothes — AI handles the rest</p>
                </div>
                {isNativePicker() ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="outline" className="h-24 flex-col gap-2" onClick={() => nativeCameraTo(addClosetFiles)}>
                      <CameraIcon className="w-7 h-7 text-primary" />
                      <span className="text-sm">Take Photo</span>
                    </Button>
                    <Button type="button" variant="outline" className="h-24 flex-col gap-2" onClick={() => nativeLibraryTo(addClosetFiles)}>
                      <ShirtIcon className="w-7 h-7 text-primary" />
                      <span className="text-sm">Photo Library</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer rounded-lg border border-border p-5 text-center min-h-28 flex flex-col items-center justify-center"><CameraIcon className="w-7 h-7 text-primary mb-2" /><span className="text-sm font-medium">Take item photo</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleClosetFileSelect} /></label>
                    <label className="cursor-pointer rounded-lg border border-border p-5 text-center min-h-28 flex flex-col items-center justify-center"><ShirtIcon className="w-7 h-7 text-primary mb-2" /><span className="text-sm font-medium">Upload items</span><span className="text-xs text-muted-foreground mt-1">Up to 50</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleClosetFileSelect} /></label>
                  </div>
                )}
                {closetPreviews.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">{closetPreviews.length} items</p>
                      {isNativePicker() ? (
                        <div className="flex gap-3">
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => nativeCameraTo(addClosetFiles)}>+ Camera</button>
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => nativeLibraryTo(addClosetFiles)}>+ Library</button>
                        </div>
                      ) : (
                        <label className="text-xs text-primary cursor-pointer hover:underline">
                          Add more <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleClosetFileSelect} />
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto">
                      {closetPreviews.map((url, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button className="absolute top-0.5 right-0.5 w-4 h-4 bg-foreground/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => { setClosetFiles(prev => prev.filter((_, idx) => idx !== i)); setClosetPreviews(prev => prev.filter((_, idx) => idx !== i)); }}>
                            <X className="w-2.5 h-2.5 text-background" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button className="w-full" size="lg" disabled={closetFiles.length === 0} onClick={handleAnalyzeCloset}>
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
                <Button className="w-full" size="lg" disabled={closetSaving} onClick={handleSaveCloset}>
                  {closetSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Save closet & add inspiration <ArrowRight className="w-4 h-4 ml-2" /></>}
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
